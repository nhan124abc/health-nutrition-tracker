import { useEffect, useMemo, useState } from 'react';
import { Alert, Col, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import FoodCatalogCard from './components/FoodCatalogCard';
import FoodDetailCard from './components/FoodDetailCard';
import {
  getFoodById,
  getFoodCategories,
  getFoods,
} from './nutritionService';
import {
  extractCategoriesFromApi,
  extractFoodFromApi,
  extractFoodsFromApi,
  filterFoods,
  normalizeCategory,
  normalizeFoodFromApi,
} from './nutritionUtils';

function Nutrition() {
  const { t } = useTranslation();
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedFood, setSelectedFood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const filteredFoods = useMemo(
    () => filterFoods(foods, query, category),
    [category, foods, query]
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

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('nutritionPage.title')}</h1>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

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
              onCategoryChange={setCategory}
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
    </>
  );
}

export default Nutrition;
