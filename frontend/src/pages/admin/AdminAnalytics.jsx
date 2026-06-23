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
import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChartLine, FaDatabase, FaUserCheck, FaUsers } from 'react-icons/fa';
import { getAdminSystemAnalytics } from '../../features/admin/adminService';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const statDefinitions = [
  { labelKey: 'admin.analytics.stats.totalUsers', field: 'totalUsers', helperField: 'userTrend', icon: FaUsers },
  { labelKey: 'admin.analytics.stats.activeUsers', field: 'activeUsers', helperField: 'activeRate', icon: FaUserCheck, suffix: '%' },
  { labelKey: 'admin.analytics.stats.dailyLogs', field: 'dailyLogs', helperField: 'dailyLogsTrend', icon: FaChartLine },
  { labelKey: 'admin.analytics.stats.catalogItems', field: 'catalogItems', helperField: 'newCatalogItems', icon: FaDatabase, prefix: '+' },
];

const featureDefinitions = [
  ['meals', 'admin.analytics.features.meals', 'success'],
  ['water', 'admin.analytics.features.water', 'info'],
  ['activity', 'admin.analytics.features.activity', 'warning'],
  ['bodyMetrics', 'admin.analytics.features.bodyMetrics', 'secondary'],
];

function AdminAnalytics() {
  const { i18n, t } = useTranslation();
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadAnalytics() {
      setLoading(true);
      setLoadError('');

      try {
        const response = await getAdminSystemAnalytics();

        if (isActive) {
          setAnalytics(response.data?.data ?? response.data ?? {});
        }
      } catch (error) {
        console.error('[AdminAnalytics] Error loading system analytics:', error);

        if (isActive) {
          setLoadError(error.response?.data?.message || t('admin.analytics.loadError'));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      isActive = false;
    };
  }, [t]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  );
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
      month: 'short',
      year: 'numeric',
    }),
    [i18n.language, i18n.resolvedLanguage]
  );
  const stats = analytics.stats ?? {};
  const userGrowth = Array.isArray(analytics.userGrowth) ? analytics.userGrowth : [];
  const systemUsage = analytics.systemUsage ?? {};
  const featureAdoption = analytics.featureAdoption ?? {};

  const analyticsStats = statDefinitions.map((definition) => {
    const helperValue = stats[definition.helperField];
    const numericHelper = typeof helperValue === 'number'
      ? `${definition.prefix || ''}${numberFormatter.format(helperValue)}${definition.suffix || ''}`
      : helperValue;

    return {
      ...definition,
      value: numberFormatter.format(Number(stats[definition.field]) || 0),
      helper: numericHelper ?? '0',
    };
  });

  const growthData = {
    labels: userGrowth.map((item) => {
      const date = new Date(`${item.month}-01T00:00:00`);
      return Number.isNaN(date.getTime()) ? item.month : monthFormatter.format(date);
    }),
    datasets: [{
      label: t('admin.analytics.userGrowth'),
      data: userGrowth.map((item) => Number(item.totalUsers) || 0),
      borderColor: '#2f8f6b',
      backgroundColor: 'rgba(47, 143, 107, 0.14)',
      tension: 0.35,
    }],
  };

  const systemData = {
    labels: featureDefinitions.map(([, labelKey]) => t(labelKey)),
    datasets: [{
      label: t('admin.analytics.logs'),
      data: featureDefinitions.map(([field]) => Number(systemUsage[field]) || 0),
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
          <h2>{t('admin.analytics.title')}</h2>
        </div>
      </div>

      {loading && (
        <Alert variant="light" className="border d-flex align-items-center gap-2">
          <Spinner animation="border" size="sm" />
          {t('admin.analytics.loading')}
        </Alert>
      )}
      {loadError && <Alert variant="danger">{loadError}</Alert>}

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
                  <span className="text-success small fw-semibold">{stat.helper}</span>
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
            {featureDefinitions.map(([field, labelKey, variant]) => {
              const value = Math.min(100, Math.max(0, Number(featureAdoption[field]) || 0));
              return (
              <Col md={6} key={labelKey}>
                <div className="d-flex justify-content-between mb-2">
                  <strong>{t(labelKey)}</strong>
                  <span>{value}%</span>
                </div>
                <ProgressBar now={value} variant={variant} />
              </Col>
              );
            })}
          </Row>
        </Card.Body>
      </Card>
    </>
  );
}

export default AdminAnalytics;
