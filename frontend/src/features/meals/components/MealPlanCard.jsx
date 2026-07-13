import { useCallback, useEffect, useState } from 'react';
import { Card, ListGroup, Spinner } from 'react-bootstrap';
import { getMealsByDate } from '../mealService';
import { extractMealsFromApi, getMealDisplayName, getMealTotals, normalizeMealFromApi } from '../mealUtils';
import ErrorModal from '../../../components/ErrorModal';
import { useTranslation } from 'react-i18next';

const labels = {
  BREAKFAST: 'plansPage.mealCard.types.breakfast', MORNING_SNACK: 'plansPage.mealCard.types.morningSnack',
  LUNCH: 'plansPage.mealCard.types.lunch', AFTERNOON_SNACK: 'plansPage.mealCard.types.afternoonSnack',
  DINNER: 'plansPage.mealCard.types.dinner', EVENING_SNACK: 'plansPage.mealCard.types.eveningSnack',
};

function entriesFromMeals(data) {
  return extractMealsFromApi(data).map(normalizeMealFromApi).map((meal) => ({
    id: meal.id,
    mealType: String(meal.type || '').toUpperCase(),
    foodName: getMealDisplayName(meal),
    calories: getMealTotals(meal).calories,
  }));
}

function MealPlanCard({ selectedDate }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => getMealsByDate(selectedDate).then((response) => {
    // This screen is defined as a view of the meal diary.  Do not show stale
    // standalone plan entries after a meal is replaced or deleted.
    setEntries(entriesFromMeals(response.data));
  }).catch((err) => {
    setEntries([]); setError(err.response?.data?.message || t('plansPage.mealCard.loadError'));
  }).finally(() => setLoading(false)), [selectedDate, t]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener('focus', refresh);
    window.addEventListener('meals:changed', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('meals:changed', refresh); };
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
