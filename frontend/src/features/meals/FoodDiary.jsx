import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import DailyMealSummary from './components/DailyMealSummary';
import MealCard from './components/MealCard';
import MealDetailModal from './components/MealDetailModal';
import {
  extractMealFromApi,
  extractMealsFromApi,
  getMealsTotals,
  getTodayDate,
  normalizeMealFromApi,
} from './mealUtils';
import { getMealById, getMealsByDate } from './mealService';
import { getProfile } from '../profile/profileService';
import { extractProfileFromApi, mapProfileFromApi } from '../profile/profileUtils';

function FoodDiary() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [meals, setMeals] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [loadingMealDetail, setLoadingMealDetail] = useState(false);
  const [mealError, setMealError] = useState('');
  const [selectedMealDetail, setSelectedMealDetail] = useState(null);
  const [calorieGoal, setCalorieGoal] = useState(2000);

  useEffect(() => {
    getProfile().then((response) => {
      const value = mapProfileFromApi(extractProfileFromApi(response.data)).dailyCalorieGoal;
      if (Number(value) > 0) setCalorieGoal(Number(value));
    }).catch(() => {});
  }, []);

  const dayMeals = useMemo(
    () => meals.filter((meal) => meal.date === selectedDate),
    [meals, selectedDate]
  );
  const totals = useMemo(() => getMealsTotals(dayMeals), [dayMeals]);

  useEffect(() => {
    let isMounted = true;

    async function fetchMeals() {
      setLoadingMeals(true);
      setMealError('');

      try {
        const response = await getMealsByDate(selectedDate);
        const normalizedMeals = extractMealsFromApi(response.data).map(normalizeMealFromApi);

        if (isMounted) {
          setMeals(normalizedMeals);
        }
      } catch (error) {
        console.error('[FoodDiary] Error fetching meals:', error);

        if (isMounted) {
          setMeals([]);
          setMealError(error.response?.data?.message || 'Could not load meals.');
        }
      } finally {
        if (isMounted) {
          setLoadingMeals(false);
        }
      }
    }

    fetchMeals();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const openMealDetail = async (meal) => {
    setMealError('');
    setSelectedMealDetail(meal);
    setLoadingMealDetail(true);

    try {
      const response = await getMealById(meal.id);
      setSelectedMealDetail(normalizeMealFromApi(extractMealFromApi(response.data)));
    } catch (error) {
      console.error('[FoodDiary] Error fetching meal detail:', error);
      setMealError(error.response?.data?.message || 'Could not load meal detail.');
    } finally {
      setLoadingMealDetail(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('foodDiaryPage.badge')}</Badge>
          <h1>{t('foodDiaryPage.title')}</h1>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input className="form-control page-date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          {mealError && <div className="alert alert-danger">{mealError}</div>}
          {loadingMeals && <div className="alert alert-light border">{t('foodDiaryPage.loadingMeals')}</div>}
          <div className="meal-card-stack">
            {!loadingMeals && dayMeals.length === 0 && (
              <Card className="border-0 shadow-sm meal-planner-card">
                <Card.Body className="text-secondary">{t('foodDiaryPage.notFound')}</Card.Body>
              </Card>
            )}
            {dayMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onOpen={openMealDetail}
                t={t}
              />
            ))}
          </div>
        </Col>

        <Col lg={4}>
          <DailyMealSummary calorieGoal={calorieGoal} mealCount={dayMeals.length} t={t} totals={totals} />
        </Col>
      </Row>

      <MealDetailModal
        loading={loadingMealDetail}
        meal={selectedMealDetail}
        onClose={() => setSelectedMealDetail(null)}
        t={t}
      />
    </>
  );
}

export default FoodDiary;
