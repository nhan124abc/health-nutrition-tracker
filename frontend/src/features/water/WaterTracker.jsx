import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import GoalFireworks from '../../components/GoalFireworks';
import { getProfile, updateProfile } from '../profile/profileService';
import WaterHistoryCard from './components/WaterHistoryCard';
import WaterReminderCard from './components/WaterReminderCard';
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
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [waterLogs, setWaterLogs] = useState([]);
  const [dailyWaterTotal, setDailyWaterTotal] = useState(0);
  const [waterSettings, setWaterSettings] = useState(() => ({
    ...defaultWaterSettings,
    ...readStoredJson(waterSettingsStorageKey, {}),
  }));
  const [waterAmount, setWaterAmount] = useState(250);
  const [waterGoalInput, setWaterGoalInput] = useState(waterSettings.goalMl);
  const [waterDraftAmounts, setWaterDraftAmounts] = useState({});
  const [waterReminderMessage, setWaterReminderMessage] = useState('');
  const [waterError, setWaterError] = useState('');
  const [waterNotice, setWaterNotice] = useState('');
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
    if (!waterSettings.reminderEnabled) {
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
  }, [lastWaterLog, selectedDate, t, totalWaterMl, waterSettings]);

  const showNotice = (message) => {
    setWaterNotice(message);
    window.setTimeout(() => setWaterNotice(''), 2800);
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

      showNotice(t('waterPage.loggedMessage', { amount: normalizedAmount }));
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
      setWaterDraftAmounts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[log.id];
        return nextDrafts;
      });

      if (log.date === getTodayDate()) {
        setDailyWaterTotal((current) => current - normalizeNumber(log.amountMl) + normalizedAmount);
      }

      showNotice(t('waterPage.updatedMessage'));
    } catch (error) {
      console.error('[WaterTracker] Error updating water log:', error);
      setWaterError(error.response?.data?.message || t('dashboardPage.loadError'));
    }
  };

  const removeWaterLog = async (log) => {
    if (!window.confirm(t('waterPage.confirmDeleteLog'))) {
      return;
    }

    setWaterError('');

    try {
      await deleteWaterLog(log.id);
      setWaterLogs((current) => current.filter((item) => item.id !== log.id));
      setWaterDraftAmounts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[log.id];
        return nextDrafts;
      });

      if (log.date === getTodayDate()) {
        setDailyWaterTotal((current) => Math.max(0, current - normalizeNumber(log.amountMl)));
      }

      showNotice(t('waterPage.deletedMessage'));
    } catch (error) {
      console.error('[WaterTracker] Error deleting water log:', error);
      setWaterError(error.response?.data?.message || t('dashboardPage.loadError'));
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
      showNotice(t('waterPage.goalSaved'));
    } catch (error) {
      console.error('[WaterTracker] Error saving water goal:', error);
      showNotice(t('waterPage.localGoalSaved'));
    }
  };

  const updateWaterReminderSetting = (name, value) => {
    setWaterSettings((current) => ({ ...current, [name]: value }));
  };

  const updateWaterDraftAmount = (logId, value) => {
    setWaterDraftAmounts((current) => ({ ...current, [logId]: value }));
  };

  return (
    <>
      <GoalFireworks visible={showFireworks} />
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('waterPage.badge')}</Badge>
          <h1>{t('waterPage.title')}</h1>
        </div>
        <input className="form-control page-date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
      </div>

      <Row className="g-4">
        <Col lg={5}>
          <WaterSummaryCard
            error={waterError}
            goalInput={waterGoalInput}
            notice={waterNotice}
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
            <WaterReminderCard
              onSettingChange={updateWaterReminderSetting}
              settings={waterSettings}
              t={t}
            />
            <WaterHistoryCard
              draftAmounts={waterDraftAmounts}
              logs={dayWaterLogs}
              onDelete={removeWaterLog}
              onDraftChange={updateWaterDraftAmount}
              onUpdate={updateWaterLogAmount}
              t={t}
            />
          </div>
        </Col>
      </Row>
    </>
  );
}

export default WaterTracker;
