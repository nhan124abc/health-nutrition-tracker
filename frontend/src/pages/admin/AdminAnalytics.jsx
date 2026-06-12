import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { Badge, Card, Col, ProgressBar, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChartLine, FaDatabase, FaUserCheck, FaUsers } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const analyticsStats = [
  { labelKey: 'admin.analytics.stats.totalUsers', value: '12,480', helper: '+8.2%', icon: FaUsers },
  { labelKey: 'admin.analytics.stats.activeUsers', value: '9,214', helper: '73.8%', icon: FaUserCheck },
  { labelKey: 'admin.analytics.stats.dailyLogs', value: '9,820', helper: '+14.5%', icon: FaChartLine },
  { labelKey: 'admin.analytics.stats.catalogItems', value: '3,434', helper: '+136', icon: FaDatabase },
];

const featureUsage = [
  ['admin.analytics.features.meals', 86, 'success'],
  ['admin.analytics.features.water', 72, 'info'],
  ['admin.analytics.features.activity', 64, 'warning'],
  ['admin.analytics.features.bodyMetrics', 48, 'secondary'],
];

function AdminAnalytics() {
  const { t } = useTranslation();

  const growthData = {
    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    datasets: [{
      label: t('admin.analytics.userGrowth'),
      data: [7280, 7960, 8540, 9680, 10840, 12480],
      borderColor: '#2f8f6b',
      backgroundColor: 'rgba(47, 143, 107, 0.14)',
      tension: 0.35,
    }],
  };

  const systemData = {
    labels: [
      t('admin.analytics.features.meals'),
      t('admin.analytics.features.water'),
      t('admin.analytics.features.activity'),
      t('admin.analytics.features.bodyMetrics'),
    ],
    datasets: [{
      label: t('admin.analytics.logs'),
      data: [48200, 35100, 26800, 15400],
      backgroundColor: ['#2f8f6b', '#3b9fbd', '#e0a458', '#7d8ca3'],
      borderRadius: 8,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('admin.analytics.badge')}</Badge>
          <h2>{t('admin.analytics.title')}</h2>
          <p>{t('admin.analytics.description')}</p>
        </div>
      </div>

      <Row className="g-4 mb-4">
        {analyticsStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Col md={6} xl={3} key={stat.labelKey}>
              <Card className="admin-stat-card border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="admin-stat-icon"><Icon /></div>
                  <span className="text-secondary">{t(stat.labelKey)}</span>
                  <div className="admin-stat-value">{stat.value}</div>
                  <Badge bg="light" text="success">{stat.helper}</Badge>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={7}>
          <Card className="admin-card border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fw-bold">{t('admin.analytics.userGrowth')}</Card.Title>
              <p className="text-secondary">{t('admin.analytics.userGrowthDescription')}</p>
              <div className="admin-analytics-chart">
                <Line data={growthData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="admin-card border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fw-bold">{t('admin.analytics.systemUsage')}</Card.Title>
              <p className="text-secondary">{t('admin.analytics.systemUsageDescription')}</p>
              <div className="admin-analytics-chart">
                <Bar data={systemData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="admin-card border-0 shadow-sm">
        <Card.Body>
          <Card.Title className="fw-bold">{t('admin.analytics.featureAdoption')}</Card.Title>
          <p className="text-secondary">{t('admin.analytics.featureAdoptionDescription')}</p>
          <Row className="g-4">
            {featureUsage.map(([labelKey, value, variant]) => (
              <Col md={6} key={labelKey}>
                <div className="d-flex justify-content-between mb-2">
                  <strong>{t(labelKey)}</strong>
                  <span>{value}%</span>
                </div>
                <ProgressBar now={value} variant={variant} />
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
    </>
  );
}

export default AdminAnalytics;
