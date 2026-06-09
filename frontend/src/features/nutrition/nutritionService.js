import api from '../../api/api';
import nutritionConfig from '../../config/nutritionConfig';

export function getFoods(params = {}) {
  return api.get(nutritionConfig.endpoints.foods, { params });
}

export function getFoodById(id) {
  return api.get(nutritionConfig.endpoints.foodDetail(id));
}

export function createFood(payload) {
  return api.post(nutritionConfig.endpoints.foods, payload);
}

export function getFoodCategories() {
  return api.get(nutritionConfig.endpoints.categories);
}
