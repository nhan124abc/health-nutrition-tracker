import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import CrudActions from '../../components/CrudActions';
import DailyMealSummary from './components/DailyMealSummary';
import MealCard from './components/MealCard';
import MealDetailModal from './components/MealDetailModal';
import MealFormModal from './components/MealFormModal';
import {
  buildMealFallback,
  emptyMeal,
  extractMealFromApi,
  extractMealsFromApi,
  getMealsTotals,
  getTodayDate,
  mapMealToApi,
  mapMealToForm,
  normalizeMealFromApi,
} from './mealUtils';
import { createMeal, deleteMealById, getMealById, getMealsByDate, updateMeal } from './mealService';

function FoodDiary() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [meals, setMeals] = useState([]);
  const [form, setForm] = useState(() => ({ ...emptyMeal, date: getTodayDate() }));
  const [showMealModal, setShowMealModal] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [loadingMealDetail, setLoadingMealDetail] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [mealError, setMealError] = useState('');
  const [selectedMealDetail, setSelectedMealDetail] = useState(null);
  const [editingMealId, setEditingMealId] = useState(null);

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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openMealModal = () => {
    setEditingMealId(null);
    setForm((current) => ({ ...current, date: selectedDate }));
    setShowMealModal(true);
  };

  const openEditMealModal = (meal) => {
    setMealError('');
    setEditingMealId(meal.id);
    setForm(mapMealToForm(meal));
    setShowMealModal(true);
  };

  const closeMealModal = () => {
    setShowMealModal(false);
    setEditingMealId(null);
    setForm({ ...emptyMeal, date: selectedDate });
  };

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

  const createNewMeal = async () => {
    const response = await createMeal(mapMealToApi(form));
    const createdMeal = normalizeMealFromApi(extractMealFromApi(response.data));

    setMeals((current) => {
      if (createdMeal.id && current.some((meal) => meal.id === createdMeal.id)) {
        return current;
      }

      return [...current, createdMeal];
    });
  };

  const updateCurrentMeal = async () => {
    if (!window.confirm(t('foodDiaryPage.confirmUpdateMeal'))) {
      return false;
    }

    const response = await updateMeal(editingMealId, mapMealToApi(form));
    const updatedMeal = normalizeMealFromApi(
      extractMealFromApi(response.data) || buildMealFallback(editingMealId, form)
    );

    setMeals((current) => current.map((meal) => (meal.id === editingMealId ? updatedMeal : meal)));
    setSelectedMealDetail((current) => (current?.id === editingMealId ? updatedMeal : current));
    return true;
  };

  const saveMeal = async () => {
    if (savingMeal) {
      return;
    }

    setMealError('');
    setSavingMeal(true);

    try {
      if (editingMealId) {
        const didUpdate = await updateCurrentMeal();

        if (!didUpdate) {
          return;
        }
      } else {
        await createNewMeal();
      }

      closeMealModal();
    } catch (error) {
      console.error('[FoodDiary] Error saving meal:', error);
      setMealError(error.response?.data?.message || 'Could not save meal.');
    } finally {
      setSavingMeal(false);
    }
  };

  const removeMeal = async (mealId) => {
    if (!window.confirm(t('foodDiaryPage.confirmDeleteMeal'))) {
      return;
    }

    setMealError('');

    try {
      await deleteMealById(mealId);
      setMeals((current) => current.filter((meal) => meal.id !== mealId));
      setSelectedMealDetail((current) => (current?.id === mealId ? null : current));
    } catch (error) {
      console.error('[FoodDiary] Error deleting meal:', error);
      setMealError(error.response?.data?.message || 'Could not delete meal.');
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('foodDiaryPage.badge')}</Badge>
          <h1>{t('foodDiaryPage.title')}</h1>
          <p>{t('foodDiaryPage.description')}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input className="form-control page-date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <CrudActions addLabel={t('foodDiaryPage.createMeal')} onAdd={openMealModal} size={null} />
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
                onDelete={removeMeal}
                onEdit={openEditMealModal}
                onOpen={openMealDetail}
                t={t}
              />
            ))}
          </div>
        </Col>

        <Col lg={4}>
          <DailyMealSummary mealCount={dayMeals.length} t={t} totals={totals} />
        </Col>
      </Row>

      <MealFormModal
        editingMealId={editingMealId}
        form={form}
        onChange={handleChange}
        onClose={closeMealModal}
        onSave={saveMeal}
        savingMeal={savingMeal}
        show={showMealModal}
        t={t}
      />

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
