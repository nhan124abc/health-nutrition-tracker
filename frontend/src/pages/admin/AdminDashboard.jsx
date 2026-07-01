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
import { Link } from 'react-router-dom';
import ErrorModal from '../../components/ErrorModal';
import { FaChartLine, FaDumbbell, FaUsers, FaUtensils } from 'react-icons/fa';
import { getAdminDashboardOverview, getAdminSystemAnalytics } from '../../features/admin/adminService';
import { getAdminActivityCategories } from '../../features/activities/activityService';
import { getAdminFoodCategories } from '../../features/nutrition/nutritionService';
import { extractCategoriesFromApi } from '../../features/nutrition/nutritionUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const statDefinitions = [
  { labelKey: 'admin.dashboard.stats.users', field: 'totalUsers', trendField: 'users', icon: FaUsers },
  { labelKey: 'admin.dashboard.stats.foods', field: 'totalFoods', trendField: 'foods', icon: FaUtensils },
  { labelKey: 'admin.dashboard.progress.exercises', field: 'totalExercises', trendField: 'exercises', icon: FaDumbbell },
  { labelKey: 'admin.dashboard.stats.todayLogs', field: 'todayLogs', trendField: 'todayLogs', icon: FaChartLine },
];

const featureDefinitions = [
  ['meals', 'admin.analytics.features.meals', 'success'],
  ['water', 'admin.analytics.features.water', 'info'],
  ['activity', 'admin.analytics.features.activity', 'warning'],
  ['bodyMetrics', 'admin.analytics.features.bodyMetrics', 'secondary'],
];

const catalogDefinitions = [
  {
    labelKey: 'admin.dashboard.catalogs.foodCategories',
    linkTo: '/admin/catalogs/food-categories',
    icon: FaUtensils,
    type: 'food',
  },
  {
    labelKey: 'admin.dashboard.catalogs.activityCategories',
    linkTo: '/admin/catalogs/activity-categories',
    icon: FaDumbbell,
    type: 'activity',
  },
];

function unwrapOverview(payload) {
  return payload?.data?.overview
    || payload?.data
    || payload?.overview
    || payload
    || {};
}

function clampPercentage(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function AdminDashboard() {
  const { i18n, t } = useTranslation();
  const [overview, setOverview] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [catalogs, setCatalogs] = useState({ food: 0, activity: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
      setLoading(true);
      setLoadError('');

      const [overviewResult, analyticsResult] = await Promise.allSettled([
        getAdminDashboardOverview(),
        getAdminSystemAnalytics(),
      ]);
      const [foodCategoriesResult, activityCategoriesResult] = await Promise.allSettled([
        getAdminFoodCategories(),
        getAdminActivityCategories(),
      ]);

      if (!isActive) {
        return;
      }

      if (overviewResult.status === 'fulfilled') {
        setOverview(unwrapOverview(overviewResult.value.data));
      } else {
        console.error('[AdminDashboard] Error loading overview:', overviewResult.reason);
        setLoadError(overviewResult.reason?.response?.data?.message || t('dashboardPage.loadError'));
      }

      if (analyticsResult.status === 'fulfilled') {
        const payload = analyticsResult.value.data;
        setAnalytics(payload?.data ?? payload ?? {});
      } else {
        console.error('[AdminDashboard] Error loading system analytics:', analyticsResult.reason);
        setLoadError((currentError) => currentError || analyticsResult.reason?.response?.data?.message || t('admin.analytics.loadError'));
      }

      if (foodCategoriesResult.status === 'fulfilled') {
        const foodCategories = extractCategoriesFromApi(foodCategoriesResult.value.data);
        setCatalogs((current) => ({ ...current, food: Array.isArray(foodCategories) ? foodCategories.length : 0 }));
      } else {
        console.error('[AdminDashboard] Error loading food categories:', foodCategoriesResult.reason);
      }

      if (activityCategoriesResult.status === 'fulfilled') {
        const activityCategories = activityCategoriesResult.value.data?.data ?? activityCategoriesResult.value.data ?? [];
        setCatalogs((current) => ({
          ...current,
          activity: Array.isArray(activityCategories) ? activityCategories.length : 0,
        }));
      } else {
        console.error('[AdminDashboard] Error loading activity categories:', activityCategoriesResult.reason);
      }

      setLoading(false);
    }

    loadDashboardData();

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

  const overviewStats = statDefinitions.map((definition) => ({
    ...definition,
    value: numberFormatter.format(Number(overview[definition.field]) || 0),
    trend: overview.trends?.[definition.trendField] ?? overview[`${definition.trendField}Trend`],
  }));
  const userGrowth = Array.isArray(analytics.userGrowth) ? analytics.userGrowth : [];
  const systemUsage = analytics.systemUsage ?? {};
  const featureAdoption = analytics.featureAdoption ?? {};

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

  const displayText = (value, fallback = '') => {
    if (!value) {
      return fallback;
    }

    return typeof value === 'string' && value.startsWith('admin.') ? t(value) : value;
  };

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h2>{t('admin.dashboard.title')}</h2>
        </div>
      </div>

      {loading && (
        <Alert variant="light" className="border d-flex align-items-center gap-2">
          <Spinner animation="border" size="sm" />
          {t('dashboardPage.loading')}
        </Alert>
      )}
      <ErrorModal error={loadError} onClose={() => setLoadError('')} />

      <Row className="g-3 mb-4 admin-overview-stats">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Col md={6} xl={3} key={stat.labelKey}>
              <Card className="admin-stat-card admin-overview-stat border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="admin-stat-icon">
                    <Icon />
                  </div>
                  <div>
                    <span className="text-secondary">{t(stat.labelKey)}</span>
                    <div className="admin-stat-value">{stat.value}</div>
                    {stat.trend !== undefined && stat.trend !== null && (
                      <span className="text-success small fw-semibold">
                        {displayText(stat.trend)}
                      </span>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row className="g-4 mb-4">
        {catalogDefinitions.map((item) => {
          const Icon = item.icon;
          const count = catalogs[item.type] || 0;

          return (
            <Col md={6} key={item.type}>
              <Card className="admin-card border-0 shadow-sm h-100">
                <Card.Body className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-start justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="admin-stat-icon">
                        <Icon />
                      </div>
                      <div className="admin-catalog-summary">
                        <div className="text-secondary admin-catalog-title">{t(item.labelKey)}</div>
                        <div className="admin-stat-value">{count}</div>
                      </div>
                    </div>
                    <Link to={item.linkTo} className="btn btn-outline-success btn-sm admin-catalog-manage">
                      {t('admin.dashboard.catalogs.manage')}
                    </Link>
                  </div>
                  <div className="text-secondary">{t(item.descriptionKey)}</div>
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
          <Row className="g-4">
            {featureDefinitions.map(([field, labelKey, variant]) => {
              const value = clampPercentage(featureAdoption[field]);
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

export default AdminDashboard;
