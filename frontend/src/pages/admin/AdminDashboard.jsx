import { Badge, Button, Card, Col, ProgressBar, Row, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChartLine, FaDumbbell, FaUsers, FaUtensils } from 'react-icons/fa';

const overviewStats = [
  { labelKey: 'admin.dashboard.stats.users', value: '12,480', trendKey: 'admin.dashboard.trends.users', icon: FaUsers },
  { labelKey: 'admin.dashboard.stats.foods', value: '3,248', trendKey: 'admin.dashboard.trends.foods', icon: FaUtensils },
  { labelKey: 'admin.dashboard.progress.exercises', value: '186', trendKey: 'admin.dashboard.trends.exercises', icon: FaDumbbell },
  { labelKey: 'admin.dashboard.stats.todayLogs', value: '9,820', trendKey: 'admin.dashboard.trends.todayLogs', icon: FaChartLine },
];

const recentActivities = [
  {
    itemKey: 'admin.dashboard.activities.foodAdded',
    typeKey: 'admin.common.food',
    statusKey: 'admin.status.pending',
    variant: 'warning',
  },
  {
    itemKey: 'admin.dashboard.activities.macroUpdated',
    typeKey: 'admin.common.nutrition',
    statusKey: 'admin.status.approved',
    variant: 'success',
  },
  {
    itemKey: 'admin.dashboard.activities.weeklyReport',
    typeKey: 'admin.common.report',
    statusKey: 'admin.status.completed',
    variant: 'success',
  },
  {
    itemKey: 'admin.dashboard.activities.activityUpdated',
    typeKey: 'admin.common.activity',
    statusKey: 'admin.status.completed',
    variant: 'success',
  },
];

const dataProgress = [
  { labelKey: 'admin.dashboard.progress.foods', value: 82, variant: 'success' },
  { labelKey: 'admin.dashboard.progress.exercises', value: 68, variant: 'info' },
  { labelKey: 'admin.dashboard.progress.users', value: 74, variant: 'warning' },
];

function AdminDashboard() {
  const { t } = useTranslation();

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <Badge bg="success" className="mb-2">
            {t('admin.dashboard.badge')}
          </Badge>
          <h2>{t('admin.dashboard.title')}</h2>
          <p>{t('admin.dashboard.description')}</p>
        </div>
        <Button variant="success">{t('admin.dashboard.quickExport')}</Button>
      </div>

      <Row className="g-4 mb-4">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Col md={6} xl={3} key={stat.labelKey}>
              <Card className="admin-stat-card border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="admin-stat-icon">
                    <Icon />
                  </div>
                  <span className="text-secondary">{t(stat.labelKey)}</span>
                  <div className="admin-stat-value">{stat.value}</div>
                  <Badge bg="light" text="success">
                    {t(stat.trendKey)}
                  </Badge>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm h-100 admin-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div>
                  <Card.Title className="fw-bold mb-1">{t('admin.dashboard.recentTitle')}</Card.Title>
                  <p className="text-secondary mb-0">{t('admin.dashboard.recentDescription')}</p>
                </div>
                <Button variant="outline-success" size="sm">
                  {t('admin.common.viewAll')}
                </Button>
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
                    {recentActivities.map((activity) => (
                      <tr key={activity.itemKey}>
                        <td>{t(activity.itemKey)}</td>
                        <td>{t(activity.typeKey)}</td>
                        <td>
                          <Badge bg={activity.variant}>{t(activity.statusKey)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
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
