import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Nav, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { FaBullseye, FaCalendarAlt, FaDumbbell, FaFire, FaUtensils } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import WorkoutPlanCard from '../features/activities/components/WorkoutPlanCard';
import MealPlanCard from '../features/meals/components/MealPlanCard';
import { getProfile } from '../features/profile/profileService';
import { extractProfileFromApi, mapProfileFromApi } from '../features/profile/profileUtils';

const goalLabels = {
  lose_weight: 'Giảm cân', maintain: 'Duy trì cân nặng', gain_weight: 'Tăng cân',
  gain_muscle: 'Tăng cơ', cutting: 'Giảm mỡ', body_recomposition: 'Giảm mỡ, tăng cơ',
  improve_health: 'Cải thiện thể chất',
};

function readActiveGoal() {
  try { return JSON.parse(localStorage.getItem('activeGoalPlan')) || null; } catch { return null; }
}

function Plans() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('meals');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [profile, setProfile] = useState(null);
  const [loadingGoal, setLoadingGoal] = useState(true);
  const activeGoal = useMemo(readActiveGoal, []);

  useEffect(() => {
    getProfile()
      .then((response) => setProfile(mapProfileFromApi(extractProfileFromApi(response.data))))
      .catch(() => setProfile(null))
      .finally(() => setLoadingGoal(false));
  }, []);

  const goalName = goalLabels[activeGoal?.goal || profile?.healthGoal];
  const durationWeeks = Number(activeGoal?.weeks || profile?.planDurationWeeks) || 0;
  const startDate = profile?.planStartDate;
  const elapsedDays = startDate ? Math.max(0, Math.floor((Date.now() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000)) : 0;
  const durationDays = durationWeeks * 7;
  const timeProgress = durationDays ? Math.min(100, Math.round((elapsedDays / durationDays) * 100)) : 0;
  const hasGoal = Boolean(goalName || profile?.targetWeight || activeGoal);

  return (
    <div>
      <div className="page-heading"><div><h1>Kế hoạch của tôi</h1><p className="text-secondary mb-0">Theo dõi mục tiêu và những việc cần hoàn thành.</p></div></div>

      <Card className="border-0 shadow-sm mb-4 goal-journey-card"><Card.Body className="p-4">
        {loadingGoal ? <div className="text-center py-4"><Spinner animation="border" variant="success" /></div> : !hasGoal ? (
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div><h2 className="h5 fw-bold mb-1">Bạn chưa thiết lập mục tiêu</h2><p className="text-secondary mb-0">Hãy đặt mục tiêu trước khi theo dõi kế hoạch.</p></div>
            <Button variant="success" onClick={() => navigate('/goals')} title="Thiết lập mục tiêu sức khỏe">Thiết lập mục tiêu</Button>
          </div>
        ) : <>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
            <div><div className="text-success fw-semibold small mb-1"><FaBullseye className="me-2" />MỤC TIÊU ĐANG THEO DÕI</div><h2 className="h4 fw-bold mb-1">{goalName || 'Mục tiêu sức khỏe'}</h2><p className="text-secondary mb-0">Từ chỉ tiêu đã đặt đến kế hoạch thực hiện hằng ngày.</p></div>
            <Button variant="outline-success" onClick={() => navigate('/goals')} title="Điều chỉnh mục tiêu">Điều chỉnh mục tiêu</Button>
          </div>
          <Row className="g-3 mb-4">
            <Col sm={6} xl={3}><div className="goal-journey-stat"><span>Cân nặng</span><strong>{profile?.weight || '-'} → {activeGoal?.targetWeightKg || profile?.targetWeight || '-'} kg</strong></div></Col>
            <Col sm={6} xl={3}><div className="goal-journey-stat"><span><FaFire className="me-1" />Calo mỗi ngày</span><strong>{Math.round(Number(activeGoal?.dailyCalorieGoal || profile?.dailyCalorieGoal) || 0).toLocaleString('vi-VN')} kcal</strong></div></Col>
            <Col sm={6} xl={3}><div className="goal-journey-stat"><span><FaDumbbell className="me-1" />Vận động mỗi ngày</span><strong>{Math.round(Number(activeGoal?.dailyActivityGoalKcal || profile?.dailyActivityGoalKcal) || 0)} kcal</strong></div></Col>
            <Col sm={6} xl={3}><div className="goal-journey-stat"><span><FaCalendarAlt className="me-1" />Thời gian</span><strong>{durationWeeks || '-'} tuần</strong></div></Col>
          </Row>
          {durationDays > 0 && <div><div className="d-flex justify-content-between small mb-2"><span>Tiến độ thời gian</span><strong>{timeProgress}%</strong></div><ProgressBar now={timeProgress} variant="success" className="goal-journey-progress" /><div className="text-secondary small mt-2">Bắt đầu: {startDate || 'Chưa xác định'} · Đã qua {elapsedDays}/{durationDays} ngày</div></div>}
        </>}
      </Card.Body></Card>

      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3"><Nav variant="tabs" activeKey={activeTab} onSelect={(key) => setActiveTab(key || 'meals')}>
        <Nav.Item><Nav.Link eventKey="meals" title="Xem kế hoạch ăn uống"><FaUtensils className="me-2" />Kế hoạch ăn uống</Nav.Link></Nav.Item>
        <Nav.Item><Nav.Link eventKey="activities" title="Xem kế hoạch tập luyện"><FaDumbbell className="me-2" />Kế hoạch tập luyện</Nav.Link></Nav.Item>
      </Nav><div><label className="form-label small fw-semibold mb-1" htmlFor="plan-date">Ngày theo dõi</label><input id="plan-date" className="form-control" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></div></div>
      {activeTab === 'meals' ? <MealPlanCard selectedDate={selectedDate} /> : <WorkoutPlanCard selectedDate={selectedDate} />}
    </div>
  );
}

export default Plans;
