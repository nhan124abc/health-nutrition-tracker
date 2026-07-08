import { useEffect, useMemo, useState } from 'react';
import { Col, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ErrorModal from '../../components/ErrorModal';
import FoodCatalogCard from './components/FoodCatalogCard';
import FoodDetailCard from './components/FoodDetailCard';
import {
  getFoodById,
  getFoodCategories,
  getFoods,
} from './nutritionService';
import {
  deriveCategoriesFromFoods,
  extractCategoriesFromApi,
  extractFoodFromApi,
  extractFoodsFromApi,
  filterFoods,
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
  const [error, setError] = useState('');

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
              : <FoodDetailCard food={selectedFood} language={i18n.language} t={t} />}
          </Col>
        </Row>
      )}
    </>
  );
}

export default Nutrition;
