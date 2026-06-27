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

export function updateAuthenticatedUserAvatar(avatarUrl) {
  return api.put(authConfig.endpoints.avatar, { avatarUrl });
}

export function uploadAuthenticatedUserAvatar(file) {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(authConfig.endpoints.avatarUpload, formData);
}

function getAuthErrorMessage(error) {
  return String(error?.response?.data?.message || error?.message || '').toLowerCase();
}

export function isAccountNotFoundError(error) {
  const status = error?.response?.status;
  const message = getAuthErrorMessage(error);

  if (status === 404) {
    return true;
  }

  if (status === 423) {
    return false;
  }

  return [
    'account not found',
    'user not found',
    'email not found',
    'not found',
    'does not exist',
    'not exist',
    'no user',
    'khong ton tai',
    'khong tim thay',
    'chua ton tai',
  ].some((keyword) => message.includes(keyword));
}

export function isLockedAccountError(error) {
  const status = error?.response?.status;
  const message = getAuthErrorMessage(error);

  if (status === 423) {
    return true;
  }

  if (isAccountNotFoundError(error)) {
    return false;
  }

  return [
    'account is unavailable',
    'inactive',
    'locked',
    'disabled',
    'bi khoa',
    'khoa',
    'khong hoat dong',
  ].some((keyword) => message.includes(keyword));
}
