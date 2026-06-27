import { useEffect, useState } from 'react';
import { Card, Form, ListGroup, ProgressBar, Spinner } from 'react-bootstrap';
import { getActivitiesByDate } from '../activityService';
import { extractActivitiesFromApi, normalizeActivityFromApi } from '../activityUtils';
import { getActivityCompletionId, readCompletionIds, toggleCompletionId } from '../../../utils/completionStorage';

function WorkoutPlanCard({ selectedDate }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedIds, setCompletedIds] = useState(() => readCompletionIds('activities'));

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    getActivitiesByDate(selectedDate)
      .then((response) => { if (!cancelled) setActivities(extractActivitiesFromApi(response.data).map(normalizeActivityFromApi)); })
      .catch((err) => { if (!cancelled) { setActivities([]); setError(err.response?.data?.message || 'Không tải được hoạt động.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  const completedCount = activities.filter((item) => completedIds.includes(getActivityCompletionId(item))).length;
  const progress = activities.length ? Math.round((completedCount / activities.length) * 100) : 0;
  const toggle = (activity) => setCompletedIds(toggleCompletionId('activities', getActivityCompletionId(activity)));

  return <Card className="border-0 shadow-sm planner-side-card"><Card.Body>
    <div className="mb-3"><h2 className="h5 fw-bold mb-1">Vận động ngày {selectedDate}</h2><p className="text-secondary mb-0">Dữ liệu được đồng bộ trực tiếp từ Nhật ký vận động.</p></div>
    {error && <div className="alert alert-danger py-2 small">{error}</div>}
    {loading && <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>}
    {!loading && activities.length === 0 && <div className="text-secondary border rounded p-3">Ngày này chưa có hoạt động nào trong Nhật ký.</div>}
    {!loading && activities.length > 0 && <section className="plan-checklist">
      <div className="plan-checklist-header"><div><h3 className="h5 fw-bold mb-1">Tiến độ vận động</h3><div className="text-secondary small">Hoàn thành các hoạt động đã chọn</div></div><strong className="plan-progress-value">{completedCount}/{activities.length}</strong></div>
      <ProgressBar now={progress} className="plan-progress" />
      <ListGroup variant="flush" className="plan-checklist-items">{activities.map((activity) => {
        const id = getActivityCompletionId(activity); const completed = completedIds.includes(id);
        return <ListGroup.Item className={`plan-checklist-item ${completed ? 'is-completed' : ''}`} key={id}><div className="d-flex justify-content-between align-items-center gap-3"><div><div className="fw-semibold">{activity.customName}</div><div className="text-secondary">{activity.duration || 0} phút · {Math.round(activity.calories || 0)} kcal</div></div><Form.Check checked={completed} label="Hoàn thành" onChange={() => toggle(activity)} title="Đánh dấu hoạt động đã hoàn thành" /></div></ListGroup.Item>;
      })}</ListGroup>
    </section>}
  </Card.Body></Card>;
}

export default WorkoutPlanCard;
