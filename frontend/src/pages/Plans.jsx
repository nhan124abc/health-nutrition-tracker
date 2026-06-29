import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Nav, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { FaBullseye, FaCalendarAlt, FaDumbbell, FaFire, FaUtensils } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import WorkoutPlanCard from '../features/activities/components/WorkoutPlanCard';
import MealPlanCard from '../features/meals/components/MealPlanCard';
import { getProfile } from '../features/profile/profileService';
import { extractProfileFromApi, mapProfileFromApi } from '../features/profile/profileUtils';

const goalLabels = {
  lose_weight: 'profilePage.goals.lose_weight',
  maintain: 'profilePage.goals.maintain',
  gain_weight: 'profilePage.goals.gain_weight',
  gain_muscle: 'profilePage.goals.gain_muscle',
  cutting: 'profilePage.goals.cutting',
  body_recomposition: 'profilePage.goals.body_recomposition',
  improve_health: 'profilePage.goals.improve_health',
};

function readActiveGoal() {
  try { return JSON.parse(localStorage.getItem('activeGoalPlan')) || null; } catch { return null; }
}

function Plans() {
  const { i18n, t } = useTranslation();
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

  const goalKey = goalLabels[activeGoal?.goal || profile?.healthGoal];
  const goalName = goalKey ? t(goalKey) : '';
  const durationWeeks = Number(activeGoal?.weeks || profile?.planDurationWeeks) || 0;
  const startDate = profile?.planStartDate;
  const elapsedDays = startDate ? Math.max(0, Math.floor((Date.now() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000)) : 0;
  const durationDays = durationWeeks * 7;
  const timeProgress = durationDays ? Math.min(100, Math.round((elapsedDays / durationDays) * 100)) : 0;
  const hasGoal = Boolean(goalName || profile?.targetWeight || activeGoal);

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>{t('plansPage.title')}</h1>
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-4 goal-journey-card">
        <Card.Body className="p-4">
          {loadingGoal ? (
            <div className="text-center py-4"><Spinner animation="border" variant="success" /></div>
          ) : !hasGoal ? (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <h2 className="h5 fw-bold mb-1">{t('plansPage.empty.title')}</h2>
                <p className="text-secondary mb-0">{t('plansPage.empty.description')}</p>
              </div>
              <Button variant="success" onClick={() => navigate('/goals')} title={t('plansPage.empty.actionTitle')}>
                {t('plansPage.empty.action')}
              </Button>
            </div>
          ) : (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                <div>
                  <div className="text-success fw-semibold small mb-1">
                    <FaBullseye className="me-2" />
                    {t('plansPage.trackingEyebrow')}
                  </div>
                </div>
                <Button variant="outline-success" onClick={() => navigate('/goals')} title={t('plansPage.adjustGoal')}>
                  {t('plansPage.adjustGoal')}
                </Button>
              </div>

              <Row className="g-3 mb-4">
                <Col sm={6} xl={3}>
                  <div className="goal-journey-stat">
                    <span>{t('common.weight')}</span>
                    <strong>{profile?.weight || '-'} → {activeGoal?.targetWeightKg || profile?.targetWeight || '-'} {t('goalPlannerPage.units.kg')}</strong>
                  </div>
                </Col>
                <Col sm={6} xl={3}>
                  <div className="goal-journey-stat">
                    <span><FaFire className="me-1" />{t('plansPage.stats.dailyCalories')}</span>
                    <strong>{Math.round(Number(activeGoal?.dailyCalorieGoal || profile?.dailyCalorieGoal) || 0).toLocaleString(i18n.language)} {t('goalPlannerPage.units.kcal')}</strong>
                  </div>
                </Col>
                <Col sm={6} xl={3}>
                  <div className="goal-journey-stat">
                    <span><FaDumbbell className="me-1" />{t('plansPage.stats.dailyActivity')}</span>
                    <strong>{Math.round(Number(activeGoal?.dailyActivityGoalKcal || profile?.dailyActivityGoalKcal) || 0).toLocaleString(i18n.language)} {t('goalPlannerPage.units.kcal')}</strong>
                  </div>
                </Col>
                <Col sm={6} xl={3}>
                  <div className="goal-journey-stat">
                    <span><FaCalendarAlt className="me-1" />{t('plansPage.stats.duration')}</span>
                    <strong>{durationWeeks ? t('plansPage.weeks', { count: durationWeeks }) : '-'}</strong>
                  </div>
                </Col>
              </Row>

              {durationDays > 0 && (
                <div>
                  <div className="d-flex justify-content-between small mb-2">
                    <span>{t('plansPage.timeProgress')}</span>
                    <strong>{timeProgress}%</strong>
                  </div>
                  <ProgressBar now={timeProgress} variant="success" className="goal-journey-progress" />
                  <div className="text-secondary small mt-2">
                    {t('plansPage.progressDetail', {
                      startDate: startDate || t('plansPage.unknown'),
                      elapsedDays,
                      durationDays,
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <Nav variant="tabs" activeKey={activeTab} onSelect={(key) => setActiveTab(key || 'meals')}>
          <Nav.Item>
            <Nav.Link eventKey="meals" title={t('plansPage.tabs.mealsTitle')}>
              <FaUtensils className="me-2" />
              {t('plansPage.tabs.meals')}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="activities" title={t('plansPage.tabs.activitiesTitle')}>
              <FaDumbbell className="me-2" />
              {t('plansPage.tabs.activities')}
            </Nav.Link>
          </Nav.Item>
        </Nav>
        <div>
          <label className="form-label small fw-semibold mb-1" htmlFor="plan-date">{t('plansPage.planDate')}</label>
          <input id="plan-date" className="form-control" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
      </div>

      {activeTab === 'meals' ? <MealPlanCard selectedDate={selectedDate} /> : <WorkoutPlanCard selectedDate={selectedDate} />}
    </div>
  );
}

export default Plans;
