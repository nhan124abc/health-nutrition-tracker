import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, hasUsableAccessToken } from '../../api/api';
import { getActivitiesByDate } from '../activities/activityService';
import { extractActivitiesFromApi, getTodayDate, normalizeActivityFromApi } from '../activities/activityUtils';
import { getMealsByDate } from '../meals/mealService';
import { extractMealsFromApi, normalizeMealFromApi } from '../meals/mealUtils';
import { getBodyMetrics, getProfile } from '../profile/profileService';
import { extractMetricRows, extractProfileFromApi, mapProfileFromApi } from '../profile/profileUtils';
import {
  getActivityCompletionId,
  getMealCompletionId,
  readCompletionIds,
} from '../../utils/completionStorage';
import { sendReminderEmail } from './reminderService';
import {
  canSyncNotificationSettings,
  getNotificationSettings,
  notificationSettingsSyncedAtKey,
  persistNotificationSettings,
  readStoredNotificationSettings,
} from './notificationSettingsService';

const lastSeenStorageKey = 'reminders:lastSeenAt';
const sentStorageKey = 'reminders:sent';
const popupStorageKey = 'reminders:popup';
const pendingEmailStorageKey = 'reminders:pendingEmails';

const mealReminderSlots = [
  { id: 'breakfast', labelKey: 'reminderNotifier.slots.breakfast', path: '/meals', time: '08:00', type: 'breakfast', kind: 'meal' },
  { id: 'lunch', labelKey: 'reminderNotifier.slots.lunch', path: '/meals', time: '12:00', type: 'lunch', kind: 'meal' },
  { id: 'dinner', labelKey: 'reminderNotifier.slots.dinner', path: '/meals', time: '18:00', type: 'dinner', kind: 'meal' },
];

const activityReminderSlots = [
  { id: 'activity-morning', labelKey: 'reminderNotifier.slots.activityMorning', path: '/activity', time: '09:00', kind: 'activity' },
  { id: 'activity-afternoon', labelKey: 'reminderNotifier.slots.activityAfternoon', path: '/activity', time: '15:00', kind: 'activity' },
];

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function getOwnerKey() {
  const user = getCurrentUser() || {};
  return user.email || user.username || user.id || 'guest';
}

function getSlotDate(date, time) {
  const [hours, minutes] = time.split(':').map(Number);
  const slotDate = new Date(`${date}T00:00:00`);
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate;
}

function isWebActiveNow() {
  return typeof document !== 'undefined' && !document.hidden && document.hasFocus();
}

function isBrowserOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

function readLastSeenDate() {
  const lastSeenAt = Number(localStorage.getItem(lastSeenStorageKey));
  return Number.isFinite(lastSeenAt) && lastSeenAt > 0 ? new Date(lastSeenAt) : null;
}

function hasActiveGoal(profile) {
  return Boolean(
    profile?.healthGoal
    || Number(profile?.dailyCalorieGoal) > 0
    || Number(profile?.dailyActivityGoalKcal) > 0
  );
}

function inferReminderKind(item = {}) {
  if (item.kind) {
    return item.kind;
  }

  const key = String(item.key || '');
  if (key.includes('activity')) return 'activity';
  if (key.includes('body-metrics')) return 'bodyMetric';
  if (key.includes('breakfast') || key.includes('lunch') || key.includes('dinner')) return 'meal';
  return '';
}

function reminderKindEnabled(kindOrItem, settings = readSettings()) {
  const kind = typeof kindOrItem === 'string' ? kindOrItem : inferReminderKind(kindOrItem);
  if (kind === 'meal') return settings.mealReminder === true;
  if (kind === 'activity') return settings.activityReminder === true;
  if (kind === 'bodyMetric') return settings.bodyMetricsReminder === true;
  return true;
}

function queueReminderEmail(key, payload, kind) {
  if (!reminderKindEnabled(kind)) {
    return;
  }

  const ownerKey = getOwnerKey();
  const map = readJson(pendingEmailStorageKey, {});
  const ownerValues = Array.isArray(map[ownerKey]) ? map[ownerKey] : [];

  if (ownerValues.some((item) => item.key === key)) {
    return;
  }

  localStorage.setItem(pendingEmailStorageKey, JSON.stringify({
    ...map,
    [ownerKey]: [...ownerValues, { key, payload, kind }],
  }));
}

async function sendOrQueueReminderEmail(key, payload, kind) {
  if (!reminderKindEnabled(kind)) {
    return;
  }

  if (!isBrowserOnline()) {
    queueReminderEmail(key, payload, kind);
    return;
  }

  await sendReminderEmail(payload);
}

async function flushQueuedReminderEmails() {
  if (!isBrowserOnline() || !getCurrentUser() || !hasUsableAccessToken()) {
    return;
  }

  const ownerKey = getOwnerKey();
  const map = readJson(pendingEmailStorageKey, {});
  const ownerValues = Array.isArray(map[ownerKey]) ? map[ownerKey] : [];
  const settings = readSettings();

  if (ownerValues.length === 0) {
    return;
  }

  const remaining = [];
  for (const item of ownerValues) {
    if (!reminderKindEnabled(item, settings)) {
      continue;
    }

    try {
      await sendReminderEmail(item.payload);
    } catch {
      remaining.push(item);
    }
  }

  localStorage.setItem(pendingEmailStorageKey, JSON.stringify({
    ...map,
    [ownerKey]: remaining,
  }));
}

function markOnce(key, storageKey) {
  const ownerKey = getOwnerKey();
  const map = readJson(storageKey, {});
  const ownerValues = Array.isArray(map[ownerKey]) ? map[ownerKey] : [];

  if (ownerValues.includes(key)) {
    return false;
  }

  localStorage.setItem(storageKey, JSON.stringify({
    ...map,
    [ownerKey]: [...ownerValues, key],
  }));
  return true;
}

function readSettings() {
  return readStoredNotificationSettings();
}

async function syncSettingsFromApi(maxAgeMs = 5 * 60 * 1000) {
  if (!canSyncNotificationSettings()) {
    return readSettings();
  }

  const syncedAt = Number(localStorage.getItem(notificationSettingsSyncedAtKey));
  if (Number.isFinite(syncedAt) && Date.now() - syncedAt < maxAgeMs) {
    return readSettings();
  }

  try {
    const settings = await getNotificationSettings();
    return persistNotificationSettings(settings);
  } catch {
    return readSettings();
  }
}

function pruneQueuedReminderEmails(settings = readSettings()) {
  const ownerKey = getOwnerKey();
  const map = readJson(pendingEmailStorageKey, {});
  const ownerValues = Array.isArray(map[ownerKey]) ? map[ownerKey] : [];

  if (ownerValues.length === 0) {
    return;
  }

  localStorage.setItem(pendingEmailStorageKey, JSON.stringify({
    ...map,
    [ownerKey]: ownerValues.filter((item) => reminderKindEnabled(item, settings)),
  }));
}

function getMealSlotReminderState(meals, completedIds, slot) {
  const slotMeals = meals.filter((meal) => meal.type === slot.type);
  if (slotMeals.length === 0) {
    return { status: 'none', identity: 'none' };
  }

  const completionIds = slotMeals.map(getMealCompletionId).filter(Boolean);
  return {
    status: slotMeals.every((meal) => completedIds.includes(getMealCompletionId(meal))) ? 'complete' : 'incomplete',
    identity: completionIds.join('|') || slotMeals.map((meal) => meal.id).filter(Boolean).join('|') || 'logged',
  };
}

function getActivitySlotReminderState(activities, completedIds) {
  if (activities.length === 0) {
    return { status: 'none', identity: 'none' };
  }

  const completionIds = activities.map(getActivityCompletionId).filter(Boolean);
  return {
    status: activities.every((activity) => completedIds.includes(getActivityCompletionId(activity))) ? 'complete' : 'incomplete',
    identity: completionIds.join('|') || activities.map((activity) => activity.id).filter(Boolean).join('|') || 'logged',
  };
}

function buildReminderMessage(slot, status, t) {
  const label = t(slot.labelKey);
  return {
    subject: t('reminderNotifier.email.subject', { label, time: slot.time }),
    message: t(`reminderNotifier.email.${slot.kind}.${status}`, { label, time: slot.time }),
  };
}

function ReminderNotifier() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeReminder, setActiveReminder] = useState(null);
  const checkingRef = useRef(false);

  const updateLastSeen = useCallback(() => {
    localStorage.setItem(lastSeenStorageKey, String(Date.now()));
  }, []);

  const checkReminders = useCallback(async () => {
    if (checkingRef.current || !getCurrentUser() || !hasUsableAccessToken()) {
      return;
    }

    checkingRef.current = true;

    try {
      const settings = await syncSettingsFromApi();
      pruneQueuedReminderEmails(settings);
      const today = getTodayDate();
      const now = new Date();
      const lastSeenDate = readLastSeenDate();
      const completedMealIds = readCompletionIds('meals');
      const completedActivityIds = readCompletionIds('activities');
      const enabledSlots = [
        ...(settings.mealReminder ? mealReminderSlots : []),
        ...(settings.activityReminder ? activityReminderSlots : []),
      ];

      if (enabledSlots.length === 0) {
        return;
      }

      const profileResponse = await getProfile();
      const profile = mapProfileFromApi(extractProfileFromApi(profileResponse.data));

      if (!hasActiveGoal(profile)) {
        return;
      }

      await flushQueuedReminderEmails();

      const [mealResponse, activityResponse, metricResponse] = await Promise.all([
        settings.mealReminder ? getMealsByDate(today) : Promise.resolve({ data: [] }),
        settings.activityReminder ? getActivitiesByDate(today) : Promise.resolve({ data: [] }),
        settings.bodyMetricsReminder ? getBodyMetrics({ page: 0, size: 1 }) : Promise.resolve({ data: [] }),
      ]);

      const meals = extractMealsFromApi(mealResponse.data).map(normalizeMealFromApi);
      const activities = extractActivitiesFromApi(activityResponse.data).map(normalizeActivityFromApi);

      if (settings.bodyMetricsReminder) {
        const metrics = extractMetricRows(metricResponse.data);
        const latestDate = metrics[0]?.date || metrics[0]?.recordedAt;
        const latestTime = latestDate ? new Date(`${String(latestDate).slice(0, 10)}T00:00:00`).getTime() : 0;
        const overdue = !latestTime || (now.getTime() - latestTime) >= 7 * 24 * 60 * 60 * 1000;
        const bodyMetricKey = `${today}:body-metrics`;
        if (overdue && markOnce(bodyMetricKey, popupStorageKey) && isWebActiveNow()) {
          setActiveReminder({ kind: 'bodyMetric', path: '/body-metrics', message: 'Đã 7 ngày kể từ lần cập nhật gần nhất. Hãy cập nhật cân nặng và chỉ số cơ thể để theo dõi mục tiêu chính xác hơn.' });
          return;
        }
      }

      for (const slot of enabledSlots) {
        const slotDate = getSlotDate(today, slot.time);

        if (now < slotDate) {
          continue;
        }

        const { status, identity } = slot.kind === 'meal'
          ? getMealSlotReminderState(meals, completedMealIds, slot)
          : getActivitySlotReminderState(activities, completedActivityIds);
        const key = `${today}:${slot.id}:${status}:${identity}`;

        if (status === 'complete' || status === 'none') {
          continue;
        }

        const missedWhileAway = Boolean(lastSeenDate && lastSeenDate < slotDate);
        if (missedWhileAway || !isWebActiveNow()) {
          if (markOnce(key, sentStorageKey)) {
            await sendOrQueueReminderEmail(key, buildReminderMessage(slot, status, t), slot.kind);
          }
          continue;
        }

        if (markOnce(key, popupStorageKey)) {
          setActiveReminder({ ...slot, status });
          break;
        }
      }
    } catch (error) {
      console.error('[ReminderNotifier] Could not check reminders:', error);
    } finally {
      checkingRef.current = false;
      updateLastSeen();
    }
  }, [t, updateLastSeen]);

  useEffect(() => {
    checkReminders();

    const intervalId = window.setInterval(checkReminders, 60 * 1000);
    const handleFocus = () => checkReminders();
    const handleVisibility = () => {
      if (!document.hidden) {
        checkReminders();
      }
    };
    const handleOnline = () => {
      flushQueuedReminderEmails().catch((error) => {
        console.error('[ReminderNotifier] Could not flush queued reminder emails:', error);
      });
      checkReminders();
    };
    const handleSettingsChanged = (event) => {
      const settings = event.detail || readSettings();
      pruneQueuedReminderEmails(settings);
      setActiveReminder((current) => {
        if (!current) return null;
        if (current.kind === 'meal' && !settings.mealReminder) return null;
        if (current.kind === 'activity' && !settings.activityReminder) return null;
        if (current.kind === 'bodyMetric' && !settings.bodyMetricsReminder) return null;
        return current;
      });
      checkReminders();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('settings:notificationsChanged', handleSettingsChanged);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('settings:notificationsChanged', handleSettingsChanged);
      document.removeEventListener('visibilitychange', handleVisibility);
      updateLastSeen();
    };
  }, [checkReminders, updateLastSeen]);

  const reminderText = useMemo(() => {
    if (!activeReminder) {
      return '';
    }

    if (activeReminder.message) return activeReminder.message;
    const label = t(activeReminder.labelKey);
    return t(`reminderNotifier.popup.${activeReminder.kind}.${activeReminder.status}`, {
      label,
      time: activeReminder.time,
    });
  }, [activeReminder, t]);

  if (!activeReminder) {
    return null;
  }

  return (
    <Modal show centered onHide={() => setActiveReminder(null)}>
      <Modal.Header closeButton>
        <Modal.Title>{t('reminderNotifier.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-secondary mb-0">{reminderText}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => setActiveReminder(null)}>
          {t('reminderNotifier.later')}
        </Button>
        <Button
          variant="success"
          onClick={() => {
            const path = activeReminder.path;
            setActiveReminder(null);
            navigate(path);
          }}
        >
          {t('reminderNotifier.openNow')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ReminderNotifier;
