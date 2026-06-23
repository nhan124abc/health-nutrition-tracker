import { useEffect, useMemo, useRef, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import GoalFireworks from '../../components/GoalFireworks';
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
} from './activityService';

function ActivityTracker() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [category, setCategory] = useState('all');
  const [logs, setLogs] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [showFireworks, setShowFireworks] = useState(false);
  const wasActivityGoalComplete = useRef(false);
  const [activityGoal] = useState(() => {
    try { return JSON.parse(localStorage.getItem('activeGoalPlan'))?.dailyActivityGoalKcal || 0; } catch { return 0; }
  });

  const filteredTypes = category === 'all' ? activityTypes : activityTypes.filter((type) => type.category === category);
  const visibleLogs = category === 'all' ? logs : logs.filter((log) => log.category === category);
  const summary = useMemo(() => getActivitySummary(logs), [logs]);

  useEffect(() => {
    const isComplete = !loadingLogs
      && selectedDate === getTodayDate()
      && activityGoal > 0
      && summary.calories >= activityGoal;
    let timeoutId;

    if (isComplete && !wasActivityGoalComplete.current) {
      setShowFireworks(true);
      timeoutId = window.setTimeout(() => setShowFireworks(false), 2400);
    }

    wasActivityGoalComplete.current = isComplete;
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activityGoal, loadingLogs, selectedDate, summary.calories]);

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

  return (
    <>
      <GoalFireworks visible={showFireworks} />
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
          {activityError && <div className="alert alert-danger">{activityError}</div>}
          {loadingLogs && <div className="alert alert-light border">{t('activityPage.loading')}</div>}
          <ActivityLogTable
            category={category}
            loading={loadingLogs}
            logs={visibleLogs}
            onCategoryChange={setCategory}
            t={t}
          />
        </Col>

        <Col lg={4}>
          <ActivitySummaryCard
            activityGoal={activityGoal}
            activityTypes={filteredTypes}
            logCount={logs.length}
            summary={summary}
            t={t}
          />
        </Col>
      </Row>
    </>
  );
}

export default ActivityTracker;
