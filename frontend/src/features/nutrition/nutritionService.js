import api from '../../api/api';
import { getAccessToken, getCurrentUserRole } from '../../api/api';
import nutritionConfig from '../../config/nutritionConfig';

function withAdminAuth() {
  const token = getAccessToken();
  const role = getCurrentUserRole();
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (role) {
    headers['X-User-Role'] = role;
  }

  return { headers };
}

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
  return api.put(nutritionConfig.endpoints.foodDetail(id), payload, withAdminAuth());
}

export function deleteFood(id) {
  return api.delete(nutritionConfig.endpoints.foodDetail(id), withAdminAuth());
}

export function getFoodCategories() {
  return api.get(nutritionConfig.endpoints.categories);
}

export function getAdminFoodCategories(params = {}) {
  return api.get(nutritionConfig.endpoints.adminCategories, { ...withAdminAuth(), params });
}

export function createFoodCategory(payload) {
  return api.post(nutritionConfig.endpoints.adminCategories, payload, withAdminAuth());
}

export function updateFoodCategory(id, payload) {
  return api.put(nutritionConfig.endpoints.adminCategoryDetail(id), payload, withAdminAuth());
}

export function deleteFoodCategory(id) {
  return api.delete(nutritionConfig.endpoints.adminCategoryDetail(id), withAdminAuth());
}

export function updateFoodCategoryVisibility(id, hidden) {
  const endpoint = hidden
    ? nutritionConfig.endpoints.adminCategoryHide(id)
    : nutritionConfig.endpoints.adminCategoryRestore(id);

  return api.patch(endpoint, {}, withAdminAuth());
}

export function getRecipeSuggestions(params = {}) {
  return api.get(nutritionConfig.endpoints.recipeSuggestions, { params });
}
