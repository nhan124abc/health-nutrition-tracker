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
import { Badge, Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const macroOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 18,
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => `${context.label}: ${context.raw}%`,
      },
    },
  },
};

const calorieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => `${value} kcal`,
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 18,
      },
    },
  },
};

function Dashboard() {
  const { t } = useTranslation();

  const healthStats = [
    {
      title: t('health.bmi'),
      value: '22.4',
      helper: t('health.normalBody'),
      tone: 'success',
    },
    {
      title: t('health.tdee'),
      value: '2,180 kcal',
      helper: t('health.dailyEnergyBurn'),
      tone: 'primary',
    },
    {
      title: t('health.dailyCalorieGoal'),
      value: '1,900 kcal',
      helper: t('health.calorieDeficitHint'),
      tone: 'warning',
    },
  ];

  const macroData = {
    labels: [t('health.protein'), t('health.carbs'), t('health.fat')],
    datasets: [
      {
        data: [30, 45, 25],
        backgroundColor: ['#198754', '#0d6efd', '#ffc107'],
        borderColor: '#ffffff',
        borderWidth: 4,
        hoverOffset: 8,
      },
    ],
  };

  const calorieData = {
    labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    datasets: [
      {
        label: t('health.caloriesIn'),
        data: [1850, 1980, 1750, 2100, 1920, 2300, 2050],
        backgroundColor: '#198754',
        borderRadius: 6,
      },
      {
        label: t('health.caloriesOut'),
        data: [2150, 2250, 2050, 2350, 2200, 2500, 2180],
        backgroundColor: '#0d6efd',
        borderRadius: 6,
      },
    ],
  };

  return (
    <>
      <div className="dashboard-heading mb-4">
        <Badge bg="success" className="mb-2">
          {t('nav.dashboard')}
        </Badge>
        <h1 className="h2 fw-bold mb-1">{t('dashboard.title')}</h1>
        <p className="text-secondary mb-0">{t('dashboard.subtitle')}</p>
      </div>

      <Row className="g-3 g-lg-4 mb-4">
        {healthStats.map((stat) => (
          <Col xs={12} md={4} key={stat.title}>
            <Card className="dashboard-stat-card h-100 border-0 shadow-sm">
              <Card.Body>
                <div className={`small fw-semibold text-${stat.tone} mb-2`}>{stat.title}</div>
                <div className="display-6 fw-bold mb-2">{stat.value}</div>
                <p className="text-secondary mb-0">{stat.helper}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col xs={12} lg={5}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <Card.Title className="fw-bold mb-1">{t('health.macroRatio')}</Card.Title>
                  <Card.Text className="text-secondary small mb-0">{t('health.macroDescription')}</Card.Text>
                </div>
                <Badge bg="light" text="dark">
                  %
                </Badge>
              </div>

              <div className="dashboard-chart dashboard-chart-doughnut">
                <Doughnut data={macroData} options={macroOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={7}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mb-3">
                <div>
                  <Card.Title className="fw-bold mb-1">{t('health.weeklyCalories')}</Card.Title>
                  <Card.Text className="text-secondary small mb-0">
                    {t('health.weeklyCaloriesDescription')}
                  </Card.Text>
                </div>
                <Badge bg="success" className="align-self-start">
                  {t('health.sevenDays')}
                </Badge>
              </div>

              <div className="dashboard-chart dashboard-chart-bar">
                <Bar data={calorieData} options={calorieOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Dashboard;
