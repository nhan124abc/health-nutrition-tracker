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

export function updateFood(id, payload) {
  return api.put(nutritionConfig.endpoints.foodDetail(id), payload);
}

export function deleteFood(id) {
  return api.delete(nutritionConfig.endpoints.foodDetail(id));
}

export function getFoodCategories() {
  return api.get(nutritionConfig.endpoints.categories);
}
