import api from '../../api/api';
import authConfig from '../../config/authConfig';

export function login(credentials) {
  return api.post(authConfig.endpoints.login, credentials);
}

export function register(payload) {
  return api.post(authConfig.endpoints.register, payload);
}

export function requestPasswordReset(email) {
  return api.post(authConfig.endpoints.forgotPassword, { email });
}

export function resetPassword(payload) {
  return api.post(authConfig.endpoints.resetPassword, payload);
}

export function getAuthenticatedUser() {
  return api.get(authConfig.endpoints.me);
}
