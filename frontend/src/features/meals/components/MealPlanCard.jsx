import { useCallback, useEffect, useState } from 'react';
import { Card, Form, ListGroup, ProgressBar, Spinner } from 'react-bootstrap';
import { getMealPlans } from '../mealService';
import { getMealCompletionId, readCompletionIds, toggleCompletionId } from '../../../utils/completionStorage';
import ErrorModal from '../../../components/ErrorModal';
import { useTranslation } from 'react-i18next';

const labels = {
  breakfast: 'plansPage.mealCard.types.breakfast',
  morning_snack: 'plansPage.mealCard.types.morningSnack',
  lunch: 'plansPage.mealCard.types.lunch',
  afternoon_snack: 'plansPage.mealCard.types.afternoonSnack',
  dinner: 'plansPage.mealCard.types.dinner',
  evening_snack: 'plansPage.mealCard.types.eveningSnack',
};

function extractPlans(data) {
  return Array.isArray(data) ? data : data?.data || [];
}

function getEntriesForDate(plans, selectedDate) {
  return plans
    .flatMap((plan) => (plan.entries || []).map((entry) => ({
      ...entry,
      id: entry.id || `${plan.id}-${entry.planDate}-${entry.mealType}-${entry.foodName}`,
      planName: plan.name,
      type: String(entry.mealType || '').toLowerCase(),
      date: entry.planDate,
    })))
    .filter((entry) => entry.planDate === selectedDate);
}

function MealPlanCard({ selectedDate }) {
  const { t } = useTranslation();
  const [planEntries, setPlanEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedIds, setCompletedIds] = useState(() => readCompletionIds('meals'));

  const loadMeals = useCallback((showLoading = true) => {
    let active = true;

    if (showLoading) {
      setLoading(true);
    }
    setError('');
    getMealPlans()
      .then((response) => {
        if (active) {
          setPlanEntries(getEntriesForDate(extractPlans(response.data), selectedDate));
        }
      })
      .catch((err) => {
        if (active) {
          setPlanEntries([]);
          setError(err.response?.data?.message || t('plansPage.mealCard.loadError'));
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

  useEffect(() => loadMeals(true), [loadMeals]);

  useEffect(() => {
    const refreshOnFocus = () => loadMeals(false);
    const refreshCompletions = (event) => {
      if (!event.detail?.scope || event.detail.scope === 'meals') {
        setCompletedIds(readCompletionIds('meals'));
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    window.addEventListener('completion:changed', refreshCompletions);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      window.removeEventListener('completion:changed', refreshCompletions);
    };
  }, [loadMeals]);

  const completedCount = planEntries.filter((meal) => completedIds.includes(getMealCompletionId(meal))).length;
  const progress = planEntries.length ? Math.round((completedCount / planEntries.length) * 100) : 0;
  const toggle = (meal) => setCompletedIds(toggleCompletionId('meals', getMealCompletionId(meal)));

  return (
    <Card className="border-0 shadow-sm planner-side-card">
      <Card.Body>
        <div className="mb-3">
          <h2 className="h5 fw-bold mb-1">{t('plansPage.mealCard.title', { date: selectedDate })}</h2>
          <p className="text-secondary mb-0">{t('plansPage.mealCard.description')}</p>
        </div>
        <ErrorModal error={error} onClose={() => setError('')} />
        {loading && <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>}
        {!loading && planEntries.length === 0 && <div className="text-secondary border rounded p-3">{t('plansPage.mealCard.empty')}</div>}
        {!loading && planEntries.length > 0 && (
          <section className="plan-checklist">
            <div className="plan-checklist-header">
              <div>
                <h3 className="h5 fw-bold mb-1">{t('plansPage.mealCard.progress')}</h3>
                <div className="text-secondary small">{t('plansPage.mealCard.progressHint')}</div>
              </div>
              <strong className="plan-progress-value">{completedCount}/{planEntries.length}</strong>
            </div>
            <ProgressBar now={progress} variant="success" className="plan-progress" />
            <ListGroup variant="flush" className="plan-checklist-items">
              {planEntries.map((meal) => {
                const id = getMealCompletionId(meal);
                const completed = completedIds.includes(id);

                return (
                  <ListGroup.Item className={`plan-checklist-item ${completed ? 'is-completed' : ''}`} key={id}>
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <div>
                        <div className="fw-semibold">{labels[meal.type] ? t(labels[meal.type]) : meal.type}</div>
                        <div className="text-secondary">{meal.foodName || meal.planName || t('plansPage.mealCard.noFood')} - {Math.round(Number(meal.calories) || 0)} kcal</div>
                      </div>
                      <Form.Check checked={completed} label={t('plansPage.complete')} onChange={() => toggle(meal)} title={t('plansPage.mealCard.completeTitle')} />
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

export default MealPlanCard;
