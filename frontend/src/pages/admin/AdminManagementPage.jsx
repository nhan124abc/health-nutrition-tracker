import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, InputGroup, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaDumbbell,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaSearch,
  FaTrash,
  FaUsers,
  FaUtensils,
} from 'react-icons/fa';
import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
} from '../../features/admin/adminService';
import {
  createActivityType,
  deleteActivityType,
  getAdminActivityTypes,
  getActivityTypes,
  updateActivityType,
  updateActivityTypeVisibility,
} from '../../features/activities/activityService';
import {
  createFood,
  deleteFood,
  getAdminFoodCategories,
  getFoods,
  updateFood,
} from '../../features/nutrition/nutritionService';
import { cleanText } from '../../features/nutrition/nutritionUtils';
import { getCurrentUser } from '../../api/api';

const pageConfigs = {
  users: {
    icon: FaUsers,
    stats: [],
    columns: ['name', 'email', 'role', 'status'],
    rows: [],
  },
  foods: {
    icon: FaUtensils,
    stats: [],
    columns: ['food', 'portion', 'calories', 'macro', 'status'],
    rows: [],
  },
  exercises: {
    icon: FaDumbbell,
    stats: [],
    columns: ['exercise', 'category', 'met', 'status'],
    rows: [],
  },
};

function extractUsers(payload) {
  const data = payload?.data ?? payload ?? {};
  const users = data.content ?? data.users ?? data.items ?? data.data ?? data;
  return Array.isArray(users) ? users : [];
}

function mapUserRow(user) {
  const active = user.hidden != null
    ? !user.hidden
    : user.active ?? user.isActive ?? user.enabled ?? !user.locked;
  const role = String(user.role || 'USER').replace(/^ROLE_/, '').toUpperCase();

  return {
    id: user.userId ?? user.id ?? user.email,
    cells: [
      user.fullName || user.name || user.username || '-',
      user.email || '-',
      role,
      active ? 'admin.status.active' : 'admin.status.locked',
    ],
    variant: active ? 'success' : 'secondary',
    active,
    raw: user,
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

async function loadAllAdminUsers() {
  const firstResponse = await getAdminUsers({ page: 0, size: 100 });
  const firstPayload = firstResponse.data?.data ?? firstResponse.data ?? {};
  const firstUsers = extractUsers(firstResponse.data);
  const totalPages = Number(firstPayload.totalPages) || 0;

  if (totalPages <= 1) {
    return {
      users: firstUsers,
      summary: firstPayload,
    };
  }

  const remainingResponses = await Promise.all(
    Array.from(
      { length: totalPages - 1 },
      (_, index) => getAdminUsers({ page: index + 1, size: 100 })
    )
  );

  return {
    users: [
      ...firstUsers,
      ...remainingResponses.flatMap((response) => extractUsers(response.data)),
    ],
    summary: firstPayload,
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

function getActiveStatus(item = {}) {
  return item.hidden != null
    ? !item.hidden
    : item.active ?? item.isActive ?? item.enabled ?? !item.locked;
}

function mapFoodRow(food) {
  const serving = cleanText(food.servingDescription)
    || (food.servingSizeG != null ? `${food.servingSizeG}g` : '-');
  const calories = food.calories != null ? `${food.calories} kcal` : '-';
  const macro = hasCompleteMacro(food)
    ? `${food.proteinG}P / ${food.carbsG}C / ${food.fatG}F`
    : '-';
  const active = getActiveStatus(food);

  return {
    id: food.id,
    cells: [
      cleanText(food.nameVi) || cleanText(food.name) || '-',
      serving,
      calories,
      macro,
      active ? 'admin.status.active' : 'admin.status.locked',
    ],
    variant: active ? 'success' : 'secondary',
    active,
    verified: Boolean(food.verified),
    macroComplete: hasCompleteMacro(food),
    raw: food,
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
  const active = getActiveStatus(activityType);

  return {
    id: activityType.id,
    cells: [
      cleanText(activityType.nameVi) || cleanText(activityType.name) || '-',
      formatEnum(activityType.category),
      hasMet ? metValue.toFixed(1) : '-',
      active ? 'admin.status.active' : 'admin.status.locked',
    ],
    variant: active ? 'success' : 'secondary',
    active,
    hasMet,
    raw: activityType,
  };
}

function getAdminActionErrorMessage(error, fallback) {
  const message = error.response?.data?.message || '';

  if (/authorization header|invalid or expired jwt|unauthorized/i.test(message)) {
    return 'Phiên đăng nhập admin đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại rồi thử mở khóa tài khoản.';
  }

  return message || fallback;
}

function isSelfLockError(error) {
  const message = String(error.response?.data?.message || error.message || '').toLowerCase();
  return message.includes('cannot lock the currently logged-in account')
    || message.includes('cannot lock an account that is currently logged in')
    || message.includes('không thể khóa tài khoản đang đăng nhập')
    || message.includes('khong the khoa tai khoan dang dang nhap');
}

function normalizeIdentity(value) {
  return value == null ? '' : String(value).trim().toLowerCase();
}

function getUserIdentityValues(user = {}) {
  return [
    user.id,
    user.userId,
    user.email,
    user.username,
    user.sub,
    user.cells?.[1],
  ].map(normalizeIdentity).filter(Boolean);
}

function isCurrentUserRow(row, currentUser) {
  const currentValues = new Set(getUserIdentityValues(currentUser));

  if (currentValues.size === 0) {
    return false;
  }

  return getUserIdentityValues({ ...row?.raw, id: row?.id, cells: row?.cells })
    .some((value) => currentValues.has(value));
}

function isTranslationKey(value) {
  return typeof value === 'string' && (
    value.startsWith('admin.')
    || value.startsWith('common.')
  );
}

const emptyFoodForm = {
  name: '',
  nameVi: '',
  brand: '',
  barcode: '',
  categoryId: '',
  servingSizeG: '100',
  servingDescription: '100g',
  calories: '0',
  proteinG: '0',
  carbsG: '0',
  fatG: '0',
  fiberG: '0',
  sugarG: '0',
  sodiumMg: '0',
  imageUrl: '',
};

const emptyActivityForm = {
  name: '',
  nameVi: '',
  category: 'OTHER',
  metValue: '3.0',
  icon: '',
  description: '',
  hidden: false,
};

function toNumberOrNull(value) {
  if (value === '' || value == null) {
    return null;
  }
  return Number(value);
}

function AdminManagementPage({ type }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [userRows, setUserRows] = useState([]);
  const [userSummary, setUserSummary] = useState({});
  const [foodRows, setFoodRows] = useState([]);
  const [foodSummary, setFoodSummary] = useState({});
  const [foodCategories, setFoodCategories] = useState([]);
  const [activityRows, setActivityRows] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', role: 'USER', active: true });
  const [catalogForm, setCatalogForm] = useState(emptyFoodForm);
  const [editingCatalogRow, setEditingCatalogRow] = useState(null);
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionError, setActionError] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
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
          const { users, summary } = await loadAllAdminUsers();
          const mappedUsers = users.map(mapUserRow);

          if (!isActive) {
            return;
          }
          setUserRows(mappedUsers);
          setUserSummary({
            total: summary.totalUsers ?? summary.totalElements ?? mappedUsers.length,
            active: summary.activeUsers ?? summary.active,
            locked: summary.lockedUsers ?? summary.locked ?? summary.inactiveUsers,
          });
        } else if (type === 'foods') {
          const [{ foods, total }, categoriesResponse] = await Promise.all([
            loadAllFoods(),
            getAdminFoodCategories().catch(() => ({ data: [] })),
          ]);
          const categories = categoriesResponse.data?.data ?? categoriesResponse.data ?? [];

          if (!isActive) {
            return;
          }
          setFoodRows(foods.map(mapFoodRow));
          setFoodSummary({ total });
          setFoodCategories(Array.isArray(categories) ? categories : []);
        } else {
          const response = await getAdminActivityTypes().catch(() => getActivityTypes());
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
          if (isTranslationKey(cell)) {
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
    isTranslationKey(cell) ? t(cell) : cell
  );

  const getRowActionKey = (action, row) => `${action}:${row.id}`;

  const updateUserRow = (id, updater) => {
    setUserRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const nextRaw = typeof updater === 'function' ? updater(row.raw, row) : updater;
        return mapUserRow({ ...row.raw, ...nextRaw });
      })
    );
  };

  const openEditUser = (row) => {
    setActionError('');
    setEditingUser(row);
    setShowUserForm(true);
    setEditForm({
      fullName: row.raw?.fullName || row.raw?.name || row.raw?.username || '',
      email: row.raw?.email || '',
      role: String(row.raw?.role || row.cells[2] || 'USER').replace(/^ROLE_/, '').toUpperCase(),
      active: row.active,
    });
  };

  const closeUserForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
    setEditForm({ fullName: '', email: '', role: 'USER', active: true });
  };

  const openCreateCatalog = () => {
    setActionError('');
    setEditingCatalogRow(null);
    setCatalogForm(type === 'foods' ? emptyFoodForm : emptyActivityForm);
    setShowCatalogForm(true);
  };

  const openEditCatalog = (row) => {
    const raw = row.raw || {};
    setActionError('');
    setEditingCatalogRow(row);
    setCatalogForm(type === 'foods'
      ? {
        name: raw.name || '',
        nameVi: raw.nameVi || '',
        brand: '',
        barcode: '',
        categoryId: raw.category?.id ?? raw.categoryId ?? '',
        servingSizeG: raw.servingSizeG ?? '100',
        servingDescription: raw.servingDescription || `${raw.servingSizeG ?? 100}g`,
        calories: raw.calories ?? '0',
        proteinG: raw.proteinG ?? '0',
        carbsG: raw.carbsG ?? '0',
        fatG: raw.fatG ?? '0',
        fiberG: raw.fiberG ?? '0',
        sugarG: raw.sugarG ?? '0',
        sodiumMg: raw.sodiumMg ?? '0',
        imageUrl: '',
      }
      : {
        name: raw.name || '',
        nameVi: raw.nameVi || '',
        category: raw.category || 'OTHER',
        metValue: raw.metValue ?? '3.0',
        icon: raw.icon || '',
        description: raw.description || '',
        hidden: Boolean(raw.hidden),
      });
    setShowCatalogForm(true);
  };

  const closeCatalogForm = () => {
    setShowCatalogForm(false);
    setEditingCatalogRow(null);
    setCatalogForm(type === 'foods' ? emptyFoodForm : emptyActivityForm);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
  };

  const showSelfLockNotice = () => {
    setNoticeMessage('Kh\u00f4ng th\u1ec3 kh\u00f3a t\u00e0i kho\u1ea3n \u0111ang \u0111\u0103ng nh\u1eadp.');
  };

  const shouldPreventSelfLock = (row, nextActive) => (
    !nextActive && isCurrentUserRow(row, getCurrentUser() || {})
  );

  const toggleUserStatus = async (row) => {
    const actionKey = getRowActionKey('status', row);
    const nextActive = !row.active;

    if (shouldPreventSelfLock(row, nextActive)) {
      showSelfLockNotice();
      return;
    }

    setActionError('');
    setPendingAction(actionKey);

    try {
      const response = await updateAdminUserStatus(row.id, nextActive);
      const responseUser = response.data?.data ?? response.data;
      updateUserRow(row.id, {
        ...(typeof responseUser === 'object' ? responseUser : {}),
        active: nextActive,
        enabled: nextActive,
        hidden: !nextActive,
        locked: !nextActive,
      });
      setUserSummary((summary) => ({
        ...summary,
        active: summary.active == null ? summary.active : summary.active + (nextActive ? 1 : -1),
        locked: summary.locked == null ? summary.locked : summary.locked + (nextActive ? -1 : 1),
      }));
      showSuccess(nextActive ? 'Đã mở khóa tài khoản thành công.' : 'Đã khóa tài khoản thành công.');
    } catch (error) {
      if (isSelfLockError(error)) {
        showSelfLockNotice();
      } else {
        setActionError(getAdminActionErrorMessage(error, t(`${pageKey}.loadError`)));
      }
    } finally {
      setPendingAction('');
    }
  };

  const saveUserEdit = async (event) => {
    event?.preventDefault();

    setActionError('');
    setSavingEdit(true);

    try {
      if (shouldPreventSelfLock(editingUser, editForm.active)) {
        showSelfLockNotice();
        return;
      }

      const payload = {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        active: editForm.active,
      };
      const response = await updateAdminUser(editingUser.id, payload);
      const responseUser = response.data?.data ?? response.data;
      updateUserRow(editingUser.id, typeof responseUser === 'object' ? responseUser : payload);

      if (editingUser && editingUser.active !== editForm.active) {
        setUserSummary((summary) => ({
          ...summary,
          active: summary.active == null ? summary.active : summary.active + (editForm.active ? 1 : -1),
          locked: summary.locked == null ? summary.locked : summary.locked + (editForm.active ? -1 : 1),
        }));
      }
      closeUserForm();
      showSuccess('Đã cập nhật người dùng thành công.');
    } catch (error) {
      if (isSelfLockError(error)) {
        showSelfLockNotice();
      } else {
        setActionError(getAdminActionErrorMessage(error, t(`${pageKey}.loadError`)));
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const removeUser = async (row) => {
    const actionKey = getRowActionKey('delete', row);
    setActionError('');
    setPendingAction(actionKey);

    try {
      await deleteAdminUser(row.id);
      setUserRows((currentRows) => currentRows.filter((currentRow) => currentRow.id !== row.id));
      setUserSummary((summary) => ({
        ...summary,
        total: summary.total == null ? summary.total : Math.max(0, summary.total - 1),
        active: summary.active == null || !row.active ? summary.active : Math.max(0, summary.active - 1),
        locked: summary.locked == null || row.active ? summary.locked : Math.max(0, summary.locked - 1),
      }));
      showSuccess('Đã xóa người dùng thành công.');
    } catch (error) {
      setActionError(getAdminActionErrorMessage(error, t(`${pageKey}.loadError`)));
    } finally {
      setPendingAction('');
    }
  };

  const saveCatalog = async (event) => {
    event?.preventDefault();
    setActionError('');
    setSavingEdit(true);

    try {
      if (type === 'foods') {
        const payload = {
          name: catalogForm.name.trim(),
          nameVi: catalogForm.nameVi.trim() || null,
          brand: catalogForm.brand.trim() || null,
          barcode: catalogForm.barcode.trim() || null,
          categoryId: toNumberOrNull(catalogForm.categoryId),
          servingSizeG: toNumberOrNull(catalogForm.servingSizeG),
          servingDescription: catalogForm.servingDescription.trim() || `${catalogForm.servingSizeG}g`,
          calories: toNumberOrNull(catalogForm.calories),
          proteinG: toNumberOrNull(catalogForm.proteinG),
          carbsG: toNumberOrNull(catalogForm.carbsG),
          fatG: toNumberOrNull(catalogForm.fatG),
          fiberG: toNumberOrNull(catalogForm.fiberG) ?? 0,
          sugarG: toNumberOrNull(catalogForm.sugarG) ?? 0,
          sodiumMg: toNumberOrNull(catalogForm.sodiumMg) ?? 0,
          imageUrl: catalogForm.imageUrl.trim() || null,
        };
        const response = editingCatalogRow
          ? await updateFood(editingCatalogRow.id, payload)
          : await createFood(payload);
        const savedFood = response.data?.data ?? response.data;
        const mappedRow = mapFoodRow(savedFood);

        setFoodRows((currentRows) => editingCatalogRow
          ? currentRows.map((row) => (row.id === editingCatalogRow.id ? mappedRow : row))
          : [mappedRow, ...currentRows]);
        if (!editingCatalogRow) {
          setFoodSummary((summary) => ({ ...summary, total: (summary.total ?? foodRows.length) + 1 }));
        }
        showSuccess(editingCatalogRow ? 'Đã cập nhật thực phẩm.' : 'Đã thêm thực phẩm.');
      } else {
        const payload = {
          name: catalogForm.name.trim(),
          nameVi: catalogForm.nameVi.trim() || null,
          category: catalogForm.category,
          metValue: toNumberOrNull(catalogForm.metValue),
          icon: catalogForm.icon.trim() || null,
          description: catalogForm.description.trim() || null,
          hidden: Boolean(catalogForm.hidden),
        };
        const response = editingCatalogRow
          ? await updateActivityType(editingCatalogRow.id, payload)
          : await createActivityType(payload);
        const savedActivity = response.data?.data ?? response.data;
        const mappedRow = mapActivityTypeRow(savedActivity);

        setActivityRows((currentRows) => editingCatalogRow
          ? currentRows.map((row) => (row.id === editingCatalogRow.id ? mappedRow : row))
          : [mappedRow, ...currentRows]);
        showSuccess(editingCatalogRow ? 'Đã cập nhật hoạt động.' : 'Đã thêm hoạt động.');
      }

      closeCatalogForm();
    } catch (error) {
      setActionError(error.response?.data?.message || 'Không thể lưu dữ liệu.');
    } finally {
      setSavingEdit(false);
    }
  };

  const removeCatalog = async (row) => {
    const actionKey = getRowActionKey('delete', row);
    setActionError('');
    setPendingAction(actionKey);

    try {
      if (type === 'foods') {
        await deleteFood(row.id);
        setFoodRows((currentRows) => currentRows.filter((currentRow) => currentRow.id !== row.id));
        setFoodSummary((summary) => ({ ...summary, total: Math.max(0, (summary.total ?? foodRows.length) - 1) }));
        showSuccess('Đã xóa thực phẩm.');
      } else {
        await deleteActivityType(row.id);
        setActivityRows((currentRows) => currentRows.filter((currentRow) => currentRow.id !== row.id));
        showSuccess('Đã xóa hoạt động.');
      }
    } catch (error) {
      setActionError(error.response?.data?.message || 'Không thể xóa dữ liệu.');
    } finally {
      setPendingAction('');
    }
  };

  const toggleActivityStatus = async (row) => {
    const actionKey = getRowActionKey('status', row);
    setActionError('');
    setPendingAction(actionKey);

    try {
      const response = await updateActivityTypeVisibility(row.id, row.active);
      const savedActivity = response.data?.data ?? response.data;
      const mappedRow = mapActivityTypeRow(savedActivity);
      setActivityRows((currentRows) => currentRows.map((currentRow) => (
        currentRow.id === row.id ? mappedRow : currentRow
      )));
      showSuccess(row.active ? 'Đã ẩn hoạt động.' : 'Đã hiện hoạt động.');
    } catch (error) {
      setActionError(error.response?.data?.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setPendingAction('');
    }
  };

  const runConfirmedAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);

    if (!action) {
      return;
    }

    setConfirmingAction(true);

    try {
      if (action.type === 'status') {
        await toggleUserStatus(action.row);
      } else if (action.type === 'delete' && type === 'users') {
        await removeUser(action.row);
      } else if (action.type === 'delete') {
        await removeCatalog(action.row);
      } else if (action.type === 'catalog-status') {
        await toggleActivityStatus(action.row);
      }
    } finally {
      setConfirmingAction(false);
    }
  };

  const userDetailRows = selectedUser ? [
    [t('admin.table.name'), selectedUser.cells[0]],
    [t('admin.table.email'), selectedUser.cells[1]],
    [t('admin.table.role'), selectedUser.cells[2]],
    [t('admin.table.status'), displayCell(selectedUser.cells[3])],
    ['ID', selectedUser.id || '-'],
    [t('admin.userDetails.username'), selectedUser.raw?.username || '-'],
    [t('admin.userDetails.phone'), selectedUser.raw?.phone || selectedUser.raw?.phoneNumber || '-'],
    [t('admin.userDetails.createdAt'), selectedUser.raw?.createdAt ? new Date(selectedUser.raw.createdAt).toLocaleString() : '-'],
  ] : [];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h2>{t(`${pageKey}.title`)}</h2>
        </div>
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
      {actionError && <Alert variant="danger">{actionError}</Alert>}

      <Card className="admin-card border-0 shadow-sm">
        <Card.Body>
          <div className="admin-table-toolbar">
            <div>
              <h3 className="h5 fw-bold mb-1">{t('admin.table.listTitle')}</h3>
            </div>
            {type !== 'users' && (
              <Button variant="success" onClick={openCreateCatalog}>
                {type === 'foods' ? 'Thêm thực phẩm' : 'Thêm hoạt động'}
              </Button>
            )}
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
                  const isUserRow = type === 'users';
                  const statusActionKey = getRowActionKey('status', row);
                  const deleteActionKey = getRowActionKey('delete', row);
                  const visibilityActionLabel = isUserRow
                    ? t(row.active ? 'admin.actions.hideAccount' : 'admin.actions.showAccount')
                    : type === 'exercises'
                      ? (row.active ? 'Ẩn hoạt động' : 'Hiện hoạt động')
                      : t('admin.actions.view');

                  return (
                    <tr key={rowKey}>
                      {row.cells.map((cell, index) => {
                        const isStatusCell = config.statusColumn !== false
                          && index === row.cells.length - 1;
                        return (
                          <td key={`${rowKey}-${cell}`}>
                            {isStatusCell
                              ? <span className={`small fw-semibold text-${row.variant || 'secondary'}`}>{displayCell(cell)}</span>
                              : type === 'users' && index === 0
                                ? (
                                  <button
                                    type="button"
                                    className="admin-table-link"
                                    onClick={() => setSelectedUser(row)}
                                    title={t('admin.userDetails.open')}
                                  >
                                    {displayCell(cell)}
                                  </button>
                                )
                                : displayCell(cell)}
                          </td>
                        );
                      })}
                      <td className="text-end">
                        <div className="admin-row-actions">
                          <Button
                            variant={isUserRow && !row.active ? 'outline-primary' : 'outline-secondary'}
                            size="sm"
                            aria-label={visibilityActionLabel}
                            title={visibilityActionLabel}
                            disabled={type === 'foods' || pendingAction === statusActionKey}
                            onClick={() => {
                              if (type === 'foods') {
                                return;
                              }

                              if (!isUserRow) {
                                setConfirmAction({ type: 'catalog-status', row });
                                return;
                              }

                              if (shouldPreventSelfLock(row, !row.active)) {
                                showSelfLockNotice();
                                return;
                              }

                              setConfirmAction({ type: 'status', row });
                            }}
                          >
                            {pendingAction === statusActionKey
                              ? <Spinner animation="border" size="sm" />
                              : row.active ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            aria-label={t('admin.actions.edit')}
                            title={t('admin.actions.edit')}
                            onClick={() => (isUserRow ? openEditUser(row) : openEditCatalog(row))}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            aria-label={t('admin.actions.delete')}
                            title={t('admin.actions.delete')}
                            disabled={pendingAction === deleteActionKey}
                            onClick={() => setConfirmAction({ type: 'delete', row })}
                          >
                            {pendingAction === deleteActionKey
                              ? <Spinner animation="border" size="sm" />
                              : <FaTrash />}
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

      <Modal show={Boolean(selectedUser)} onHide={() => setSelectedUser(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('admin.userDetails.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="profile-summary-list">
            {userDetailRows.map(([label, value]) => (
              <div className="profile-summary-row" key={label}>
                <span>{label}</span>
                <strong>{value || '-'}</strong>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setSelectedUser(null)}>
            {t('common.close')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showUserForm} onHide={closeUserForm} centered>
        <Form onSubmit={(event) => {
          event.preventDefault();
          saveUserEdit();
        }}>
          <Modal.Header closeButton>
            <Modal.Title>{t('admin.actions.edit')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Label>{t('admin.table.name')}</Form.Label>
                <Form.Control
                  value={editForm.fullName}
                  onChange={(event) => setEditForm((form) => ({ ...form, fullName: event.target.value }))}
                />
              </Col>
              <Col md={12}>
                <Form.Label>{t('admin.table.email')}</Form.Label>
                <Form.Control
                  type="email"
                  value={editForm.email}
                  onChange={(event) => setEditForm((form) => ({ ...form, email: event.target.value }))}
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>{t('admin.table.role')}</Form.Label>
                <Form.Select
                  value={editForm.role}
                  onChange={(event) => setEditForm((form) => ({ ...form, role: event.target.value }))}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>{t('admin.table.status')}</Form.Label>
                <Form.Select
                  value={editForm.active ? 'active' : 'locked'}
                  onChange={(event) => setEditForm((form) => ({ ...form, active: event.target.value === 'active' }))}
                >
                  <option value="active">{t('admin.status.active')}</option>
                  <option value="locked">{t('admin.status.locked')}</option>
                </Form.Select>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline-secondary" onClick={closeUserForm}>
              {t('common.close')}
            </Button>
            <Button type="submit" variant="success" disabled={savingEdit}>
              {savingEdit ? <Spinner animation="border" size="sm" /> : t('admin.actions.edit')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showCatalogForm} onHide={closeCatalogForm} centered size="lg">
        <Form onSubmit={saveCatalog}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingCatalogRow
                ? (type === 'foods' ? 'Sửa thực phẩm' : 'Sửa hoạt động')
                : (type === 'foods' ? 'Thêm thực phẩm' : 'Thêm hoạt động')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {type === 'foods' ? (
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label>Tên thực phẩm</Form.Label>
                  <Form.Control required value={catalogForm.name} onChange={(event) => setCatalogForm((form) => ({ ...form, name: event.target.value }))} />
                </Col>
                <Col md={6}>
                  <Form.Label>Tên tiếng Việt</Form.Label>
                  <Form.Control value={catalogForm.nameVi} onChange={(event) => setCatalogForm((form) => ({ ...form, nameVi: event.target.value }))} />
                </Col>
                <Col md={6}>
                  <Form.Label>Danh mục</Form.Label>
                  <Form.Select value={catalogForm.categoryId} onChange={(event) => setCatalogForm((form) => ({ ...form, categoryId: event.target.value }))}>
                    <option value="">Chưa chọn</option>
                    {foodCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {cleanText(category.nameVi) || cleanText(category.name)}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>Khẩu phần (g)</Form.Label>
                  <Form.Control required type="number" min="0.1" step="0.1" value={catalogForm.servingSizeG} onChange={(event) => setCatalogForm((form) => ({ ...form, servingSizeG: event.target.value }))} />
                </Col>
                <Col md={6}>
                  <Form.Label>Mô tả khẩu phần</Form.Label>
                  <Form.Control value={catalogForm.servingDescription} onChange={(event) => setCatalogForm((form) => ({ ...form, servingDescription: event.target.value }))} />
                </Col>
                <Col md={4}>
                  <Form.Label>Calories</Form.Label>
                  <Form.Control required type="number" min="0" step="0.1" value={catalogForm.calories} onChange={(event) => setCatalogForm((form) => ({ ...form, calories: event.target.value }))} />
                </Col>
                <Col md={4}>
                  <Form.Label>Protein (g)</Form.Label>
                  <Form.Control required type="number" min="0" step="0.1" value={catalogForm.proteinG} onChange={(event) => setCatalogForm((form) => ({ ...form, proteinG: event.target.value }))} />
                </Col>
                <Col md={4}>
                  <Form.Label>Carbs (g)</Form.Label>
                  <Form.Control required type="number" min="0" step="0.1" value={catalogForm.carbsG} onChange={(event) => setCatalogForm((form) => ({ ...form, carbsG: event.target.value }))} />
                </Col>
                <Col md={4}>
                  <Form.Label>Fat (g)</Form.Label>
                  <Form.Control required type="number" min="0" step="0.1" value={catalogForm.fatG} onChange={(event) => setCatalogForm((form) => ({ ...form, fatG: event.target.value }))} />
                </Col>
                <Col md={4}>
                  <Form.Label>Fiber (g)</Form.Label>
                  <Form.Control type="number" min="0" step="0.1" value={catalogForm.fiberG} onChange={(event) => setCatalogForm((form) => ({ ...form, fiberG: event.target.value }))} />
                </Col>
                <Col md={4}>
                  <Form.Label>Sugar (g)</Form.Label>
                  <Form.Control type="number" min="0" step="0.1" value={catalogForm.sugarG} onChange={(event) => setCatalogForm((form) => ({ ...form, sugarG: event.target.value }))} />
                </Col>
                <Col md={4}>
                  <Form.Label>Sodium (mg)</Form.Label>
                  <Form.Control type="number" min="0" step="0.1" value={catalogForm.sodiumMg} onChange={(event) => setCatalogForm((form) => ({ ...form, sodiumMg: event.target.value }))} />
                </Col>
              </Row>
            ) : (
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label>Tên hoạt động</Form.Label>
                  <Form.Control required value={catalogForm.name} onChange={(event) => setCatalogForm((form) => ({ ...form, name: event.target.value }))} />
                </Col>
                <Col md={6}>
                  <Form.Label>Tên tiếng Việt</Form.Label>
                  <Form.Control value={catalogForm.nameVi} onChange={(event) => setCatalogForm((form) => ({ ...form, nameVi: event.target.value }))} />
                </Col>
                <Col md={4}>
                  <Form.Label>Nhóm</Form.Label>
                  <Form.Select value={catalogForm.category} onChange={(event) => setCatalogForm((form) => ({ ...form, category: event.target.value }))}>
                    {['CARDIO', 'STRENGTH', 'FLEXIBILITY', 'SPORTS', 'DAILY', 'OTHER'].map((category) => (
                      <option key={category} value={category}>{formatEnum(category)}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>MET</Form.Label>
                  <Form.Control required type="number" min="0.1" max="50" step="0.1" value={catalogForm.metValue} onChange={(event) => setCatalogForm((form) => ({ ...form, metValue: event.target.value }))} />
                </Col>
                <Col md={4}>
                  <Form.Label>Icon</Form.Label>
                  <Form.Control value={catalogForm.icon} onChange={(event) => setCatalogForm((form) => ({ ...form, icon: event.target.value }))} />
                </Col>
                <Col md={12}>
                  <Form.Label>Mô tả</Form.Label>
                  <Form.Control as="textarea" rows={2} value={catalogForm.description} onChange={(event) => setCatalogForm((form) => ({ ...form, description: event.target.value }))} />
                </Col>
                <Col md={12}>
                  <Form.Check
                    type="switch"
                    label="Ẩn hoạt động này"
                    checked={catalogForm.hidden}
                    onChange={(event) => setCatalogForm((form) => ({ ...form, hidden: event.target.checked }))}
                  />
                </Col>
              </Row>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline-secondary" onClick={closeCatalogForm}>
              {t('common.close')}
            </Button>
            <Button type="submit" variant="success" disabled={savingEdit}>
              {savingEdit ? <Spinner animation="border" size="sm" /> : 'Lưu'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(confirmAction)} onHide={() => setConfirmAction(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận thao tác</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmAction?.type === 'delete' && 'Bạn có chắc muốn xóa người dùng này?'}
          {confirmAction?.type === 'status' && (
            confirmAction.row?.active
              ? 'Bạn có chắc muốn khóa tài khoản này?'
              : 'Bạn có chắc muốn mở khóa tài khoản này?'
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setConfirmAction(null)}>
            {t('common.close')}
          </Button>
          <Button
            variant={confirmAction?.type === 'delete' ? 'danger' : 'success'}
            onClick={runConfirmedAction}
            disabled={confirmingAction}
          >
            Xác nhận
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(successMessage)} onHide={() => setSuccessMessage('')} centered>
        <Modal.Header closeButton>
          <Modal.Title>Thành công</Modal.Title>
        </Modal.Header>
        <Modal.Body>{successMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setSuccessMessage('')}>
            {t('common.close')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(noticeMessage)} onHide={() => setNoticeMessage('')} centered>
        <Modal.Header closeButton>
          <Modal.Title>{'Th\u00f4ng b\u00e1o'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{noticeMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setNoticeMessage('')}>
            {t('common.close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default AdminManagementPage;
