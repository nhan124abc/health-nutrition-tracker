import api from '../../api/api';

const mealEndpoints = {
  list: '/meals',
  create: '/meals',
  detail: (id) => `/meals/${id}`,
  delete: (id) => `/meals/${id}`,
  summary: '/meals/summary',
  getlist: (date) => `/meals?date=${date}`,
};

export function getMealsByDate(date) {
  return api.get(mealEndpoints.getlist(date));
}

export function createMeal(payload) {
  return api.post(mealEndpoints.create, payload);
}

export function getMealById(id) {
  return api.get(mealEndpoints.detail(id));
}

export function deleteMealById(id) {
  return api.delete(mealEndpoints.delete(id));
}

export function getMealSummary(date) {
  return api.get(mealEndpoints.summary, {
    params: { date },
  });
}
