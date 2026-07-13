import { useEffect, useMemo, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import ErrorModal from '../../components/ErrorModal';
import ActivityLogTable from './components/ActivityLogTable';
import ActivitySummaryCard from './components/ActivitySummaryCard';
import {
  extractActivitiesFromApi,
  extractActivityTypesFromApi,
  getActivitySummary,
  getTodayDate,
  normalizeActivityFromApi,
  normalizeActivityType,
} from './activityUtils';
import {
  getActivitiesByDate,
  getActivityTypes,
  updateActivityCompletion,
} from './activityService';

function ActivityTracker() {
  const { i18n, t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get('date') || getTodayDate());
  const [logs, setLogs] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [updatingCompletionId, setUpdatingCompletionId] = useState(null);
  const [activityGoal] = useState(() => {
    try { return JSON.parse(localStorage.getItem('activeGoalPlan'))?.dailyActivityGoalKcal || 0; } catch { return 0; }
  });

  const summary = useMemo(() => getActivitySummary(logs), [logs]);

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

  const toggleActivityCompleted = async (activity) => {
    if (!activity.id || updatingCompletionId === activity.id) return;
    setUpdatingCompletionId(activity.id);
    try {
      const response = await updateActivityCompletion(activity.id, !activity.completed);
      const updated = normalizeActivityFromApi(response.data?.data || response.data);
      setLogs((current) => current.map((item) => item.id === activity.id ? { ...item, ...updated } : item));
    } catch (error) {
      setActivityError(error.response?.data?.message || t('activityPage.completeError'));
    } finally { setUpdatingCompletionId(null); }
  };

  return (
    <>
      <ErrorModal error={activityError} onClose={() => setActivityError('')} />
      <div className="page-heading">
        <div>
          <h1>{t('activityPage.title')}</h1>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input className="form-control page-date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          {loadingLogs && <div className="alert alert-light border">{t('activityPage.loading')}</div>}
          <ActivityLogTable
            activityTypes={activityTypes}
            completedIds={logs.filter((log) => log.completed).map((log) => String(log.id))}
            language={i18n.language}
            loading={loadingLogs}
            logs={logs}
            onToggleComplete={toggleActivityCompleted}
            t={t}
          />
        </Col>

        <Col lg={4}>
          <ActivitySummaryCard
            activityGoal={activityGoal}
            logCount={logs.length}
            logs={logs}
            summary={summary}
            t={t}
          />
        </Col>
      </Row>
    </>
  );
}

export default ActivityTracker;
