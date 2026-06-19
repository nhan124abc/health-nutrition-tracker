import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa';
import FoodCatalogCard from './components/FoodCatalogCard';
import FoodDetailCard from './components/FoodDetailCard';
import FoodFormModal from './components/FoodFormModal';
import {
  createFood,
  deleteFood,
  getFoodById,
  getFoodCategories,
  getFoods,
  updateFood,
} from './nutritionService';
import {
  emptyFood,
  extractCategoriesFromApi,
  extractFoodFromApi,
  extractFoodsFromApi,
  filterFoods,
  mapFoodToApi,
  mapFoodToForm,
  normalizeCategory,
  normalizeFoodFromApi,
} from './nutritionUtils';

function Nutrition() {
  const { t } = useTranslation();
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [imageSearchName, setImageSearchName] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [newFood, setNewFood] = useState(emptyFood);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const filteredFoods = useMemo(
    () => filterFoods(foods, query, category, imageSearchName),
    [category, foods, imageSearchName, query]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadNutritionData() {
      setLoading(true);
      setError('');

      try {
        const [foodsResponse, categoriesResponse] = await Promise.all([
          getFoods({ page: 0, size: 100 }),
          getFoodCategories(),
        ]);

        if (!isMounted) {
          return;
        }

        const normalizedFoods = extractFoodsFromApi(foodsResponse.data).map(normalizeFoodFromApi);
        const normalizedCategories = extractCategoriesFromApi(categoriesResponse.data).map(normalizeCategory);

        setFoods(normalizedFoods);
        setCategories(normalizedCategories);
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

  const handleNewFoodChange = (event) => {
    const { name, value } = event.target;
    setNewFood((current) => ({ ...current, [name]: value }));
  };

  const handleImageSearch = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setImageSearchName('');
      setImagePreview('');
      return;
    }

    setImageSearchName(file.name);

    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const clearImageSearch = () => {
    setImageSearchName('');
    setImagePreview('');
  };

  const openCreateModal = () => {
    setError('');
    setSaved(false);
    setEditingFoodId(null);
    setNewFood({ ...emptyFood, categoryId: categories[0]?.id || '' });
    setShowCreateModal(true);
  };

  const openEditModal = (food) => {
    setError('');
    setSaved(false);
    setEditingFoodId(food.id);
    setNewFood(mapFoodToForm(food));
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingFoodId(null);
    setNewFood(emptyFood);
  };

  const selectFood = async (food) => {
    setSelectedFood(food);
    setLoadingDetail(true);
    setError('');

    try {
      const response = await getFoodById(food.id);
      setSelectedFood(normalizeFoodFromApi(extractFoodFromApi(response.data)));
    } catch (requestError) {
      console.error('[Nutrition] Error loading food detail:', requestError);
      setError(requestError.response?.data?.message || t('nutritionPage.detailError'));
    } finally {
      setLoadingDetail(false);
    }
  };

  const saveFood = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const payload = mapFoodToApi(newFood);

      if (editingFoodId) {
        const response = await updateFood(editingFoodId, payload);
        const responseFood = extractFoodFromApi(response.data) || {};
        const updatedFood = normalizeFoodFromApi({
          ...payload,
          ...responseFood,
          id: responseFood.id ?? responseFood.foodId ?? editingFoodId,
          category: responseFood.category || categories.find(
            (item) => String(item.id) === String(newFood.categoryId)
          ),
        });

        setFoods((current) => current.map((food) => (
          food.id === editingFoodId ? updatedFood : food
        )));
        setSelectedFood(updatedFood);
      } else {
        const response = await createFood(payload);
        const createdFood = normalizeFoodFromApi(extractFoodFromApi(response.data));

        setFoods((current) => [createdFood, ...current]);
        setSelectedFood(createdFood);
      }

      closeCreateModal();
      setSaved(true);
    } catch (requestError) {
      console.error('[Nutrition] Error saving food:', requestError);
      setError(requestError.response?.data?.message || t('nutritionPage.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const removeFood = async (foodId) => {
    if (!window.confirm(t('nutritionPage.confirmDeleteFood'))) {
      return;
    }

    setError('');

    try {
      await deleteFood(foodId);
      setFoods((current) => {
        const remainingFoods = current.filter((food) => food.id !== foodId);

        setSelectedFood((selected) => (
          selected?.id === foodId ? remainingFoods[0] || null : selected
        ));
        return remainingFoods;
      });
    } catch (requestError) {
      console.error('[Nutrition] Error deleting food:', requestError);
      setError(requestError.response?.data?.message || t('nutritionPage.deleteError'));
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('nutritionPage.badge')}</Badge>
          <h1>{t('nutritionPage.title')}</h1>
        </div>
        <Button variant="success" onClick={openCreateModal}>
          <FaPlus className="me-2" />
          {t('nutritionPage.addFood')}
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">{t('nutritionPage.savedMessage')}</Alert>}

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
              foods={filteredFoods}
              imagePreview={imagePreview}
              imageSearchName={imageSearchName}
              onCategoryChange={setCategory}
              onClearImage={clearImageSearch}
              onImageSearch={handleImageSearch}
              onDeleteFood={removeFood}
              onEditFood={openEditModal}
              onQueryChange={setQuery}
              onSelectFood={selectFood}
              query={query}
              t={t}
            />
          </Col>

          <Col lg={4}>
            {loadingDetail
              ? <div className="alert alert-light border">{t('nutritionPage.loadingDetail')}</div>
              : <FoodDetailCard food={selectedFood} t={t} />}
          </Col>
        </Row>
      )}

      <FoodFormModal
        categories={categories}
        editingFoodId={editingFoodId}
        food={newFood}
        onChange={handleNewFoodChange}
        onClose={closeCreateModal}
        onSave={saveFood}
        saving={saving}
        show={showCreateModal}
        t={t}
      />
    </>
  );
}

export default Nutrition;
