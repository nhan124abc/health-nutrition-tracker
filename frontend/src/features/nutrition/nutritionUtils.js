import { isVietnameseSearchLanguage, valuesMatchSearch } from '../../utils/searchText';

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

const mojibakePattern = /[\u00c0-\u00ff\u2018-\u201d\u2026]/;
const windows1252ReverseMap = {
  '\u20ac': 0x80,
  '\u201a': 0x82,
  '\u0192': 0x83,
  '\u201e': 0x84,
  '\u2026': 0x85,
  '\u2020': 0x86,
  '\u2021': 0x87,
  '\u02c6': 0x88,
  '\u2030': 0x89,
  '\u0160': 0x8a,
  '\u2039': 0x8b,
  '\u0152': 0x8c,
  '\u017d': 0x8e,
  '\u2018': 0x91,
  '\u2019': 0x92,
  '\u201c': 0x93,
  '\u201d': 0x94,
  '\u2022': 0x95,
  '\u2013': 0x96,
  '\u2014': 0x97,
  '\u02dc': 0x98,
  '\u2122': 0x99,
  '\u0161': 0x9a,
  '\u203a': 0x9b,
  '\u0153': 0x9c,
  '\u017e': 0x9e,
  '\u0178': 0x9f,
};

function repairMojibake(value) {
  if (typeof value !== 'string' || !mojibakePattern.test(value)) {
    return value || '';
  }

  try {
    const bytes = Uint8Array.from([...value].map((character) => (
      windows1252ReverseMap[character] ?? character.charCodeAt(0)
    )));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

export function cleanText(value) {
  return repairMojibake(value).trim();
}

function normalizeNumber(value) {
  return Number(value) || 0;
}

function optionalNumber(value) {
  return value === '' || value === null || value === undefined ? null : parseLocalizedNumber(value);
}

export function parseLocalizedNumber(value) {
  if (typeof value === 'number') {
    return value;
  }

  return Number(String(value || '').trim().replace(',', '.'));
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
    name: cleanText(category.name),
    nameVi: cleanText(category.nameVi),
    icon: cleanText(category.icon),
  };
}

export function normalizeFoodFromApi(food = {}) {
  const category = normalizeCategory({
    id: food.category?.id ?? food.categoryId,
    categoryId: food.category?.categoryId,
    name: food.category?.name ?? food.categoryName ?? food.category,
    nameVi: food.category?.nameVi ?? food.categoryNameVi,
    icon: food.category?.icon ?? food.categoryIcon,
  });

  return {
    id: food.id ?? food.foodId,
    name: cleanText(food.name),
    nameVi: cleanText(food.nameVi),
    brand: cleanText(food.brand),
    categoryId: category.id ?? '',
    category: category.name || category.nameVi || '',
    categoryName: category.name || '',
    categoryNameVi: category.nameVi || '',
    servingSize: `${normalizeNumber(food.servingSizeG)}g`,
    servingDescription: cleanText(food.servingDescription),
    calories: normalizeNumber(food.calories),
    protein: normalizeNumber(food.proteinG),
    carbs: normalizeNumber(food.carbsG),
    fat: normalizeNumber(food.fatG),
    fiber: normalizeNumber(food.fiberG),
    sugar: normalizeNumber(food.sugarG),
    sodium: normalizeNumber(food.sodiumMg),
    imageUrl: food.imageUrl || '',
    createdByUserId: food.createdByUserId ?? food.creatorUserId ?? null,
    verified: Boolean(food.verified),
    public: food.public ?? food.isPublic ?? true,
  };
}

export function deriveCategoriesFromFoods(foods = []) {
  const categoriesById = foods.reduce((groups, food) => {
    if (!food.categoryId && !food.category) {
      return groups;
    }

    const id = food.categoryId || food.category;
    const existing = groups[id];

    return {
      ...groups,
      [id]: {
        id,
        name: existing?.name || food.category,
        nameVi: existing?.nameVi || '',
        icon: existing?.icon || '',
      },
    };
  }, {});

  return Object.values(categoriesById)
    .filter((category) => category.id && (category.name || category.nameVi))
    .sort((left, right) => (left.nameVi || left.name).localeCompare(right.nameVi || right.name));
}

export function mapFoodToApi(food) {
  return {
    name: food.name.trim(),
    nameVi: food.nameVi.trim() || null,
    brand: food.brand.trim() || null,
    categoryId: food.categoryId ? Number(food.categoryId) : null,
    servingSizeG: parseLocalizedNumber(food.servingSize),
    servingDescription: food.servingDescription.trim() || null,
    calories: parseLocalizedNumber(food.calories),
    proteinG: parseLocalizedNumber(food.protein),
    carbsG: parseLocalizedNumber(food.carbs),
    fatG: parseLocalizedNumber(food.fat),
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

export function filterFoods(items, query, categoryId, language = '') {
  const isVietnamese = isVietnameseSearchLanguage(language);

  return items.filter((food) => {
    const matchesKeyword = valuesMatchSearch([
      isVietnamese ? food.nameVi || food.name : food.name || food.nameVi,
      food.brand,
      isVietnamese ? food.categoryNameVi || food.categoryName || food.category : food.categoryName || food.category || food.categoryNameVi,
    ], query);
    const matchesCategory = categoryId === 'all' || String(food.categoryId) === String(categoryId);

    return matchesKeyword && matchesCategory;
  });
}
