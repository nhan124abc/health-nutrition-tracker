import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBookOpen, FaCalendarAlt, FaCheck, FaDumbbell, FaFireAlt, FaRobot, FaUtensils } from 'react-icons/fa';
import { getAiPlanSuggestions } from '../features/ai/aiService';
import { createMeal, getMealsByDate, deleteMealById } from '../features/meals/mealService';
import { extractMealsFromApi, getMealsTotals, normalizeMealFromApi } from '../features/meals/mealUtils';
import { getProfile } from '../features/profile/profileService';
import { extractProfileFromApi, mapProfileFromApi } from '../features/profile/profileUtils';
import { getActivitiesByDate, createActivityLog, deleteActivityById, getActivityTypes } from '../features/activities/activityService';
import { extractActivityTypesFromApi, normalizeActivityType } from '../features/activities/activityUtils';
import { getFoods, getRecipeSuggestions } from '../features/nutrition/nutritionService';

function today() {
  return new Date().toLocaleDateString('en-CA');
}

const mealTypes = [
  ['breakfast', 'plannerPage.mealTypes.breakfast'],
  ['lunch', 'plannerPage.mealTypes.lunch'],
  ['dinner', 'plannerPage.mealTypes.dinner'],
  ['afternoon_snack', 'plannerPage.mealTypes.snack'],
  ['exercise', 'plannerPage.mealTypes.exercise'],
];

const maxSelectedFoods = 6;
const maxSelectedActivities = 4;

function Planner() {
  const { i18n, t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [plannerMode, setPlannerMode] = useState('meal');
  const [selectedMeal, setSelectedMeal] = useState('lunch');
  const [planDate, setPlanDate] = useState(today());
  const [foodOptions, setFoodOptions] = useState([]);
  const [selectedFoodNames, setSelectedFoodNames] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [activityOptions, setActivityOptions] = useState([]);
  const [selectedActivityNames, setSelectedActivityNames] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loggingActivity, setLoggingActivity] = useState(null);
  const [deletingActivityId, setDeletingActivityId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suggestedNames, setSuggestedNames] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('plannerSuggestedNames')) || {}; } catch { return {}; }
  });
  const [suggestionOffsets, setSuggestionOffsets] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('plannerSuggestionOffsets')) || {}; } catch { return {}; }
  });

  const totals = useMemo(() => getMealsTotals(meals), [meals]);
  const calorieGoal = Number(profile?.dailyCalorieGoal) || 2000;
  const remaining = Math.max(0, calorieGoal - totals.calories);
  const hasInvalidDailyTotal = totals.calories > calorieGoal * 2;
  const progress = Math.round((totals.calories / Math.max(calorieGoal, 1)) * 100);
  const selectedFoodCount = selectedFoodNames.length;
  const selectedActivityCount = selectedActivityNames.length;
  const isRecipeMode = plannerMode === 'recipes';
  const isExerciseMode = plannerMode === 'activity';
  const selectedFoodIds = useMemo(() => foodOptions
    .filter((food) => selectedFoodNames.includes(food.name))
    .map((food) => food.id), [foodOptions, selectedFoodNames]);
  const selectedFoodKey = selectedFoodIds.join(',');

  const loggedMealsForSlot = useMemo(() => {
    return meals.filter((meal) => meal.type === selectedMeal);
  }, [meals, selectedMeal]);

  const hasLoggedMealInSlot = loggedMealsForSlot.length > 0;

  const hasLoggedActivityInSlot = useMemo(() => {
    if (isExerciseMode) {
      return activities.some((act) =>
        (suggestion?.options || []).some((opt) => opt.name === act.activityName)
      );
    }
    return false;
  }, [activities, isExerciseMode, suggestion]);

  const isOptionLogged = (optionName) => {
    if (isExerciseMode) {
      return activities.some((act) => act.activityName === optionName);
    }
    return loggedMealsForSlot.some((meal) =>
      (meal.items || []).some((item) => item.name === optionName)
    );
  };

  const getOptionCookingMethod = (option) => {
    const description = option?.description || option?.cookingSteps || option?.instructions;
    if (description && String(description).trim()) {
      return String(description).trim();
    }

    if (!Array.isArray(option?.ingredients) || option.ingredients.length === 0) {
      return '';
    }

    const names = option.ingredients
      .map((ingredient) => ingredient.name)
      .filter(Boolean)
      .join(', ');

    return t('plannerPage.defaultCookingMethod', { ingredients: names });
  };

  const normalizeRecipeOption = useCallback((recipe) => {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const servingSizeG = ingredients.reduce((sum, ingredient) => sum + Number(ingredient.quantityG || ingredient.servingSizeG || 0), 0);
    return {
      recipeId: recipe.id,
      name: recipe.name,
      description: recipe.description || '',
      cookingMethod: recipe.description || '',
      amount: recipe.servings && recipe.servings > 1
        ? t('plannerPage.servings', { count: recipe.servings })
        : t('plannerPage.oneServing'),
      servingSizeG: servingSizeG || 100,
      calories: Number(recipe.calories) || 0,
      proteinG: Number(recipe.proteinG) || 0,
      carbsG: Number(recipe.carbsG) || 0,
      fatG: Number(recipe.fatG) || 0,
      fiberG: Number(recipe.fiberG) || 0,
      sodiumMg: Number(recipe.sodiumMg) || 0,
      ingredients: ingredients.map((ingredient) => ({
        foodItemId: ingredient.foodItemId,
        name: ingredient.name,
        servingSizeG: Number(ingredient.quantityG || ingredient.servingSizeG) || 100,
        quantity: 1,
        calories: Number(ingredient.calories) || 0,
        proteinG: Number(ingredient.proteinG) || 0,
        carbsG: Number(ingredient.carbsG) || 0,
        fatG: Number(ingredient.fatG) || 0,
      })),
    };
  }, [t]);

  const loadRecipes = useCallback(async () => {
    setRecipesLoading(true);
    setError('');
    try {
      const params = {
        maxCalories: Math.max(remaining || calorieGoal, 300),
        limit: 12,
      };
      if (selectedFoodIds.length > 0) {
        params.foodIds = selectedFoodKey;
      }
      const response = await getRecipeSuggestions(params);
      setRecipes(Array.isArray(response.data) ? response.data.map(normalizeRecipeOption) : []);
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.loadRecipes'));
    } finally {
      setRecipesLoading(false);
    }
  }, [calorieGoal, normalizeRecipeOption, remaining, selectedFoodIds.length, selectedFoodKey, t]);

  const toggleFoodName = (name) => {
    setSelectedFoodNames((current) => {
      const exists = current.includes(name);
      if (exists) {
        return current.filter((item) => item !== name);
      }
      if (current.length >= maxSelectedFoods) {
        return current;
      }
      return [...current, name];
    });
    setSuggestion(null);
    setSelectedOption(null);
  };

  const toggleActivityName = (name) => {
    setSelectedActivityNames((current) => {
      const exists = current.includes(name);
      if (exists) {
        return current.filter((item) => item !== name);
      }
      if (current.length >= maxSelectedActivities) {
        return current;
      }
      return [...current, name];
    });
    setSuggestion(null);
    setSelectedOption(null);
  };

  const findActivityTypeByName = (activityName) => activityOptions.find((type) => {
    const displayName = type.nameVi || type.name;
    return displayName === activityName || type.name === activityName || type.nameVi === activityName;
  });

  useEffect(() => {
    Promise.all([getProfile(), getMealsByDate(today()), getActivitiesByDate(today()), getFoods({ page: 0, size: 50 }), getActivityTypes()])
      .then(([profileResponse, mealsResponse, activitiesResponse, foodsResponse, activityTypesResponse]) => {
        setProfile(mapProfileFromApi(extractProfileFromApi(profileResponse.data)));
        setMeals(extractMealsFromApi(mealsResponse.data).map(normalizeMealFromApi));
        const actList = Array.isArray(activitiesResponse.data) 
          ? activitiesResponse.data 
          : activitiesResponse.data?.content || activitiesResponse.data?.data || [];
        setActivities(actList);
        const foods = Array.isArray(foodsResponse.data?.content)
          ? foodsResponse.data.content
          : Array.isArray(foodsResponse.data)
            ? foodsResponse.data
            : [];
        setFoodOptions(foods.map((food) => ({
          id: food.id,
          name: food.nameVi || food.name,
        })).filter((food) => food.id && food.name));
        setActivityOptions(extractActivityTypesFromApi(activityTypesResponse.data)
          .map(normalizeActivityType)
          .filter((activity) => activity.id && activity.name));
      })
      .catch((err) => setError(err.response?.data?.message || t('plannerPage.errors.load')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (loading || !isRecipeMode) {
      return;
    }
    loadRecipes();
  }, [loading, isRecipeMode, selectedFoodKey, remaining, loadRecipes]);

  const generate = async () => {
    setGenerating(true);
    setSuggestion(null);
    setSelectedOption(null);
    setError('');
    setSuccess('');
    try {
      const effectiveMealType = isExerciseMode ? 'exercise' : selectedMeal;
      const existingNames = isExerciseMode
        ? activities.map((act) => act.activityName).filter(Boolean)
        : meals
            .filter((meal) => meal.type === selectedMeal)
            .flatMap((meal) => meal.items || [])
            .map((item) => item.name)
            .filter(Boolean);
      const response = await getAiPlanSuggestions({
        dailyCalorieGoal: calorieGoal,
        caloriesConsumed: hasInvalidDailyTotal ? 0 : Math.round(totals.calories),
        mealType: effectiveMealType,
        goal: profile?.healthGoal?.toUpperCase() || 'MAINTAIN_WEIGHT',
        weightKg: Number(profile?.weight) || 70,
        targetWeightKg: Number(profile?.targetWeight) || Number(profile?.weight) || 70,
        activityLevel: profile?.activityLevel?.toUpperCase() || 'SEDENTARY',
        heightCm: Number(profile?.height) || 170,
        gender: profile?.gender?.toUpperCase() || 'MALE',
        excludedFoodNames: [...new Set([...existingNames, ...(suggestedNames[selectedMeal] || [])])],
        selectedFoodIds: isExerciseMode ? [] : selectedFoodIds,
        selectedFoodNames: isExerciseMode ? [] : selectedFoodNames,
        selectedActivityNames: isExerciseMode ? selectedActivityNames : [],
        cookingMethod: null,
        suggestionOffset: suggestionOffsets[effectiveMealType] || 0,
        locale: i18n.language,
      });
      setSuggestion(response.data);
      setSuggestedNames((current) => {
        const next = {
          ...current,
          [effectiveMealType]: [
            ...(current[effectiveMealType] || []),
            ...(response.data?.options || []).map((option) => option.name),
          ],
        };
        sessionStorage.setItem('plannerSuggestedNames', JSON.stringify(next));
        return next;
      });
      setSuggestionOffsets((current) => {
        const next = { ...current, [effectiveMealType]: (current[effectiveMealType] || 0) + 1 };
        sessionStorage.setItem('plannerSuggestionOffsets', JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.generate'));
    } finally {
      setGenerating(false);
    }
  };

  const addOption = async (option, index) => {
    setSaving(true);
    setError('');
    try {
      const optionCalories = Number(option.calories) || 0;
      if (optionCalories <= 0 || optionCalories > remaining || optionCalories > Number(suggestion?.mealBudget || remaining)) {
        throw new Error(t('plannerPage.errors.overBudget'));
      }

      // AI đã trả tổng dinh dưỡng cho toàn bộ phần ăn. Gửi thẳng sang Meal API,
      // không quy đổi thêm theo servingSizeG để tránh nhân calories hai lần.
      const mealItems = option.recipeId
        ? [{
          itemType: 'RECIPE',
          foodItemId: null,
          recipeId: option.recipeId,
          foodName: option.name,
          servingSizeG: Number(option.servingSizeG) || 100,
          quantity: 1,
          calories: Number(option.calories) || 0,
          proteinG: Number(option.proteinG) || 0,
          carbsG: Number(option.carbsG) || 0,
          fatG: Number(option.fatG) || 0,
          fiberG: Number(option.fiberG) || 0,
          sodiumMg: Number(option.sodiumMg) || 0,
        }]
        : Array.isArray(option.ingredients) && option.ingredients.length > 0
        ? option.ingredients.map((ingredient) => ({
          itemType: 'FOOD',
          foodItemId: ingredient.foodItemId ?? null,
          recipeId: null,
          foodName: ingredient.name,
          servingSizeG: Number(ingredient.servingSizeG) || 100,
          quantity: Number(ingredient.quantity) || 1,
          calories: Number(ingredient.calories) || 0,
          proteinG: Number(ingredient.proteinG) || 0,
          carbsG: Number(ingredient.carbsG) || 0,
          fatG: Number(ingredient.fatG) || 0,
          fiberG: Number(ingredient.fiberG) || 0,
          sodiumMg: Number(ingredient.sodiumMg) || 0,
        }))
        : [{
          itemType: 'FOOD',
          foodItemId: null,
          recipeId: null,
          foodName: option.name,
          servingSizeG: Number(option.servingSizeG) || 100,
          quantity: 1,
          calories: optionCalories,
          proteinG: Number(option.proteinG) || 0,
          carbsG: Number(option.carbsG) || 0,
          fatG: Number(option.fatG) || 0,
          fiberG: Number(option.fiberG) || 0,
          sodiumMg: Number(option.sodiumMg) || 0,
        }];

      const payload = {
        mealType: selectedMeal.toUpperCase(),
        mealDate: planDate,
        mealTime: null,
        notes: `${t('plannerPage.savedNotes.meal')}: ${option.name}`,
        items: mealItems,
      };
      const response = await createMeal(payload);
      setMeals((current) => [...current, normalizeMealFromApi(response.data)]);
      setSelectedOption(index);
      if (option.recipeId) {
        setSelectedRecipeId(option.recipeId);
      }
      setSuccess(t('plannerPage.success.mealAdded', { name: option.name }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('plannerPage.errors.addMeal'));
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = async (mealId) => {
    setSaving(true);
    setDeletingId(mealId);
    setError('');
    setSuccess('');
    try {
      await deleteMealById(mealId);
      setMeals((current) => current.filter((m) => m.id !== mealId));
      setSelectedOption(null);
      setSelectedRecipeId(null);
      setSuccess(t('plannerPage.success.mealDeleted'));
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.deleteMeal'));
    } finally {
      setSaving(false);
      setDeletingId(null);
    }
  };

  const handleLogActivity = async (activity, idx) => {
    setSaving(true);
    setLoggingActivity(idx);
    setError('');
    setSuccess('');
    const todayDate = planDate;
    const matchedActivityType = findActivityTypeByName(activity.name);

    const payload = {
      activityTypeId: matchedActivityType?.id || null,
      activityName: activity.name,
      durationMinutes: Number(activity.durationMinutes) || 30,
      caloriesBurned: Number(activity.caloriesBurned || activity.calories) || 150,
      loggedAt: `${todayDate}T12:00:00`,
      notes: t('plannerPage.savedNotes.activity'),
      category: matchedActivityType?.category?.toUpperCase() || 'CARDIO',
    };

    try {
      const response = await createActivityLog(payload);
      setActivities((current) => [...current, response.data]);
      setSelectedOption(idx);
      setSuccess(t('plannerPage.success.activityAdded', { name: activity.name }));
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.addActivity'));
    } finally {
      setSaving(false);
      setLoggingActivity(null);
    }
  };

  const handleDeleteActivity = async (activityLogId) => {
    setSaving(true);
    setDeletingActivityId(activityLogId);
    setError('');
    setSuccess('');
    try {
      await deleteActivityById(activityLogId);
      setActivities((current) => current.filter((act) => act.id !== activityLogId));
      setSelectedOption(null);
      setSuccess(t('plannerPage.success.activityDeleted'));
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.deleteActivity'));
    } finally {
      setSaving(false);
      setDeletingActivityId(null);
    }
  };

  if (loading) return <div className="py-5 text-center"><Spinner animation="border" variant="success" /></div>;

  const selectedMealLabel = t(mealTypes.find(([key]) => key === selectedMeal)?.[1] || '');

  return <>
    <div className="page-heading">
      <div>
        <Badge bg="success" className="mb-2">{t('plannerPage.badge')}</Badge>
        <h1>{t('plannerPage.title')}</h1>
        <p>{t('plannerPage.description')}</p>
      </div>
    </div>
    {error && <Alert variant="danger">{error}</Alert>}
    {success && <Alert variant="success">{success}</Alert>}
    <div className="planner-mode-switch mb-4">
      <button
        type="button"
        className={plannerMode === 'meal' ? 'is-active' : ''}
        onClick={() => {
          setPlannerMode('meal');
          setSuggestion(null);
          setSelectedOption(null);
        }}
      >
        <FaUtensils />
        <span>{t('plannerPage.sections.food')}</span>
      </button>
      <button
        type="button"
        className={plannerMode === 'recipes' ? 'is-active' : ''}
        onClick={() => {
          setPlannerMode('recipes');
          setSuggestion(null);
          setSelectedOption(null);
        }}
      >
        <FaBookOpen />
        <span>{t('plannerPage.sections.recipes')}</span>
      </button>
      <button
        type="button"
        className={plannerMode === 'activity' ? 'is-active' : ''}
        onClick={() => {
          setPlannerMode('activity');
          setSuggestion(null);
          setSelectedOption(null);
        }}
      >
        <FaDumbbell />
        <span>{t('plannerPage.sections.activity')}</span>
      </button>
    </div>
    <Row className="g-4">
      <Col lg={4}>
        <Card className="border-0 shadow-sm planner-control-card"><Card.Body>
          <section className="planner-control-section">
            <div className="planner-section-heading">
              <span><FaCalendarAlt /></span>
              <div>
                <h2>{isExerciseMode ? t('plannerPage.sections.activityPlan') : isRecipeMode ? t('plannerPage.sections.recipePlan') : t('plannerPage.sections.mealPlan')}</h2>
                <p>{isExerciseMode ? t('plannerPage.sections.activityPlanDescription') : isRecipeMode ? t('plannerPage.sections.recipePlanDescription') : t('plannerPage.sections.mealPlanDescription')}</p>
              </div>
            </div>
            <div className="planner-budget-tile">
              <div>
                <span>{t('plannerPage.calorieBudget')}</span>
                <strong>{remaining} kcal</strong>
                <small>{t('plannerPage.consumed', { consumed: totals.calories, goal: calorieGoal })}</small>
              </div>
              <FaFireAlt />
            </div>
            <ProgressBar now={Math.min(progress, 100)} variant={progress > 100 ? 'danger' : 'success'} className="mb-3" />
            <Form.Group className="mb-3">
              <Form.Label>{t('plannerPage.planDate')}</Form.Label>
              <div className="planner-date-control">
                <FaCalendarAlt />
                <Form.Control
                  type="date"
                  min={today()}
                  value={planDate}
                  onChange={(event) => {
                    setPlanDate(event.target.value || today());
                    setSuggestion(null);
                    setSelectedOption(null);
                  }}
                />
              </div>
            </Form.Group>
            <Form.Group>
              <Form.Label>{isExerciseMode ? t('plannerPage.activityKind') : t('plannerPage.selectSlot')}</Form.Label>
              <Form.Select
                value={isExerciseMode ? 'exercise' : selectedMeal}
                disabled={isExerciseMode}
                onChange={(e) => { setSelectedMeal(e.target.value); setSuggestion(null); setSelectedOption(null); }}
              >
                {(isExerciseMode ? [['exercise', 'plannerPage.mealTypes.exercise']] : mealTypes.filter(([value]) => value !== 'exercise'))
                  .map(([value, labelKey]) => <option value={value} key={value}>{t(labelKey)}</option>)}
              </Form.Select>
            </Form.Group>
          </section>
          {!isExerciseMode && (
            <section className="planner-control-section">
              <div className="planner-section-heading">
                <span><FaUtensils /></span>
                <div>
                  <h2>{isRecipeMode ? t('plannerPage.sections.recipeFilter') : t('plannerPage.sections.food')}</h2>
                  <p>{t(isRecipeMode ? 'plannerPage.sections.recipeFilterDescription' : 'plannerPage.sections.foodDescription', { max: maxSelectedFoods })}</p>
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <Form.Label className="mb-0">{t('plannerPage.selectedFoods')}</Form.Label>
                {selectedFoodCount > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 planner-clear-foods"
                    onClick={() => {
                      setSelectedFoodNames([]);
                      setSuggestion(null);
                      setSelectedOption(null);
                    }}
                  >
                    {t('plannerPage.clearFoods')}
                  </Button>
                )}
              </div>
              <div className="planner-food-picker">
                {foodOptions.map((food) => {
                  const selected = selectedFoodNames.includes(food.name);
                  return (
                    <button
                      type="button"
                      className={`planner-food-choice${selected ? ' is-selected' : ''}`}
                      key={food.id}
                      disabled={!selected && selectedFoodCount >= maxSelectedFoods}
                      onClick={() => toggleFoodName(food.name)}
                    >
                      <FaUtensils />
                      <span>{food.name}</span>
                      {selected && <FaCheck />}
                    </button>
                  );
                })}
              </div>
              <Form.Text muted>{t('plannerPage.selectedFoodsHint', { count: selectedFoodCount, max: maxSelectedFoods })}</Form.Text>
            </section>
          )}
          {isExerciseMode && (
            <section className="planner-control-section">
              <div className="planner-section-heading">
                <span><FaDumbbell /></span>
                <div>
                  <h2>{t('plannerPage.sections.activity')}</h2>
                  <p>{t('plannerPage.sections.activityDescription')}</p>
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <Form.Label className="mb-0">{t('plannerPage.selectedActivities')}</Form.Label>
                {selectedActivityCount > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 planner-clear-foods"
                    onClick={() => {
                      setSelectedActivityNames([]);
                      setSuggestion(null);
                      setSelectedOption(null);
                    }}
                  >
                    {t('plannerPage.clearActivities')}
                  </Button>
                )}
              </div>
              <div className="planner-food-picker">
                {activityOptions.map((activity) => {
                  const name = activity.nameVi || activity.name;
                  const selected = selectedActivityNames.includes(name);
                  return (
                    <button
                      type="button"
                      className={`planner-food-choice${selected ? ' is-selected' : ''}`}
                      key={activity.id}
                      disabled={!selected && selectedActivityCount >= maxSelectedActivities}
                      onClick={() => toggleActivityName(name)}
                    >
                      <FaDumbbell />
                      <span>{name}</span>
                      {selected && <FaCheck />}
                    </button>
                  );
                })}
              </div>
              <Form.Text muted>{t('plannerPage.selectedActivitiesHint', { count: selectedActivityCount, max: maxSelectedActivities })}</Form.Text>
            </section>
          )}
          {isRecipeMode ? (
            <Button className="w-100" variant="success" onClick={loadRecipes} disabled={recipesLoading}>
              <FaBookOpen className="me-2" />
              {recipesLoading ? t('plannerPage.loadingRecipes') : t('plannerPage.loadRecipes')}
            </Button>
          ) : (
            <>
              <Button className="w-100" variant={isExerciseMode ? 'primary' : 'success'} onClick={generate} disabled={generating || (!isExerciseMode && remaining < 100 && !hasInvalidDailyTotal)}><FaRobot className="me-2" />{generating ? t('plannerPage.generating') : t('plannerPage.createOptions')}</Button>
              {suggestion && <Button className="w-100 mt-2" variant={isExerciseMode ? 'outline-primary' : 'outline-success'} onClick={generate} disabled={generating}><FaRobot className="me-2" />{t('plannerPage.createOtherOptions')}</Button>}
            </>
          )}
          {hasInvalidDailyTotal && <Alert variant="danger" className="mt-3 mb-0 py-2">{t('plannerPage.invalidTotal')}</Alert>}
          {!hasInvalidDailyTotal && !isExerciseMode && !isRecipeMode && remaining < 100 && <Alert variant="warning" className="mt-3 mb-0 py-2">{t('plannerPage.insufficientCalories')}</Alert>}
        </Card.Body></Card>
      </Col>
      <Col lg={8}>
        {!isExerciseMode && loggedMealsForSlot.length > 0 && (
          <Card className="border-0 shadow-sm mb-4 bg-success bg-opacity-10 border border-success border-opacity-25">
            <Card.Body>
              <h3 className="h6 fw-bold text-success mb-3 d-flex align-items-center">
                <FaCheck className="me-2" />
                {t('plannerPage.loggedMealsTitle', { meal: selectedMealLabel.toLocaleLowerCase(i18n.language) })}
              </h3>
              <Row className="g-3">
                {loggedMealsForSlot.map((meal) =>
                  (meal.items || []).map((item, idx) => (
                    <Col md={6} key={item.id || idx}>
                      <Card className="border-0 shadow-sm bg-white h-100">
                        <Card.Body className="d-flex flex-column p-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold text-dark">{item.name}</span>
                            <Badge bg="success">{item.calories} kcal</Badge>
                          </div>
                          <div className="text-secondary small mb-3">{t('plannerPage.serving')}: {item.serving}</div>
                          <div className="quick-grid mb-3">
                            <span>{t('common.protein')}<strong>{item.protein}g</strong></span>
                            <span>{t('common.carbs')}<strong>{item.carbs}g</strong></span>
                            <span>{t('common.fat')}<strong>{item.fat}g</strong></span>
                          </div>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            className="mt-auto w-100"
                            disabled={saving}
                            onClick={() => deleteMeal(meal.id)}
                          >
                            {deletingId === meal.id ? t('plannerPage.deleting') : t('plannerPage.removeMeal')}
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))
                )}
              </Row>
            </Card.Body>
          </Card>
        )}

        {isExerciseMode && activities.length > 0 && (
          <Card className="border-0 shadow-sm mb-4 bg-primary bg-opacity-10 border border-primary border-opacity-25">
            <Card.Body>
              <h3 className="h6 fw-bold text-primary mb-3 d-flex align-items-center">
                <FaCheck className="me-2" />
                {t('plannerPage.loggedActivitiesTitle')}
              </h3>
              <Row className="g-3">
                {activities.map((act) => (
                  <Col md={6} key={act.id}>
                    <Card className="border-0 shadow-sm bg-white h-100">
                      <Card.Body className="d-flex flex-column p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold text-dark">{act.activityName}</span>
                          <Badge bg="primary">{Math.round(act.caloriesBurned)} kcal</Badge>
                        </div>
                        <div className="text-secondary small mb-3">{t('plannerPage.duration', { minutes: act.durationMinutes })}</div>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          className="mt-auto w-100"
                          disabled={saving}
                          onClick={() => handleDeleteActivity(act.id)}
                        >
                          {deletingActivityId === act.id ? t('plannerPage.deleting') : t('plannerPage.removeActivity')}
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        )}

        {isRecipeMode && (
          <>
            <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
              <div>
                <h2 className="h4 fw-bold mb-1">{t('plannerPage.recipeLibraryTitle')}</h2>
                <p className="text-secondary mb-0">{t('plannerPage.recipeLibraryDescription')}</p>
              </div>
              <Badge bg="success" className="mt-1">{recipes.length}</Badge>
            </div>
            {recipesLoading && (
              <Card className="border-0 shadow-sm">
                <Card.Body className="py-5 text-center">
                  <Spinner animation="grow" variant="success" />
                  <p className="mt-3 mb-0">{t('plannerPage.loadingRecipes')}</p>
                </Card.Body>
              </Card>
            )}
            {!recipesLoading && recipes.length === 0 && (
              <Alert variant="light" className="border">
                {t('plannerPage.empty.noRecipes')}
              </Alert>
            )}
            {!recipesLoading && recipes.length > 0 && (
              <Row className="g-3">
                {recipes.map((recipe, index) => {
                  const logged = selectedRecipeId === recipe.recipeId || loggedMealsForSlot.some((meal) =>
                    (meal.items || []).some((item) => item.recipeId === recipe.recipeId || item.name === recipe.name)
                  );
                  return (
                    <Col md={6} key={recipe.recipeId || recipe.name}>
                      <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="d-flex flex-column">
                          <div className="d-flex justify-content-between gap-2">
                            <FaBookOpen className="text-success fs-5" />
                            <Badge bg="success">{recipe.calories} kcal</Badge>
                          </div>
                          <h3 className="h5 fw-bold mt-3">{recipe.name}</h3>
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            <Badge bg="info">{t('plannerPage.savedRecipe')}</Badge>
                            <Badge bg="light" text="dark">
                              {t('plannerPage.ingredientCount', { count: recipe.ingredients.length })}
                            </Badge>
                            <Badge bg="light" text="dark">{recipe.amount}</Badge>
                          </div>
                          {recipe.ingredients.length > 0 && (
                            <div className="mb-3">
                              <div className="text-uppercase text-secondary small fw-semibold mb-1">
                                {t('plannerPage.ingredients')}
                              </div>
                              <ul className="small text-secondary ps-3 mb-0">
                                {recipe.ingredients.map((ingredient) => (
                                  <li key={`${recipe.recipeId}-${ingredient.foodItemId || ingredient.name}`}>
                                    {ingredient.name} - {Math.round(ingredient.servingSizeG)}g
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="mb-3 p-3 rounded border bg-light">
                            <div className="text-uppercase text-secondary small fw-semibold mb-1">
                              {t('plannerPage.cookingMethod')}
                            </div>
                            <p className="small mb-0">{recipe.cookingMethod || t('plannerPage.noCookingGuide')}</p>
                          </div>
                          <div className="quick-grid mb-3">
                            <span>{t('common.protein')}<strong>{recipe.proteinG}g</strong></span>
                            <span>{t('common.carbs')}<strong>{recipe.carbsG}g</strong></span>
                            <span>{t('common.fat')}<strong>{recipe.fatG}g</strong></span>
                          </div>
                          <Button
                            className="mt-auto"
                            variant={logged ? 'success' : 'outline-success'}
                            disabled={saving || logged || hasLoggedMealInSlot}
                            onClick={() => addOption(recipe, index)}
                          >
                            {logged ? (
                              <>
                                <FaCheck className="me-2" />
                                {t('plannerPage.selected')}
                              </>
                            ) : (
                              t('plannerPage.chooseRecipe')
                            )}
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </>
        )}

        {!isRecipeMode && !suggestion && !generating && (
          <Alert variant="light" className="border">
            {isExerciseMode ? (
              activities.length > 0
                ? t('plannerPage.empty.loggedActivity')
                : t('plannerPage.empty.selectActivity')
            ) : (
              loggedMealsForSlot.length > 0
                ? t('plannerPage.empty.loggedMeal', { meal: selectedMealLabel.toLocaleLowerCase(i18n.language) })
                : t('plannerPage.empty.selectMeal')
            )}
          </Alert>
        )}

        {generating && (
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-5 text-center">
              <Spinner animation="grow" variant={isExerciseMode ? 'primary' : 'success'} />
              <p className="mt-3 mb-0">{t('plannerPage.findingOptions')}</p>
            </Card.Body>
          </Card>
        )}

        {!isRecipeMode && suggestion && (
          <>
            {isExerciseMode ? (
              <Alert variant="primary">
                {t('plannerPage.suggestion.activityMessage')}
              </Alert>
            ) : (
              <Alert variant="info">
                {t('plannerPage.suggestion.mealMessage')} {t('plannerPage.suggestion.mealBudget')}: <strong>{suggestion.mealBudget} kcal</strong>.
              </Alert>
            )}
            <Row className="g-3">
              {(suggestion.options || []).map((option, index) => {
                const logged = isOptionLogged(option.name) || selectedOption === index;
                const isExercise = isExerciseMode;
                const cookingMethod = getOptionCookingMethod(option);
                const matchedActivityType = isExercise ? findActivityTypeByName(option.name) : null;
                const ingredientCount = Array.isArray(option.ingredients) ? option.ingredients.length : 0;
                const isBlockedByOtherSelection = isExercise 
                  ? (hasLoggedActivityInSlot && !logged) 
                  : (selectedOption !== null || hasLoggedMealInSlot);
                return (
                  <Col md={6} key={`${option.name}-${index}`}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Body className="d-flex flex-column">
                        <div className="d-flex justify-content-between gap-2">
                          {isExercise ? (
                            <FaDumbbell className="text-primary fs-5" />
                          ) : (
                            <FaUtensils className="text-success" />
                          )}
                          <Badge bg={isExercise ? 'primary' : 'success'}>
                            {isExercise
                              ? t('plannerPage.caloriesBurned', { calories: option.caloriesBurned || option.calories })
                              : `${option.calories} kcal`}
                          </Badge>
                        </div>
                        <h3 className="h5 fw-bold mt-3">{option.name}</h3>
                        <p className="text-secondary">{option.amount}</p>
                        {!isExercise && (
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            <Badge bg={option.recipeId ? 'info' : 'secondary'}>
                              {option.recipeId ? t('plannerPage.savedRecipe') : t('plannerPage.aiGenerated')}
                            </Badge>
                            {ingredientCount > 0 && (
                              <Badge bg="light" text="dark">
                                {t('plannerPage.ingredientCount', { count: ingredientCount })}
                              </Badge>
                            )}
                          </div>
                        )}
                        {isExercise && (
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            {option.durationMinutes && (
                              <Badge bg="light" text="dark">
                                {t('plannerPage.minutes', { minutes: option.durationMinutes })}
                              </Badge>
                            )}
                            {matchedActivityType?.category && (
                              <Badge bg="light" text="dark">
                                {t('plannerPage.activityCategory')}: {matchedActivityType.category.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        )}
                        {!isExercise && Array.isArray(option.ingredients) && option.ingredients.length > 0 && (
                          <div className="mb-3">
                            <div className="text-uppercase text-secondary small fw-semibold mb-1">
                              {t('plannerPage.ingredients')}
                            </div>
                            <p className="text-secondary small mb-0">
                              {option.ingredients.map((ingredient) => ingredient.name).join(', ')}
                            </p>
                          </div>
                        )}

                        {!isExercise && cookingMethod && (
                          <div className="mb-3 p-3 rounded border bg-light">
                            <div className="text-uppercase text-secondary small fw-semibold mb-1">
                              {t('plannerPage.cookingMethod')}
                            </div>
                            <p className="small mb-0">{cookingMethod}</p>
                          </div>
                        )}
                        
                        {!isExercise && (
                          <div className="quick-grid mb-3">
                            <span>{t('common.protein')}<strong>{option.proteinG}g</strong></span>
                            <span>{t('common.carbs')}<strong>{option.carbsG}g</strong></span>
                            <span>{t('common.fat')}<strong>{option.fatG}g</strong></span>
                          </div>
                        )}
                        
                        <Button
                          className="mt-auto"
                          variant={logged ? (isExercise ? 'primary' : 'success') : (isExercise ? 'outline-primary' : 'outline-success')}
                          disabled={saving || logged || isBlockedByOtherSelection}
                          onClick={() => {
                            if (isExercise) {
                              handleLogActivity(option, index);
                            } else {
                              addOption(option, index);
                            }
                          }}
                        >
                          {logged ? (
                            <>
                              <FaCheck className="me-2" />
                              {t('plannerPage.selected')}
                            </>
                          ) : (
                            isExercise ? t('plannerPage.chooseActivity') : t('plannerPage.chooseOption')
                          )}
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* Gợi ý vận động - luôn hiện bên dưới bữa ăn */}
            {!isExerciseMode && (
              <div className="mt-5 border-top pt-4">
                <h3 className="h5 fw-bold mb-1 d-flex align-items-center gap-2">
                  <FaDumbbell className="text-primary" />
                  {t('plannerPage.activitySuggestionsTitle')}
                </h3>
                <p className="text-secondary small mb-4">{t('plannerPage.activitySuggestionsDescription')}</p>

                {/* Hoạt động đã ghi nhận */}
                {activities.length > 0 && (
                  <Card className="border-0 shadow-sm mb-4 bg-primary bg-opacity-10 border border-primary border-opacity-25">
                    <Card.Body>
                      <h4 className="h6 fw-bold text-primary mb-3 d-flex align-items-center">
                        <FaCheck className="me-2" />
                        {t('plannerPage.loggedActivitiesTitle')}
                      </h4>
                      <Row className="g-3">
                        {activities.map((act) => (
                          <Col md={6} key={act.id}>
                            <Card className="border-0 shadow-sm bg-white h-100">
                              <Card.Body className="d-flex flex-column p-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="fw-bold text-dark">{act.activityName}</span>
                                  <Badge bg="primary">{Math.round(act.caloriesBurned)} kcal</Badge>
                                </div>
                                <div className="text-secondary small mb-3">{t('plannerPage.duration', { minutes: act.durationMinutes })}</div>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="mt-auto w-100"
                                  disabled={saving}
                                  onClick={() => handleDeleteActivity(act.id)}
                                >
                                  {deletingActivityId === act.id ? t('plannerPage.deleting') : t('plannerPage.deleteActivity')}
                                </Button>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                {/* 2 phương án vận động từ suggestion.activities */}
                {suggestion.activities && suggestion.activities.length > 0 && (
                  <Row className="g-3">
                    {suggestion.activities.map((activity, idx) => {
                      const actLogged = activities.some((act) => act.activityName === activity.name);
                      const matchedActivityType = findActivityTypeByName(activity.name);
                      return (
                        <Col md={6} key={`${activity.name}-${idx}`}>
                          <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="d-flex flex-column">
                              <div className="d-flex justify-content-between gap-2">
                                <FaDumbbell className="text-primary fs-5" />
                                <Badge bg="primary">{t('plannerPage.caloriesBurned', { calories: activity.caloriesBurned })}</Badge>
                              </div>
                              <h3 className="h5 fw-bold mt-3">{activity.name}</h3>
                              <p className="text-secondary">{t('plannerPage.durationLabel')}: <strong>{t('plannerPage.minutes', { minutes: activity.durationMinutes })}</strong></p>
                              {matchedActivityType?.category && (
                                <div className="mb-3">
                                  <Badge bg="light" text="dark">
                                    {t('plannerPage.activityCategory')}: {matchedActivityType.category.toUpperCase()}
                                  </Badge>
                                </div>
                              )}
                              <Button
                                className="mt-auto"
                                variant={actLogged ? 'primary' : 'outline-primary'}
                                disabled={saving || actLogged}
                                onClick={() => handleLogActivity(activity, idx)}
                              >
                                {actLogged ? (
                                  <><FaCheck className="me-2" />{t('plannerPage.logged')}</>
                                ) : (
                                  loggingActivity === idx ? t('plannerPage.logging') : t('plannerPage.logActivity')
                                )}
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                )}

                {/* Nếu suggestion không có activities, hiển thị nút để chuyển sang exercise slot */}
                {(!suggestion.activities || suggestion.activities.length === 0) && activities.length === 0 && (
                  <Alert variant="light" className="border d-flex align-items-center gap-2">
                    <FaDumbbell className="text-primary" />
                    <span>{t('plannerPage.noActivitySuggestions')}</span>
                  </Alert>
                )}
              </div>
            )}
          </>
        )}
      </Col>
    </Row>
  </>;
}

export default Planner;
