import api from '../../api/api';

const nutritionEndpoints = {
  foods: '/nutrition/foods',
  foodDetail: (id) => `/nutrition/foods/${id}`,
  categories: '/nutrition/categories',
};

export function getFoods(params = {}) {
  return api.get(nutritionEndpoints.foods, { params });
}

export function getFoodById(id) {
  return api.get(nutritionEndpoints.foodDetail(id));
}

export function createFood(payload) {
  return api.post(nutritionEndpoints.foods, payload);
}

export function getFoodCategories() {
  return api.get(nutritionEndpoints.categories);
}
