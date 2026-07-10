import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaTrashAlt } from 'react-icons/fa';
import { getCurrentUser, getCurrentUserRole } from '../../api/api';
import ErrorModal from '../../components/ErrorModal';
import { getLocalizedName } from '../../utils/localizedName';
import FoodCatalogCard from './components/FoodCatalogCard';
import FoodDetailCard from './components/FoodDetailCard';
import {
  getFoodById,
  getFoodCategories,
  getFoods,
  createFood,
  deleteUserFood,
  updateFood,
} from './nutritionService';
import {
  deriveCategoriesFromFoods,
  extractCategoriesFromApi,
  extractFoodFromApi,
  extractFoodsFromApi,
  filterFoods,
  emptyFood,
  mapFoodToApi,
  mapFoodToForm,
  normalizeCategory,
  normalizeFoodFromApi,
} from './nutritionUtils';

const FOOD_PAGE_SIZE = 30;

function Nutrition() {
  const { i18n, t } = useTranslation();
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedFood, setSelectedFood] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyFood);
  const [editingFood, setEditingFood] = useState(null);
  const [pendingDeleteFood, setPendingDeleteFood] = useState(null);
  const [deletingFood, setDeletingFood] = useState(false);
  const [savingFood, setSavingFood] = useState(false);
  const [error, setError] = useState('');
  const currentUser = getCurrentUser();
  const currentUserRole = getCurrentUserRole();
  const currentUserId = currentUser?.id ?? currentUser?.userId;

  const filteredFoods = useMemo(
    () => filterFoods(foods, query, category, i18n.language),
    [category, foods, i18n.language, query]
  );
  const totalPages = Math.max(1, Math.ceil(filteredFoods.length / FOOD_PAGE_SIZE));
  const paginatedFoods = useMemo(() => {
    const startIndex = (currentPage - 1) * FOOD_PAGE_SIZE;
    return filteredFoods.slice(startIndex, startIndex + FOOD_PAGE_SIZE);
  }, [currentPage, filteredFoods]);

  useEffect(() => {
    setCurrentPage(1);
  }, [category, query, i18n.language]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    let isMounted = true;

    async function loadNutritionData() {
      setLoading(true);
      setError('');

      try {
        const [foodsResult, categoriesResult] = await Promise.allSettled([
          getFoods({ page: 0, size: 1000 }),
          getFoodCategories(),
        ]);

        if (foodsResult.status === 'rejected') {
          throw foodsResult.reason;
        }

        if (!isMounted) {
          return;
        }

        const normalizedFoods = extractFoodsFromApi(foodsResult.value.data).map(normalizeFoodFromApi);
        const normalizedCategories = categoriesResult.status === 'fulfilled'
          ? extractCategoriesFromApi(categoriesResult.value.data).map(normalizeCategory)
          : deriveCategoriesFromFoods(normalizedFoods);

        setFoods(normalizedFoods);
        setCategories(normalizedCategories.length ? normalizedCategories : deriveCategoriesFromFoods(normalizedFoods));
        setSelectedFood(normalizedFoods[0] || null);
      } catch (requestError) {
        console.error('[Nutrition] Error loading nutrition data:', requestError);

        if (isMounted) {
          setFoods([]);
          setCategories([]);
          setSelectedFood(null);
          setError(requestError.response?.data?.message || t('nutritionPage.loadError'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadNutritionData();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const selectFood = async (food) => {
    setSelectedFood(food);
    setLoadingDetail(true);
    setError('');

    try {
      const response = await getFoodById(food.id);
      const detailedFood = normalizeFoodFromApi(extractFoodFromApi(response.data));
      setSelectedFood({
        ...detailedFood,
        createdByUserId: detailedFood.createdByUserId ?? food.createdByUserId ?? null,
      });
    } catch (requestError) {
      console.error('[Nutrition] Error loading food detail:', requestError);
      setError(requestError.response?.data?.message || t('nutritionPage.detailError'));
    } finally {
      setLoadingDetail(false);
    }
  };

  const updateCreateForm = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateFood = async (event) => {
    event.preventDefault();
    const requiredNumberFields = ['servingSize', 'calories', 'protein', 'carbs', 'fat'];
    const invalidNumberField = requiredNumberFields.find((field) => {
      const value = Number(String(createForm[field] || '').trim().replace(',', '.'));
      return !Number.isFinite(value) || value < (field === 'servingSize' ? 0.1 : 0);
    });

    if (!createForm.name.trim() || invalidNumberField) {
      setError(t('nutritionPage.requiredMetricsError'));
      return;
    }

    setSavingFood(true);
    setError('');

    try {
      const response = editingFood
        ? await updateFood(editingFood.id, mapFoodToApi(createForm))
        : await createFood(mapFoodToApi(createForm));
      const normalizedSavedFood = normalizeFoodFromApi(extractFoodFromApi(response.data));
      const savedFood = {
        ...normalizedSavedFood,
        createdByUserId: normalizedSavedFood.createdByUserId ?? editingFood?.createdByUserId ?? currentUserId ?? null,
      };

      setFoods((currentFoods) => {
        if (editingFood) {
          return currentFoods.map((item) => (String(item.id) === String(savedFood.id) ? savedFood : item));
        }
        return [savedFood, ...currentFoods];
      });
      setSelectedFood(savedFood);
      setCreateForm(emptyFood);
      setEditingFood(null);
      setShowCreateModal(false);
    } catch (requestError) {
      console.error('[Nutrition] Error creating food:', requestError);
      setError(requestError.response?.data?.message || t(editingFood ? 'nutritionPage.saveError' : 'nutritionPage.createError'));
    } finally {
      setSavingFood(false);
    }
  };

  const canManageFood = (food) => {
    if (!food) {
      return false;
    }

    const isAdmin = currentUserRole === 'ADMIN';
    const isOwner = food.createdByUserId != null
      && currentUserId != null
      && String(food.createdByUserId) === String(currentUserId);

    return isAdmin || isOwner;
  };

  const startEditFood = (food) => {
    setEditingFood(food);
    setCreateForm(mapFoodToForm(food));
    setShowCreateModal(true);
  };

  const closeFoodModal = () => {
    setShowCreateModal(false);
    setEditingFood(null);
    setCreateForm(emptyFood);
  };

  const handleDeleteFood = (food) => {
    setPendingDeleteFood(food);
  };

  const confirmDeleteFood = async () => {
    if (!pendingDeleteFood) {
      return;
    }

    setDeletingFood(true);
    try {
      await deleteUserFood(pendingDeleteFood.id);
      setFoods((currentFoods) => currentFoods.filter((item) => String(item.id) !== String(pendingDeleteFood.id)));
      setSelectedFood((currentFood) => {
        if (String(currentFood?.id) !== String(pendingDeleteFood.id)) {
          return currentFood;
        }
        return foods.find((item) => String(item.id) !== String(pendingDeleteFood.id)) || null;
      });
      setPendingDeleteFood(null);
    } catch (requestError) {
      console.error('[Nutrition] Error deleting food:', requestError);
      setError(requestError.response?.data?.message || t('nutritionPage.deleteError'));
    } finally {
      setDeletingFood(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('nutritionPage.title')}</h1>
        </div>
        <Button variant="success" onClick={() => {
          setEditingFood(null);
          setCreateForm(emptyFood);
          setShowCreateModal(true);
        }}>
          {t('nutritionPage.addFood')}
        </Button>
      </div>

      <ErrorModal error={error} onClose={() => setError('')} />

      {loading ? (
        <div className="py-5 text-center text-secondary">
          <Spinner animation="border" variant="success" className="mb-3" />
          <div>{t('nutritionPage.loading')}</div>
        </div>
      ) : (
        <Row className="g-4">
          <Col lg={8}>
            <FoodCatalogCard
              categories={categories}
              category={category}
              currentPage={currentPage}
              foods={paginatedFoods}
              onPageChange={setCurrentPage}
              onCategoryChange={setCategory}
              onQueryChange={setQuery}
              onSelectFood={selectFood}
              pageInfo={t('plannerPage.foodPageInfo', {
                page: currentPage,
                total: totalPages,
                count: filteredFoods.length,
              })}
              query={query}
              t={t}
              language={i18n.language}
              totalPages={totalPages}
            />
          </Col>

          <Col lg={4}>
            {loadingDetail
              ? <div className="alert alert-light border">{t('nutritionPage.loadingDetail')}</div>
              : (
                <FoodDetailCard
                  canDelete={canManageFood(selectedFood)}
                  canEdit={canManageFood(selectedFood)}
                  food={selectedFood}
                  language={i18n.language}
                  onDelete={handleDeleteFood}
                  onEdit={startEditFood}
                  t={t}
                />
              )}
          </Col>
        </Row>
      )}

      <Modal show={showCreateModal} onHide={closeFoodModal} centered size="lg">
        <Form onSubmit={handleCreateFood}>
          <Modal.Header closeButton>
            <Modal.Title>{editingFood ? t('nutritionPage.editFood') : t('nutritionPage.addFood')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>{i18n.language?.startsWith('vi') ? 'Tên thực phẩm' : 'Food name'}</Form.Label>
                <Form.Control value={createForm.name} onChange={(event) => updateCreateForm('name', event.target.value)} required />
              </Col>
              <Col md={6}>
                <Form.Label>{t('nutritionPage.fields.nameVi')}</Form.Label>
                <Form.Control value={createForm.nameVi} onChange={(event) => updateCreateForm('nameVi', event.target.value)} />
              </Col>
              <Col md={6}>
                <Form.Label>{i18n.language?.startsWith('vi') ? 'Danh mục' : 'Category'}</Form.Label>
                <Form.Select value={createForm.categoryId} onChange={(event) => updateCreateForm('categoryId', event.target.value)}>
                  <option value="">{t('nutritionPage.noCategory')}</option>
                  {categories.map((item) => (
                    <option value={item.id} key={item.id}>{getLocalizedName(item, i18n.language)}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>{i18n.language?.startsWith('vi') ? 'Khẩu phần (g)' : 'Serving size (g)'}</Form.Label>
                  <Form.Control inputMode="decimal" min="0.1" value={createForm.servingSize} onChange={(event) => updateCreateForm('servingSize', event.target.value)} required />
              </Col>
              {[
                ['calories', 'Calories'],
                ['protein', 'Protein (g)'],
                ['carbs', 'Carbs (g)'],
                ['fat', 'Fat (g)'],
                ['fiber', 'Fiber (g)'],
                ['sugar', 'Sugar (g)'],
                ['sodium', 'Sodium (mg)'],
              ].map(([field, label]) => (
                <Col md={4} sm={6} key={field}>
                  <Form.Label>{label}</Form.Label>
                  <Form.Control inputMode="decimal" min="0" value={createForm[field]} onChange={(event) => updateCreateForm(field, event.target.value)} required={['calories', 'protein', 'carbs', 'fat'].includes(field)} />
                </Col>
              ))}
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeFoodModal} disabled={savingFood}>
              {t('common.close')}
            </Button>
            <Button variant="success" type="submit" disabled={savingFood}>
              {savingFood ? t('nutritionPage.saving') : t('common.save')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(pendingDeleteFood)} onHide={() => setPendingDeleteFood(null)} centered className="logout-confirm-modal">
        <Modal.Header closeButton className="logout-confirm-header">
          <div className="logout-confirm-icon">
            <FaTrashAlt />
          </div>
          <Modal.Title>{t('waterPage.confirmDeleteTitle', 'Xác nhận xóa')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="logout-confirm-body">
          {t('nutritionPage.confirmDeleteFood')}
        </Modal.Body>
        <Modal.Footer className="logout-confirm-footer">
          <Button variant="outline-secondary" className="logout-confirm-cancel" onClick={() => setPendingDeleteFood(null)} disabled={deletingFood}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" className="logout-confirm-submit" onClick={confirmDeleteFood} disabled={deletingFood}>
            {deletingFood ? t('common.deleting') : t('nutritionPage.deleteAction')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Nutrition;
