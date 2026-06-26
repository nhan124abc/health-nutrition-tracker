import api from '../../api/api';
import authConfig from '../../config/authConfig';
import profileConfig from '../../config/profileConfig';

export function getProfile() {
  return api.get(profileConfig.endpoints.profile);
}

export function updateProfile(payload) {
  return api.put(profileConfig.endpoints.profile, payload);
}

export function updateAccountProfile(payload) {
  return api.put(authConfig.endpoints.me, payload);
}

export function getBodyMetrics(params = {}) {
  return api.get(profileConfig.endpoints.bodyMetrics, { params });
}

export function createBodyMetric(payload) {
  return api.post(profileConfig.endpoints.bodyMetrics, payload);
}

export function updateBodyMetric(id, payload) {
  return api.put(`${profileConfig.endpoints.bodyMetrics}/${id}`, payload);
}

export function deleteBodyMetric(id) {
  return api.delete(`${profileConfig.endpoints.bodyMetrics}/${id}`);
}

export function getGoalPlanSuggestions(payload) {
  return api.post(profileConfig.endpoints.goalSuggestions, payload);
}

export function getGuestGoalPlanSuggestions(payload) {
  return api.post(profileConfig.endpoints.guestGoalSuggestions, payload);
}

export function applyGoalPlan(payload) {
  return api.post(profileConfig.endpoints.applyGoal, payload);
}
