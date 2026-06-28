import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ErrorModal from '../../components/ErrorModal';
import { useNavigate } from 'react-router-dom';
import { applyGoalPlan, getGoalPlanSuggestions, getProfile } from './profileService';
import { extractProfileFromApi, goalOptions, mapProfileFromApi } from './profileUtils';

const goalValueToApi = {
  lose_weight: 'LOSE_WEIGHT',
  maintain: 'MAINTAIN_WEIGHT',
  gain_weight: 'GAIN_WEIGHT',
  gain_muscle: 'GAIN_MUSCLE',
  cutting: 'CUTTING',
  body_recomposition: 'BODY_RECOMPOSITION',
  improve_health: 'IMPROVE_FITNESS',
};

const goalsWithTargetChange = new Set(['LOSE_WEIGHT', 'GAIN_WEIGHT', 'GAIN_MUSCLE', 'CUTTING']);

function needsTargetChange(goal) {
  return goalsWithTargetChange.has(goal);
}

function GoalPlanner() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ goal: 'LOSE_WEIGHT', targetChangeKg: 5, targetWeeks: '' });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const showTargetChange = needsTargetChange(form.goal);

  useEffect(() => {
    getProfile().then((response) => {
      setProfile(mapProfileFromApi(extractProfileFromApi(response.data)));
    }).catch((err) => setError(err.response?.data?.message || t('goalPlannerPage.errors.loadProfile')))
      .finally(() => setLoading(false));
  }, [t]);

  const loadSuggestions = async (event) => {
    event?.preventDefault();
    setError('');
    setPlan(null);
    setLoading(true);
    try {
      const payload = {
        goal: form.goal,
        targetChangeKg: showTargetChange ? Number(form.targetChangeKg) : 0.1,
        ...(form.targetWeeks ? { targetWeeks: Number(form.targetWeeks) } : {}),
      };
      const response = await getGoalPlanSuggestions(payload);
      setPlan(response.data);
    } catch (err) {
      setError(err.response?.data?.message || t('goalPlannerPage.errors.calculate'));
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
        targetChangeKg: showTargetChange ? Number(form.targetChangeKg) : 0.1,
        targetWeeks: option.weeks,
      });
      localStorage.setItem('activeGoalPlan', JSON.stringify({ ...option, goal: form.goal, targetWeightKg: plan.targetWeightKg }));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || t('goalPlannerPage.errors.apply'));
    } finally {
      setApplying(false);
    }
  };

  if (loading && !profile && !plan) {
    return <div className="py-5 text-center"><Spinner animation="border" variant="success" /></div>;
  }

  const numberFormatter = new Intl.NumberFormat(i18n.language);
  const getOptionChangeText = (option) => {
    const weeklyWeightChange = Number(option.weeklyWeightChangeKg) || 0;
    const dailyEnergyChange = Number(option.dailyEnergyChangeKcal) || 0;

    if (weeklyWeightChange === 0 && dailyEnergyChange === 0) {
      return t('goalPlannerPage.option.stableActivity');
    }

    return t('goalPlannerPage.option.change', {
      weight: option.weeklyWeightChangeKg,
      energy: numberFormatter.format(option.dailyEnergyChangeKcal),
    });
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('goalPlannerPage.title')}</h1>
        </div>
      </div>
      <ErrorModal error={error} onClose={() => setError('')} />
      <Row className="g-4">
        <Col lg={4}>
          <Card className="border-0 shadow-sm"><Card.Body>
            <h2 className="h5 fw-bold mb-3">{t('goalPlannerPage.form.title')}</h2>
            <div className="small text-secondary mb-3">
              {t('goalPlannerPage.form.currentWeight')}: <strong>{profile?.weight || '-'} {t('goalPlannerPage.units.kg')}</strong>
              {' · '}TDEE: <strong>{profile?.tdee || '-'} {t('goalPlannerPage.units.kcal')}</strong>
            </div>
            <Form onSubmit={loadSuggestions}>
              <Form.Group className="mb-3">
                <Form.Label>{t('goalPlannerPage.form.goal')}</Form.Label>
                <Form.Select value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })}>
                  {goalOptions.map((goal) => (
                    <option value={goalValueToApi[goal.value]} key={goal.value}>{t(goal.labelKey)}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              {showTargetChange && (
                <Form.Group className="mb-3">
                  <Form.Label>
                    {t('goalPlannerPage.form.targetChange')}
                    <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Control type="number" min="0.1" step="0.1" value={form.targetChangeKg} onChange={(event) => setForm({ ...form, targetChangeKg: event.target.value })} required />
                </Form.Group>
              )}
              <Form.Group className="mb-3">
                <Form.Label>{t('goalPlannerPage.form.targetWeeks')}</Form.Label>
                <Form.Control type="number" min="1" max="104" value={form.targetWeeks} onChange={(event) => setForm({ ...form, targetWeeks: event.target.value })} />
              </Form.Group>
              <Button type="submit" variant="success" className="w-100" disabled={loading}>
                {loading ? t('goalPlannerPage.form.calculating') : t('goalPlannerPage.form.createOptions')}
              </Button>
            </Form>
          </Card.Body></Card>
        </Col>
        <Col lg={8}>
          {!plan ? (
            <Alert variant="light" className="border">{t('goalPlannerPage.empty')}</Alert>
          ) : (
            <>
              <div className="mb-3">
                <strong>
                  {plan.currentWeightKg} {t('goalPlannerPage.units.kg')} → {plan.targetWeightKg} {t('goalPlannerPage.units.kg')}
                </strong>
                <div className="text-secondary small">
                  {t('goalPlannerPage.summary', {
                    energy: numberFormatter.format(Number(plan.totalEnergyChangeKcal) || 0),
                    weeks: plan.safeMinimumWeeks,
                  })}
                </div>
              </div>
              <Row className="g-3">
                {plan.options.map((option) => (
                  <Col md={6} key={`${option.type}-${option.weeks}`}>
                    <Card className={`h-100 goal-option ${option.safe ? '' : 'border-danger'}`}>
                      <Card.Body>
                        <div className="d-flex justify-content-between">
                          <h3 className="h6 fw-bold">{t('goalPlannerPage.option.weeks', { count: option.weeks })}</h3>
                          <span className={`small fw-semibold text-${option.safe ? 'success' : 'danger'}`}>
                            {t(option.safe ? 'goalPlannerPage.option.safe' : 'goalPlannerPage.option.unsafe')}
                          </span>
                        </div>
                        <div className="display-6 fw-bold my-2">
                          {numberFormatter.format(option.dailyCalorieGoal)}
                          <small className="fs-6 fw-normal"> {t('goalPlannerPage.units.kcalPerDay')}</small>
                        </div>
                        <p className="mb-2">
                          {t('goalPlannerPage.option.activity')}: <strong>{numberFormatter.format(option.dailyActivityGoalKcal)} {t('goalPlannerPage.units.kcalPerDay')}</strong>
                        </p>
                        <p className="small text-secondary">{getOptionChangeText(option)}</p>
                        <ProgressBar now={Math.min(100, (plan.safeMinimumWeeks / option.weeks) * 100)} variant={option.safe ? 'success' : 'danger'} className="mb-3" />
                        <Button className="w-100" variant={option.safe ? 'success' : 'outline-danger'} disabled={!option.safe || applying} onClick={() => choosePlan(option)}>
                          {applying ? t('goalPlannerPage.option.applying') : t('goalPlannerPage.option.choose')}
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Col>
      </Row>
    </>
  );
}

export default GoalPlanner;
