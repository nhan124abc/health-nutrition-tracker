import api from '../../api/api';
import authConfig from '../../config/authConfig';

export function sendReminderEmail(payload) {
  return api.post(authConfig.endpoints.sendReminderEmail, payload);
}
