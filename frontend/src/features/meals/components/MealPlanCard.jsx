import { useEffect, useState } from 'react';
import { Card, Form, ListGroup, ProgressBar, Spinner } from 'react-bootstrap';
import { getMealsByDate } from '../mealService';
import { extractMealsFromApi, getMealTotals, normalizeMealFromApi } from '../mealUtils';
import { getMealCompletionId, readCompletionIds, toggleCompletionId } from '../../../utils/completionStorage';
import ErrorModal from '../../../components/ErrorModal';

const labels = { breakfast: 'Bữa sáng', morning_snack: 'Bữa phụ sáng', lunch: 'Bữa trưa', afternoon_snack: 'Bữa phụ chiều', dinner: 'Bữa tối', evening_snack: 'Bữa phụ tối' };

function MealPlanCard({ selectedDate }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedIds, setCompletedIds] = useState(() => readCompletionIds('meals'));

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    getMealsByDate(selectedDate)
      .then((response) => { if (!cancelled) setMeals(extractMealsFromApi(response.data).map(normalizeMealFromApi)); })
      .catch((err) => { if (!cancelled) { setMeals([]); setError(err.response?.data?.message || 'Không tải được bữa ăn.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  const completedCount = meals.filter((meal) => completedIds.includes(getMealCompletionId(meal))).length;
  const progress = meals.length ? Math.round((completedCount / meals.length) * 100) : 0;
  const toggle = (meal) => setCompletedIds(toggleCompletionId('meals', getMealCompletionId(meal)));

  return <Card className="border-0 shadow-sm planner-side-card"><Card.Body>
    <div className="mb-3"><h2 className="h5 fw-bold mb-1">Bữa ăn ngày {selectedDate}</h2><p className="text-secondary mb-0">Dữ liệu được đồng bộ trực tiếp từ Nhật ký bữa ăn.</p></div>
    <ErrorModal error={error} onClose={() => setError('')} />
    {loading && <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>}
    {!loading && meals.length === 0 && <div className="text-secondary border rounded p-3">Ngày này chưa có bữa ăn nào trong Nhật ký.</div>}
    {!loading && meals.length > 0 && <section className="plan-checklist">
      <div className="plan-checklist-header"><div><h3 className="h5 fw-bold mb-1">Tiến độ bữa ăn</h3><div className="text-secondary small">Hoàn thành các bữa đã chọn</div></div><strong className="plan-progress-value">{completedCount}/{meals.length}</strong></div>
      <ProgressBar now={progress} variant="success" className="plan-progress" />
      <ListGroup variant="flush" className="plan-checklist-items">{meals.map((meal) => {
        const id = getMealCompletionId(meal); const completed = completedIds.includes(id); const totals = getMealTotals(meal);
        return <ListGroup.Item className={`plan-checklist-item ${completed ? 'is-completed' : ''}`} key={id}><div className="d-flex justify-content-between align-items-center gap-3"><div><div className="fw-semibold">{labels[meal.type] || meal.type}</div><div className="text-secondary">{meal.items.map((item) => item.name).join(', ') || 'Chưa có món'} · {Math.round(totals.calories)} kcal</div></div><Form.Check checked={completed} label="Hoàn thành" onChange={() => toggle(meal)} title="Đánh dấu bữa ăn đã hoàn thành" /></div></ListGroup.Item>;
      })}</ListGroup>
    </section>}
  </Card.Body></Card>;
}

export default MealPlanCard;
