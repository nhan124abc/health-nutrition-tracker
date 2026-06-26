import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getGuestGoalPlanSuggestions } from '../features/profile/profileService';
import { goalOptions } from '../features/profile/profileUtils';

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
const activityFactors = [
  { value: 'sedentary', factor: 1.2, labelKey: 'profile.sedentary' },
  { value: 'light', factor: 1.375, labelKey: 'profile.light' },
  { value: 'moderate', factor: 1.55, labelKey: 'profile.moderate' },
  { value: 'active', factor: 1.725, labelKey: 'profile.active' },
  { value: 'very_active', factor: 1.9, labelKey: 'profile.veryActive' },
];

function needsTargetChange(goal) {
  return goalsWithTargetChange.has(goal);
}

const genderToApi = {
  male: 'MALE',
  female: 'FEMALE',
};

const activityToApi = {
  sedentary: 'SEDENTARY',
  light: 'LIGHTLY_ACTIVE',
  moderate: 'MODERATELY_ACTIVE',
  active: 'VERY_ACTIVE',
  very_active: 'EXTRA_ACTIVE',
};

function extractGoalPlanFromApi(data) {
  return data?.data || data?.plan || data;
}

function GuestGoalPage() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [form, setForm] = useState({
    goal: 'LOSE_WEIGHT',
    gender: 'male',
    age: 30,
    currentWeightKg: 65,
    heightCm: 170,
    activityLevel: 'light',
    targetChangeKg: 5,
    targetWeeks: '',
  });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showTargetChange = needsTargetChange(form.goal);
  const numberFormatter = new Intl.NumberFormat(i18n.language);

  const loadSuggestions = async (event) => {
    event?.preventDefault();
    setError('');
    setPlan(null);
    setLoading(true);

    const currentWeight = Number(form.currentWeightKg);
    const heightCm = Number(form.heightCm);
    const age = Number(form.age);
    const targetChangeKg = Number(form.targetChangeKg);

    if (
      !currentWeight
      || currentWeight <= 0
      || !heightCm
      || heightCm <= 0
      || !age
      || age <= 0
      || (showTargetChange && (!targetChangeKg || targetChangeKg <= 0))
    ) {
      setError(t('goalPlannerPage.errors.calculate'));
      setLoading(false);
      return;
    }

    try {
      const payload = {
        goal: form.goal,
        gender: genderToApi[form.gender] || 'MALE',
        age,
        weightKg: currentWeight,
        heightCm,
        activityLevel: activityToApi[form.activityLevel] || 'SEDENTARY',
        targetChangeKg: showTargetChange ? targetChangeKg : 0.1,
        ...(form.targetWeeks ? { targetWeeks: Number(form.targetWeeks) } : {}),
      };
      const response = await getGuestGoalPlanSuggestions(payload);
      setPlan(extractGoalPlanFromApi(response.data));
    } catch (err) {
      setError(err.response?.data?.message || t('goalPlannerPage.errors.calculate'));
    } finally {
      setLoading(false);
    }
  };

  const choosePlan = (option) => {
    localStorage.setItem('guestGoalPlan', JSON.stringify({
      ...option,
      goal: form.goal,
      targetWeightKg: plan.targetWeightKg,
      targetChangeKg: showTargetChange ? Number(form.targetChangeKg) : 0.1,
      bmr: plan.bmr,
      tdee: plan.tdee,
      activityFactor: plan.activityFactor,
      createdAt: new Date().toISOString(),
    }));
    navigate('/login');
  };

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

  const ageLabel = i18n.language?.startsWith('vi') ? 'Tuổi' : 'Age';
  const heightLabel = i18n.language?.startsWith('vi') ? 'Chiều cao cm' : 'Height cm';
  const bmrLabel = i18n.language?.startsWith('vi') ? 'BMR ước tính' : 'Estimated BMR';
  const tdeeLabel = i18n.language?.startsWith('vi') ? 'TDEE dùng để gợi ý' : 'TDEE used for suggestions';

  return (
    <div className="guest-goal-page">
      <header className="home-header premium-home-header">
        <Container className="d-flex align-items-center justify-content-between gap-3">
          <Link to="/" className="home-brand premium-home-brand">
            <img src="/img/Logo.jpg" alt={t('app.name')} />
            <span>{t('app.name')}</span>
          </Link>
          <div className="d-flex align-items-center gap-2">
            <LanguageSwitcher />
            <Button as={Link} to="/login" variant="outline-success">
              {t('home.actions.login')}
            </Button>
          </div>
        </Container>
      </header>

      <main className="guest-goal-user-style">
        <Container>
          <Button as={Link} to="/" variant="link" className="guest-goal-back">
            <FaArrowLeft />
            {t('home.nav.flow')}
          </Button>

          <div className="page-heading">
            <div>
              <h1>{t('goalPlannerPage.title')}</h1>
              <p>{t('home.hero.description')}</p>
            </div>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-4">
            <Col lg={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <h2 className="h5 fw-bold mb-3">{t('goalPlannerPage.form.title')}</h2>
                  <div className="small text-secondary mb-3">
                    {t('goalPlannerPage.form.currentWeight')}: <strong>{form.currentWeightKg || '-'} {t('goalPlannerPage.units.kg')}</strong>
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
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>{t('profile.gender')}</Form.Label>
                          <Form.Select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                            <option value="male">{t('profile.male')}</option>
                            <option value="female">{t('profile.female')}</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>{ageLabel}</Form.Label>
                          <Form.Control type="number" min="1" max="120" step="1" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} required />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('goalPlannerPage.form.currentWeight')}</Form.Label>
                      <Form.Control type="number" min="1" step="0.1" value={form.currentWeightKg} onChange={(event) => setForm({ ...form, currentWeightKg: event.target.value })} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>{heightLabel}</Form.Label>
                      <Form.Control type="number" min="1" step="0.1" value={form.heightCm} onChange={(event) => setForm({ ...form, heightCm: event.target.value })} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('profile.activityLevel')}</Form.Label>
                      <Form.Select value={form.activityLevel} onChange={(event) => setForm({ ...form, activityLevel: event.target.value })}>
                        {activityFactors.map((activity) => (
                          <option value={activity.value} key={activity.value}>
                            {t(activity.labelKey)} ({activity.factor})
                          </option>
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
                </Card.Body>
              </Card>
            </Col>
            <Col lg={8}>
              {loading ? (
                <div className="py-5 text-center"><Spinner animation="border" variant="success" /></div>
              ) : !plan ? (
                <Alert variant="light" className="border">{t('goalPlannerPage.empty')}</Alert>
              ) : (
                <>
                  <div className="mb-3">
                    <strong>
                      {plan.currentWeightKg} {t('goalPlannerPage.units.kg')} → {plan.targetWeightKg} {t('goalPlannerPage.units.kg')}
                    </strong>
                    <div className="guest-goal-calculation mt-2">
                      <div>
                        <span>{bmrLabel}</span>
                        <strong>{numberFormatter.format(plan.bmr)} {t('goalPlannerPage.units.kcal')}</strong>
                      </div>
                      <div>
                        <span>{t('profile.activityLevel')}</span>
                        <strong>{plan.activityFactor}</strong>
                      </div>
                      <div>
                        <span>{tdeeLabel}</span>
                        <strong>{numberFormatter.format(plan.tdee)} {t('goalPlannerPage.units.kcal')}</strong>
                      </div>
                    </div>
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
                            <Button className="w-100" variant={option.safe ? 'success' : 'outline-danger'} disabled={!option.safe} onClick={() => choosePlan(option)}>
                              {t('goalPlannerPage.option.choose')}
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
        </Container>
      </main>
    </div>
  );
}

export default GuestGoalPage;
