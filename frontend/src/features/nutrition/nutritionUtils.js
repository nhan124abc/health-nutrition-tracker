export const emptyFood = {
  name: '',
  nameVi: '',
  brand: '',
  categoryId: '',
  servingSize: '100',
  servingDescription: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  sodium: '',
  imageUrl: '',
};

export const basicFoodFields = [
  ['name', 'nutritionPage.fields.name'],
  ['nameVi', 'nutritionPage.fields.nameVi'],
  ['brand', 'common.brand'],
  ['servingSize', 'common.servingSize'],
  ['servingDescription', 'nutritionPage.fields.servingDescription'],
  ['imageUrl', 'nutritionPage.fields.imageUrl'],
];

function normalizeNumber(value) {
  return Number(value) || 0;
}

function optionalNumber(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

export function extractFoodsFromApi(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.content || data?.data?.content || data?.data || data?.items || data?.foods || [];
}

export function extractCategoriesFromApi(data) {
  if (Array.isArray(data)) {
    return data;
  }

  const nestedData = data?.data;

  if (Array.isArray(nestedData)) {
    return nestedData;
  }

  return nestedData?.content
    || nestedData?.items
    || nestedData?.categories
    || data?.content
    || data?.items
    || data?.categories
    || [];
}

export function extractFoodFromApi(data) {
  return data?.data || data?.food || data;
}

export function normalizeCategory(category = {}) {
  return {
    id: category.id ?? category.categoryId,
    name: category.name || '',
    nameVi: category.nameVi || '',
    icon: category.icon || '',
  };
}

export function normalizeFoodFromApi(food = {}) {
  const category = normalizeCategory(food.category || {});

  return {
    id: food.id ?? food.foodId,
    name: food.name || '',
    nameVi: food.nameVi || '',
    brand: food.brand || '',
    categoryId: category.id ?? '',
    category: category.nameVi || category.name || '',
    servingSize: `${normalizeNumber(food.servingSizeG)}g`,
    servingDescription: food.servingDescription || '',
    calories: normalizeNumber(food.calories),
    protein: normalizeNumber(food.proteinG),
    carbs: normalizeNumber(food.carbsG),
    fat: normalizeNumber(food.fatG),
    fiber: normalizeNumber(food.fiberG),
    sugar: normalizeNumber(food.sugarG),
    sodium: normalizeNumber(food.sodiumMg),
    imageUrl: food.imageUrl || '',
  };
}

export function mapFoodToApi(food) {
  return {
    name: food.name.trim(),
    nameVi: food.nameVi.trim() || null,
    brand: food.brand.trim() || null,
    categoryId: food.categoryId ? Number(food.categoryId) : null,
    servingSizeG: Number(food.servingSize),
    servingDescription: food.servingDescription.trim() || null,
    calories: Number(food.calories),
    proteinG: Number(food.protein),
    carbsG: Number(food.carbs),
    fatG: Number(food.fat),
    fiberG: optionalNumber(food.fiber),
    sugarG: optionalNumber(food.sugar),
    sodiumMg: optionalNumber(food.sodium),
    imageUrl: food.imageUrl.trim() || null,
  };
}

export function mapFoodToForm(food) {
  return {
    ...emptyFood,
    ...food,
    servingSize: String(food.servingSize || '').replace(/[^\d.]/g, ''),
  };
}

export function filterFoods(items, query, categoryId, imageSearchName) {
  const keyword = query.trim().toLowerCase();
  const imageKeyword = imageSearchName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

  return items.filter((food) => {
    const searchableValues = [food.name, food.nameVi, food.brand, food.category]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const matchesKeyword = !keyword || searchableValues.some((value) => value.includes(keyword));
    const matchesCategory = categoryId === 'all' || String(food.categoryId) === String(categoryId);
    const matchesImage = !imageKeyword || searchableValues.some((value) => value.includes(imageKeyword));

    return matchesKeyword && matchesCategory && matchesImage;
  });
}
