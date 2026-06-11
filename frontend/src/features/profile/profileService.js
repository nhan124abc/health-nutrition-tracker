import api from '../../api/api';
import profileConfig from '../../config/profileConfig';

export function getProfile() {
  return api.get(profileConfig.endpoints.profile);
}

export function updateProfile(payload) {
  return api.put(profileConfig.endpoints.profile, payload);
}

export function getBodyMetrics(params = {}) {
  return api.get(profileConfig.endpoints.bodyMetrics, { params });
}

export function createBodyMetric(payload) {
  return api.post(profileConfig.endpoints.bodyMetrics, payload);
}

export function getGoalPlanSuggestions(payload) {
  return api.post(profileConfig.endpoints.goalSuggestions, payload);
}

export function applyGoalPlan(payload) {
  return api.post(profileConfig.endpoints.applyGoal, payload);
}
