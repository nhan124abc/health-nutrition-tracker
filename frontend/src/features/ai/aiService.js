import api from '../../api/api';
import aiConfig from '../../config/aiConfig';

function getGuestId() {
  let guestId = localStorage.getItem(aiConfig.guestIdKey);

  if (!guestId) {
    guestId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(aiConfig.guestIdKey, guestId);
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
  return api.post(aiConfig.endpoints.chat, payload, withGuestHeaders());
}

export function getChatHistory() {
  return api.get(aiConfig.endpoints.chatHistory, withGuestHeaders());
}

export function clearChatHistory() {
  return api.delete(aiConfig.endpoints.chatHistory, withGuestHeaders());
}

export function getAiPlanSuggestions(payload) {
  return api.post(aiConfig.endpoints.plannerSuggest, payload, withGuestHeaders());
}
