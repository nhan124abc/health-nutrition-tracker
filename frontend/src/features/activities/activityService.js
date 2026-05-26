import api from '../../api/api';
import activityConfig from '../../config/activityConfig';

export function getActivitiesByDate(date) {
  return api.get(activityConfig.endpoints.listByDate, {
    params: { date },
  });
}

export function createActivityLog(payload) {
  return api.post(activityConfig.endpoints.createLog, payload);
}

export function getActivityById(id) {
  return api.get(activityConfig.endpoints.getById(id));
}

export function deleteActivityById(id) {
  return api.delete(activityConfig.endpoints.deleteById(id));
}

export function getActivityTypes() {
  return api.get(activityConfig.endpoints.listTypes);
}

export function createActivityPlan(payload) {
  return api.post(activityConfig.endpoints.createPlan, payload);
}

export function getActivityPlans() {
  return api.get(activityConfig.endpoints.listPlans);
}

export function getStepsByDate(date) {
  return api.get(activityConfig.endpoints.getStepsByDate, {
    params: { date },
  });
}

export function createStepsLog(payload) {
  return api.post(activityConfig.endpoints.createStepsLog, payload);
}
