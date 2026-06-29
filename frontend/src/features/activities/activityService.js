import api from '../../api/api';
import { getAccessToken, getCurrentUserRole } from '../../api/api';
import activityConfig from '../../config/activityConfig';

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

export function getActivitiesByDate(date) {
  return api.get(activityConfig.endpoints.listByDate, {
    params: { date },
  });
}

export function createActivityLog(payload) {
  return api.post(activityConfig.endpoints.createLog, payload);
}

export function updateActivityLog(id, payload) {
  return api.put(activityConfig.endpoints.updateById(id), payload);
}

export function deleteActivityById(id) {
  return api.delete(activityConfig.endpoints.deleteById(id));
}

export function getWorkoutPlans() {
  return api.get(activityConfig.endpoints.workoutPlans);
}

export function createWorkoutPlan(payload) {
  return api.post(activityConfig.endpoints.workoutPlans, payload);
}

export function updateWorkoutPlan(id, payload) {
  return api.put(activityConfig.endpoints.workoutPlanDetail(id), payload);
}

export function updateWorkoutPlanActive(id, active) {
  return api.patch(activityConfig.endpoints.workoutPlanActive(id), null, {
    params: { active },
  });
}

export function deleteWorkoutPlan(id) {
  return api.delete(activityConfig.endpoints.workoutPlanDetail(id));
}

export function getActivityTypes() {
  return api.get(activityConfig.endpoints.listTypes);
}

export function getAdminActivityTypes(params = {}) {
  return api.get(activityConfig.endpoints.adminTypes, { ...withAdminAuth(), params });
}

export function createActivityType(payload) {
  return api.post(activityConfig.endpoints.adminTypes, payload, withAdminAuth());
}

export function updateActivityType(id, payload) {
  return api.put(activityConfig.endpoints.adminTypeDetail(id), payload, withAdminAuth());
}

export function deleteActivityType(id) {
  return api.delete(activityConfig.endpoints.adminTypeDetail(id), withAdminAuth());
}

export function updateActivityTypeVisibility(id, hidden) {
  const endpoint = hidden
    ? activityConfig.endpoints.adminTypeHide(id)
    : activityConfig.endpoints.adminTypeRestore(id);

  return api.patch(endpoint, {}, withAdminAuth());
}

export function getActivityCategories() {
  return api.get(activityConfig.endpoints.categories);
}

export function getAdminActivityCategories() {
  return api.get(activityConfig.endpoints.adminCategories, withAdminAuth());
}

export function createActivityCategory(payload) {
  return api.post(activityConfig.endpoints.adminCategories, payload, withAdminAuth());
}

export function updateActivityCategory(category, payload) {
  return api.put(activityConfig.endpoints.adminCategoryDetail(category), payload, withAdminAuth());
}

export function deleteActivityCategory(category) {
  return api.delete(activityConfig.endpoints.adminCategoryDetail(category), withAdminAuth());
}

export function updateActivityCategoryVisibility(category, hidden) {
  const endpoint = hidden
    ? activityConfig.endpoints.adminCategoryHide(category)
    : activityConfig.endpoints.adminCategoryRestore(category);
  return api.patch(endpoint, {}, withAdminAuth());
}

export function getActivitySummary(date) {
  return api.get(activityConfig.endpoints.summary, {
    params: { date },
  });
}
