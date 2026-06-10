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

export function updateActivityLog(id, payload) {
  return api.put(activityConfig.endpoints.updateById(id), payload);
}

export function deleteActivityById(id) {
  return api.delete(activityConfig.endpoints.deleteById(id));
}

export function getActivityTypes() {
  return api.get(activityConfig.endpoints.listTypes);
}

export function getActivitySummary(date) {
  return api.get(activityConfig.endpoints.summary, {
    params: { date },
  });
}
