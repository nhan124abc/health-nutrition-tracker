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

export function verifyPasswordResetOtp(payload) {
  return api.post(authConfig.endpoints.verifyPasswordResetOtp, payload);
}

export function resetPassword(payload) {
  return api.post(authConfig.endpoints.resetPassword, payload);
}

export function sendEmailVerification(email) {
  return api.post(authConfig.endpoints.sendEmailVerification, { email });
}

export function confirmEmailVerification(payload) {
  return api.post(authConfig.endpoints.confirmEmailVerification, payload);
}

export function getAuthenticatedUser() {
  return api.get(authConfig.endpoints.me);
}

export function isLockedAccountError(error) {
  const message = String(error?.response?.data?.message || error?.message || '').toLowerCase();

  return [
    'account is unavailable',
    'inactive',
    'locked',
    'disabled',
    'bị khóa',
    'không hoạt động',
    'khóa',
  ].some((keyword) => message.includes(keyword));
}
