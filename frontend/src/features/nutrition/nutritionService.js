import api from '../../api/api';
import { getAccessToken, getCurrentUser, getCurrentUserRole } from '../../api/api';
import nutritionConfig from '../../config/nutritionConfig';

function withAdminAuth() {
  const token = getAccessToken();
  const currentUser = getCurrentUser();
  const role = getCurrentUserRole();
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (role) {
    headers['X-User-Role'] = role;
  }

  if (currentUser?.id || currentUser?.userId) {
    headers['X-User-Id'] = currentUser.id || currentUser.userId;
  }

  return { headers };
}

export function getFoods(params = {}, config = {}) {
  return api.get(nutritionConfig.endpoints.foods, { ...config, params });
}

export function getFoodById(id) {
  return api.get(nutritionConfig.endpoints.foodDetail(id));
}

export function createFood(payload) {
  return api.post(nutritionConfig.endpoints.foods, payload);
}

export function getAdminFoods(params = {}) {
  return api.get(nutritionConfig.endpoints.foods, { ...withAdminAuth(), params });
}

export function createAdminFood(payload) {
  return api.post(nutritionConfig.endpoints.foods, payload, withAdminAuth());
}

export function updateFood(id, payload) {
  return api.put(nutritionConfig.endpoints.foodDetail(id), payload);
}

export function updateAdminFood(id, payload) {
  return api.put(nutritionConfig.endpoints.foodDetail(id), payload, withAdminAuth());
}

export function deleteFood(id) {
  return api.delete(nutritionConfig.endpoints.foodDetail(id), withAdminAuth());
}

export function deleteUserFood(id) {
  return api.delete(nutritionConfig.endpoints.foodDetail(id));
}

export function deleteAdminFood(id) {
  return api.delete(nutritionConfig.endpoints.foodDetail(id), withAdminAuth());
}

export function updateFoodVisibility(id, hidden) {
  const endpoint = hidden
    ? nutritionConfig.endpoints.foodHide(id)
    : nutritionConfig.endpoints.foodRestore(id);

  return api.patch(endpoint, {}, withAdminAuth());
}

export function updateAdminFoodVisibility(id, hidden) {
  const endpoint = hidden
    ? nutritionConfig.endpoints.foodHide(id)
    : nutritionConfig.endpoints.foodRestore(id);

  return api.patch(endpoint, {}, withAdminAuth());
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

export function getRecipeSuggestions(params = {}, config = {}) {
  return api.get(nutritionConfig.endpoints.recipeSuggestions, { ...config, params });
}

export function createRecipe(payload) {
  return api.post(nutritionConfig.endpoints.recipes, payload);
}
