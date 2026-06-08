export const mealTypes = [
  { key: 'breakfast', labelKey: 'foodDiaryPage.mealTypes.breakfast' },
  { key: 'lunch', labelKey: 'foodDiaryPage.mealTypes.lunch' },
  { key: 'dinner', labelKey: 'foodDiaryPage.mealTypes.dinner' },
  { key: 'morning_snack', labelKey: 'foodDiaryPage.mealTypes.morning_snack' },
  { key: 'afternoon_snack', labelKey: 'foodDiaryPage.mealTypes.afternoon_snack' },
  { key: 'evening_snack', labelKey: 'foodDiaryPage.mealTypes.evening_snack' },
];

export const emptyMeal = {
  type: 'breakfast',
  date: '',
  time: '',
  notes: '',
  itemName: '',
  serving: '100g',
  quantity: 1,
};

const mealTypeFromApi = {
  BREAKFAST: 'breakfast',
  MORNING_SNACK: 'morning_snack',
  LUNCH: 'lunch',
  AFTERNOON_SNACK: 'afternoon_snack',
  DINNER: 'dinner',
  EVENING_SNACK: 'evening_snack',
};

const mealTypeToApi = {
  breakfast: 'BREAKFAST',
  morning_snack: 'MORNING_SNACK',
  lunch: 'LUNCH',
  afternoon_snack: 'AFTERNOON_SNACK',
  dinner: 'DINNER',
  evening_snack: 'EVENING_SNACK',
};

export function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeNumber(value) {
  return Number(value) || 0;
}

function normalizeDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

export function extractMealsFromApi(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.data || data?.content || data?.items || data?.meals || [];
}

export function extractMealFromApi(data) {
  return data?.data || data?.meal || data;
}

function normalizeMealItemFromApi(item = {}) {
  const servingSize = item.serving || item.servingSize || item.servingSizeG || item.portion;

  return {
    id: item.id || item.foodId || `I${Date.now()}-${Math.random()}`,
    name: item.name || item.foodName || item.itemName || '',
    serving: typeof servingSize === 'number' ? `${servingSize}g` : servingSize || '100g',
    quantity: normalizeNumber(item.quantity || 1),
    totalWeight: normalizeNumber(item.totalWeightG),
    calories: normalizeNumber(item.calories || item.caloriesKcal),
    protein: normalizeNumber(item.protein || item.proteinG || item.proteinGrams),
    carbs: normalizeNumber(item.carbs || item.carbsG || item.carbohydrates || item.carbsGrams),
    fat: normalizeNumber(item.fat || item.fatG || item.fatGrams),
    fiber: normalizeNumber(item.fiber || item.fiberG || item.fiberGrams),
    sodium: normalizeNumber(item.sodium || item.sodiumMg),
  };
}

export function normalizeMealFromApi(meal = {}) {
  const items = meal.items || meal.foodItems || meal.mealItems || [];

  return {
    id: meal.id || meal.mealId,
    type: mealTypeFromApi[meal.mealType] || meal.type || 'breakfast',
    date: normalizeDate(meal.date || meal.mealDate || meal.createdAt),
    time: meal.time || meal.mealTime || '',
    notes: meal.notes || '',
    notesKey: '',
    totals: {
      calories: normalizeNumber(meal.totalCalories),
      protein: normalizeNumber(meal.totalProteinG),
      carbs: normalizeNumber(meal.totalCarbsG),
      fat: normalizeNumber(meal.totalFatG),
      fiber: normalizeNumber(meal.totalFiberG),
    },
    items: items.map(normalizeMealItemFromApi),
  };
}

export function getMealTotals(meal) {
  const itemTotals = meal.items.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein: sum.protein + item.protein,
      carbs: sum.carbs + item.carbs,
      fat: sum.fat + item.fat,
      fiber: sum.fiber + item.fiber,
      sodium: sum.sodium + item.sodium,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 }
  );

  return {
    calories: meal.totals?.calories || itemTotals.calories,
    protein: meal.totals?.protein || itemTotals.protein,
    carbs: meal.totals?.carbs || itemTotals.carbs,
    fat: meal.totals?.fat || itemTotals.fat,
    fiber: meal.totals?.fiber || itemTotals.fiber,
    sodium: itemTotals.sodium,
  };
}

export function getMealsTotals(meals) {
  return meals.map(getMealTotals).reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein: sum.protein + item.protein,
      carbs: sum.carbs + item.carbs,
      fat: sum.fat + item.fat,
      fiber: sum.fiber + item.fiber,
      sodium: sum.sodium + item.sodium,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 }
  );
}

function parseServingG(value) {
  const parsed = Number(String(value).replace(/[^\d.]/g, ''));
  return parsed || 100;
}

export function mapMealToApi(form) {
  return {
    mealType: mealTypeToApi[form.type] || form.type,
    mealDate: form.date,
    mealTime: form.time || null,
    notes: form.notes,
    items: [
      {
        itemType: 'FOOD',
        foodName: form.itemName,
        servingSizeG: parseServingG(form.serving),
        quantity: Number(form.quantity) || 1,
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
        sodiumMg: 0,
      },
    ],
  };
}

export function buildMealFallback(id, form) {
  return {
    id,
    ...mapMealToApi(form),
  };
}

export function mapMealToForm(meal) {
  const firstItem = meal.items?.[0] || {};

  return {
    type: meal.type || emptyMeal.type,
    date: meal.date || '',
    time: meal.time || '',
    notes: meal.notes || '',
    itemName: firstItem.name || '',
    serving: firstItem.serving || emptyMeal.serving,
    quantity: firstItem.quantity || emptyMeal.quantity,
  };
}
