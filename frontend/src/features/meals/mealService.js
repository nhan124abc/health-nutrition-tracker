import api from '../../api/api';
import mealConfig from '../../config/mealConfig';

function getMealChangeDate(payload = {}) {
  return payload.mealDate || payload.date || String(payload.loggedAt || payload.createdAt || '').slice(0, 10) || '';
}

function notifyMealsChanged(action, payload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('meals:changed', {
    detail: {
      action,
      date: getMealChangeDate(payload),
      meal: payload,
    },
  }));
}

function notifyMealPlansChanged(action, payload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('meal-plans:changed', {
    detail: { action, plan: payload },
  }));
}

export function updateMeal(id, payload) {
  return api.put(mealConfig.endpoints.update(id), payload)
    .then((response) => {
      notifyMealsChanged('update', response.data?.data || response.data || payload);
      return response;
    });
}

export function getMealsByDate(date) {
  return api.get(mealConfig.endpoints.listByDate, {
    params: { date },
  });
}

export function createMeal(payload) {
  return api.post(mealConfig.endpoints.create, payload)
    .then((response) => {
      notifyMealsChanged('create', response.data?.data || response.data || payload);
      return response;
    });
}

export function getMealById(id) {
  return api.get(mealConfig.endpoints.detail(id));
}

export function updateMealCompletion(id, completed) {
  return api.patch(mealConfig.endpoints.completion(id), null, { params: { completed } });
}

export function deleteMealById(id) {
  return api.delete(mealConfig.endpoints.deleteById(id))
    .then((response) => {
      notifyMealsChanged('delete', { id });
      return response;
    });
}

export function getMealPlans() {
  return api.get(mealConfig.endpoints.mealPlans);
}

export function createMealPlan(payload) {
  return api.post(mealConfig.endpoints.mealPlans, payload)
    .then((response) => {
      notifyMealPlansChanged('create', response.data?.data || response.data || payload);
      return response;
    });
}

export function updateMealPlan(id, payload) {
  return api.put(mealConfig.endpoints.mealPlanDetail(id), payload)
    .then((response) => {
      notifyMealPlansChanged('update', response.data?.data || response.data || { id, ...payload });
      return response;
    });
}

export function updateMealPlanActive(id, active) {
  return api.patch(mealConfig.endpoints.mealPlanActive(id), null, {
    params: { active },
  }).then((response) => {
    notifyMealPlansChanged('active', response.data?.data || response.data || { id, active });
    return response;
  });
}

export function deleteMealPlan(id) {
  return api.delete(mealConfig.endpoints.mealPlanDetail(id))
    .then((response) => {
      notifyMealPlansChanged('delete', { id });
      return response;
    });
}
