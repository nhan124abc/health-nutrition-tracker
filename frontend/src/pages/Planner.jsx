import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Form, InputGroup, Modal, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ErrorModal from '../components/ErrorModal';
import {
  FaBookOpen,
  FaCheck,
  FaArrowLeft,
  FaArrowRight,
  FaDumbbell,
  FaFireAlt,
  FaRobot,
  FaSearch,
  FaUtensils,
} from 'react-icons/fa';
import { getAiPlanSuggestions } from '../features/ai/aiService';
import { createMeal, createMealPlan, getMealsByDate, deleteMealById } from '../features/meals/mealService';
import { extractMealsFromApi, formatCalories, getMealTotals, getMealsTotals, normalizeMealFromApi } from '../features/meals/mealUtils';
import { getProfile } from '../features/profile/profileService';
import { extractProfileFromApi, mapProfileFromApi } from '../features/profile/profileUtils';
import { getActivitiesByDate, createActivityLog, createWorkoutPlan, deleteActivityById, getActivityTypes } from '../features/activities/activityService';
import { extractActivitiesFromApi, extractActivityTypesFromApi, normalizeActivityFromApi, normalizeActivityType } from '../features/activities/activityUtils';
import { getFoods, getRecipeSuggestions } from '../features/nutrition/nutritionService';
import { extractFoodsFromApi, normalizeFoodFromApi } from '../features/nutrition/nutritionUtils';
import { getLocalizedName } from '../utils/localizedName';
import { isVietnameseSearchLanguage, valuesMatchSearch } from '../utils/searchText';

const goalToApi = {
  lose_weight: 'LOSE_WEIGHT',
  maintain: 'MAINTAIN_WEIGHT',
  gain_weight: 'GAIN_WEIGHT',
  gain_muscle: 'GAIN_MUSCLE',
  cutting: 'CUTTING',
  body_recomposition: 'BODY_RECOMPOSITION',
  improve_health: 'IMPROVE_FITNESS',
};

function today() {
  return new Date().toLocaleDateString('en-CA');
}

function mapFoodOption(food) {
  const normalizedFood = normalizeFoodFromApi(food);
  const servingSizeG = Number(food.servingSizeG ?? String(normalizedFood.servingSize).replace(/[^\d.]/g, ''));

  return {
    id: normalizedFood.id,
    name: normalizedFood.name,
    nameVi: normalizedFood.nameVi,
    servingSizeG: servingSizeG || 100,
    calories: Number(normalizedFood.calories) || 0,
    proteinG: Number(normalizedFood.protein) || 0,
    carbsG: Number(normalizedFood.carbs) || 0,
    fatG: Number(normalizedFood.fat) || 0,
    fiberG: Number(normalizedFood.fiber) || 0,
    sodiumMg: Number(normalizedFood.sodium) || 0,
  };
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
const foodPageSize = 10;
const recipePageSize = 4;
const activityPageSize = 10;
const mealTypeToApi = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
  afternoon_snack: 'AFTERNOON_SNACK',
  morning_snack: 'MORNING_SNACK',
  evening_snack: 'EVENING_SNACK',
};
function getTotalPagesFromApi(data) {
  return Number(data?.totalPages || data?.data?.totalPages || 1) || 1;
}

function getMealShare(mealType) {
  if (mealType === 'breakfast') return 0.25;
  if (mealType === 'dinner') return 0.27;
  if (mealType === 'afternoon_snack' || mealType === 'snack' || mealType === 'snacks') return 0.10;
  return 0.38;
}

function getMealBudget(goalCalories, consumedCalories, mealType) {
  const remainingCalories = Math.max(100, goalCalories - consumedCalories);
  const mealShareBudget = Math.round(goalCalories * getMealShare(mealType));
  return Math.max(100, Math.min(mealShareBudget, remainingCalories));
}

function calculateActivityPreviewCalories(activity, activityType, weightKg) {
  const duration = getActivityDurationMinutes(activity);
  const weight = Number(weightKg) || 70;

  if (activityType?.met) {
    return Math.round(activityType.met * weight * (duration / 60));
  }

  return Math.round(Number(activity?.caloriesBurned || activity?.calories) || 0);
}

function getActivityDurationMinutes(activity) {
  const explicitDuration = Number(activity?.durationMinutes);
  if (explicitDuration > 0) {
    return explicitDuration;
  }

  const amountMatch = String(activity?.amount || '').match(/\d+/);
  return amountMatch ? Number(amountMatch[0]) : 30;
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getPlannerDayOfWeek(date) {
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

function getMealItemFoodId(item = {}) {
  return item.foodItemId || item.foodId || item.food?.id || item.id;
}

function getRecipeId(recipe = {}) {
  return recipe.recipeId || recipe.id;
}

function hasVietnameseText(value = '') {
  return /[À-ỹĐđ]/u.test(String(value));
}

function textMatchesLanguage(value = '', language = '') {
  const text = String(value || '').trim();
  if (!text) {
    return false;
  }
  const wantsVietnamese = String(language).toLowerCase().startsWith('vi');
  return wantsVietnamese ? hasVietnameseText(text) : !hasVietnameseText(text);
}

function normalizePlannerActivityLog(activity = {}) {
  const normalized = normalizeActivityFromApi(activity);
  return {
    ...activity,
    ...normalized,
    activityTypeId: normalized.typeId,
    activityName: normalized.customName,
    durationMinutes: normalized.duration,
    caloriesBurned: normalized.calories,
  };
}

function Planner() {
  const { i18n, t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [plannerMode, setPlannerMode] = useState('meal');
  const [selectedMeal, setSelectedMeal] = useState('breakfast');
  const planDate = today();
  const [foodOptions, setFoodOptions] = useState([]);
  const [foodSearchTerm, setFoodSearchTerm] = useState('');
  const [foodSearchResults, setFoodSearchResults] = useState([]);
  const [foodSearchLoading, setFoodSearchLoading] = useState(false);
  const [foodPage, setFoodPage] = useState(0);
  const [foodTotalPages, setFoodTotalPages] = useState(1);
  const [selectedFoodNames, setSelectedFoodNames] = useState([]);
  const selectedFoodNamesRef = useRef([]);
  const [recipes, setRecipes] = useState([]);
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipePage, setRecipePage] = useState(0);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [activityOptions, setActivityOptions] = useState([]);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activityPage, setActivityPage] = useState(0);
  const [selectedActivityNames, setSelectedActivityNames] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectingOption, setSelectingOption] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [, setLoggingActivity] = useState(null);
  const [deletingActivityId, setDeletingActivityId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mealSuccessPopup, setMealSuccessPopup] = useState(null);
  const [plannerNotice, setPlannerNotice] = useState(null);
  const recipeCacheRef = useRef(new Map());
  const recipeRequestIdRef = useRef(0);
  const [suggestedNames, setSuggestedNames] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('plannerSuggestedNames')) || {}; } catch { return {}; }
  });
  const [suggestionOffsets, setSuggestionOffsets] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('plannerSuggestionOffsets')) || {}; } catch { return {}; }
  });

  const totals = useMemo(() => getMealsTotals(meals), [meals]);

  useEffect(() => {
    selectedFoodNamesRef.current = selectedFoodNames;
  }, [selectedFoodNames]);
  const calorieGoal = Number(profile?.dailyCalorieGoal) || 2000;
  const remaining = Math.max(0, calorieGoal - totals.calories);
  const hasInvalidDailyTotal = totals.calories > calorieGoal * 2;
  const progress = Math.round((totals.calories / Math.max(calorieGoal, 1)) * 100);
  const dailyActivityGoal = Number(profile?.dailyActivityGoalKcal) || (() => {
    try {
      return Number(JSON.parse(localStorage.getItem('activeGoalPlan'))?.dailyActivityGoalKcal) || 0;
    } catch {
      return 0;
    }
  })();
  const activityCaloriesToday = activities.reduce((sum, activity) => (
    sum + Number(activity.caloriesBurned || activity.calories || 0)
  ), 0);
  const selectedFoodCount = selectedFoodNames.length;
  const selectedActivityCount = selectedActivityNames.length;
  const isRecipeMode = plannerMode === 'recipes';
  const isExerciseMode = plannerMode === 'activity';
  const activeGoal = goalToApi[profile?.healthGoal] || 'MAINTAIN_WEIGHT';
  const selectedFoodIds = useMemo(() => foodOptions
    .filter((food) => selectedFoodNames.includes(food.name))
    .map((food) => food.id), [foodOptions, selectedFoodNames]);
  const selectedFoodKey = selectedFoodIds.join(',');
  const selectedFoodOptions = useMemo(() => foodOptions
    .filter((food) => selectedFoodNames.includes(food.name)), [foodOptions, selectedFoodNames]);
  const normalizedFoodSearchTerm = foodSearchTerm.trim();
  const availableFoodSearchResults = useMemo(() => foodSearchResults.filter(
    (food) => !selectedFoodNames.includes(food.name)
  ), [foodSearchResults, selectedFoodNames]);
  const foodResultCount = availableFoodSearchResults.length;
  const normalizedRecipeSearchTerm = recipeSearchTerm.trim();
  const canSearchRecipes = isRecipeMode || normalizedRecipeSearchTerm.length >= 2 || selectedFoodIds.length > 0;
  const normalizedActivitySearchTerm = activitySearchTerm.trim();
  const selectedActivityOptions = useMemo(() => activityOptions.filter((activity) => (
    selectedActivityNames.includes(activity.name)
  )), [activityOptions, selectedActivityNames]);
  const selectedActivityTypeIds = useMemo(() => selectedActivityOptions
    .map((activity) => activity.id)
    .filter(Boolean), [selectedActivityOptions]);
  const filteredActivityOptions = useMemo(() => {
    if (!normalizedActivitySearchTerm) {
      return activityOptions;
    }
    const isVietnamese = isVietnameseSearchLanguage(i18n.language);

    return activityOptions.filter((activity) => valuesMatchSearch([
      isVietnamese ? activity.nameVi || activity.name : activity.name || activity.nameVi,
      activity.category,
    ], normalizedActivitySearchTerm));
  }, [activityOptions, i18n.language, normalizedActivitySearchTerm]);
  const activityTotalPages = Math.max(1, Math.ceil(filteredActivityOptions.length / activityPageSize));
  const activitySearchResults = useMemo(() => {
    const start = activityPage * activityPageSize;
    return filteredActivityOptions.slice(start, start + activityPageSize);
  }, [activityPage, filteredActivityOptions]);

  const loggedMealsForSlot = useMemo(() => {
    return meals.filter((meal) => meal.type === selectedMeal);
  }, [meals, selectedMeal]);

  const loggedSlotCalories = useMemo(() => {
    return loggedMealsForSlot.reduce((sum, meal) => sum + (Number(getMealTotals(meal).calories) || 0), 0);
  }, [loggedMealsForSlot]);

  const effectiveCaloriesConsumed = hasInvalidDailyTotal
    ? 0
    : Math.max(0, Math.round(totals.calories - loggedSlotCalories));
  const availableCaloriesForSelectedMeal = Math.max(0, calorieGoal - effectiveCaloriesConsumed);
  const selectedMealBudget = getMealBudget(calorieGoal, effectiveCaloriesConsumed, selectedMeal);
  const rankedRecipes = useMemo(() => {
    const selectedIdSet = new Set(selectedFoodIds.map(String));
    return recipes.map((recipe, originalIndex) => ({ recipe, originalIndex })).sort((leftItem, rightItem) => {
      const left = leftItem.recipe;
      const right = rightItem.recipe;
      const matchCount = (recipe) => (recipe.ingredients || []).filter(
        (ingredient) => selectedIdSet.has(String(ingredient.foodItemId))
      ).length;
      const matchDifference = matchCount(right) - matchCount(left);
      if (matchDifference !== 0) return matchDifference;
      return leftItem.originalIndex - rightItem.originalIndex;
    }).map((item) => item.recipe);
  }, [recipes, selectedFoodIds]);
  const recipeTotalPages = Math.max(1, Math.ceil(rankedRecipes.length / recipePageSize));
  const pagedRecipes = useMemo(() => {
    const start = recipePage * recipePageSize;
    return rankedRecipes.slice(start, start + recipePageSize);
  }, [rankedRecipes, recipePage]);

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
      String(meal.notes || '').toLowerCase().includes(String(optionName).toLowerCase()) ||
      (meal.items || []).some((item) => item.name === optionName)
    );
  };

  const findLoggedActivityByName = (activityName) => activities.find((activity) => activity.activityName === activityName);

  const getLocalizedMealItemName = (item = {}) => {
    const matchedFood = foodOptions.find((food) => String(food.id) === String(getMealItemFoodId(item)));
    return getLocalizedName(matchedFood || item, i18n.language);
  };

  const getLoggedMealTitle = (meal, fallbackLabel) => {
    const noteText = String(meal.notes || '');
    const noteTitle = noteText.includes(':')
      ? noteText.split(':').slice(1).join(':').trim()
      : '';

    const itemNames = (meal.items || [])
      .map(getLocalizedMealItemName)
      .filter(Boolean)
      .join(', ');

    return itemNames || noteTitle || fallbackLabel;
  };

  const getOptionCookingMethod = (option) => {
    const description = option?.description || option?.cookingSteps || option?.instructions;
    const cookingMethod = option?.cookingMethod;
    const text = cookingMethod || description;
    const normalizedText = String(text || '').trim();
    const genericHints = [
      'ket hop cac thuc pham',
      'kết hợp các thực phẩm',
      'che bien don gian',
      'chế biến đơn giản',
      'dieu chinh khau phan',
      'điều chỉnh khẩu phần',
    ];

    if (
      option?.recipeId
      && normalizedText
      && textMatchesLanguage(normalizedText, i18n.language)
      && !genericHints.some((hint) => normalizedText.toLowerCase().includes(hint))
    ) {
      return normalizedText;
    }

    if (!Array.isArray(option?.ingredients) || option.ingredients.length === 0) {
      return '';
    }

    const names = option.ingredients
      .map(getLocalizedIngredientName)
      .filter(Boolean)
      .join(', ');

    const mainIngredient = getLocalizedIngredientName(option.ingredients[0]) || names;
    return t('plannerPage.generatedCookingMethod', { ingredients: names, mainIngredient });
  };

  function getLocalizedIngredientName(ingredient) {
    const matchedFood = foodOptions.find((food) => String(food.id) === String(ingredient?.foodItemId));
    return getLocalizedName(matchedFood || ingredient, i18n.language);
  }

  const getLocalizedActivityCategory = (category) => {
    const key = String(category || 'other').toLowerCase();
    return t(`activityPage.categories.${key}`, { defaultValue: key });
  };

  const getLocalizedOptionAmount = (option) => {
    if (!option) {
      return '';
    }
    if (!option.recipeId) {
      return t('plannerPage.oneServing');
    }
    const servings = Number(option.servings);
    return servings > 1 ? t('plannerPage.servings', { count: servings }) : t('plannerPage.oneServing');
  };

  const getOptionDisplayName = (option) => {
    if (option?.recipeId) {
      return getRecipeDisplayName(option);
    }
    if (!Array.isArray(option?.ingredients) || option.ingredients.length === 0) {
      return option?.name || '';
    }
    const ingredientNames = option.ingredients.map(getLocalizedIngredientName).filter(Boolean).slice(0, 3);
    return t('plannerPage.generatedDishName', { ingredients: ingredientNames.join(', ') });
  };

  function getRecipeDisplayName(recipe) {
    const originalName = String(recipe?.name || '').trim();
    if (textMatchesLanguage(originalName, i18n.language)) return originalName;
    const ingredientNames = (recipe?.ingredients || [])
      .map(getLocalizedIngredientName)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    return ingredientNames
      ? t('plannerPage.localizedRecipeName', { ingredients: ingredientNames })
      : originalName;
  }

  const normalizeRecipeOption = useCallback((recipe) => {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const servingSizeG = ingredients.reduce((sum, ingredient) => sum + Number(ingredient.quantityG || ingredient.servingSizeG || 0), 0);
    return {
      recipeId: getRecipeId(recipe),
      name: recipe.name,
      description: recipe.description || '',
      cookingMethod: recipe.description || '',
      servings: Number(recipe.servings) || 1,
      amount: '',
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
        nameVi: ingredient.nameVi,
        servingSizeG: Number(ingredient.quantityG || ingredient.servingSizeG) || 100,
        quantity: 1,
        calories: Number(ingredient.calories) || 0,
        proteinG: Number(ingredient.proteinG) || 0,
        carbsG: Number(ingredient.carbsG) || 0,
        fatG: Number(ingredient.fatG) || 0,
      })),
    };
  }, []);

  const loadRecipes = useCallback(async (signal) => {
    if (!canSearchRecipes) {
      setRecipes([]);
      return;
    }

    const requestId = ++recipeRequestIdRef.current;
    try {
      const params = {
        maxCalories: Math.max(Math.round(selectedMealBudget * 1.12), 300),
        limit: 12,
        goal: activeGoal,
        mealType: mealTypeToApi[selectedMeal] || selectedMeal.toUpperCase(),
      };
      if (selectedFoodIds.length > 0) {
        params.foodIds = selectedFoodKey;
      }
      if (normalizedRecipeSearchTerm) {
        params.q = normalizedRecipeSearchTerm;
      }
      const cacheKey = JSON.stringify(params);
      const cachedRecipes = recipeCacheRef.current.get(cacheKey);
      if (cachedRecipes) {
        setRecipes(cachedRecipes);
        setRecipesLoading(false);
        return;
      }
      setRecipesLoading(true);
      setError('');
      const response = await getRecipeSuggestions(params, { signal });
      const normalizedRecipes = Array.isArray(response.data) ? response.data.map(normalizeRecipeOption) : [];
      if (recipeCacheRef.current.size >= 30) {
        recipeCacheRef.current.delete(recipeCacheRef.current.keys().next().value);
      }
      recipeCacheRef.current.set(cacheKey, normalizedRecipes);
      if (requestId === recipeRequestIdRef.current) setRecipes(normalizedRecipes);
    } catch (err) {
      if (err.code !== 'ERR_CANCELED' && requestId === recipeRequestIdRef.current) {
        setError(err.response?.data?.message || t('plannerPage.errors.loadRecipes'));
      }
    } finally {
      if (requestId === recipeRequestIdRef.current) setRecipesLoading(false);
    }
  }, [activeGoal, canSearchRecipes, normalizeRecipeOption, normalizedRecipeSearchTerm, selectedFoodIds.length, selectedFoodKey, selectedMeal, selectedMealBudget, t]);

  const toggleFoodName = (name) => {
    setSelectedFoodNames((current) => {
      const exists = current.includes(name);
      if (exists) {
        return current.filter((item) => item !== name);
      }
      if (current.length >= maxSelectedFoods) {
        setPlannerNotice({
          title: t('plannerPage.warnings.foodLimitTitle'),
          message: t('plannerPage.warnings.foodLimitMessage', { max: maxSelectedFoods }),
        });
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
        setPlannerNotice({
          title: t('plannerPage.warnings.activityLimitTitle'),
          message: t('plannerPage.warnings.activityLimitMessage', { max: maxSelectedActivities }),
        });
        return current;
      }
      return [...current, name];
    });
    setSuggestion(null);
    setSelectedOption(null);
  };

  const buildGeneratedMealItems = (option) => {
    const aiIngredients = Array.isArray(option.ingredients)
      ? option.ingredients.filter((ingredient) => ingredient.foodItemId)
      : [];
    const sourceItems = aiIngredients.length > 0
      ? aiIngredients
      : selectedFoodOptions.map((food) => ({
        foodItemId: food.id,
        name: food.name,
        nameVi: food.nameVi,
        servingSizeG: food.servingSizeG,
        quantity: 1,
        calories: food.calories,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
        fiberG: food.fiberG,
        sodiumMg: food.sodiumMg,
      }));

    return sourceItems.map((ingredient) => {
      const matchedFood = foodOptions.find((food) => String(food.id) === String(ingredient.foodItemId));
      const servingSizeG = Number(ingredient.servingSizeG || ingredient.quantityG || matchedFood?.servingSizeG) || 100;
      const quantity = Number(ingredient.quantity) || 1;
      const fallbackScale = servingSizeG / Math.max(Number(matchedFood?.servingSizeG) || servingSizeG, 1);
      const scaledValue = (fieldName, fallbackName) => {
        const directValue = Number(ingredient[fieldName]);
        if (directValue > 0 || fieldName === 'fiberG' || fieldName === 'sodiumMg') {
          return directValue || 0;
        }
        return (Number(matchedFood?.[fallbackName]) || 0) * fallbackScale * quantity;
      };

      return {
        itemType: 'FOOD',
        foodItemId: ingredient.foodItemId,
        recipeId: null,
        foodName: getLocalizedName(matchedFood || ingredient, i18n.language) || ingredient.name || matchedFood?.name || '',
        servingSizeG,
        quantity,
        calories: scaledValue('calories', 'calories'),
        proteinG: scaledValue('proteinG', 'proteinG'),
        carbsG: scaledValue('carbsG', 'carbsG'),
        fatG: scaledValue('fatG', 'fatG'),
        fiberG: scaledValue('fiberG', 'fiberG'),
        sodiumMg: scaledValue('sodiumMg', 'sodiumMg'),
      };
    }).filter((item) => item.foodItemId && item.foodName && item.calories >= 0);
  };

  const findActivityTypeByName = (activityName, activityTypeId = null) => activityOptions.find((type) => {
    if (activityTypeId && String(type.id) === String(activityTypeId)) {
      return true;
    }
    const displayName = type.nameVi || type.name;
    return displayName === activityName || type.name === activityName || type.nameVi === activityName;
  });

  const getActivityDisplayName = (activity, matchedType = findActivityTypeByName(activity?.name, activity?.activityTypeId)) => (
    matchedType ? getLocalizedName(matchedType, i18n.language) : activity?.name || ''
  );

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [i18n.language]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getProfile(), getActivityTypes()])
      .then(([profileResponse, activityTypesResponse]) => {
        if (cancelled) {
          return;
        }
        setProfile(mapProfileFromApi(extractProfileFromApi(profileResponse.data)));
        setActivityOptions(extractActivityTypesFromApi(activityTypesResponse.data)
          .map(normalizeActivityType)
          .filter((activity) => activity.id && activity.name));
      })
      .catch((err) => setError(err.response?.data?.message || t('plannerPage.errors.load')))
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setSuggestion(null);
    setSelectedOption(null);
    setSelectedRecipeId(null);

    Promise.all([getMealsByDate(planDate), getActivitiesByDate(planDate)])
      .then(([mealsResponse, activitiesResponse]) => {
        if (cancelled) {
          return;
        }
        setMeals(extractMealsFromApi(mealsResponse.data).map(normalizeMealFromApi));
        setActivities(extractActivitiesFromApi(activitiesResponse.data).map(normalizePlannerActivityLog));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || t('plannerPage.errors.load'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [planDate, t]);

  useEffect(() => {
    setFoodPage(0);
  }, [normalizedFoodSearchTerm]);

  useEffect(() => {
    setActivityPage(0);
  }, [normalizedActivitySearchTerm]);

  useEffect(() => {
    setRecipePage(0);
  }, [normalizedRecipeSearchTerm, selectedFoodKey, selectedMeal, i18n.language]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setFoodSearchLoading(true);
    const timer = setTimeout(() => {
      const hasFoodSearch = Boolean(normalizedFoodSearchTerm);

      getFoods({
        recipeFirst: true,
        page: hasFoodSearch ? 0 : foodPage,
        size: hasFoodSearch ? 1000 : foodPageSize,
      }, { signal: controller.signal })
        .then((response) => {
          if (cancelled) {
            return;
          }

          const mappedFoods = extractFoodsFromApi(response.data)
            .map(mapFoodOption)
            .filter((food) => food.id && food.name);
          const searchMatchedFoods = hasFoodSearch
            ? mappedFoods.filter((food) => valuesMatchSearch([
              isVietnameseSearchLanguage(i18n.language) ? food.nameVi || food.name : food.name || food.nameVi,
            ], normalizedFoodSearchTerm))
            : mappedFoods;
          const pageStart = hasFoodSearch ? foodPage * foodPageSize : 0;
          const pagedFoods = hasFoodSearch
            ? searchMatchedFoods.slice(pageStart, pageStart + foodPageSize)
            : searchMatchedFoods;

          setFoodSearchResults(pagedFoods);
          setFoodTotalPages(hasFoodSearch
            ? Math.max(1, Math.ceil(searchMatchedFoods.length / foodPageSize))
            : getTotalPagesFromApi(response.data));
          setFoodOptions((current) => {
            const retainedSelectedFoods = current.filter((food) => selectedFoodNamesRef.current.includes(food.name));
            const foodMap = new Map(retainedSelectedFoods.map((food) => [food.id, food]));
            searchMatchedFoods.forEach((food) => foodMap.set(food.id, food));
            return Array.from(foodMap.values());
          });
        })
        .catch((err) => {
          if (!cancelled && err.code !== 'ERR_CANCELED') {
            setFoodSearchResults([]);
            setFoodTotalPages(1);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setFoodSearchLoading(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [foodPage, i18n.language, normalizedFoodSearchTerm]);

  useEffect(() => {
    if (loading || !isRecipeMode) {
      return undefined;
    }

    if (!canSearchRecipes) {
      setRecipes([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => loadRecipes(controller.signal), 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canSearchRecipes, isRecipeMode, loadRecipes, loading, normalizedRecipeSearchTerm, selectedFoodKey]);

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
        caloriesConsumed: effectiveCaloriesConsumed,
        mealType: effectiveMealType,
        goal: activeGoal,
        weightKg: Number(profile?.weight) || 70,
        targetWeightKg: Number(profile?.targetWeight) || Number(profile?.weight) || 70,
        activityLevel: profile?.activityLevel?.toUpperCase() || 'SEDENTARY',
        heightCm: Number(profile?.height) || 170,
        gender: profile?.gender?.toUpperCase() || 'MALE',
        excludedFoodNames: [...new Set([...existingNames, ...(suggestedNames[effectiveMealType] || [])])],
        selectedFoodIds: isExerciseMode ? [] : selectedFoodIds,
        selectedFoodNames: isExerciseMode ? [] : selectedFoodNames,
        selectedActivityTypeIds: isExerciseMode ? selectedActivityTypeIds : [],
        selectedActivityNames: isExerciseMode ? selectedActivityNames : [],
        dailyActivityGoalKcal: dailyActivityGoal,
        activityCaloriesBurned: Math.round(activityCaloriesToday),
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
    setSelectingOption(true);
    setError('');
    setSuccess('');
    setMealSuccessPopup(null);
    try {
      const optionDisplayName = getOptionDisplayName(option);
      const optionCalories = Number(option.calories) || 0;
      const fallbackMealBudgetLimit = isRecipeMode
        ? Math.round(selectedMealBudget * 1.12)
        : availableCaloriesForSelectedMeal;
      const mealBudgetLimit = Math.max(Number(suggestion?.mealBudget) || 0, fallbackMealBudgetLimit);
      if (optionCalories <= 0 || optionCalories > availableCaloriesForSelectedMeal || optionCalories > mealBudgetLimit) {
        throw new Error(t('plannerPage.errors.overBudget'));
      }

      const mealItems = option.recipeId ? [{
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
      }] : buildGeneratedMealItems(option);

      if (mealItems.length === 0) {
        throw new Error(t('plannerPage.errors.selectFoodBeforeSave'));
      }

      const mealPlanEntries = option.recipeId ? [{
        planDate,
        mealType: mealTypeToApi[selectedMeal] || selectedMeal.toUpperCase(),
        foodItemId: null,
        recipeId: option.recipeId,
        foodName: option.name,
        servingSizeG: Number(option.servingSizeG) || 100,
        quantity: 1,
        calories: Number(option.calories) || 0,
        notes: getOptionCookingMethod(option) || option.description || '',
      }] : mealItems.map((item) => ({
        planDate,
        mealType: mealTypeToApi[selectedMeal] || selectedMeal.toUpperCase(),
        foodItemId: item.foodItemId,
        recipeId: null,
        foodName: item.foodName,
        servingSizeG: item.servingSizeG,
        quantity: item.quantity,
        calories: item.calories,
        notes: optionDisplayName,
      }));

      const payload = {
        mealType: selectedMeal.toUpperCase(),
        mealDate: planDate,
        mealTime: null,
        notes: `${t('plannerPage.savedNotes.meal')}: ${optionDisplayName}`,
        items: mealItems,
      };
      const replacedMealIds = loggedMealsForSlot.map((meal) => meal.id).filter(Boolean);
      if (replacedMealIds.length > 0) {
        await Promise.all(replacedMealIds.map((mealId) => deleteMealById(mealId)));
      }
      const mealPlanPayload = {
        name: `${selectedMealLabel} - ${planDate}`,
        description: `${t('plannerPage.savedNotes.meal')}: ${optionDisplayName}`,
        startDate: planDate,
        endDate: planDate,
        active: true,
        entries: mealPlanEntries,
      };
      const response = await createMeal(payload);
      createMealPlan(mealPlanPayload).catch((planError) => {
        console.warn('[Planner] Meal was logged, but meal plan synchronization failed:', planError);
      });
      setMeals((current) => [
        ...current.filter((meal) => !replacedMealIds.includes(meal.id)),
        normalizeMealFromApi(response.data),
      ]);
      setSelectedOption(index);
      setSelectedRecipeId(option.recipeId || null);
      setSuccess(t(replacedMealIds.length > 0 ? 'plannerPage.success.mealReplaced' : 'plannerPage.success.mealAdded', { name: optionDisplayName }));
      setMealSuccessPopup({
        message: t('plannerPage.successPopup.mealSelected'),
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('plannerPage.errors.addMeal'));
    } finally {
      setSaving(false);
      setSelectingOption(false);
    }
  };

  const deleteMeal = async (mealId) => {
    setSaving(true);
    setDeletingId(mealId);
    setError('');
    setSuccess('');
    setMealSuccessPopup(null);
    try {
      await deleteMealById(mealId);
      setMeals((current) => current.filter((m) => m.id !== mealId));
      setSelectedOption(null);
      setSelectedRecipeId(null);
      setSuccess(t('plannerPage.success.mealDeleted'));
      setMealSuccessPopup({
        message: t('plannerPage.successPopup.mealUnselected'),
      });
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.deleteMeal'));
    } finally {
      setSaving(false);
      setDeletingId(null);
    }
  };

  const handleLogActivity = async (activity, idx) => {
    const matchedActivityType = findActivityTypeByName(activity.name, activity.activityTypeId);
    const predictedCalories = calculateActivityPreviewCalories(activity, matchedActivityType, profile?.weight);
    const projectedActivityCalories = activityCaloriesToday + predictedCalories;

    if (dailyActivityGoal > 0 && projectedActivityCalories > dailyActivityGoal) {
      setPlannerNotice({
        title: t('plannerPage.warnings.activityOverGoalTitle'),
        message: t('plannerPage.warnings.activityOverGoalMessage', {
          current: Math.round(activityCaloriesToday),
          added: Math.round(predictedCalories),
          total: Math.round(projectedActivityCalories),
          goal: Math.round(dailyActivityGoal),
        }),
        confirmLabel: t('plannerPage.warnings.continueAnyway'),
        onConfirm: () => logActivity(activity, idx, matchedActivityType),
      });
      return;
    }

    await logActivity(activity, idx, matchedActivityType);
  };

  const logActivity = async (activity, idx, matchedActivityType = findActivityTypeByName(activity.name, activity.activityTypeId)) => {
    setSaving(true);
    setSelectingOption(true);
    setLoggingActivity(idx);
    setError('');
    setSuccess('');
    const todayDate = planDate;

    const payload = {
      activityTypeId: matchedActivityType?.id || null,
      activityName: activity.name,
      durationMinutes: getActivityDurationMinutes(activity),
      userWeightKg: Number(profile?.weight) || 70,
      loggedAt: `${todayDate}T${getCurrentTime()}:00`,
      notes: t('plannerPage.savedNotes.activity'),
      category: matchedActivityType?.category?.toUpperCase() || 'CARDIO',
    };

    try {
      const activityDisplayName = getActivityDisplayName(activity, matchedActivityType);
      const workoutPlanPayload = {
        name: `${t('plannerPage.sections.activityPlan')} - ${planDate}`,
        description: `${t('plannerPage.savedNotes.activity')}: ${activityDisplayName}`,
        goal: activeGoal === 'LOSE_WEIGHT' || activeGoal === 'CUTTING'
          ? 'WEIGHT_LOSS'
          : activeGoal === 'GAIN_MUSCLE'
            ? 'MUSCLE_GAIN'
            : 'GENERAL_FITNESS',
        durationWeeks: 1,
        active: true,
        exercises: [{
          dayOfWeek: getPlannerDayOfWeek(planDate),
          activityTypeId: matchedActivityType?.id || activity.activityTypeId || null,
          exerciseName: activityDisplayName,
          durationMinutes: getActivityDurationMinutes(activity),
          sortOrder: 0,
          notes: t('plannerPage.savedNotes.activity'),
        }],
      };
      const response = await createActivityLog(payload);
      createWorkoutPlan(workoutPlanPayload).catch((planError) => {
        console.warn('[Planner] Activity was logged, but workout plan synchronization failed:', planError);
      });
      setActivities((current) => [...current, normalizePlannerActivityLog(response.data)]);
      setSelectedOption(idx);
      setSuccess(t('plannerPage.success.activityAdded', { name: activityDisplayName }));
    } catch (err) {
      setError(err.response?.data?.message || t('plannerPage.errors.addActivity'));
    } finally {
      setSaving(false);
      setSelectingOption(false);
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
        <h1>{t('plannerPage.title')}</h1>
      </div>
    </div>
    <ErrorModal error={error} onClose={() => setError('')} />
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
              <div>
                <h2>{isExerciseMode ? t('plannerPage.sections.activityPlan') : isRecipeMode ? t('plannerPage.sections.recipePlan') : t('plannerPage.sections.mealPlan')}</h2> 
              </div>
            </div>
            <div className="planner-budget-tile">
              <div>
                <span>{t('plannerPage.calorieBudget')}</span>
                <strong>{formatCalories(remaining)} kcal</strong>
                <small>{t('plannerPage.consumed', { consumed: formatCalories(totals.calories), goal: formatCalories(calorieGoal) })}</small>
              </div>
              <FaFireAlt />
            </div>
            <ProgressBar now={Math.min(progress, 100)} variant={progress > 100 ? 'danger' : 'success'} className="mb-3" />
            <Form.Group>
              {isExerciseMode ? (
                <div className="form-control bg-body-secondary" aria-label={t('plannerPage.mealTypes.exercise')}>
                  {t('plannerPage.mealTypes.exercise')}
                </div>
              ) : (
                <Form.Select
                  value={selectedMeal}
                  onChange={(e) => { setSelectedMeal(e.target.value); setSuggestion(null); setSelectedOption(null); }}
                >
                  {mealTypes.filter(([value]) => value !== 'exercise')
                    .map(([value, labelKey]) => <option value={value} key={value}>{t(labelKey)}</option>)}
                </Form.Select>
              )}
            </Form.Group>
          </section>
          {!isExerciseMode && (
            <section className="planner-control-section">
              <div className="planner-section-heading">
                <span><FaUtensils /></span>
                <div>
                  <h2>{isRecipeMode ? t('plannerPage.sections.recipeFilter') : t('plannerPage.sections.food')}</h2>
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
              <InputGroup className="planner-food-search mb-2">
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  value={foodSearchTerm}
                  onChange={(event) => setFoodSearchTerm(event.target.value)}
                  placeholder={t('plannerPage.searchFoodsPlaceholder')}
                  aria-label={t('plannerPage.searchFoods')}
                />
              </InputGroup>
              {selectedFoodOptions.length > 0 && (
                <div className="planner-food-picker planner-food-picker-selected mb-2">
                  {selectedFoodOptions.map((food) => (
                    <button
                      type="button"
                      className="planner-food-choice is-selected"
                      key={food.id}
                      onClick={() => toggleFoodName(food.name)}
                    >
                      <FaUtensils />
                      <span>{getLocalizedName(food, i18n.language)}</span>
                      <FaCheck />
                    </button>
                  ))}
                </div>
              )}
              <div className="planner-food-picker">
                {foodSearchLoading && (
                  <div className="planner-food-empty">
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('plannerPage.searchingFoods')}
                  </div>
                )}
                {!foodSearchLoading && foodSearchResults.length === 0 && (
                  <div className="planner-food-empty">{t('plannerPage.noFoodResults')}</div>
                )}
                {!foodSearchLoading && availableFoodSearchResults.map((food) => {
                  return (
                    <button
                      type="button"
                      className="planner-food-choice"
                      key={food.id}
                      onClick={() => toggleFoodName(food.name)}
                    >
                      <FaUtensils />
                      <span>{getLocalizedName(food, i18n.language)}</span>
                    </button>
                  );
                })}
              </div>
              <div className="planner-food-pagination">
                <Button
                  variant="link"
                  size="sm"
                  className="pagination-arrow-btn"
                  aria-label={t('plannerPage.previousPage')}
                  title={t('plannerPage.previousPage')}
                  disabled={foodSearchLoading || foodPage <= 0}
                  onClick={() => setFoodPage((current) => Math.max(0, current - 1))}
                >
                  <FaArrowLeft />
                </Button>
                <span>
                  {t('plannerPage.foodPageInfo', {
                    page: foodPage + 1,
                    total: foodTotalPages,
                    count: foodResultCount,
                  })}
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="pagination-arrow-btn"
                  aria-label={t('plannerPage.nextPage')}
                  title={t('plannerPage.nextPage')}
                  disabled={foodSearchLoading || foodPage + 1 >= foodTotalPages}
                  onClick={() => setFoodPage((current) => Math.min(foodTotalPages - 1, current + 1))}
                >
                  <FaArrowRight />
                </Button>
              </div>
              <Form.Text muted>{t('plannerPage.selectedFoodsHint', { count: selectedFoodCount, max: maxSelectedFoods })}</Form.Text>
              {isRecipeMode && (
                <div className="mt-3">
                  <Form.Label className="mb-2">{t('plannerPage.searchRecipes')}</Form.Label>
                  <InputGroup className="planner-food-search">
                    <InputGroup.Text><FaSearch /></InputGroup.Text>
                    <Form.Control
                      value={recipeSearchTerm}
                      onChange={(event) => {
                        setRecipeSearchTerm(event.target.value);
                        setSelectedRecipeId(null);
                      }}
                      placeholder={t('plannerPage.searchRecipesPlaceholder')}
                      aria-label={t('plannerPage.searchRecipes')}
                    />
                  </InputGroup>
                  <Form.Text muted>{t('plannerPage.searchRecipesHint')}</Form.Text>
                </div>
              )}
            </section>
          )}
          {isExerciseMode && (
            <section className="planner-control-section">
              <div className="planner-section-heading">
                <span><FaDumbbell /></span>
                <div>
                  <h2>{t('plannerPage.sections.activity')}</h2>
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
              <InputGroup className="planner-food-search mb-2">
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  value={activitySearchTerm}
                  onChange={(event) => setActivitySearchTerm(event.target.value)}
                  placeholder={t('plannerPage.searchActivitiesPlaceholder')}
                  aria-label={t('plannerPage.searchActivities')}
                />
              </InputGroup>
              {selectedActivityOptions.length > 0 && (
                <div className="planner-food-picker planner-food-picker-selected mb-2">
                  {selectedActivityOptions.map((activity) => {
                    const name = activity.name;
                    const displayName = getLocalizedName(activity, i18n.language);
                    return (
                      <button
                        type="button"
                        className="planner-food-choice is-selected"
                        key={activity.id}
                        onClick={() => toggleActivityName(name)}
                      >
                        <FaDumbbell />
                        <span>{displayName}</span>
                        <FaCheck />
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="planner-food-picker">
                {activitySearchResults.length === 0 && (
                  <div className="planner-food-empty">{t('plannerPage.noActivityResults')}</div>
                )}
                {activitySearchResults.map((activity) => {
                  const name = activity.name;
                  const displayName = getLocalizedName(activity, i18n.language);
                  const selected = selectedActivityNames.includes(name);
                  return (
                    <button
                      type="button"
                      className={`planner-food-choice${selected ? ' is-selected' : ''}`}
                      key={activity.id}
                      onClick={() => toggleActivityName(name)}
                    >
                      <FaDumbbell />
                      <span>{displayName}</span>
                      {selected && <FaCheck />}
                    </button>
                  );
                })}
              </div>
              <div className="planner-food-pagination">
                <Button
                  variant="link"
                  size="sm"
                  className="pagination-arrow-btn"
                  aria-label={t('plannerPage.previousPage')}
                  title={t('plannerPage.previousPage')}
                  disabled={activityPage <= 0}
                  onClick={() => setActivityPage((current) => Math.max(0, current - 1))}
                >
                  <FaArrowLeft />
                </Button>
                <span>
                  {t('plannerPage.activityPageInfo', {
                    page: activityPage + 1,
                    total: activityTotalPages,
                    count: filteredActivityOptions.length,
                  })}
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="pagination-arrow-btn"
                  aria-label={t('plannerPage.nextPage')}
                  title={t('plannerPage.nextPage')}
                  disabled={activityPage + 1 >= activityTotalPages}
                  onClick={() => setActivityPage((current) => Math.min(activityTotalPages - 1, current + 1))}
                >
                  <FaArrowRight />
                </Button>
              </div>
              <Form.Text muted>{t('plannerPage.selectedActivitiesHint', { count: selectedActivityCount, max: maxSelectedActivities })}</Form.Text>
            </section>
          )}
          {!isRecipeMode && (
            <>
              <Button className="w-100" variant={isExerciseMode ? 'primary' : 'success'} onClick={generate} disabled={generating || (!isExerciseMode && availableCaloriesForSelectedMeal < 100 && !hasInvalidDailyTotal)}><FaRobot className="me-2" />{generating ? t('plannerPage.generating') : t('plannerPage.createOptions')}</Button>
              {suggestion && <Button className="w-100 mt-2" variant={isExerciseMode ? 'outline-primary' : 'outline-success'} onClick={generate} disabled={generating}><FaRobot className="me-2" />{t('plannerPage.createOtherOptions')}</Button>}
            </>
          )}
          {hasInvalidDailyTotal && <Alert variant="danger" className="mt-3 mb-0 py-2">{t('plannerPage.invalidTotal')}</Alert>}
          {!hasInvalidDailyTotal && !isExerciseMode && !isRecipeMode && availableCaloriesForSelectedMeal < 100 && <Alert variant="warning" className="mt-3 mb-0 py-2">{t('plannerPage.insufficientCalories')}</Alert>}
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
                {loggedMealsForSlot.map((meal) => {
                  const mealTotals = getMealTotals(meal);
                  const mealItems = meal.items || [];

                  return (
                    <Col md={6} key={meal.id || meal.notes || getLoggedMealTitle(meal, selectedMealLabel)}>
                      <Card className="border-0 shadow-sm bg-white h-100">
                        <Card.Body className="d-flex flex-column p-3">
                          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                            <span className="fw-bold text-dark">{getLoggedMealTitle(meal, selectedMealLabel)}</span>
                            <span className="small fw-semibold text-success">{Math.round(mealTotals.calories)} kcal</span>
                          </div>

                          {mealItems.length > 0 && (
                            <div className="mb-3">
                              <div className="text-uppercase text-secondary small fw-semibold mb-1">
                                {t('plannerPage.ingredients')}
                              </div>
                              <ul className="small text-secondary ps-3 mb-0">
                                {mealItems.map((item) => (
                                  <li key={item.id || item.name}>
                                    {getLocalizedMealItemName(item)}{item.serving ? ` - ${item.serving}` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="quick-grid mb-3">
                            <span>{t('common.protein')}<strong>{mealTotals.protein.toFixed(1)}g</strong></span>
                            <span>{t('common.carbs')}<strong>{mealTotals.carbs.toFixed(1)}g</strong></span>
                            <span>{t('common.fat')}<strong>{mealTotals.fat.toFixed(1)}g</strong></span>
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
                  );
                })}
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
                          <span className="fw-bold text-dark">{getActivityDisplayName({ name: act.activityName, activityTypeId: act.activityTypeId })}</span>
                          <span className="small fw-semibold text-primary">{Math.round(act.caloriesBurned)} kcal</span>
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
                <p className="text-secondary small mb-0">{t('plannerPage.recipeLibraryDescription')}</p>
                <p className="text-success small fw-semibold mt-1 mb-0">
                  {t('plannerPage.filteringForMeal', { meal: selectedMealLabel })}
                </p>
              </div>
              <span className="small fw-semibold text-success mt-1">{rankedRecipes.length}</span>
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
                {t(canSearchRecipes ? 'plannerPage.empty.noRecipes' : 'plannerPage.searchRecipesEmpty')}
              </Alert>
            )}
            {!recipesLoading && recipes.length > 0 && (
              <Row className="g-3">
                {pagedRecipes.map((recipe, index) => {
                  const matchedIngredientCount = recipe.ingredients.filter((ingredient) =>
                    selectedFoodIds.some((foodId) => String(foodId) === String(ingredient.foodItemId))
                  ).length;
                  const recipeId = getRecipeId(recipe);
                  const logged = selectedRecipeId === recipeId || loggedMealsForSlot.some((meal) =>
                    (meal.items || []).some((item) => getRecipeId(item) === recipeId || item.name === recipe.name)
                  );
                  return (
                    <Col md={6} key={recipeId || recipe.name}>
                      <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="d-flex flex-column">
                          <div className="d-flex justify-content-between gap-2">
                            <FaBookOpen className="text-success fs-5" />
                            <span className="small fw-semibold text-success">{formatCalories(recipe.calories)} kcal</span>
                          </div>
                          <h3 className="h5 fw-bold mt-3">{getRecipeDisplayName(recipe)}</h3>
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            <span className="text-info small fw-semibold">{t('plannerPage.savedRecipe')}</span>
                            <span className="text-secondary small">
                              {t('plannerPage.ingredientCount', { count: recipe.ingredients.length })}
                            </span>
                            <span className="text-secondary small">
                              {recipe.servings > 1
                                ? t('plannerPage.servings', { count: recipe.servings })
                                : t('plannerPage.oneServing')}
                            </span>
                            {selectedFoodIds.length > 0 && (
                              <span className="text-success small fw-semibold">
                                {t('plannerPage.recipeMatch', { matched: matchedIngredientCount, total: selectedFoodIds.length })}
                              </span>
                            )}
                          </div>
                          {recipe.ingredients.length > 0 && (
                            <div className="mb-3">
                              <div className="text-uppercase text-secondary small fw-semibold mb-1">
                                {t('plannerPage.ingredients')}
                              </div>
                              <ul className="small text-secondary ps-3 mb-0">
                                {recipe.ingredients.map((ingredient) => (
                                  <li key={`${recipeId}-${ingredient.foodItemId || ingredient.name}`}>
                                    {getLocalizedIngredientName(ingredient)} - {Math.round(ingredient.servingSizeG)}g
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="mb-3 p-3 rounded border bg-light">
                            <div className="text-uppercase text-secondary small fw-semibold mb-1">
                              {t('plannerPage.cookingMethod')}
                            </div>
                            <p className="small mb-0">{getOptionCookingMethod({ ...recipe, recipeId: null }) || t('plannerPage.noCookingGuide')}</p>
                          </div>
                          <div className="quick-grid mb-3">
                            <span>{t('common.protein')}<strong>{recipe.proteinG}g</strong></span>
                            <span>{t('common.carbs')}<strong>{recipe.carbsG}g</strong></span>
                            <span>{t('common.fat')}<strong>{recipe.fatG}g</strong></span>
                          </div>
                          <Button
                            className="mt-auto"
                            variant={logged ? 'success' : 'outline-success'}
                            disabled={saving || logged || selectedOption !== null}
                            onClick={() => addOption(recipe, index)}
                          >
                            {logged ? (
                              <>
                                <FaCheck className="me-2" />
                                {t('plannerPage.selected')}
                              </>
                            ) : (
                              hasLoggedMealInSlot ? t('plannerPage.replaceOption') : t('plannerPage.chooseRecipe')
                            )}
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
            {!recipesLoading && rankedRecipes.length > recipePageSize && (
              <div className="planner-food-pagination mt-4">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={recipePage === 0}
                  aria-label={t('plannerPage.previousPage')}
                  onClick={() => setRecipePage((current) => Math.max(0, current - 1))}
                >
                  <FaArrowLeft />
                </Button>
                <span>{t('plannerPage.recipePageInfo', { page: recipePage + 1, total: recipeTotalPages })}</span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={recipePage + 1 >= recipeTotalPages}
                  aria-label={t('plannerPage.nextPage')}
                  onClick={() => setRecipePage((current) => Math.min(recipeTotalPages - 1, current + 1))}
                >
                  <FaArrowRight />
                </Button>
              </div>
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
            {isExerciseMode && (suggestion.options || []).length === 0 ? (
              <Alert variant="warning" className="border">
                {t('plannerPage.empty.noActivityCatalog')}
              </Alert>
            ) : (
            <Row className="g-3">
              {(suggestion.options || []).map((option, index) => {
                const logged = isOptionLogged(option.name) || selectedOption === index;
                const isExercise = isExerciseMode;
                const cookingMethod = getOptionCookingMethod(option);
                const matchedActivityType = isExercise ? findActivityTypeByName(option.name, option.activityTypeId) : null;
                const loggedActivity = isExercise ? findLoggedActivityByName(option.name) : null;
                const activityPreviewCalories = loggedActivity
                  ? Math.round(Number(loggedActivity.caloriesBurned) || 0)
                  : isExercise
                    ? calculateActivityPreviewCalories(option, matchedActivityType, profile?.weight)
                    : 0;
                const activityDurationMinutes = loggedActivity?.durationMinutes || getActivityDurationMinutes(option);
                const ingredientCount = Array.isArray(option.ingredients) ? option.ingredients.length : 0;
                const optionDisplayName = isExercise ? option.name : getOptionDisplayName(option);
                const isBlockedByOtherSelection = isExercise 
                  ? (hasLoggedActivityInSlot && !logged) 
                  : selectedOption !== null;
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
                          <span className={`small fw-semibold text-${isExercise ? 'primary' : 'success'}`}>
                            {isExercise
                              ? t('plannerPage.caloriesBurned', { calories: activityPreviewCalories })
                              : `${formatCalories(option.calories)} kcal`}
                          </span>
                        </div>
                        <h3 className="h5 fw-bold mt-3">{isExercise ? getActivityDisplayName(option, matchedActivityType) : optionDisplayName}</h3>
                        <p className="text-secondary">{!isExercise ? getLocalizedOptionAmount(option) : option.amount}</p>
                        {!isExercise && (
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            <span className={`small fw-semibold text-${option.recipeId ? 'info' : 'secondary'}`}>
                              {option.recipeId ? t('plannerPage.savedRecipe') : t('plannerPage.aiGenerated')}
                            </span>
                            {ingredientCount > 0 && (
                              <span className="text-secondary small">
                                {t('plannerPage.ingredientCount', { count: ingredientCount })}
                              </span>
                            )}
                          </div>
                        )}
                        {isExercise && (
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            <span className="text-primary small fw-semibold">
                              {t('plannerPage.activityOptionNumber', { number: index + 1 })}
                            </span>
                            {activityDurationMinutes && (
                              <span className="text-secondary small">
                                {t('plannerPage.minutes', { minutes: activityDurationMinutes })}
                              </span>
                            )}
                            {matchedActivityType?.category && (
                              <span className="text-secondary small">
                                {t('plannerPage.activityCategory')}: {getLocalizedActivityCategory(matchedActivityType.category)}
                              </span>
                            )}
                          </div>
                        )}
                        {!isExercise && Array.isArray(option.ingredients) && option.ingredients.length > 0 && (
                          <div className="mb-3">
                            <div className="text-uppercase text-secondary small fw-semibold mb-1">
                              {t('plannerPage.ingredients')}
                            </div>
                            <p className="text-secondary small mb-0">
                              {option.ingredients.map(getLocalizedIngredientName).join(', ')}
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
                            isExercise
                              ? t('plannerPage.chooseActivity')
                              : hasLoggedMealInSlot
                                ? t('plannerPage.replaceOption')
                                : t('plannerPage.chooseOption')
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
      </Col>
    </Row>
    <Modal show={selectingOption} centered backdrop="static" keyboard={false}>
      <Modal.Body className="py-5 text-center" aria-live="polite" aria-busy="true">
        <Spinner animation="border" variant="primary" role="status" className="mb-3">
          <span className="visually-hidden">{t('plannerPage.selectionProgress.title')}</span>
        </Spinner>
        <h2 className="h5 mb-2">{t('plannerPage.selectionProgress.title')}</h2>
        <p className="text-secondary mb-0">{t('plannerPage.selectionProgress.message')}</p>
      </Modal.Body>
    </Modal>
    <Modal show={Boolean(mealSuccessPopup)} onHide={() => setMealSuccessPopup(null)} centered>
      <Modal.Header closeButton>
        <Modal.Title>{t('plannerPage.successPopup.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-secondary mb-0">{mealSuccessPopup?.message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={() => setMealSuccessPopup(null)}>
          {t('common.close')}
        </Button>
      </Modal.Footer>
    </Modal>
    <Modal show={Boolean(plannerNotice)} onHide={() => setPlannerNotice(null)} centered>
      <Modal.Header closeButton>
        <Modal.Title>{plannerNotice?.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-secondary mb-0">{plannerNotice?.message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => setPlannerNotice(null)}>
          {plannerNotice?.onConfirm ? t('common.cancel') : t('common.close')}
        </Button>
        {plannerNotice?.onConfirm && (
          <Button
            variant="warning"
            onClick={() => {
              const confirmAction = plannerNotice.onConfirm;
              setPlannerNotice(null);
              confirmAction();
            }}
          >
            {plannerNotice.confirmLabel}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  </>;
}

export default Planner;
