import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, InputGroup, Row, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaBullseye,
  FaChartLine,
  FaCheck,
  FaCog,
  FaDumbbell,
  FaEdit,
  FaEye,
  FaNewspaper,
  FaPlus,
  FaSearch,
  FaTasks,
  FaTrash,
  FaUsers,
  FaUtensils,
} from 'react-icons/fa';

const pageConfigs = {
  users: {
    badgeKey: 'admin.pages.users.badge',
    icon: FaUsers,
    stats: [
      ['total', '12,480'],
      ['active', '9,214'],
      ['locked', '26'],
    ],
    columns: ['name', 'email', 'role', 'status'],
    rows: [
      { cells: ['admin.data.users.an', 'an.nguyen@email.com', 'admin.roles.user', 'admin.status.active'], variant: 'success' },
      { cells: ['admin.data.users.nam', 'nam.tran@email.com', 'admin.roles.coach', 'admin.status.active'], variant: 'success' },
      { cells: ['admin.data.users.mai', 'mai.le@email.com', 'admin.roles.user', 'admin.status.locked'], variant: 'secondary' },
    ],
  },
  foods: {
    badgeKey: 'admin.pages.foods.badge',
    icon: FaUtensils,
    stats: [
      ['total', '3,248'],
      ['pending', '42'],
      ['macroFull', '86%'],
    ],
    columns: ['food', 'portion', 'calories', 'macro'],
    rows: [
      { cells: ['admin.data.foods.chicken', '100g', '165 kcal', '31P / 0C / 3.6F'], variant: 'success' },
      { cells: ['admin.data.foods.rice', 'admin.data.portions.bowl', '205 kcal', '4P / 45C / 0.4F'], variant: 'success' },
      { cells: ['admin.data.foods.smoothie', 'admin.data.portions.glass', '320 kcal', '10P / 58C / 7F'], variant: 'success' },
    ],
  },
  exercises: {
    badgeKey: 'admin.pages.exercises.badge',
    icon: FaDumbbell,
    stats: [
      ['total', '186'],
      ['hasMet', '151'],
      ['needsReview', '12'],
    ],
    columns: ['exercise', 'duration', 'caloriesBurned', 'intensity'],
    rows: [
      { cells: ['admin.data.exercises.running', 'admin.data.duration.thirty', '280 kcal', 'admin.intensity.medium'], variant: 'success' },
      { cells: ['admin.data.exercises.gym', 'admin.data.duration.fortyFive', '360 kcal', 'admin.intensity.high'], variant: 'success' },
      { cells: ['admin.data.exercises.yoga', 'admin.data.duration.forty', '140 kcal', 'admin.intensity.light'], variant: 'success' },
    ],
  },
  articles: {
    badgeKey: 'admin.pages.articles.badge',
    icon: FaNewspaper,
    stats: [
      ['total', '96'],
      ['published', '72'],
      ['draftPending', '24'],
    ],
    columns: ['title', 'category', 'author', 'status'],
    rows: [
      { cells: ['admin.data.articles.macro', 'admin.common.nutrition', 'Admin', 'admin.status.published'], variant: 'success' },
      { cells: ['admin.data.articles.water', 'admin.common.health', 'Editor', 'admin.status.pending'], variant: 'warning' },
      { cells: ['admin.data.articles.breakfast', 'admin.common.food', 'Admin', 'admin.status.draft'], variant: 'warning' },
    ],
  },
  reports: {
    badgeKey: 'admin.pages.reports.badge',
    icon: FaChartLine,
    stats: [
      ['logs', '48,920'],
      ['calories', '72M'],
      ['retention', '64%'],
    ],
    columns: ['report', 'period', 'creator', 'status'],
    rows: [
      { cells: ['admin.data.reports.users', 'admin.data.periods.may2026', 'admin.common.system', 'admin.status.ready'], variant: 'success' },
      { cells: ['admin.data.reports.popularFoods', 'admin.data.periods.thisWeek', 'Admin', 'admin.status.processing'], variant: 'warning' },
      { cells: ['admin.data.reports.goals', 'admin.data.periods.thirtyDays', 'admin.common.system', 'admin.status.ready'], variant: 'success' },
    ],
  },
  submissions: {
    badgeKey: 'admin.pages.submissions.badge',
    icon: FaTasks,
    stats: [
      ['pending', '38'],
      ['approvedToday', '19'],
      ['rejected', '5'],
    ],
    columns: ['data', 'submitter', 'type', 'status'],
    rows: [
      { cells: ['admin.data.submissions.noodle', 'user_1024', 'admin.common.food', 'admin.status.pending'], variant: 'warning' },
      { cells: ['admin.data.submissions.stairs', 'coach_08', 'admin.common.activity', 'admin.status.needsEdit'], variant: 'warning' },
      { cells: ['admin.data.submissions.dinnerTip', 'editor_03', 'admin.common.article', 'admin.status.pending'], variant: 'warning' },
    ],
  },
  plans: {
    badgeKey: 'admin.pages.plans.badge',
    icon: FaBullseye,
    stats: [
      ['goals', '16'],
      ['plans', '4'],
      ['activeUsers', '2,840'],
    ],
    columns: ['name', 'type', 'value', 'status'],
    rows: [
      { cells: ['admin.data.plans.weightLoss', 'admin.common.goal', 'admin.data.plans.weightLossValue', 'admin.status.inUse'], variant: 'success' },
      { cells: ['Premium Meal Planner', 'admin.common.servicePlan', 'admin.data.plans.premiumPrice', 'admin.status.selling'], variant: 'success' },
      { cells: ['Coach Pro', 'admin.common.servicePlan', 'admin.data.plans.coachPrice', 'admin.status.draft'], variant: 'warning' },
    ],
  },
  settings: {
    badgeKey: 'admin.pages.settings.badge',
    icon: FaCog,
    stats: [
      ['roles', '5'],
      ['permissions', '32'],
      ['enabledSettings', '18'],
    ],
    columns: ['setting', 'group', 'value', 'status'],
    rows: [
      { cells: ['admin.data.settings.fullAdmin', 'admin.common.permission', 'admin.data.settings.fullAccess', 'admin.status.enabled'], variant: 'success' },
      { cells: ['admin.data.settings.foodReview', 'admin.common.permission', 'food.review', 'admin.status.enabled'], variant: 'success' },
      { cells: ['admin.data.settings.jwtTimeout', 'admin.common.security', 'admin.data.settings.twentyFourHours', 'admin.status.enabled'], variant: 'success' },
    ],
  },
};

function AdminManagementPage({ type }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();
  const config = pageConfigs[type] || pageConfigs.users;
  const Icon = config.icon;
  const pageKey = `admin.pages.${type}`;

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return config.rows;
    }

    return config.rows.filter((row) =>
      row.cells
        .map((cell) => t(cell))
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [config.rows, searchTerm, t]);

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <Badge bg="success" className="mb-2">
            {t(config.badgeKey)}
          </Badge>
          <h2>{t(`${pageKey}.title`)}</h2>
          <p>{t(`${pageKey}.description`)}</p>
        </div>
        <Button variant="success">
          <FaPlus className="me-2" />
          {t(`${pageKey}.action`)}
        </Button>
      </div>

      <Row className="g-4 mb-4">
        {config.stats.map(([labelKey, value]) => (
          <Col md={4} key={labelKey}>
            <Card className="admin-mini-stat border-0 shadow-sm">
              <Card.Body>
                <div className="admin-mini-stat-icon">
                  <Icon />
                </div>
                <span>{t(`${pageKey}.stats.${labelKey}`)}</span>
                <strong>{value}</strong>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="admin-card border-0 shadow-sm">
        <Card.Body>
          <div className="admin-table-toolbar">
            <div>
              <h3 className="h5 fw-bold mb-1">{t('admin.table.listTitle')}</h3>
              <p className="text-secondary mb-0">{t('admin.table.listDescription')}</p>
            </div>
            <Form className="admin-table-search">
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('admin.table.searchPlaceholder')}
                  aria-label={t('admin.table.searchLabel')}
                />
              </InputGroup>
            </Form>
          </div>

          <div className="table-responsive">
            <Table hover className="align-middle mb-0 admin-table">
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <th key={column}>{t(`admin.table.${column}`)}</th>
                  ))}
                  <th className="text-end">{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const rowKey = row.cells.join('-');
                  return (
                    <tr key={rowKey}>
                      {row.cells.map((cell, index) => {
                        const isStatusCell = index === row.cells.length - 1;
                        return (
                          <td key={`${rowKey}-${cell}`}>
                            {isStatusCell ? <Badge bg={row.variant}>{t(cell)}</Badge> : t(cell)}
                          </td>
                        );
                      })}
                      <td className="text-end">
                        <div className="admin-row-actions">
                          <Button variant="outline-secondary" size="sm" aria-label={t('admin.actions.view')}>
                            <FaEye />
                          </Button>
                          <Button variant="outline-success" size="sm" aria-label={t('admin.actions.edit')}>
                            <FaEdit />
                          </Button>
                          {type === 'submissions' && (
                            <Button variant="success" size="sm" aria-label={t('admin.actions.approve')}>
                              <FaCheck />
                            </Button>
                          )}
                          <Button variant="outline-danger" size="sm" aria-label={t('admin.actions.delete')}>
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}

export default AdminManagementPage;
