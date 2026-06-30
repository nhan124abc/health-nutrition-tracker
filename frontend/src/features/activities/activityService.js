import api from '../../api/api';
import { getAccessToken, getCurrentUserRole } from '../../api/api';
import activityConfig from '../../config/activityConfig';

function getActivityChangeDate(payload = {}) {
  return payload.loggedAt
    ? String(payload.loggedAt).slice(0, 10)
    : payload.date || String(payload.createdAt || '').slice(0, 10) || '';
}

function notifyActivitiesChanged(action, payload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('activities:changed', {
    detail: {
      action,
      date: getActivityChangeDate(payload),
      activity: payload,
    },
  }));
}

function notifyWorkoutPlansChanged(action, payload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('workout-plans:changed', {
    detail: { action, plan: payload },
  }));
}

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
  return api.post(activityConfig.endpoints.createLog, payload)
    .then((response) => {
      notifyActivitiesChanged('create', response.data?.data || response.data || payload);
      return response;
    });
}

export function updateActivityLog(id, payload) {
  return api.put(activityConfig.endpoints.updateById(id), payload)
    .then((response) => {
      notifyActivitiesChanged('update', response.data?.data || response.data || payload);
      return response;
    });
}

export function deleteActivityById(id) {
  return api.delete(activityConfig.endpoints.deleteById(id))
    .then((response) => {
      notifyActivitiesChanged('delete', { id });
      return response;
    });
}

export function getWorkoutPlans() {
  return api.get(activityConfig.endpoints.workoutPlans);
}

export function createWorkoutPlan(payload) {
  return api.post(activityConfig.endpoints.workoutPlans, payload)
    .then((response) => {
      notifyWorkoutPlansChanged('create', response.data?.data || response.data || payload);
      return response;
    });
}

export function updateWorkoutPlan(id, payload) {
  return api.put(activityConfig.endpoints.workoutPlanDetail(id), payload)
    .then((response) => {
      notifyWorkoutPlansChanged('update', response.data?.data || response.data || { id, ...payload });
      return response;
    });
}

export function updateWorkoutPlanActive(id, active) {
  return api.patch(activityConfig.endpoints.workoutPlanActive(id), null, {
    params: { active },
  }).then((response) => {
    notifyWorkoutPlansChanged('active', response.data?.data || response.data || { id, active });
    return response;
  });
}

export function deleteWorkoutPlan(id) {
  return api.delete(activityConfig.endpoints.workoutPlanDetail(id))
    .then((response) => {
      notifyWorkoutPlansChanged('delete', { id });
      return response;
    });
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
