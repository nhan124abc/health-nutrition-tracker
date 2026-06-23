import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaDumbbell, FaEdit, FaEye, FaPlus, FaTrash, FaUtensils } from 'react-icons/fa';
import { getActivityTypes } from '../../features/activities/activityService';
import { extractActivityTypesFromApi, normalizeActivityType } from '../../features/activities/activityUtils';
import { getFoods } from '../../features/nutrition/nutritionService';
import { cleanText } from '../../features/nutrition/nutritionUtils';

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

function extractPage(payload) {
  const data = payload?.data ?? payload ?? {};
  return {
    content: Array.isArray(data.content) ? data.content : [],
    totalPages: Number(data.totalPages) || 0,
  };
}

async function loadAllFoods() {
  const firstResponse = await getFoods({ page: 0, size: 100 });
  const firstPage = extractPage(firstResponse.data);

  if (firstPage.totalPages <= 1) {
    return firstPage.content;
  }

  const remainingResponses = await Promise.all(
    Array.from(
      { length: firstPage.totalPages - 1 },
      (_, index) => getFoods({ page: index + 1, size: 100 })
    )
  );

  return [
    ...firstPage.content,
    ...remainingResponses.flatMap((response) => extractPage(response.data).content),
  ];
}

function groupByCategory(items, getCategory) {
  return Object.values(items.reduce((groups, item) => {
    const category = getCategory(item) || 'other';
    const key = String(category).toLowerCase();

    return {
      ...groups,
      [key]: {
        id: groups[key]?.id || key,
        name: groups[key]?.name || category,
        count: (groups[key]?.count || 0) + 1,
        hidden: groups[key]?.hidden || false,
      },
    };
  }, {})).sort((left, right) => left.name.localeCompare(right.name));
}

function AdminCatalogs({ type = 'overview' }) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(type !== 'overview');
  const [error, setError] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
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

      try {
        if (isFoodCategories) {
          const foods = await loadAllFoods();
          const groupedFoods = groupByCategory(foods, (food) =>
            cleanText(food.categoryName)
            || cleanText(food.category)
            || cleanText(food.foodGroup)
            || cleanText(food.brandName)
          );

          if (isActive) {
            setCategories(groupedFoods);
          }
        } else if (isActivityCategories) {
          const response = await getActivityTypes();
          const activityTypes = extractActivityTypesFromApi(response.data).map(normalizeActivityType);

          if (isActive) {
            setCategories(groupByCategory(activityTypes, (activity) => activity.category));
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

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setShowCategoryModal(true);
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const saveCategory = (event) => {
    event.preventDefault();
    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      return;
    }

    if (editingCategory) {
      setCategories((current) => current.map((category) =>
        category.id === editingCategory.id ? { ...category, name: trimmedName } : category
      ));
    } else {
      setCategories((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          name: trimmedName,
          count: 0,
          hidden: false,
        },
      ].sort((left, right) => left.name.localeCompare(right.name)));
    }

    closeCategoryModal();
  };

  const deleteCategory = (category) => {
    setCategories((current) => current.filter((item) => item.id !== category.id));
  };

  const toggleCategoryHidden = (category) => {
    setCategories((current) => current.map((item) =>
      item.id === category.id ? { ...item, hidden: !item.hidden } : item
    ));
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
        {error && <Alert variant="danger">{error}</Alert>}

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
                <Button
                  variant="success"
                  className="admin-catalog-add-action"
                  onClick={openAddCategory}
                  aria-label={t('admin.catalogs.addCategory')}
                  title={t('admin.catalogs.addCategory')}
                >
                  <FaPlus />
                </Button>
              </div>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0 admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.catalogs.categoryName')}</th>
                      <th>{t('admin.table.status')}</th>
                      <th className="text-end">{t('admin.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td className="fw-semibold">{category.name}</td>
                        <td>
                          <span className={`small fw-semibold text-${category.hidden ? 'secondary' : 'success'}`}>
                            {t(category.hidden ? 'admin.catalogs.hidden' : 'admin.catalogs.visible')}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="admin-row-actions">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => toggleCategoryHidden(category)}
                              aria-label={t('admin.catalogs.toggleHidden')}
                              title={t('admin.catalogs.toggleHidden')}
                            >
                              <FaEye />
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => openEditCategory(category)}
                              aria-label={t('admin.actions.edit')}
                              title={t('admin.actions.edit')}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => deleteCategory(category)}
                              aria-label={t('admin.actions.delete')}
                              title={t('admin.actions.delete')}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center text-secondary py-4">
                          {t('admin.table.empty')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              </Card.Body>
            </Card>
          </>
        )}

        <Modal show={showCategoryModal} onHide={closeCategoryModal} centered>
          <Form onSubmit={saveCategory}>
            <Modal.Header closeButton>
              <Modal.Title>
                {editingCategory ? t('admin.catalogs.editCategory') : t('admin.catalogs.addCategory')}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group>
                <Form.Label>{t('admin.catalogs.categoryName')}</Form.Label>
                <Form.Control
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  autoFocus
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={closeCategoryModal}>
                {t('common.cancel')}
              </Button>
              <Button variant="success" type="submit">
                {t('common.save')}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
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
                  <p>{t(item.descriptionKey)}</p>
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
