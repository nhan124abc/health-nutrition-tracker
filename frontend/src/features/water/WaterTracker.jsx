import { useEffect, useMemo, useState } from 'react';
import { Badge, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getProfile, updateProfile } from '../profile/profileService';
import WaterHistoryCard from './components/WaterHistoryCard';
import WaterReminderCard from './components/WaterReminderCard';
import WaterSummaryCard from './components/WaterSummaryCard';
import {
  defaultWaterSettings,
  getTodayDate,
  normalizeNumber,
  readStoredJson,
  waterLogsStorageKey,
  waterSettingsStorageKey,
} from './waterUtils';

function WaterTracker() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [waterLogs, setWaterLogs] = useState(() => readStoredJson(waterLogsStorageKey, []));
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

  const dayWaterLogs = useMemo(
    () => waterLogs
      .filter((log) => log.date === selectedDate)
      .sort((first, second) => new Date(second.loggedAt) - new Date(first.loggedAt)),
    [selectedDate, waterLogs]
  );

  const totalWaterMl = dayWaterLogs.reduce((sum, log) => sum + normalizeNumber(log.amountMl), 0);
  const waterProgress = Math.min((totalWaterMl / Math.max(waterSettings.goalMl, 1)) * 100, 100);
  const lastWaterLog = dayWaterLogs[0];

  useEffect(() => {
    localStorage.setItem(waterLogsStorageKey, JSON.stringify(waterLogs));
  }, [waterLogs]);

  useEffect(() => {
    localStorage.setItem(waterSettingsStorageKey, JSON.stringify(waterSettings));
  }, [waterSettings]);

  useEffect(() => {
    let isMounted = true;

    async function fetchWaterGoal() {
      try {
        const response = await getProfile();
        const goalMl = normalizeNumber(response.data?.dailyWaterGoalMl);

        if (isMounted && goalMl > 0) {
          setWaterSettings((current) => ({ ...current, goalMl }));
          setWaterGoalInput(goalMl);
        }
      } catch (error) {
        console.error('[WaterTracker] Error loading water goal:', error);
      }
    }

    fetchWaterGoal();

    return () => {
      isMounted = false;
    };
  }, []);

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
        setWaterReminderMessage(t('waterPage.reminderStart'));
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

  const addWaterLog = (amount = waterAmount) => {
    const normalizedAmount = Number(amount) || 0;

    if (normalizedAmount <= 0) {
      setWaterError(t('waterPage.invalidAmount'));
      return;
    }

    const now = new Date();
    const nextLog = {
      id: `W${now.getTime()}`,
      date: selectedDate,
      amountMl: normalizedAmount,
      loggedAt: selectedDate === getTodayDate()
        ? now.toISOString()
        : `${selectedDate}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00.000Z`,
    };

    setWaterError('');
    setWaterLogs((current) => [nextLog, ...current]);
    showNotice(t('waterPage.loggedMessage', { amount: normalizedAmount }));
  };

  const updateWaterLogAmount = (logId, amount) => {
    const normalizedAmount = Number(amount) || 0;

    if (normalizedAmount <= 0) {
      setWaterError(t('waterPage.invalidAmount'));
      return;
    }

    setWaterError('');
    setWaterLogs((current) => current.map((log) => (
      log.id === logId ? { ...log, amountMl: normalizedAmount } : log
    )));
    setWaterDraftAmounts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[logId];
      return nextDrafts;
    });
    showNotice(t('waterPage.updatedMessage'));
  };

  const removeWaterLog = (logId) => {
    if (!window.confirm(t('waterPage.confirmDeleteLog'))) {
      return;
    }

    setWaterLogs((current) => current.filter((log) => log.id !== logId));
    showNotice(t('waterPage.deletedMessage'));
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
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('waterPage.badge')}</Badge>
          <h1>{t('waterPage.title')}</h1>
          <p>{t('waterPage.description')}</p>
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
