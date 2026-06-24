import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChartLine, FaDumbbell, FaUsers, FaUtensils } from 'react-icons/fa';
import { getAdminDashboardOverview } from '../../features/admin/adminService';

const statDefinitions = [
  { labelKey: 'admin.dashboard.stats.users', field: 'totalUsers', trendField: 'users', icon: FaUsers },
  { labelKey: 'admin.dashboard.stats.foods', field: 'totalFoods', trendField: 'foods', icon: FaUtensils },
  { labelKey: 'admin.dashboard.progress.exercises', field: 'totalExercises', trendField: 'exercises', icon: FaDumbbell },
  { labelKey: 'admin.dashboard.stats.todayLogs', field: 'todayLogs', trendField: 'todayLogs', icon: FaChartLine },
];

const progressDefinitions = [
  { labelKey: 'admin.dashboard.progress.foods', field: 'foods', variant: 'success' },
  { labelKey: 'admin.dashboard.progress.exercises', field: 'exercises', variant: 'info' },
  { labelKey: 'admin.dashboard.progress.users', field: 'users', variant: 'warning' },
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadOverview() {
      setLoading(true);
      setLoadError('');

      try {
        const response = await getAdminDashboardOverview();

        if (isActive) {
          setOverview(unwrapOverview(response.data));
        }
      } catch (error) {
        console.error('[AdminDashboard] Error loading overview:', error);

        if (isActive) {
          setLoadError(error.response?.data?.message || t('dashboardPage.loadError'));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      isActive = false;
    };
  }, [t]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  );

  const overviewStats = statDefinitions.map((definition) => ({
    ...definition,
    value: numberFormatter.format(Number(overview[definition.field]) || 0),
    trend: overview.trends?.[definition.trendField] ?? overview[`${definition.trendField}Trend`],
  }));

  const recentActivities = Array.isArray(overview.recentActivities)
    ? overview.recentActivities
    : [];

  const dataProgress = progressDefinitions.map((definition) => ({
    ...definition,
    value: clampPercentage(
      overview.dataHealth?.[definition.field]
      ?? overview.dataProgress?.[definition.field]
      ?? overview[`${definition.field}Completion`]
    ),
  }));

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
      {loadError && <Alert variant="danger">{loadError}</Alert>}

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

      <Row className="g-4 align-items-stretch">
        <Col xl={8}>
          <Card className="border-0 shadow-sm h-100 admin-card">
            <Card.Body>
              <div className="mb-4">
                <div>
                  <Card.Title className="fw-bold mb-1">{t('admin.dashboard.recentTitle')}</Card.Title>
                </div>
              </div>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0 admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.table.content')}</th>
                      <th>{t('admin.table.type')}</th>
                      <th>{t('admin.table.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivities.map((activity, index) => (
                      <tr key={activity.id ?? `${activity.content || activity.itemKey}-${index}`}>
                        <td>{displayText(activity.content || activity.itemKey)}</td>
                        <td>{displayText(activity.type || activity.typeKey)}</td>
                        <td>
                          <span className={`small fw-semibold text-${activity.variant || activity.statusVariant || 'secondary'}`}>
                            {displayText(activity.status || activity.statusKey)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!loading && recentActivities.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center text-secondary py-4">
                          -
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={4}>
          <Card className="border-0 shadow-sm h-100 admin-card">
            <Card.Body>
              <Card.Title className="fw-bold mb-1">{t('admin.dashboard.dataHealthTitle')}</Card.Title>
              <p className="text-secondary">{t('admin.dashboard.dataHealthDescription')}</p>
              <div className="admin-progress-list">
                {dataProgress.map((item) => (
                  <div key={item.labelKey}>
                    <div className="d-flex justify-content-between mb-2">
                      <strong>{t(item.labelKey)}</strong>
                      <span>{item.value}%</span>
                    </div>
                    <ProgressBar now={item.value} variant={item.variant} />
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default AdminDashboard;
