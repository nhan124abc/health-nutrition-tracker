import api, { getCurrentUser, hasUsableAccessToken } from '../../api/api';

export const notificationSettingsStorageKey = 'userSettings';
export const notificationSettingsSyncedAtKey = 'userSettings:syncedAt';

export const defaultNotificationSettings = {
  mealReminder: false,
  waterReminder: false,
  bodyMetricsReminder: false,
};

export function normalizeNotificationSettings(data = {}) {
  const source = data?.data || data;

  return {
    ...defaultNotificationSettings,
    mealReminder: Boolean(source.mealReminder ?? source.mealReminderEnabled),
    waterReminder: Boolean(source.waterReminder ?? source.waterReminderEnabled),
    bodyMetricsReminder: Boolean(
      source.bodyMetricsReminder ?? source.weightReminderEnabled ?? source.bodyMetricsReminderEnabled
    ),
  };
}

export function readStoredNotificationSettings() {
  try {
    return {
      ...defaultNotificationSettings,
      ...(JSON.parse(localStorage.getItem(notificationSettingsStorageKey)) || {}),
    };
  } catch {
    return { ...defaultNotificationSettings };
  }
}

export function persistNotificationSettings(settings) {
  const normalized = {
    ...defaultNotificationSettings,
    ...settings,
  };

  localStorage.setItem(notificationSettingsStorageKey, JSON.stringify(normalized));
  localStorage.setItem(notificationSettingsSyncedAtKey, String(Date.now()));
  window.dispatchEvent(new CustomEvent('settings:notificationsChanged', { detail: normalized }));
  return normalized;
}

export function canSyncNotificationSettings() {
  return Boolean(getCurrentUser() && hasUsableAccessToken());
}

export async function getNotificationSettings() {
  const response = await api.get('/users/me/notification-settings');
  return normalizeNotificationSettings(response.data);
}

export async function updateNotificationSettings(settings) {
  const payload = normalizeNotificationSettings(settings);
  const response = await api.put('/users/me/notification-settings', payload);
  return normalizeNotificationSettings(response.data);
}
