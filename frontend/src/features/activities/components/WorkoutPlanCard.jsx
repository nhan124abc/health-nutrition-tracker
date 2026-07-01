import { useCallback, useEffect, useState } from 'react';
import { Card, Form, ListGroup, ProgressBar, Spinner } from 'react-bootstrap';
import { getActivitiesByDate } from '../activityService';
import { extractActivitiesFromApi, normalizeActivityFromApi } from '../activityUtils';
import { getActivityCompletionId, readCompletionIds, toggleCompletionId } from '../../../utils/completionStorage';
import ErrorModal from '../../../components/ErrorModal';
import { useTranslation } from 'react-i18next';

function getActivitiesForDate(data, selectedDate) {
  return extractActivitiesFromApi(data)
    .map(normalizeActivityFromApi)
    .filter((activity) => activity.date === selectedDate);
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
    getActivitiesByDate(selectedDate)
      .then((response) => {
        if (active) {
          setActivities(getActivitiesForDate(response.data, selectedDate));
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
    window.addEventListener('activities:changed', refreshOnFocus);
    window.addEventListener('workout-plans:changed', refreshOnFocus);
    window.addEventListener('completion:changed', refreshCompletions);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      window.removeEventListener('activities:changed', refreshOnFocus);
      window.removeEventListener('workout-plans:changed', refreshOnFocus);
      window.removeEventListener('completion:changed', refreshCompletions);
    };
  }, [loadActivities]);

  const completedCount = activities.filter((item) => completedIds.includes(getActivityCompletionId(item))).length;
  const progress = activities.length ? Math.round((completedCount / activities.length) * 100) : 0;
  const toggle = (activity) => setCompletedIds(toggleCompletionId('activities', getActivityCompletionId(activity)));

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
