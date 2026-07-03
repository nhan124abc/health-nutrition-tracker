import api from '../../api/api';
import analyticsConfig from '../../config/analyticsConfig';

export function getHealthInsights(params = {}) {
  return api.get(analyticsConfig.endpoints.insights, { params });
}

export function markHealthInsightRead(id) {
  return api.put(analyticsConfig.endpoints.insightRead(id));
}

export function getDailyAnalytics(date) {
  return api.get(analyticsConfig.endpoints.daily, { params: { date } });
}

export function getWeeklyAnalytics(date) {
  return api.get(analyticsConfig.endpoints.weekly, { params: { date } });
}

export function getMonthlyAnalytics(year, month) {
  return api.get(analyticsConfig.endpoints.monthly, { params: { year, month } });
}
