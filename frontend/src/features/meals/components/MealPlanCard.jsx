import { useCallback, useEffect, useState } from 'react';
import { Card, ListGroup, Spinner } from 'react-bootstrap';
import { getMealPlans } from '../mealService';
import ErrorModal from '../../../components/ErrorModal';
import { useTranslation } from 'react-i18next';

const labels = {
  BREAKFAST: 'plansPage.mealCard.types.breakfast', MORNING_SNACK: 'plansPage.mealCard.types.morningSnack',
  LUNCH: 'plansPage.mealCard.types.lunch', AFTERNOON_SNACK: 'plansPage.mealCard.types.afternoonSnack',
  DINNER: 'plansPage.mealCard.types.dinner', EVENING_SNACK: 'plansPage.mealCard.types.eveningSnack',
};

function plansFrom(data) { return Array.isArray(data) ? data : (data?.data || data?.content || data?.items || []); }

function entriesForDate(plans, date) {
  return plans.filter((plan) => plan.active !== false).flatMap((plan) => {
    const byType = (plan.entries || []).filter((entry) => String(entry.planDate).slice(0, 10) === date)
      .reduce((groups, entry) => ({ ...groups, [entry.mealType]: [...(groups[entry.mealType] || []), entry] }), {});
    return Object.values(byType).map((entries) => ({
      id: `${plan.id}-${entries[0].mealType}`,
      mealType: entries[0].mealType,
      // One plan / meal slot is displayed as one meal, including legacy plans
      // that were accidentally saved with one entry per ingredient.
      foodName: entries[0].recipeId ? entries[0].foodName : (String(plan.description || '').split(':').slice(1).join(':').trim() || entries[0].foodName),
      calories: entries.reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0),
    }));
  });
}

function MealPlanCard({ selectedDate }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => getMealPlans().then((response) => {
    setEntries(entriesForDate(plansFrom(response.data), selectedDate));
  }).catch((err) => {
    setEntries([]); setError(err.response?.data?.message || t('plansPage.mealCard.loadError'));
  }).finally(() => setLoading(false)), [selectedDate, t]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener('focus', refresh);
    window.addEventListener('meal-plans:changed', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('meal-plans:changed', refresh); };
  }, [load]);

  return <Card className="border-0 shadow-sm planner-side-card"><Card.Body>
    <div className="mb-3"><h2 className="h5 fw-bold mb-1">{t('plansPage.mealCard.title', { date: selectedDate })}</h2><p className="text-secondary mb-0">{t('plansPage.mealCard.description')}</p></div>
    <ErrorModal error={error} onClose={() => setError('')} />
    {loading && <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>}
    {!loading && entries.length === 0 && <div className="text-secondary border rounded p-3">{t('plansPage.mealCard.empty')}</div>}
    {!loading && entries.length > 0 && <ListGroup variant="flush" className="plan-checklist-items">{entries.map((entry) => <ListGroup.Item className="plan-checklist-item" key={entry.id}><div><div className="fw-semibold">{labels[entry.mealType] ? t(labels[entry.mealType]) : entry.mealType}</div><div className="text-secondary">{entry.foodName || t('plansPage.mealCard.noFood')} - {Math.round(entry.calories)} kcal</div></div></ListGroup.Item>)}</ListGroup>}
  </Card.Body></Card>;
}

export default MealPlanCard;
