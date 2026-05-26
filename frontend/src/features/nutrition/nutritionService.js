import api from '../../api/api';

const nutritionEndpoints = {
  foods: '/nutrition/foods',
  foodDetail: (id) => `/nutrition/foods/${id}`,
  barcode: (code) => `/nutrition/foods/barcode/${code}`,
  categories: '/nutrition/categories',
};

export function getFoods(params = {}) {
  return api.get(nutritionEndpoints.foods, { params });
}

export function getFoodById(id) {
  return api.get(nutritionEndpoints.foodDetail(id));
}

export function getFoodByBarcode(code) {
  return api.get(nutritionEndpoints.barcode(code));
}

export function createFood(payload) {
  return api.post(nutritionEndpoints.foods, payload);
}

export function getFoodCategories() {
  return api.get(nutritionEndpoints.categories);
}
