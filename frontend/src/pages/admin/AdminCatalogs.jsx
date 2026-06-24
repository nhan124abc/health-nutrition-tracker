import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaDumbbell, FaEdit, FaEyeSlash, FaPlus, FaTrash, FaUtensils } from 'react-icons/fa';
import { getActivityTypes } from '../../features/activities/activityService';
import { extractActivityTypesFromApi, normalizeActivityType } from '../../features/activities/activityUtils';
import { getFoodCategories, getFoods } from '../../features/nutrition/nutritionService';
import {
  cleanText,
  deriveCategoriesFromFoods,
  extractCategoriesFromApi,
  extractFoodsFromApi,
  normalizeCategory,
  normalizeFoodFromApi,
} from '../../features/nutrition/nutritionUtils';

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

function groupByCategory(items, getCategory, getName = (category) => category) {
  return Object.values(items.reduce((groups, item) => {
    const category = getCategory(item) || 'other';
    const key = String(category).toLowerCase();

    return {
      ...groups,
      [key]: {
        id: groups[key]?.id || key,
        name: groups[key]?.name || getName(key, category),
        count: (groups[key]?.count || 0) + 1,
      },
    };
  }, {})).sort((left, right) => left.name.localeCompare(right.name));
}

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
  const name = normalizedCategory.nameVi || normalizedCategory.name;

  return {
    id: normalizedCategory.id ?? cleanText(name).toLowerCase(),
    name: name || '-',
    count: getCategoryItemCount(category),
  };
}

function mapDerivedFoodCategory(category, foods) {
  return {
    ...category,
    count: foods.filter((food) => String(food.categoryId || food.category) === String(category.id)).length,
  };
}

async function loadFoodCategoriesFromFoods() {
  const response = await getFoods({ page: 0, size: 500 });
  const foods = extractFoodsFromApi(response.data).map(normalizeFoodFromApi);

  return deriveCategoriesFromFoods(foods).map((category) => mapDerivedFoodCategory(category, foods));
}

function AdminCatalogs({ type = 'overview' }) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(type !== 'overview');
  const [error, setError] = useState('');
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
          const response = await getFoodCategories();
          const foodCategories = extractCategoriesFromApi(response.data)
            .map(mapFoodCategory)
            .filter((category) => category.id && category.name)
            .sort((left, right) => left.name.localeCompare(right.name));
          const categoriesFromDb = foodCategories.length
            ? foodCategories
            : await loadFoodCategoriesFromFoods();

          if (isActive) {
            setCategories(categoriesFromDb);
          }
        } else if (isActivityCategories) {
          const response = await getActivityTypes();
          const activityTypes = extractActivityTypesFromApi(response.data).map(normalizeActivityType);

          if (isActive) {
            setCategories(groupByCategory(
              activityTypes,
              (activity) => activity.category,
              (category) => t(`activityPage.categories.${category}`)
            ));
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
                          <span className="small fw-semibold text-success">
                            {t('admin.catalogs.visible')}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="admin-row-actions">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              aria-label={t('admin.catalogs.toggleHidden')}
                              title={t('admin.catalogs.toggleHidden')}
                              disabled
                            >
                              <FaEyeSlash />
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              aria-label={t('admin.actions.edit')}
                              title={t('admin.actions.edit')}
                              disabled
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              aria-label={t('admin.actions.delete')}
                              title={t('admin.actions.delete')}
                              disabled
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
