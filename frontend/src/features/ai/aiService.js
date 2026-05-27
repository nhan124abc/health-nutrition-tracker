import api from '../../api/api';
import authConfig from '../../config/authConfig';

export function sendChatMessage(payload) {
  return api.post(authConfig.endpoints.aiChat, payload);
}
