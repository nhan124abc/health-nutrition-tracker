import { useCallback, useEffect, useState } from 'react';
import { Card, Form, ListGroup, ProgressBar, Spinner } from 'react-bootstrap';
import { createActivityLog, getActivitiesByDate, getWorkoutPlans, updateActivityCompletion } from '../activityService';
import { extractActivitiesFromApi, normalizeActivityFromApi } from '../activityUtils';
import { getActivityCompletionId, readCompletionIds, toggleCompletionId } from '../../../utils/completionStorage';
import ErrorModal from '../../../components/ErrorModal';
import { useTranslation } from 'react-i18next';

function getPlannerDayOfWeek(date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 ? 7 : day;
}

function extractWorkoutPlans(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return data?.data?.content || data?.content || data?.data?.items || data?.items || [];
}

function getExercisesForDate(data, selectedDate, activityLogs) {
  const dayOfWeek = getPlannerDayOfWeek(selectedDate);
  return extractWorkoutPlans(data)
    .filter((plan) => plan.active !== false)
    // Daily plans created by Planner include the date in their name. Legacy
    // recurring plans fall back to their configured day of week.
    .filter((plan) => String(plan.name || '').includes(selectedDate)
      || !(plan.name || '').match(/\d{4}-\d{2}-\d{2}/))
    .flatMap((plan) => (plan.exercises || [])
      .filter((exercise) => Number(exercise.dayOfWeek) === dayOfWeek)
      .map((exercise) => {
        const matchedLog = activityLogs.find((log) => String(log.typeId) === String(exercise.activityTypeId)
          && Number(log.duration) === Number(exercise.durationMinutes));
        return {
          id: `workout-plan-${plan.id}-exercise-${exercise.id}`,
          activityTypeId: exercise.activityTypeId,
          customName: exercise.activityTypeName || exercise.exerciseName,
          duration: exercise.durationMinutes,
          planName: plan.name,
          activityLogId: matchedLog?.id || null,
          completed: Boolean(matchedLog?.completed),
        };
      }));
}

function WorkoutPlanCard({ selectedDate }) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedIds, setCompletedIds] = useState(() => readCompletionIds('activities'));

  const loadActivities = useCallback((showLoading = true) => {
    let active = true;

    if (showLoading) {
      setLoading(true);
    }
    setError('');
    Promise.all([getWorkoutPlans(), getActivitiesByDate(selectedDate)])
      .then(([plansResponse, logsResponse]) => {
        if (active) {
          const activityLogs = extractActivitiesFromApi(logsResponse.data).map(normalizeActivityFromApi);
          const exercises = getExercisesForDate(plansResponse.data, selectedDate, activityLogs);
          setActivities(exercises);
          setCompletedIds((current) => [...new Set([
            ...current,
            ...exercises.filter((exercise) => exercise.completed).map(getActivityCompletionId),
          ])]);
        }
      })
      .catch((err) => {
        if (active) {
          setActivities([]);
          setError(err.response?.data?.message || t('plansPage.workoutCard.loadError'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedDate, t]);

  useEffect(() => loadActivities(true), [loadActivities]);

  useEffect(() => {
    const refreshOnFocus = () => loadActivities(false);
    const refreshCompletions = (event) => {
      if (!event.detail?.scope || event.detail.scope === 'activities') {
        setCompletedIds(readCompletionIds('activities'));
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    window.addEventListener('workout-plans:changed', refreshOnFocus);
    window.addEventListener('completion:changed', refreshCompletions);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      window.removeEventListener('workout-plans:changed', refreshOnFocus);
      window.removeEventListener('completion:changed', refreshCompletions);
    };
  }, [loadActivities]);

  const completedCount = activities.filter((item) => completedIds.includes(getActivityCompletionId(item))).length;
  const progress = activities.length ? Math.round((completedCount / activities.length) * 100) : 0;
  const toggle = async (activity) => {
    const id = getActivityCompletionId(activity);
    const completed = completedIds.includes(id);

    try {
      let activityLogId = activity.activityLogId;
      if (!activityLogId && !completed) {
        const response = await createActivityLog({
          activityTypeId: activity.activityTypeId,
          activityName: activity.customName,
          durationMinutes: Number(activity.duration) || 30,
          loggedAt: `${selectedDate}T${new Date().toTimeString().slice(0, 5)}:00`,
          notes: activity.planName,
        });
        activityLogId = response.data?.id;
        setActivities((current) => current.map((item) => (
          item.id === activity.id ? { ...item, activityLogId } : item
        )));
      }

      if (activityLogId) {
        await updateActivityCompletion(activityLogId, !completed);
      }
      setCompletedIds(toggleCompletionId('activities', id));
    } catch (err) {
      setError(err.response?.data?.message || t('plansPage.workoutCard.loadError'));
    }
  };

  return (
    <Card className="border-0 shadow-sm planner-side-card">
      <Card.Body>
        <div className="mb-3">
          <h2 className="h5 fw-bold mb-1">{t('plansPage.workoutCard.title', { date: selectedDate })}</h2>
          <p className="text-secondary mb-0">{t('plansPage.workoutCard.description')}</p>
        </div>
        <ErrorModal error={error} onClose={() => setError('')} />
        {loading && <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>}
        {!loading && activities.length === 0 && <div className="text-secondary border rounded p-3">{t('plansPage.workoutCard.empty')}</div>}
        {!loading && activities.length > 0 && (
          <section className="plan-checklist">
            <div className="plan-checklist-header">
              <div>
                <h3 className="h5 fw-bold mb-1">{t('plansPage.workoutCard.progress')}</h3>
                <div className="text-secondary small">{t('plansPage.workoutCard.progressHint')}</div>
              </div>
              <strong className="plan-progress-value">{completedCount}/{activities.length}</strong>
            </div>
            <ProgressBar now={progress} className="plan-progress" />
            <ListGroup variant="flush" className="plan-checklist-items">
              {activities.map((activity) => {
                const id = getActivityCompletionId(activity);
                const completed = completedIds.includes(id);
                const details = activity.duration
                  ? t('plansPage.workoutCard.minutes', { count: activity.duration })
                  : activity.planName || '';

                return (
                  <ListGroup.Item className={`plan-checklist-item ${completed ? 'is-completed' : ''}`} key={id}>
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <div>
                        <div className="fw-semibold">{activity.customName}</div>
                        <div className="text-secondary">{details}</div>
                      </div>
                      <Form.Check checked={completed} label={t('plansPage.complete')} onChange={() => toggle(activity)} title={t('plansPage.workoutCard.completeTitle')} />
                    </div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </section>
        )}
      </Card.Body>
    </Card>
  );
}

export default WorkoutPlanCard;
