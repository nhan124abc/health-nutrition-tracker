import api from '../../api/api';
import { getAccessToken, getCurrentUser, getCurrentUserRole } from '../../api/api';
import adminConfig from '../../config/adminConfig';

function withAdminAuth() {
  const token = getAccessToken();
  const currentUser = getCurrentUser();
  const role = getCurrentUserRole();
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (role) {
    headers['X-User-Role'] = role;
  }

  if (currentUser?.id || currentUser?.userId) {
    headers['X-User-Id'] = currentUser.id || currentUser.userId;
  }

  return { headers };
}

export function getAdminDashboardOverview() {
  return api.get(adminConfig.endpoints.dashboardOverview);
}

export function getAdminUsers(params = {}) {
  return api.get(adminConfig.endpoints.users, { ...withAdminAuth(), params });
}

export function updateAdminUser(id, payload) {
  return api.put(adminConfig.endpoints.userDetail(id), payload, withAdminAuth());
}

export async function updateAdminUserStatus(id, active) {
  const endpoint = active ? adminConfig.endpoints.userUnlock(id) : adminConfig.endpoints.userLock(id);

  try {
    return await api.patch(endpoint, {}, withAdminAuth());
  } catch (error) {
    if (![404, 405].includes(error.response?.status)) {
      throw error;
    }

    return api.put(adminConfig.endpoints.userDetail(id), { active }, withAdminAuth());
  }
}

export function deleteAdminUser(id) {
  return api.delete(adminConfig.endpoints.userDetail(id), withAdminAuth());
}

export function getAdminSystemAnalytics() {
  return api.get(adminConfig.endpoints.systemAnalytics);
}
