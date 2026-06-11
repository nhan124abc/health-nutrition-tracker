import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { applyGoalPlan, getGoalPlanSuggestions, getProfile } from './profileService';
import { extractProfileFromApi, mapProfileFromApi } from './profileUtils';

function GoalPlanner() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ goal: 'LOSE_WEIGHT', targetChangeKg: 5, targetWeeks: '' });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getProfile().then((response) => {
      setProfile(mapProfileFromApi(extractProfileFromApi(response.data)));
    }).catch((err) => setError(err.response?.data?.message || 'Không thể tải hồ sơ.'))
      .finally(() => setLoading(false));
  }, []);

  const loadSuggestions = async (event) => {
    event?.preventDefault();
    setError('');
    setPlan(null);
    setLoading(true);
    try {
      const payload = {
        goal: form.goal,
        targetChangeKg: form.goal === 'MAINTAIN_WEIGHT' ? 0.1 : Number(form.targetChangeKg),
        ...(form.targetWeeks ? { targetWeeks: Number(form.targetWeeks) } : {}),
      };
      const response = await getGoalPlanSuggestions(payload);
      setPlan(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tính kế hoạch. Hãy hoàn thiện hồ sơ trước.');
    } finally {
      setLoading(false);
    }
  };

  const choosePlan = async (option) => {
    setError('');
    setApplying(true);
    try {
      await applyGoalPlan({
        goal: form.goal,
        targetChangeKg: form.goal === 'MAINTAIN_WEIGHT' ? 0.1 : Number(form.targetChangeKg),
        targetWeeks: option.weeks,
      });
      localStorage.setItem('activeGoalPlan', JSON.stringify({ ...option, goal: form.goal, targetWeightKg: plan.targetWeightKg }));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể áp dụng kế hoạch.');
    } finally {
      setApplying(false);
    }
  };

  if (loading && !profile && !plan) {
    return <div className="py-5 text-center"><Spinner animation="border" variant="success" /></div>;
  }

  return (
    <>
      <div className="page-heading">
        <div><Badge bg="success" className="mb-2">Kế hoạch tự động</Badge><h1>Thiết lập mục tiêu cân nặng</h1><p>Chọn mục tiêu, hệ thống sẽ tính mức calo và vận động phù hợp.</p></div>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Row className="g-4">
        <Col lg={4}>
          <Card className="border-0 shadow-sm"><Card.Body>
            <h2 className="h5 fw-bold mb-3">Thông tin mục tiêu</h2>
            <div className="small text-secondary mb-3">Hiện tại: <strong>{profile?.weight || '-'} kg</strong> · TDEE: <strong>{profile?.tdee || '-'} kcal</strong></div>
            <Form onSubmit={loadSuggestions}>
              <Form.Group className="mb-3"><Form.Label>Mục tiêu</Form.Label><Form.Select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}><option value="LOSE_WEIGHT">Giảm cân</option><option value="GAIN_WEIGHT">Tăng cân</option><option value="MAINTAIN_WEIGHT">Duy trì cân nặng</option></Form.Select></Form.Group>
              {form.goal !== 'MAINTAIN_WEIGHT' && <Form.Group className="mb-3"><Form.Label>Số kg muốn thay đổi</Form.Label><Form.Control type="number" min="0.1" step="0.1" value={form.targetChangeKg} onChange={(e) => setForm({ ...form, targetChangeKg: e.target.value })} required /></Form.Group>}
              <Form.Group className="mb-3"><Form.Label>Thời gian mong muốn (tuần, không bắt buộc)</Form.Label><Form.Control type="number" min="1" max="104" value={form.targetWeeks} onChange={(e) => setForm({ ...form, targetWeeks: e.target.value })} /></Form.Group>
              <Button type="submit" variant="success" className="w-100" disabled={loading}>{loading ? 'Đang tính...' : 'Tạo các phương án'}</Button>
            </Form>
          </Card.Body></Card>
        </Col>
        <Col lg={8}>
          {!plan ? <Alert variant="light" className="border">Nhập mục tiêu để nhận các mốc thời gian phù hợp.</Alert> : <>
            <div className="mb-3"><strong>{plan.currentWeightKg} kg → {plan.targetWeightKg} kg</strong><div className="text-secondary small">Tổng năng lượng cần thay đổi: {Number(plan.totalEnergyChangeKcal).toLocaleString()} kcal · Thời gian an toàn tối thiểu: {plan.safeMinimumWeeks} tuần</div></div>
            <Row className="g-3">{plan.options.map((option) => <Col md={6} key={`${option.type}-${option.weeks}`}><Card className={`h-100 goal-option ${option.safe ? '' : 'border-danger'}`}><Card.Body>
              <div className="d-flex justify-content-between"><h3 className="h6 fw-bold">{option.weeks} tuần</h3><Badge bg={option.safe ? 'success' : 'danger'}>{option.safe ? 'Phù hợp' : 'Không an toàn'}</Badge></div>
              <div className="display-6 fw-bold my-2">{option.dailyCalorieGoal}<small className="fs-6 fw-normal"> kcal/ngày</small></div>
              <p className="mb-2">Vận động: <strong>{option.dailyActivityGoalKcal} kcal/ngày</strong></p>
              <p className="small text-secondary">Thay đổi {option.weeklyWeightChangeKg} kg/tuần · {option.dailyEnergyChangeKcal} kcal/ngày</p>
              <ProgressBar now={Math.min(100, (plan.safeMinimumWeeks / option.weeks) * 100)} variant={option.safe ? 'success' : 'danger'} className="mb-3" />
              <Button className="w-100" variant={option.safe ? 'success' : 'outline-danger'} disabled={!option.safe || applying} onClick={() => choosePlan(option)}>Chọn phương án này</Button>
            </Card.Body></Card></Col>)}</Row>
          </>}
        </Col>
      </Row>
    </>
  );
}

export default GoalPlanner;
