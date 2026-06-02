import api from '../../api/api';
import authConfig from '../../config/authConfig';

const GUEST_ID_KEY = 'aiGuestId';

function getGuestId() {
  let guestId = localStorage.getItem(GUEST_ID_KEY);

  if (!guestId) {
    guestId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }

  return guestId;
}

function withGuestHeaders(config = {}) {
  return {
    ...config,
    headers: {
      ...config.headers,
      'X-Guest-Id': getGuestId(),
    },
  };
}

export function sendChatMessage(payload) {
  return api.post(authConfig.endpoints.aiChat, payload, withGuestHeaders());
}

export function getChatHistory() {
  return api.get(authConfig.endpoints.aiChatHistory, withGuestHeaders());
}

export function clearChatHistory() {
  return api.delete(authConfig.endpoints.aiChatHistory, withGuestHeaders());
}
