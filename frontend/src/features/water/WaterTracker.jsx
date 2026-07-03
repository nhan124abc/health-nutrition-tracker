import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Col, Modal, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import GoalFireworks from '../../components/GoalFireworks';
import { getProfile, updateProfile } from '../profile/profileService';
import WaterHistoryCard from './components/WaterHistoryCard';
import WaterSummaryCard from './components/WaterSummaryCard';
import {
  defaultWaterSettings,
  formatLocalDateTime,
  getTodayDate,
  normalizeDailyWaterFromApi,
  normalizeNumber,
  normalizeWaterLogFromApi,
  normalizeWaterLogsFromApi,
  readStoredJson,
  waterSettingsStorageKey,
} from './waterUtils';
import {
  createWaterLog,
  deleteWaterLog,
  getTodayWater,
  getWaterLogs,
  updateWaterLog,
} from './waterService';

function WaterTracker() {
  const { t } = useTranslation();
  const userSettings = readStoredJson('userSettings', {});
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [waterLogs, setWaterLogs] = useState([]);
  const [dailyWaterTotal, setDailyWaterTotal] = useState(0);
  const [waterSettings, setWaterSettings] = useState(() => ({
    ...defaultWaterSettings,
    ...readStoredJson(waterSettingsStorageKey, {}),
  }));
  const [waterAmount, setWaterAmount] = useState(250);
  const [waterGoalInput, setWaterGoalInput] = useState(waterSettings.goalMl);
  const [waterReminderMessage, setWaterReminderMessage] = useState('');
  const [waterError, setWaterError] = useState('');
  const [waterPopup, setWaterPopup] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [showFireworks, setShowFireworks] = useState(false);
  const wasWaterGoalComplete = useRef(false);

  const dayWaterLogs = useMemo(
    () => waterLogs
      .filter((log) => log.date === selectedDate)
      .sort((first, second) => new Date(second.loggedAt) - new Date(first.loggedAt)),
    [selectedDate, waterLogs]
  );

  const totalWaterMl = selectedDate === getTodayDate()
    ? dailyWaterTotal
    : dayWaterLogs.reduce((sum, log) => sum + normalizeNumber(log.amountMl), 0);
  const waterProgress = Math.min((totalWaterMl / Math.max(waterSettings.goalMl, 1)) * 100, 100);
  const lastWaterLog = dayWaterLogs[0];

  useEffect(() => {
    localStorage.setItem(waterSettingsStorageKey, JSON.stringify(waterSettings));
  }, [waterSettings]);

  useEffect(() => {
    const isComplete = selectedDate === getTodayDate()
      && waterSettings.goalMl > 0
      && totalWaterMl >= waterSettings.goalMl;
    let timeoutId;

    if (isComplete && !wasWaterGoalComplete.current) {
      setShowFireworks(true);
      timeoutId = window.setTimeout(() => setShowFireworks(false), 2400);
    }

    wasWaterGoalComplete.current = isComplete;
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [selectedDate, totalWaterMl, waterSettings.goalMl]);

  useEffect(() => {
    let isMounted = true;

    async function fetchWaterData() {
      const [profileResult, waterResult, logsResult] = await Promise.allSettled([
        getProfile(),
        selectedDate === getTodayDate() ? getTodayWater() : Promise.resolve(null),
        getWaterLogs(selectedDate),
      ]);

      if (!isMounted) {
        return;
      }

      const dailyWater = waterResult.status === 'fulfilled' && waterResult.value
          ? normalizeDailyWaterFromApi(waterResult.value.data)
          : { totalAmountMl: 0, goalMl: 0 };
      const profileGoal = profileResult.status === 'fulfilled'
        ? normalizeNumber(profileResult.value.data?.dailyWaterGoalMl)
        : 0;
      const goalMl = dailyWater.goalMl || profileGoal;

      setDailyWaterTotal(dailyWater.totalAmountMl);
      if (logsResult.status === 'fulfilled') {
        const selectedDateLogs = normalizeWaterLogsFromApi(logsResult.value.data);
        setWaterLogs((current) => [
          ...current.filter((log) => log.date !== selectedDate),
          ...selectedDateLogs,
        ]);
      }
      if (goalMl > 0) {
        setWaterSettings((current) => ({ ...current, goalMl }));
        setWaterGoalInput(goalMl);
      }

      const failedResult = [profileResult, waterResult, logsResult]
        .find((result) => result.status === 'rejected');
      if (failedResult) {
        console.error('[WaterTracker] Error loading water data:', failedResult.reason);
        setWaterError(failedResult.reason.response?.data?.message || t('dashboardPage.loadError'));
      }
    }

    fetchWaterData();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, t]);

  useEffect(() => {
    if (userSettings.waterReminder === false || !waterSettings.reminderEnabled) {
      setWaterReminderMessage('');
      return undefined;
    }

    const updateReminder = () => {
      if (selectedDate !== getTodayDate()) {
        setWaterReminderMessage('');
        return;
      }

      if (totalWaterMl >= waterSettings.goalMl) {
        setWaterReminderMessage(t('waterPage.goalReached'));
        return;
      }

      if (!lastWaterLog) {
        setWaterReminderMessage(
          totalWaterMl > 0 ? '' : t('waterPage.reminderStart')
        );
        return;
      }

      const elapsedMinutes = Math.floor((Date.now() - new Date(lastWaterLog.loggedAt).getTime()) / 60000);

      if (elapsedMinutes >= waterSettings.reminderIntervalMinutes) {
        setWaterReminderMessage(t('waterPage.reminderDue', { minutes: elapsedMinutes }));
      } else {
        setWaterReminderMessage('');
      }
    };

    updateReminder();
    const timerId = window.setInterval(updateReminder, 60000);

    return () => window.clearInterval(timerId);
  }, [lastWaterLog, selectedDate, t, totalWaterMl, userSettings.waterReminder, waterSettings]);

  const showSuccessPopup = (title, message) => {
    setWaterPopup({ title, message });
  };

  const closeSuccessPopup = () => {
    setWaterPopup(null);
  };

  const addWaterLog = async (amount = waterAmount) => {
    const normalizedAmount = Number(amount) || 0;

    if (normalizedAmount <= 0 || normalizedAmount > 10000) {
      setWaterError(t('waterPage.invalidAmount'));
      return;
    }

    setWaterError('');
    const now = new Date();
    const loggedAt = selectedDate === getTodayDate()
      ? now
      : new Date(`${selectedDate}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`);

    try {
      const response = await createWaterLog({
        amountMl: normalizedAmount,
        loggedAt: formatLocalDateTime(loggedAt),
      });
      const createdLog = normalizeWaterLogFromApi(response.data);
      setWaterLogs((current) => [createdLog, ...current]);

      if (selectedDate === getTodayDate()) {
        const todayResponse = await getTodayWater();
        setDailyWaterTotal(normalizeDailyWaterFromApi(todayResponse.data).totalAmountMl);
      }

      showSuccessPopup(t('waterPage.successTitle'), t('waterPage.loggedMessage', { amount: normalizedAmount }));
    } catch (error) {
      console.error('[WaterTracker] Error creating water log:', error);
      setWaterError(error.response?.data?.message || t('dashboardPage.loadError'));
    }
  };

  const updateWaterLogAmount = async (log, amount) => {
    const normalizedAmount = Number(amount) || 0;

    if (normalizedAmount <= 0 || normalizedAmount > 10000) {
      setWaterError(t('waterPage.invalidAmount'));
      return;
    }

    setWaterError('');

    try {
      const response = await updateWaterLog(log.id, {
        amountMl: normalizedAmount,
        loggedAt: log.loggedAt,
      });
      const updatedLog = normalizeWaterLogFromApi({
        ...log,
        ...response.data,
        id: response.data?.id ?? response.data?.waterLogId ?? log.id,
      });

      setWaterLogs((current) => current.map((item) => (
        item.id === log.id ? updatedLog : item
      )));

      if (log.date === getTodayDate()) {
        setDailyWaterTotal((current) => current - normalizeNumber(log.amountMl) + normalizedAmount);
      }

      showSuccessPopup(t('waterPage.successTitle'), t('waterPage.updatedMessage'));
    } catch (error) {
      console.error('[WaterTracker] Error updating water log:', error);
      setWaterError(error.response?.data?.message || t('dashboardPage.loadError'));
    }
  };

  const requestDeleteWaterLog = (log) => {
    setDeleteCandidate(log);
  };

  const confirmDeleteWaterLog = async () => {
    if (!deleteCandidate) {
      return;
    }

    setWaterError('');

    try {
      await deleteWaterLog(deleteCandidate.id);
      setWaterLogs((current) => current.filter((item) => item.id !== deleteCandidate.id));

      if (deleteCandidate.date === getTodayDate()) {
        setDailyWaterTotal((current) => Math.max(0, current - normalizeNumber(deleteCandidate.amountMl)));
      }

      showSuccessPopup(t('waterPage.successTitle'), t('waterPage.deletedMessage'));
    } catch (error) {
      console.error('[WaterTracker] Error deleting water log:', error);
      setWaterError(error.response?.data?.message || t('dashboardPage.loadError'));
    } finally {
      setDeleteCandidate(null);
    }
  };

  const saveWaterGoal = async () => {
    const goalMl = Number(waterGoalInput) || 0;

    if (goalMl < 100 || goalMl > 10000) {
      setWaterError(t('waterPage.invalidGoal'));
      return;
    }

    setWaterError('');
    setWaterSettings((current) => ({ ...current, goalMl }));

    try {
      await updateProfile({ dailyWaterGoalMl: goalMl });
      showSuccessPopup(t('waterPage.successTitle'), t('waterPage.goalSaved'));
    } catch (error) {
      console.error('[WaterTracker] Error saving water goal:', error);
      showSuccessPopup(t('waterPage.successTitle'), t('waterPage.localGoalSaved'));
    }
  };

  return (
    <>
      <GoalFireworks visible={showFireworks} />
      <div className="page-heading">
        <div>
          <h1>{t('waterPage.title')}</h1>
        </div>
        <input className="form-control page-date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
      </div>

      <Row className="g-4">
        <Col lg={5}>
          <WaterSummaryCard
            error={waterError}
            onCloseError={() => setWaterError('')}
            goalInput={waterGoalInput}
            onAddWater={addWaterLog}
            onGoalInputChange={setWaterGoalInput}
            onSaveGoal={saveWaterGoal}
            onWaterAmountChange={setWaterAmount}
            progress={waterProgress}
            reminderMessage={waterReminderMessage}
            settings={waterSettings}
            t={t}
            totalWaterMl={totalWaterMl}
            waterAmount={waterAmount}
          />
        </Col>

        <Col lg={7}>
          <div className="planner-side-stack">
            <WaterHistoryCard
              logs={dayWaterLogs}
              onRequestDelete={requestDeleteWaterLog}
              onUpdate={updateWaterLogAmount}
              t={t}
            />
          </div>
        </Col>
      </Row>

      <Modal show={Boolean(deleteCandidate)} onHide={() => setDeleteCandidate(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('waterPage.confirmDeleteTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t('waterPage.confirmDeleteLog')}</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDeleteCandidate(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmDeleteWaterLog}>
            {t('waterPage.deleteLog')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(waterPopup)} onHide={closeSuccessPopup} centered>
        <Modal.Header closeButton>
          <Modal.Title>{waterPopup?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{waterPopup?.message}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={closeSuccessPopup}>
            {t('common.close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default WaterTracker;
