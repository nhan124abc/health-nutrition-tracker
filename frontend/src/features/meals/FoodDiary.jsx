import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ErrorModal from '../../components/ErrorModal';
import { useSearchParams } from 'react-router-dom';
import GoalFireworks from '../../components/GoalFireworks';
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
import { getMealById, getMealsByDate, updateMealCompletion } from './mealService';
import { getProfile } from '../profile/profileService';
import { extractProfileFromApi, mapProfileFromApi } from '../profile/profileUtils';

function FoodDiary() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get('date') || getTodayDate());
  const [meals, setMeals] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [loadingMealDetail, setLoadingMealDetail] = useState(false);
  const [mealError, setMealError] = useState('');
  const [selectedMealDetail, setSelectedMealDetail] = useState(null);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [showFireworks, setShowFireworks] = useState(false);
  const [updatingCompletionId, setUpdatingCompletionId] = useState(null);

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
  const completedMeals = useMemo(
    () => dayMeals.filter((meal) => meal.completed),
    [dayMeals]
  );
  const totals = useMemo(() => getMealsTotals(completedMeals), [completedMeals]);

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
      setMealError(error.response?.data?.message || t('foodDiaryPage.detailError'));
    } finally {
      setLoadingMealDetail(false);
    }
  };

  const toggleMealCompleted = async (meal) => {
    if (!meal.id || updatingCompletionId === meal.id) return;
    const nextCompleted = !meal.completed;
    setUpdatingCompletionId(meal.id);
    setMealError('');

    try {
      const response = await updateMealCompletion(meal.id, nextCompleted);
      const updatedMeal = normalizeMealFromApi(extractMealFromApi(response.data));
      setMeals((current) => current.map((item) => (
        item.id === meal.id ? { ...item, ...updatedMeal } : item
      )));
      if (nextCompleted) {
        setShowFireworks(true);
        window.setTimeout(() => setShowFireworks(false), 2400);
      }
    } catch (error) {
      setMealError(error.response?.data?.message || t('foodDiaryPage.completeError'));
    } finally {
      setUpdatingCompletionId(null);
    }
  };

  return (
    <>
      <GoalFireworks visible={showFireworks} />
      <div className="page-heading">
        <div>
          <h1>{t('foodDiaryPage.title')}</h1>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input className="form-control page-date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          <ErrorModal error={mealError} onClose={() => setMealError('')} />
          {loadingMeals && <div className="alert alert-light border">{t('foodDiaryPage.loadingMeals')}</div>}
          <div className="meal-card-stack">
            {!loadingMeals && dayMeals.length === 0 && (
              <Card className="border-0 shadow-sm meal-planner-card">
                <Card.Body className="text-secondary">{t('foodDiaryPage.notFound')}</Card.Body>
              </Card>
            )}
            {dayMeals.map((meal) => (
              <MealCard
                completed={meal.completed}
                key={meal.id}
                meal={meal}
                onOpen={openMealDetail}
                onToggleComplete={toggleMealCompleted}
                t={t}
              />
            ))}
          </div>
        </Col>

        <Col lg={4}>
          <DailyMealSummary calorieGoal={calorieGoal} mealCount={completedMeals.length} t={t} totals={totals} />
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
