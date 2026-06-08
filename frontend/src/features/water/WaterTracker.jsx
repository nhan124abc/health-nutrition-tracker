import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, ProgressBar, Row, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBell, FaEdit, FaHistory, FaPlus, FaTint, FaTrash } from 'react-icons/fa';
import { getProfile, updateProfile } from '../profile/profileService';

const defaultWaterSettings = {
  goalMl: 2000,
  reminderEnabled: true,
  reminderIntervalMinutes: 90,
};

const quickWaterAmounts = [150, 250, 500, 750];
const waterLogsStorageKey = 'healthNutritionWaterLogs';
const waterSettingsStorageKey = 'healthNutritionWaterSettings';

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeNumber(value) {
  return Number(value) || 0;
}

function readStoredJson(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    console.error(`[WaterTracker] Could not read ${key}:`, error);
    return fallback;
  }
}

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
          <Card className="border-0 shadow-sm planner-side-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="water-glass"><FaTint /></span>
                  <div>
                    <Card.Title className="fw-bold mb-0">{t('waterPage.todayTitle')}</Card.Title>
                    <Card.Text className="text-secondary small mb-0">
                      {t('waterPage.totalToday', { total: totalWaterMl, goal: waterSettings.goalMl })}
                    </Card.Text>
                  </div>
                </div>
                <Badge bg={waterProgress >= 100 ? 'success' : 'info'}>{Math.round(waterProgress)}%</Badge>
              </div>

              <ProgressBar now={waterProgress} className="mb-3" />

              {waterError && <div className="alert alert-warning py-2">{waterError}</div>}
              {waterNotice && <div className="alert alert-success py-2">{waterNotice}</div>}
              {waterReminderMessage && (
                <div className="alert alert-info py-2 d-flex align-items-center gap-2">
                  <FaBell />
                  <span>{waterReminderMessage}</span>
                </div>
              )}

              <Form.Group className="mb-3">
                <Form.Label>{t('waterPage.goal')}</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="number"
                    min="100"
                    max="10000"
                    step="50"
                    value={waterGoalInput}
                    onChange={(event) => setWaterGoalInput(event.target.value)}
                  />
                  <Button variant="outline-success" onClick={saveWaterGoal}>{t('common.save')}</Button>
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('waterPage.addAmount')}</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="number"
                    min="1"
                    step="50"
                    value={waterAmount}
                    onChange={(event) => setWaterAmount(event.target.value)}
                  />
                  <Button variant="info" className="text-white" onClick={() => addWaterLog()}>
                    <FaPlus className="me-2" />
                    {t('waterPage.addLog')}
                  </Button>
                </div>
              </Form.Group>

              <div className="d-flex flex-wrap gap-2">
                {quickWaterAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline-info"
                    size="sm"
                    onClick={() => addWaterLog(amount)}
                  >
                    +{amount} ml
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <div className="planner-side-stack">
            <Card className="border-0 shadow-sm planner-side-card">
              <Card.Body>
                <Card.Title className="fw-bold mb-3">{t('waterPage.notificationTitle')}</Card.Title>
                <Form.Check
                  type="switch"
                  id="water-reminder-enabled"
                  label={t('waterPage.reminderEnabled')}
                  checked={waterSettings.reminderEnabled}
                  onChange={(event) => updateWaterReminderSetting('reminderEnabled', event.target.checked)}
                />
                <Form.Group className="mt-3">
                  <Form.Label>{t('waterPage.reminderInterval')}</Form.Label>
                  <Form.Control
                    type="number"
                    min="15"
                    step="15"
                    value={waterSettings.reminderIntervalMinutes}
                    onChange={(event) => updateWaterReminderSetting('reminderIntervalMinutes', Number(event.target.value) || 60)}
                    disabled={!waterSettings.reminderEnabled}
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm planner-side-card">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <FaHistory className="text-secondary" />
                  <Card.Title className="fw-bold mb-0">{t('waterPage.history')}</Card.Title>
                </div>

                {dayWaterLogs.length === 0 ? (
                  <p className="text-secondary small mb-0">{t('waterPage.noHistory')}</p>
                ) : (
                  <div className="table-responsive">
                    <Table size="sm" hover className="align-middle mb-0">
                      <thead>
                        <tr>
                          <th>{t('waterPage.time')}</th>
                          <th className="text-end">{t('waterPage.amount')}</th>
                          <th className="text-end">{t('admin.table.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayWaterLogs.map((log) => (
                          <tr key={log.id}>
                            <td>{String(log.loggedAt).slice(11, 16)}</td>
                            <td className="text-end">
                              <Form.Control
                                type="number"
                                min="1"
                                size="sm"
                                className="text-end"
                                value={waterDraftAmounts[log.id] ?? log.amountMl}
                                onChange={(event) => {
                                  const { value } = event.target;
                                  setWaterDraftAmounts((current) => ({ ...current, [log.id]: value }));
                                }}
                              />
                            </td>
                            <td className="text-end">
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="me-2"
                                onClick={() => updateWaterLogAmount(log.id, waterDraftAmounts[log.id] ?? log.amountMl)}
                                aria-label={t('waterPage.updateLog')}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removeWaterLog(log.id)}
                                aria-label={t('waterPage.deleteLog')}
                              >
                                <FaTrash />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        </Col>
      </Row>
    </>
  );
}

export default WaterTracker;
