import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa';
import FoodCatalogCard from './components/FoodCatalogCard';
import FoodDetailCard from './components/FoodDetailCard';
import FoodFormModal from './components/FoodFormModal';
import { createFood, getFoodById, getFoodCategories, getFoods } from './nutritionService';
import {
  emptyFood,
  extractCategoriesFromApi,
  extractFoodFromApi,
  extractFoodsFromApi,
  filterFoods,
  mapFoodToApi,
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
    setNewFood({ ...emptyFood, categoryId: categories[0]?.id || '' });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
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
      const response = await createFood(mapFoodToApi(newFood));
      const createdFood = normalizeFoodFromApi(extractFoodFromApi(response.data));

      setFoods((current) => [createdFood, ...current]);
      setSelectedFood(createdFood);
      closeCreateModal();
      setSaved(true);
    } catch (requestError) {
      console.error('[Nutrition] Error saving food:', requestError);
      setError(requestError.response?.data?.message || t('nutritionPage.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('nutritionPage.badge')}</Badge>
          <h1>{t('nutritionPage.title')}</h1>
          <p>{t('nutritionPage.description')}</p>
        </div>
        <Button variant="success" onClick={openCreateModal} disabled={loading || categories.length === 0}>
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
