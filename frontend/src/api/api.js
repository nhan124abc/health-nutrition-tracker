import axios from 'axios';
import authConfig from '../config/authConfig';

const API_BASE_URL = authConfig.apiBaseUrl;
const TOKEN_KEYS = authConfig.tokenKeys;
const USER_KEY = authConfig.userKey;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEYS.access) || localStorage.getItem(TOKEN_KEYS.legacy);
}

export function hasUsableAccessToken() {
  const payload = decodeJwtPayload(getAccessToken());
  return Boolean(payload?.exp && payload.exp * 1000 > Date.now());
}

export function getRefreshToken() {
  return localStorage.getItem(TOKEN_KEYS.refresh);
}

function decodeJwtPayload(token) {
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split('.');
    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const jsonPayload = decodeURIComponent(
      atob(normalizedPayload)
        .split('')
        .map((character) => `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  try {
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedUser) {
      return JSON.parse(storedUser);
    }
  } catch {
    localStorage.removeItem(USER_KEY);
  }

  const tokenPayload = decodeJwtPayload(getAccessToken());

  if (!tokenPayload) {
    return null;
  }

  return {
    id: tokenPayload.userId,
    email: tokenPayload.sub,
    role: tokenPayload.role,
  };
}

export function getCurrentUserRole() {
  const role = getCurrentUser()?.role?.toUpperCase();
  return role?.replace(/^ROLE_/, '') || null;
}

export function getDefaultRouteForCurrentUser() {
  return getCurrentUserRole() === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
}

export function saveAuthTokens(payload = {}) {
  const accessToken = payload.accessToken || payload.token || payload.jwtToken;
  const refreshToken = payload.refreshToken;

  if (accessToken) {
    localStorage.setItem(TOKEN_KEYS.access, accessToken);
    localStorage.setItem(TOKEN_KEYS.legacy, accessToken);
  }

  if (refreshToken) {
    localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
  }

  if (payload.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  }
}

export function clearAuthTokens() {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem(TOKEN_KEYS.legacy);
  localStorage.removeItem(USER_KEY);
}

export async function logout() {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await api.post(authConfig.endpoints.logout, { refreshToken });
    }
  } catch {
    // Local logout must still succeed when backend logout is unavailable.
  } finally {
    clearAuthTokens();
  }
}

let refreshPromise = null;

function shouldSkipTokenRefresh(url = '') {
  const authPaths = [
    authConfig.endpoints.login,
    authConfig.endpoints.register,
    authConfig.endpoints.refresh,
    authConfig.endpoints.forgotPassword,
    authConfig.endpoints.resetPassword,
    authConfig.endpoints.sendEmailVerification,
    authConfig.endpoints.confirmEmailVerification,
  ];

  return authPaths.some((path) => url.includes(path));
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      shouldSkipTokenRefresh(originalRequest?.url)
    ) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuthTokens();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise =
        refreshPromise ||
        axios.post(`${API_BASE_URL}${authConfig.endpoints.refresh}`, {
          refreshToken,
        });

      const response = await refreshPromise;
      refreshPromise = null;
      saveAuthTokens(response.data);
      originalRequest.headers.Authorization = `Bearer ${getAccessToken()}`;
      return api(originalRequest);
    } catch (refreshError) {
      refreshPromise = null;
      clearAuthTokens();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
