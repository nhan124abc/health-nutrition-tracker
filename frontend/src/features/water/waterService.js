import api from '../../api/api';
import waterConfig from '../../config/waterConfig';

export function getTodayWater() {
  return api.get(waterConfig.endpoints.today);
}

export function getWaterLogs(date) {
  return api.get(waterConfig.endpoints.logs, { params: { date } });
}

export function createWaterLog(payload) {
  return api.post(waterConfig.endpoints.createLog, payload);
}

export function updateWaterLog(id, payload) {
  return api.put(waterConfig.endpoints.updateById(id), payload);
}

export function deleteWaterLog(id) {
  return api.delete(waterConfig.endpoints.deleteById(id));
}
