import api from '../../api/api';
import adminConfig from '../../config/adminConfig';

export function getAdminDashboardOverview() {
  return api.get(adminConfig.endpoints.dashboardOverview);
}

export function getAdminUsers(params = {}) {
  return api.get(adminConfig.endpoints.users, { params });
}

export function getAdminSystemAnalytics() {
  return api.get(adminConfig.endpoints.systemAnalytics);
}
