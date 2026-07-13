import { useCallback, useEffect, useState } from 'react';
import { Card, ListGroup, Spinner } from 'react-bootstrap';
import { getWorkoutPlans } from '../activityService';
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

function getActivityLogDefaults(notes) {
  try { return JSON.parse(notes || '')?.activityLogDefaults || {}; } catch { return {}; }
}

function getExercisesForDate(data, selectedDate) {
  const dayOfWeek = getPlannerDayOfWeek(selectedDate);
  return extractWorkoutPlans(data)
    .filter((plan) => plan.active !== false)
    .filter((plan) => String(plan.planDate) === selectedDate)
    .flatMap((plan) => (plan.exercises || [])
      .filter((exercise) => Number(exercise.dayOfWeek) === dayOfWeek)
      .map((exercise) => {
        const defaults = getActivityLogDefaults(exercise.notes);
        return {
          id: `workout-plan-${plan.id}-exercise-${exercise.id}`,
          exerciseId: exercise.id,
          activityTypeId: exercise.activityTypeId,
          customName: exercise.activityTypeName || exercise.exerciseName,
          duration: exercise.durationMinutes,
          defaults,
          planName: plan.name,
        };
      }));
}

function WorkoutPlanCard({ selectedDate }) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadActivities = useCallback((showLoading = true) => {
    let active = true;

    if (showLoading) {
      setLoading(true);
    }
    setError('');
    getWorkoutPlans()
      .then((plansResponse) => {
        if (active) {
          const exercises = getExercisesForDate(plansResponse.data, selectedDate);
          setActivities(exercises);
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
    window.addEventListener('focus', refreshOnFocus);
    window.addEventListener('workout-plans:changed', refreshOnFocus);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      window.removeEventListener('workout-plans:changed', refreshOnFocus);
    };
  }, [loadActivities]);

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
            <ListGroup variant="flush" className="plan-checklist-items">
              {activities.map((activity) => {
                const id = activity.id;
                const details = activity.duration
                  ? t('plansPage.workoutCard.minutes', { count: activity.duration })
                  : activity.planName || '';
                const metrics = [
                  activity.defaults?.sets && activity.defaults?.repsPerSet ? `${activity.defaults.sets} sets × ${activity.defaults.repsPerSet} reps` : null,
                  activity.defaults?.distanceKm ? `${activity.defaults.distanceKm} km` : null,
                  activity.defaults?.avgHeartRate ? `${activity.defaults.avgHeartRate} bpm` : null,
                  activity.defaults?.steps ? `${activity.defaults.steps} steps` : null,
                ].filter(Boolean).join(' · ');

                return (
                  <ListGroup.Item className="plan-checklist-item" key={id}>
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <div>
                        <div className="fw-semibold">{activity.customName}</div>
                        <div className="text-secondary">{details}</div>
                        {metrics && <div className="text-secondary small">{metrics}</div>}
                      </div>
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
