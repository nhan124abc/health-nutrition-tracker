import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row, Spinner, Table } from 'react-bootstrap';
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
import { getAdminUsers } from '../../features/admin/adminService';
import { getActivityTypes } from '../../features/activities/activityService';
import { getFoods } from '../../features/nutrition/nutritionService';

const pageConfigs = {
  users: {
    badgeKey: 'admin.pages.users.badge',
    icon: FaUsers,
    stats: [],
    columns: ['name', 'email', 'role', 'status'],
    rows: [],
  },
  foods: {
    badgeKey: 'admin.pages.foods.badge',
    icon: FaUtensils,
    stats: [],
    columns: ['food', 'portion', 'calories', 'macro'],
    rows: [],
    statusColumn: false,
  },
  exercises: {
    badgeKey: 'admin.pages.exercises.badge',
    icon: FaDumbbell,
    stats: [],
    columns: ['exercise', 'category', 'met', 'source'],
    rows: [],
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

function extractUsers(payload) {
  const data = payload?.data ?? payload ?? {};
  const users = data.content ?? data.users ?? data.items ?? data.data ?? data;
  return Array.isArray(users) ? users : [];
}

function mapUserRow(user) {
  const active = user.active ?? user.isActive ?? user.enabled ?? !user.locked;
  const role = String(user.role || 'USER').replace(/^ROLE_/, '').toUpperCase();

  return {
    id: user.id ?? user.userId ?? user.email,
    cells: [
      user.fullName || user.name || user.username || '-',
      user.email || '-',
      role,
      active ? 'admin.status.active' : 'admin.status.locked',
    ],
    variant: active ? 'success' : 'secondary',
    active,
  };
}

function extractPage(payload) {
  const data = payload?.data ?? payload ?? {};
  return {
    content: Array.isArray(data.content) ? data.content : [],
    totalPages: Number(data.totalPages) || 0,
    totalElements: Number(data.totalElements) || 0,
  };
}

async function loadAllFoods() {
  const firstResponse = await getFoods({ page: 0, size: 100 });
  const firstPage = extractPage(firstResponse.data);

  if (firstPage.totalPages <= 1) {
    return {
      foods: firstPage.content,
      total: firstPage.totalElements || firstPage.content.length,
    };
  }

  const remainingResponses = await Promise.all(
    Array.from(
      { length: firstPage.totalPages - 1 },
      (_, index) => getFoods({ page: index + 1, size: 100 })
    )
  );

  return {
    foods: [
      ...firstPage.content,
      ...remainingResponses.flatMap((response) => extractPage(response.data).content),
    ],
    total: firstPage.totalElements,
  };
}

function hasCompleteMacro(food) {
  return [food.calories, food.proteinG, food.carbsG, food.fatG]
    .every((value) => value !== null && value !== undefined);
}

function mapFoodRow(food) {
  const serving = food.servingDescription
    || (food.servingSizeG != null ? `${food.servingSizeG}g` : '-');
  const calories = food.calories != null ? `${food.calories} kcal` : '-';
  const macro = hasCompleteMacro(food)
    ? `${food.proteinG}P / ${food.carbsG}C / ${food.fatG}F`
    : '-';

  return {
    id: food.id,
    cells: [food.nameVi || food.name || '-', serving, calories, macro],
    verified: Boolean(food.verified),
    macroComplete: hasCompleteMacro(food),
  };
}

function formatEnum(value) {
  if (!value) {
    return '-';
  }

  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapActivityTypeRow(activityType) {
  const metValue = Number(activityType.metValue);
  const hasMet = Number.isFinite(metValue) && metValue > 0;

  return {
    id: activityType.id,
    cells: [
      activityType.nameVi || activityType.name || '-',
      formatEnum(activityType.category),
      hasMet ? metValue.toFixed(1) : '-',
      activityType.system ? 'admin.status.system' : 'admin.status.custom',
    ],
    variant: activityType.system ? 'success' : 'secondary',
    hasMet,
  };
}

function AdminManagementPage({ type }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [userRows, setUserRows] = useState([]);
  const [userSummary, setUserSummary] = useState({});
  const [foodRows, setFoodRows] = useState([]);
  const [foodSummary, setFoodSummary] = useState({});
  const [activityRows, setActivityRows] = useState([]);
  const [loading, setLoading] = useState(['users', 'foods', 'exercises'].includes(type));
  const [loadError, setLoadError] = useState('');
  const { t } = useTranslation();
  const config = pageConfigs[type] || pageConfigs.users;
  const Icon = config.icon;
  const pageKey = `admin.pages.${type}`;
  const rows = {
    users: userRows,
    foods: foodRows,
    exercises: activityRows,
  }[type] ?? config.rows;
  const stats = {
    users: [
      ['total', userSummary.total ?? userRows.length],
      ['active', userSummary.active ?? userRows.filter((row) => row.active).length],
      ['locked', userSummary.locked ?? userRows.filter((row) => !row.active).length],
    ],
    foods: [
      ['total', foodSummary.total ?? foodRows.length],
      ['pending', foodRows.filter((row) => !row.verified).length],
      [
        'macroFull',
        `${foodRows.length
          ? Math.round(foodRows.filter((row) => row.macroComplete).length * 100 / foodRows.length)
          : 0}%`,
      ],
    ],
    exercises: [
      ['total', activityRows.length],
      ['hasMet', activityRows.filter((row) => row.hasMet).length],
      ['needsReview', activityRows.filter((row) => !row.hasMet).length],
    ],
  }[type] ?? config.stats;

  useEffect(() => {
    if (!['users', 'foods', 'exercises'].includes(type)) {
      setLoading(false);
      return undefined;
    }

    let isActive = true;

    async function loadData() {
      setLoading(true);
      setLoadError('');

      try {
        if (type === 'users') {
          const response = await getAdminUsers({ page: 0, size: 100 });
          const payload = response.data?.data ?? response.data ?? {};
          const mappedUsers = extractUsers(response.data).map(mapUserRow);

          if (!isActive) {
            return;
          }
          setUserRows(mappedUsers);
          setUserSummary({
            total: payload.totalUsers ?? payload.totalElements,
            active: payload.activeUsers ?? payload.active,
            locked: payload.lockedUsers ?? payload.locked ?? payload.inactiveUsers,
          });
        } else if (type === 'foods') {
          const { foods, total } = await loadAllFoods();

          if (!isActive) {
            return;
          }
          setFoodRows(foods.map(mapFoodRow));
          setFoodSummary({ total });
        } else {
          const response = await getActivityTypes();
          const activityTypes = response.data?.data ?? response.data ?? [];

          if (!isActive) {
            return;
          }
          setActivityRows(
            Array.isArray(activityTypes) ? activityTypes.map(mapActivityTypeRow) : []
          );
        }
      } catch (error) {
        console.error(`[AdminManagementPage] Error loading ${type}:`, error);

        if (isActive) {
          setLoadError(error.response?.data?.message || t(`${pageKey}.loadError`));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isActive = false;
    };
  }, [pageKey, t, type]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((row) =>
      row.cells
        .map((cell) => {
          if (typeof cell === 'string' && cell.startsWith('admin.')) {
            return t(cell);
          }
          return String(cell);
        })
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [rows, searchTerm, t]);

  const displayCell = (cell) => (
    typeof cell === 'string' && cell.startsWith('admin.') ? t(cell) : cell
  );

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <Badge bg="success" className="mb-2">
            {t(config.badgeKey)}
          </Badge>
          <h2>{t(`${pageKey}.title`)}</h2>
        </div>
        <Button variant="success">
          <FaPlus className="me-2" />
          {t(`${pageKey}.action`)}
        </Button>
      </div>

      <Row className="g-4 mb-4">
        {stats.map(([labelKey, value]) => (
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

      {loading && (
        <Alert variant="light" className="border d-flex align-items-center gap-2">
          <Spinner animation="border" size="sm" />
          {t(`${pageKey}.loading`)}
        </Alert>
      )}
      {loadError && <Alert variant="danger">{loadError}</Alert>}

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
                {!loading && !loadError && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={config.columns.length + 1} className="text-center text-secondary py-4">
                      {t('admin.table.empty')}
                    </td>
                  </tr>
                )}
                {filteredRows.map((row) => {
                  const rowKey = row.id || row.cells.join('-');
                  return (
                    <tr key={rowKey}>
                      {row.cells.map((cell, index) => {
                        const isStatusCell = config.statusColumn !== false
                          && index === row.cells.length - 1;
                        return (
                          <td key={`${rowKey}-${cell}`}>
                            {isStatusCell
                              ? <Badge bg={row.variant}>{displayCell(cell)}</Badge>
                              : displayCell(cell)}
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
