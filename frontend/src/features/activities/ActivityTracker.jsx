import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa';
import ActivityFormModal from './components/ActivityFormModal';
import ActivityLogTable from './components/ActivityLogTable';
import ActivitySummaryCard from './components/ActivitySummaryCard';
import {
  calculateActivityCalories,
  emptyLog,
  extractActivitiesFromApi,
  extractActivityTypesFromApi,
  getActivitySummary,
  getTodayDate,
  mapActivityToApi,
  mapActivityToForm,
  normalizeActivityFromApi,
  normalizeActivityType,
} from './activityUtils';
import {
  createActivityLog,
  deleteActivityById,
  getActivitiesByDate,
  getActivityTypes,
  updateActivityLog,
} from './activityService';

function ActivityTracker() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [category, setCategory] = useState('all');
  const [logs, setLogs] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [form, setForm] = useState(() => ({ ...emptyLog, date: getTodayDate() }));
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activityGoal] = useState(() => {
    try { return JSON.parse(localStorage.getItem('activeGoalPlan'))?.dailyActivityGoalKcal || 0; } catch { return 0; }
  });

  const filteredTypes = category === 'all' ? activityTypes : activityTypes.filter((type) => type.category === category);
  const visibleLogs = category === 'all' ? logs : logs.filter((log) => log.category === category);
  const summary = useMemo(() => getActivitySummary(visibleLogs), [visibleLogs]);
  const estimatedCalories = calculateActivityCalories(form, activityTypes);

  useEffect(() => {
    let isMounted = true;

    async function fetchActivityTypes() {
      try {
        const response = await getActivityTypes();
        const normalizedTypes = extractActivityTypesFromApi(response.data).map(normalizeActivityType);

        if (isMounted) {
          setActivityTypes(normalizedTypes);
        }
      } catch (error) {
        console.error('[ActivityTracker] Error fetching activity types:', error);

        if (isMounted) {
          setActivityError(error.response?.data?.message || t('activityPage.loadTypesError'));
        }
      }
    }

    fetchActivityTypes();

    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    let isMounted = true;

    async function fetchActivities() {
      setLoadingLogs(true);
      setActivityError('');

      try {
        const response = await getActivitiesByDate(selectedDate);
        const normalizedLogs = extractActivitiesFromApi(response.data).map(normalizeActivityFromApi);

        if (isMounted) {
          setLogs(normalizedLogs);
        }
      } catch (error) {
        console.error('[ActivityTracker] Error fetching activities:', error);

        if (isMounted) {
          setLogs([]);
          setActivityError(error.response?.data?.message || t('activityPage.loadError'));
        }
      } finally {
        if (isMounted) {
          setLoadingLogs(false);
        }
      }
    }

    fetchActivities();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, t]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openCreateModal = () => {
    setActivityError('');
    setEditingLogId(null);
    setForm({
      ...emptyLog,
      typeId: activityTypes[0]?.id || '',
      date: selectedDate,
      time: new Date().toTimeString().slice(0, 5),
    });
    setShowModal(true);
  };

  const openEditModal = (log) => {
    setActivityError('');
    setEditingLogId(log.id);
    setForm(mapActivityToForm(log));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLogId(null);
    setForm({ ...emptyLog, date: selectedDate });
  };

  const saveLog = async () => {
    if (savingLog) {
      return;
    }

    setActivityError('');
    setSavingLog(true);

    try {
      const payload = mapActivityToApi(form, activityTypes);

      if (editingLogId) {
        const response = await updateActivityLog(editingLogId, payload);
        const currentLog = logs.find((log) => log.id === editingLogId);
        const responseLog = response.data?.data || response.data || {};
        const updatedLog = normalizeActivityFromApi({
          ...currentLog,
          ...payload,
          ...responseLog,
          id: responseLog.id ?? responseLog.activityLogId ?? editingLogId,
        });

        setLogs((current) => (
          updatedLog.date === selectedDate
            ? current.map((log) => (log.id === editingLogId ? updatedLog : log))
            : current.filter((log) => log.id !== editingLogId)
        ));
      } else {
        const response = await createActivityLog(payload);
        const createdLog = normalizeActivityFromApi(response.data);

        if (createdLog.date === selectedDate) {
          setLogs((current) => [createdLog, ...current]);
        }
      }

      closeModal();
    } catch (error) {
      console.error('[ActivityTracker] Error saving activity:', error);
      setActivityError(error.response?.data?.message || t('activityPage.saveError'));
    } finally {
      setSavingLog(false);
    }
  };

  const removeLog = async (id) => {
    if (!window.confirm(t('activityPage.confirmDelete'))) {
      return;
    }

    setActivityError('');

    try {
      await deleteActivityById(id);
      setLogs((current) => current.filter((log) => log.id !== id));
    } catch (error) {
      console.error('[ActivityTracker] Error deleting activity:', error);
      setActivityError(error.response?.data?.message || t('activityPage.deleteError'));
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('activityPage.badge')}</Badge>
          <h1>{t('activityPage.title')}</h1>
          <p>{t('activityPage.description')}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input className="form-control page-date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <Button variant="success" onClick={openCreateModal}>
            <FaPlus className="me-2" />
            {t('activityPage.addActivity')}
          </Button>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          {activityError && <div className="alert alert-danger">{activityError}</div>}
          {loadingLogs && <div className="alert alert-light border">{t('activityPage.loading')}</div>}
          <ActivityLogTable
            category={category}
            loading={loadingLogs}
            logs={visibleLogs}
            onCategoryChange={setCategory}
            onDelete={removeLog}
            onEdit={openEditModal}
            t={t}
          />
        </Col>

        <Col lg={4}>
          <ActivitySummaryCard
            activityGoal={activityGoal}
            activityTypes={filteredTypes}
            logCount={visibleLogs.length}
            summary={summary}
            t={t}
          />
        </Col>
      </Row>

      <ActivityFormModal
        activityTypes={activityTypes}
        editingLogId={editingLogId}
        estimatedCalories={estimatedCalories}
        form={form}
        onChange={handleChange}
        onClose={closeModal}
        onSave={saveLog}
        saving={savingLog}
        show={showModal}
        t={t}
      />
    </>
  );
}

export default ActivityTracker;
