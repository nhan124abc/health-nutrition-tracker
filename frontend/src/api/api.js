import axios from 'axios';
import authConfig from '../config/authConfig';

const API_BASE_URL = authConfig.apiBaseUrl;
const TOKEN_KEYS = authConfig.tokenKeys;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEYS.access) || localStorage.getItem(TOKEN_KEYS.legacy);
}

export function getRefreshToken() {
  return localStorage.getItem(TOKEN_KEYS.refresh);
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
}

export function clearAuthTokens() {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem(TOKEN_KEYS.legacy);
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

    if (error.response?.status !== 401 || originalRequest?._retry) {
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
