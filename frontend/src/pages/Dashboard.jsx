import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Col, ProgressBar, Row } from 'react-bootstrap';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const dailySummary = {
  caloriesConsumed: 1680,
  caloriesBurned: 430,
  calorieGoal: 2000,
  protein: 112,
  carbs: 188,
  fat: 54,
  fiber: 24,
  sodium: 1780,
  mealCount: 4,
  activityCount: 2,
  activeMinutes: 65,
  waterIntake: 1750,
  weight: 67.4,
  streak: 8,
};

function Dashboard() {
  const { t } = useTranslation();
  const netCalories = dailySummary.caloriesConsumed - dailySummary.caloriesBurned;
  const goalPercent = Math.round((dailySummary.caloriesConsumed / dailySummary.calorieGoal) * 100);

  const macroData = {
    labels: [t('common.protein'), t('common.carbs'), t('common.fat')],
    datasets: [
      {
        data: [dailySummary.protein * 4, dailySummary.carbs * 4, dailySummary.fat * 9],
        backgroundColor: ['#2f8f6b', '#4f7cac', '#e0a458'],
        borderColor: '#ffffff',
        borderWidth: 4,
      },
    ],
  };

  const weeklyData = {
    labels: t('common.weekdayShort', { returnObjects: true }),
    datasets: [
      {
        label: t('common.caloriesIn'),
        data: [1820, 1960, 1740, 1680, 1900, 2100, 1650],
        backgroundColor: '#2f8f6b',
        borderRadius: 6,
      },
      {
        label: t('common.caloriesOut'),
        data: [380, 520, 300, 430, 460, 650, 280],
        backgroundColor: '#4f7cac',
        borderRadius: 6,
      },
    ],
  };

  const statCards = [
    [t('dashboardPage.stats.consumed'), `${dailySummary.caloriesConsumed} kcal`, t('dashboardPage.stats.goalPercent', { percent: goalPercent }), 'success'],
    [t('dashboardPage.stats.burned'), `${dailySummary.caloriesBurned} kcal`, t('dashboardPage.stats.activityCount', { count: dailySummary.activityCount }), 'primary'],
    [t('dashboardPage.stats.net'), `${netCalories} kcal`, t('dashboardPage.stats.netHelper'), 'warning'],
    [t('dashboardPage.stats.streak'), `${dailySummary.streak} ${t('common.days')}`, t('dashboardPage.stats.streakHelper'), 'danger'],
  ];

  const goals = [
    [t('dashboardPage.goals.calorie'), dailySummary.caloriesConsumed, dailySummary.calorieGoal, 'kcal'],
    [t('dashboardPage.goals.water'), dailySummary.waterIntake, 2500, 'ml'],
    [t('common.activeMinutes'), dailySummary.activeMinutes, 60, t('common.minutes')],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('dashboardPage.badge')}</Badge>
          <h1>{t('dashboardPage.title')}</h1>
          <p>{t('dashboardPage.description')}</p>
        </div>
        <input className="form-control page-date-input" type="date" defaultValue="2026-05-21" />
      </div>

      <Row className="g-3 mb-4">
        {statCards.map(([title, value, helper, variant]) => (
          <Col xs={12} md={6} xl={3} key={title}>
            <Card className="metric-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className={`small fw-semibold text-${variant} mb-2`}>{title}</div>
                <div className="metric-value">{value}</div>
                <div className="text-secondary small">{helper}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between gap-3 mb-3">
                <div>
                  <Card.Title className="fw-bold mb-1">{t('dashboardPage.weeklyTitle')}</Card.Title>
                  <Card.Text className="text-secondary small mb-0">{t('dashboardPage.weeklyDescription')}</Card.Text>
                </div>
                <Badge bg="light" text="dark">{t('common.weekly')}</Badge>
              </div>
              <div className="dashboard-chart dashboard-chart-bar">
                <Bar data={weeklyData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fw-bold mb-1">{t('dashboardPage.macroTitle')}</Card.Title>
              <Card.Text className="text-secondary small">{t('dashboardPage.macroDescription')}</Card.Text>
              <div className="dashboard-chart dashboard-chart-doughnut">
                <Doughnut data={macroData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('dashboardPage.goals.title')}</Card.Title>
              {goals.map(([label, value, goal, unit]) => (
                <div className="goal-row" key={label}>
                  <div className="d-flex justify-content-between">
                    <span>{label}</span>
                    <strong>{value} / {goal} {unit}</strong>
                  </div>
                  <ProgressBar now={Math.min((value / goal) * 100, 100)} />
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('dashboardPage.quickTitle')}</Card.Title>
              <div className="quick-grid">
                <span>{t('common.meals')}<strong>{dailySummary.mealCount}</strong></span>
                <span>{t('common.protein')}<strong>{dailySummary.protein}g</strong></span>
                <span>{t('common.fiber')}<strong>{dailySummary.fiber}g</strong></span>
                <span>{t('common.sodium')}<strong>{dailySummary.sodium}mg</strong></span>
                <span>{t('common.weight')}<strong>{dailySummary.weight}kg</strong></span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Dashboard;
