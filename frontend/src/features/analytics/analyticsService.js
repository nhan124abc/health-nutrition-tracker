import api from '../../api/api';
import analyticsConfig from '../../config/analyticsConfig';

export function getHealthInsights(params = {}) {
  return api.get(analyticsConfig.endpoints.insights, { params });
}

export function markHealthInsightRead(id) {
  return api.put(analyticsConfig.endpoints.insightRead(id));
}
