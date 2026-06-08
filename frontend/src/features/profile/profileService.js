import api from '../../api/api';
import authConfig from '../../config/authConfig';

export function getProfile() {
  return api.get(authConfig.endpoints.profile);
}

export function updateProfile(payload) {
  return api.put(authConfig.endpoints.profile, payload);
}

export function getBodyMetrics(params = {}) {
  return api.get('/users/me/metrics', { params });
}
