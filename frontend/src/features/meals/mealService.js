import api from '../../api/api';
import mealConfig from '../../config/mealConfig';

export function updateMeal(id, payload) {
  return api.put(mealConfig.endpoints.update(id), payload);
}

export function getMealsByDate(date) {
  return api.get(mealConfig.endpoints.listByDate, {
    params: { date },
  });
}

export function createMeal(payload) {
  return api.post(mealConfig.endpoints.create, payload);
}

export function getMealById(id) {
  return api.get(mealConfig.endpoints.detail(id));
}

export function deleteMealById(id) {
  return api.delete(mealConfig.endpoints.deleteById(id));
}

export function getMealPlans() {
  return api.get(mealConfig.endpoints.mealPlans);
}

export function createMealPlan(payload) {
  return api.post(mealConfig.endpoints.mealPlans, payload);
}

export function updateMealPlan(id, payload) {
  return api.put(mealConfig.endpoints.mealPlanDetail(id), payload);
}

export function updateMealPlanActive(id, active) {
  return api.patch(mealConfig.endpoints.mealPlanActive(id), null, {
    params: { active },
  });
}

export function deleteMealPlan(id) {
  return api.delete(mealConfig.endpoints.mealPlanDetail(id));
}
