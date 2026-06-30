import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, InputGroup, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight, FaDumbbell, FaEdit, FaEye, FaEyeSlash, FaPlus, FaSearch, FaTrash, FaUtensils } from 'react-icons/fa';
import {
  getAdminActivityCategories,
  getActivityCategories,
  updateActivityCategoryVisibility,
} from '../../features/activities/activityService';
import {
  createFoodCategory,
  deleteFoodCategory,
  getAdminFoodCategories,
  getFoodCategories,
  getFoods,
  updateFoodCategory,
  updateFoodCategoryVisibility,
} from '../../features/nutrition/nutritionService';
import {
  cleanText,
  extractCategoriesFromApi,
  extractFoodsFromApi,
  normalizeCategory,
  normalizeFoodFromApi,
} from '../../features/nutrition/nutritionUtils';
import { getLocalizedName } from '../../utils/localizedName';
import ErrorModal from '../../components/ErrorModal';

const ADMIN_PAGE_SIZE = 16;

const catalogItems = [
  {
    icon: FaUtensils,
    titleKey: 'admin.catalogs.foodsTitle',
    to: '/admin/catalogs/food-categories',
  },
  {
    icon: FaDumbbell,
    titleKey: 'admin.catalogs.activitiesTitle',
    to: '/admin/catalogs/activity-categories',
  },
];

const emptyFoodCategoryForm = {
  name: '',
  nameVi: '',
  hidden: false,
};

function getCategoryItemCount(category) {
  return Number(
    category.count
    ?? category.foodCount
    ?? category.itemCount
    ?? category.totalItems
    ?? category.totalFoods
    ?? 0
  ) || 0;
}

function mapFoodCategory(category = {}) {
  const normalizedCategory = normalizeCategory(category);
  const name = normalizedCategory.name || normalizedCategory.nameVi;

  return {
    id: normalizedCategory.id ?? cleanText(name).toLowerCase(),
    name: name || '-',
    nameRaw: normalizedCategory.name || '',
    nameVi: normalizedCategory.nameVi || '',
    hidden: Boolean(category.hidden),
    count: getCategoryItemCount(category),
    raw: category,
  };
}

function mapDerivedFoodCategory(category, foods) {
  return {
    ...category,
    count: foods.filter((food) => String(food.categoryId || food.category) === String(category.id)).length,
  };
}

function mapActivityCategory(category = {}) {
  const categoryValue = String(category.category || category.id || category.name || 'OTHER').toUpperCase();
  const name = cleanText(category.name) || cleanText(category.nameVi) || categoryValue;

  return {
    id: categoryValue,
    name,
    nameRaw: cleanText(category.name),
    nameVi: cleanText(category.nameVi),
    category: categoryValue,
    categoryKey: categoryValue.toLowerCase(),
    hidden: Boolean(category.hidden),
    count: Number(category.activityTypeCount ?? category.count ?? 0) || 0,
    raw: category,
  };
}

function isLinkedFoodCategoryError(error) {
  const message = String(error.response?.data?.message || error.message || '').toLowerCase();
  return message.includes('food item')
    || message.includes('food(s)')
    || message.includes('thuc pham')
    || message.includes('thực phẩm');
}

function AdminCatalogs({ type = 'overview' }) {
  const { i18n, t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(type !== 'overview');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState(emptyFoodCategoryForm);
  const [saving, setSaving] = useState(false);
  const [noticeKey, setNoticeKey] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [visibilityCandidate, setVisibilityCandidate] = useState(null);
  const [successKey, setSuccessKey] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const isFoodCategories = type === 'food';
  const isActivityCategories = type === 'activity';

  useEffect(() => {
    if (type === 'overview') {
      return undefined;
    }

    let isActive = true;

    async function loadCategories() {
      setLoading(true);
      setError('');
      setActionError('');

      try {
        if (isFoodCategories) {
          const [categoryResponse, foodsResponse] = await Promise.all([
            getAdminFoodCategories().catch(() => getFoodCategories()),
            getFoods({ page: 0, size: 1000 }).catch(() => null),
          ]);
          const foods = foodsResponse
            ? extractFoodsFromApi(foodsResponse.data).map(normalizeFoodFromApi)
            : [];
          const foodCategories = extractCategoriesFromApi(categoryResponse.data)
            .map(mapFoodCategory)
            .map((category) => mapDerivedFoodCategory(category, foods))
            .filter((category) => category.id && category.name)
            .sort((left, right) => left.name.localeCompare(right.name));

          if (isActive) {
            setCategories(foodCategories);
          }
        } else if (isActivityCategories) {
          const response = await getAdminActivityCategories().catch(() => getActivityCategories());
          const activityCategories = response.data?.data ?? response.data ?? [];

          if (isActive) {
            setCategories((Array.isArray(activityCategories) ? activityCategories : [])
              .map(mapActivityCategory)
              .sort((left, right) => left.name.localeCompare(right.name)));
          }
        }
      } catch (loadError) {
        console.error('[AdminCatalogs] Error loading categories:', loadError);

        if (isActive) {
          setError(t('admin.catalogs.loadError'));
          setCategories([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      isActive = false;
    };
  }, [isActivityCategories, isFoodCategories, t, type]);

  const totalItems = useMemo(
    () => categories.reduce((sum, category) => sum + category.count, 0),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) => [
      getLocalizedName({ name: category.nameRaw, nameVi: category.nameVi }, i18n.language),
      category.name,
      category.nameRaw,
      category.nameVi,
      category.category,
      category.id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch));
  }, [categories, i18n.language, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / ADMIN_PAGE_SIZE));
  const pageStartIndex = (currentPage - 1) * ADMIN_PAGE_SIZE;
  const paginatedCategories = filteredCategories.slice(pageStartIndex, pageStartIndex + ADMIN_PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, type]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const getActionError = (requestError) => {
    const message = requestError.response?.data?.message || '';

    if (/authorization header|invalid or expired jwt|unauthorized/i.test(message)) {
      return t('admin.common.sessionExpired');
    }

    return message || t('admin.catalogs.loadError');
  };

  const showLinkedFoodNotice = () => {
    setNoticeKey('admin.catalogs.linkedFoodCategoryBlocked');
  };

  const showLinkedActivityNotice = () => {
    setNoticeKey('admin.catalogs.linkedActivityCategoryBlocked');
  };

  const resetForm = () => {
    setEditingItem(null);
    setShowFormModal(false);
    setForm(emptyFoodCategoryForm);
  };

  const openCreateModal = () => {
    setActionError('');
    setEditingItem(null);
    setForm(emptyFoodCategoryForm);
    setShowFormModal(true);
  };

  const openEditModal = (item) => {
    setActionError('');
    setEditingItem(item);
    setShowFormModal(true);
    setForm({
      name: item.nameRaw || item.name || '',
      nameVi: item.nameVi || '',
      hidden: item.hidden,
    });
  };

  const updateCategoryRow = (id, data) => {
    setCategories((current) =>
      current
        .map((item) => (String(item.id) === String(id) ? mapFoodCategory({ ...item.raw, ...data }) : item))
        .sort((left, right) => left.name.localeCompare(right.name))
    );
  };

  const toggleVisibility = async (item) => {
    const nextHidden = !item.hidden;
    const actionKey = `visibility:${item.id}`;

    setActionError('');
    setPendingAction(actionKey);

    try {
      if (isActivityCategories) {
        if (nextHidden && item.count > 0) {
          showLinkedActivityNotice();
          return;
        }

        const response = await updateActivityCategoryVisibility(item.category, nextHidden);
        const data = response.data?.data ?? response.data ?? { ...item.raw, hidden: nextHidden };
        setCategories((current) => current
          .map((category) => (String(category.id) === String(item.id)
            ? mapActivityCategory({ ...category.raw, ...data, hidden: nextHidden })
            : category))
          .sort((left, right) => left.name.localeCompare(right.name)));
      } else {
        const response = await updateFoodCategoryVisibility(item.id, nextHidden);
        const data = response.data?.data ?? response.data ?? { hidden: nextHidden };
        updateCategoryRow(item.id, { ...data, hidden: nextHidden });
        setSuccessKey(nextHidden ? 'admin.catalogs.foodCategoryHideSuccess' : 'admin.catalogs.foodCategoryShowSuccess');
      }
    } catch (requestError) {
      if (isFoodCategories && nextHidden && isLinkedFoodCategoryError(requestError)) {
        showLinkedFoodNotice();
      } else {
        setActionError(getActionError(requestError));
      }
    } finally {
      setPendingAction('');
    }
  };

  const requestDeleteItem = (item) => {
    setActionError('');
    setDeleteCandidate(item);
  };

  const requestVisibilityChange = (item) => {
    setActionError('');

    if (isFoodCategories) {
      setVisibilityCandidate(item);
      return;
    }

    if (isActivityCategories && !item.hidden && item.count > 0) {
      showLinkedActivityNotice();
      return;
    }

    setVisibilityCandidate(item);
  };

  const closeVisibilityPopup = () => {
    if (!pendingAction.startsWith('visibility:')) {
      setVisibilityCandidate(null);
    }
  };

  const confirmVisibilityChange = async () => {
    if (!visibilityCandidate) {
      return;
    }

    await toggleVisibility(visibilityCandidate);
    setVisibilityCandidate(null);
  };

  const closeDeletePopup = () => {
    if (!pendingAction.startsWith('delete:')) {
      setDeleteCandidate(null);
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleteCandidate) {
      return;
    }

    const item = deleteCandidate;
    const actionKey = `delete:${item.id}`;

    setActionError('');
    setPendingAction(actionKey);

    try {
      await deleteFoodCategory(item.id);
      setCategories((current) => current.filter((category) => String(category.id) !== String(item.id)));
      setDeleteCandidate(null);
      setSuccessKey('admin.catalogs.foodCategoryDeleteSuccess');
    } catch (requestError) {
      if (isLinkedFoodCategoryError(requestError)) {
        showLinkedFoodNotice();
        setDeleteCandidate(null);
      } else {
        setActionError(getActionError(requestError));
      }
    } finally {
      setPendingAction('');
    }
  };

  const saveItem = async (event) => {
    event.preventDefault();
    setActionError('');
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        nameVi: form.nameVi.trim() || null,
        hidden: form.hidden,
      };

      const response = editingItem
        ? await updateFoodCategory(editingItem.id, payload)
        : await createFoodCategory(payload);
      const successMessageKey = editingItem
        ? 'admin.catalogs.foodCategoryUpdateSuccess'
        : 'admin.catalogs.foodCategoryCreateSuccess';
      const data = response.data?.data ?? response.data ?? payload;
      const mappedItem = mapFoodCategory(data);

      setCategories((current) => {
        const withoutCurrent = editingItem
          ? current.filter((item) => String(item.id) !== String(editingItem.id))
          : current;

        return [...withoutCurrent, mappedItem].sort((left, right) => left.name.localeCompare(right.name));
      });

      const [categoryResponse, foodsResponse] = await Promise.all([
        getAdminFoodCategories(),
        getFoods({ page: 0, size: 1000 }).catch(() => null),
      ]);
      const foods = foodsResponse
        ? extractFoodsFromApi(foodsResponse.data).map(normalizeFoodFromApi)
        : [];
      const persistedCategories = extractCategoriesFromApi(categoryResponse.data)
        .map(mapFoodCategory)
        .map((category) => mapDerivedFoodCategory(category, foods))
        .filter((category) => category.id && (category.nameRaw || category.nameVi))
        .sort((left, right) => left.name.localeCompare(right.name));
      setCategories(persistedCategories);
      resetForm();
      setSuccessKey(successMessageKey);
    } catch (requestError) {
      setActionError(getActionError(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (type !== 'overview') {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <Link to="/admin/catalogs" className="admin-back-link" aria-label={t('admin.catalogs.back')} title={t('admin.catalogs.back')}>
              <FaArrowLeft />
            </Link>
          </div>
        </div>

        {loading && (
          <Alert variant="light" className="border d-flex align-items-center gap-2">
            <Spinner animation="border" size="sm" />
            {t('admin.catalogs.loading')}
          </Alert>
        )}
        <ErrorModal error={error || actionError} onClose={() => { setError(''); setActionError(''); }} />

        {!loading && !error && (
          <>
            <Row className="g-4 mb-4">
              <Col md={6}>
                <Card className="admin-mini-stat border-0 shadow-sm">
                  <Card.Body>
                    <div className="admin-mini-stat-icon">
                      {isFoodCategories ? <FaUtensils /> : <FaDumbbell />}
                    </div>
                    <div>
                      <span>{t('admin.catalogs.totalCategoryBlocks')}</span>
                      <strong>{categories.length}</strong>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="admin-mini-stat border-0 shadow-sm">
                  <Card.Body>
                    <div className="admin-mini-stat-icon">
                      <FaPlus />
                    </div>
                    <div>
                      <span>{t('admin.catalogs.totalDataItems')}</span>
                      <strong>{totalItems}</strong>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Card className="admin-card border-0 shadow-sm">
              <Card.Body>
                <div className="admin-table-toolbar">
                  <div>
                    <h3 className="h5 fw-bold mb-1">{t('admin.catalogs.categoryList')}</h3>
                  </div>
                  <Form className="admin-table-search">
                    <InputGroup>
                      <InputGroup.Text>
                        <FaSearch />
                      </InputGroup.Text>
                      <Form.Control
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={t('admin.catalogs.searchPlaceholder')}
                        aria-label={t('admin.catalogs.searchLabel')}
                      />
                    </InputGroup>
                  </Form>
                  {isFoodCategories && (
                    <Button
                      variant="success"
                      onClick={openCreateModal}
                      title={t('admin.catalogs.addCategory')}
                    >
                      {t('admin.catalogs.addCategory')}
                    </Button>
                  )}
                </div>
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0 admin-table">
                    <thead>
                      <tr>
                        <th>{t('admin.catalogs.categoryName')}</th>
                        <th>{t('admin.catalogs.itemCount')}</th>
                        <th>{t('admin.table.status')}</th>
                        <th className="text-end">{t('admin.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCategories.map((category) => {
                        const visibilityActionKey = `visibility:${category.id}`;
                        const deleteActionKey = `delete:${category.id}`;

                        return (
                          <tr key={category.id}>
                            <td className="fw-semibold">
                              {getLocalizedName({ name: category.nameRaw, nameVi: category.nameVi }, i18n.language)}
                              {isActivityCategories && (
                                <div className="small text-secondary">
                                  {category.category}
                                </div>
                              )}
                            </td>
                            <td>{category.count}</td>
                            <td>
                              <span className={`small fw-semibold text-${category.hidden ? 'secondary' : 'success'}`}>
                                {t(category.hidden ? 'admin.status.locked' : 'admin.status.active')}
                              </span>
                            </td>
                            <td className="text-end">
                              <div className="admin-row-actions">
                                <Button
                                  variant={category.hidden ? 'outline-primary' : 'outline-secondary'}
                                  size="sm"
                                  aria-label={t('admin.catalogs.toggleHidden')}
                                  title={t('admin.catalogs.toggleHidden')}
                                  disabled={pendingAction === visibilityActionKey}
                                  onClick={() => requestVisibilityChange(category)}
                                >
                                  {pendingAction === visibilityActionKey
                                    ? <Spinner animation="border" size="sm" />
                                    : category.hidden ? <FaEye /> : <FaEyeSlash />}
                                </Button>
                                {isFoodCategories && (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    aria-label={t('admin.actions.edit')}
                                    title={t('admin.actions.edit')}
                                    onClick={() => openEditModal(category)}
                                  >
                                    <FaEdit />
                                  </Button>
                                )}
                                {isFoodCategories && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    aria-label={t('admin.actions.delete')}
                                    title={t('admin.actions.delete')}
                                    disabled={pendingAction === deleteActionKey}
                                    onClick={() => requestDeleteItem(category)}
                                  >
                                    {pendingAction === deleteActionKey
                                      ? <Spinner animation="border" size="sm" />
                                      : <FaTrash />}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCategories.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center text-secondary py-4">
                            {t('admin.table.empty')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                <div className="d-flex flex-column align-items-center justify-content-center gap-2 mt-3">
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="pagination-arrow-btn"
                      aria-label={t('admin.table.previousPage')}
                      title={t('admin.table.previousPage')}
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      <FaArrowLeft />
                    </Button>
                    <span className="small text-secondary">
                      {currentPage}/{totalPages}
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="pagination-arrow-btn"
                      aria-label={t('admin.table.nextPage')}
                      title={t('admin.table.nextPage')}
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      <FaArrowRight />
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Modal show={showFormModal} onHide={resetForm} centered>
              <Form onSubmit={saveItem}>
                <Modal.Header closeButton>
                  <Modal.Title>
                    {t(editingItem ? 'admin.catalogs.editCategory' : 'admin.catalogs.addCategory')}
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Label>{t('admin.catalogs.categoryName')}</Form.Label>
                      <Form.Control
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        required
                      />
                    </Col>
                    <Col md={12}>
                      <Form.Label>{t('admin.catalogs.categoryName')} (VI)</Form.Label>
                      <Form.Control
                        value={form.nameVi}
                        onChange={(event) => setForm((current) => ({ ...current, nameVi: event.target.value }))}
                      />
                    </Col>
                    <Col md={12}>
                      <Form.Check
                        type="switch"
                        id="catalog-hidden"
                        label={t('admin.status.locked')}
                        checked={form.hidden}
                        onChange={(event) => setForm((current) => ({ ...current, hidden: event.target.checked }))}
                      />
                    </Col>
                  </Row>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    type="button"
                    variant="outline-secondary"
                    onClick={resetForm}
                    title={t('common.close')}
                  >
                    {t('common.close')}
                  </Button>
                  <Button
                    type="submit"
                    variant="success"
                    disabled={saving}
                    title={t(editingItem ? 'admin.actions.edit' : 'admin.catalogs.addCategory')}
                  >
                    {saving ? <Spinner animation="border" size="sm" /> : t(editingItem ? 'admin.actions.edit' : 'admin.catalogs.addCategory')}
                  </Button>
                </Modal.Footer>
              </Form>
            </Modal>

            <Modal show={Boolean(noticeKey)} onHide={() => setNoticeKey('')} centered>
              <Modal.Header closeButton>
                <Modal.Title>{t('admin.profile.notifications')}</Modal.Title>
              </Modal.Header>
              <Modal.Body>{noticeKey ? t(noticeKey) : ''}</Modal.Body>
              <Modal.Footer>
                <Button variant="success" onClick={() => setNoticeKey('')}>
                  {t('common.close')}
                </Button>
              </Modal.Footer>
            </Modal>

            <Modal show={Boolean(successKey)} onHide={() => setSuccessKey('')} centered>
              <Modal.Header closeButton>
                <Modal.Title>{t('admin.catalogs.successTitle')}</Modal.Title>
              </Modal.Header>
              <Modal.Body>{successKey ? t(successKey) : ''}</Modal.Body>
              <Modal.Footer>
                <Button variant="success" onClick={() => setSuccessKey('')}>
                  {t('common.close')}
                </Button>
              </Modal.Footer>
            </Modal>

            <Modal show={Boolean(visibilityCandidate)} onHide={closeVisibilityPopup} centered>
              <Modal.Header closeButton={!pendingAction.startsWith('visibility:')}>
                <Modal.Title>{t('admin.catalogs.visibilityConfirmTitle')}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {visibilityCandidate?.hidden
                  ? t(
                    isActivityCategories
                      ? 'admin.catalogs.showActivityCategoryConfirm'
                      : 'admin.catalogs.showFoodCategoryConfirm',
                    { name: visibilityCandidate?.name || '' }
                  )
                  : t(
                    isActivityCategories
                      ? 'admin.catalogs.hideActivityCategoryConfirm'
                      : 'admin.catalogs.hideFoodCategoryConfirm',
                    { name: visibilityCandidate?.name || '' }
                  )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={closeVisibilityPopup}
                  disabled={pendingAction.startsWith('visibility:')}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={confirmVisibilityChange}
                  disabled={pendingAction.startsWith('visibility:')}
                >
                  {pendingAction.startsWith('visibility:') ? <Spinner animation="border" size="sm" /> : t('admin.users.confirmAction')}
                </Button>
              </Modal.Footer>
            </Modal>

            <Modal show={Boolean(deleteCandidate)} onHide={closeDeletePopup} centered>
              <Modal.Header closeButton={!pendingAction.startsWith('delete:')}>
                <Modal.Title>{t('admin.catalogs.deleteConfirmTitle')}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {t('admin.catalogs.deleteFoodCategoryConfirm', {
                  name: deleteCandidate?.name || '',
                })}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={closeDeletePopup}
                  disabled={pendingAction.startsWith('delete:')}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={confirmDeleteItem}
                  disabled={pendingAction.startsWith('delete:')}
                >
                  {pendingAction.startsWith('delete:') ? <Spinner animation="border" size="sm" /> : t('admin.actions.delete')}
                </Button>
              </Modal.Footer>
            </Modal>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h2>{t('admin.catalogs.title')}</h2>
        </div>
      </div>

      <Row className="g-4">
        {catalogItems.map((item) => {
          const Icon = item.icon;

          return (
            <Col md={6} key={item.to}>
              <Card as={Link} to={item.to} className="admin-catalog-card border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="admin-mini-stat-icon">
                    <Icon />
                  </div>
                  <h3>{t(item.titleKey)}</h3>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </>
  );
}

export default AdminCatalogs;
