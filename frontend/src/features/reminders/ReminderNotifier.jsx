import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../api/api';
import { getActivitiesByDate } from '../activities/activityService';
import { extractActivitiesFromApi, getTodayDate, normalizeActivityFromApi } from '../activities/activityUtils';
import { getMealsByDate } from '../meals/mealService';
import { extractMealsFromApi, normalizeMealFromApi } from '../meals/mealUtils';
import {
  getActivityCompletionId,
  getMealCompletionId,
  readCompletionIds,
} from '../../utils/completionStorage';
import { sendReminderEmail } from './reminderService';

const settingsStorageKey = 'userSettings';
const lastSeenStorageKey = 'reminders:lastSeenAt';
const sentStorageKey = 'reminders:sent';
const popupStorageKey = 'reminders:popup';

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
  return {
    mealReminder: true,
    activityReminder: true,
    ...readJson(settingsStorageKey, {}),
  };
}

function getMealSlotReminderState(meals, completedIds, slot) {
  const slotMeals = meals.filter((meal) => meal.type === slot.type);
  if (slotMeals.length === 0) {
    return { status: 'missing', identity: 'none' };
  }

  const completionIds = slotMeals.map(getMealCompletionId).filter(Boolean);
  return {
    status: slotMeals.every((meal) => completedIds.includes(getMealCompletionId(meal))) ? 'complete' : 'incomplete',
    identity: completionIds.join('|') || slotMeals.map((meal) => meal.id).filter(Boolean).join('|') || 'logged',
  };
}

function getActivitySlotReminderState(activities, completedIds) {
  if (activities.length === 0) {
    return { status: 'missing', identity: 'none' };
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
    if (checkingRef.current || !getCurrentUser()) {
      return;
    }

    checkingRef.current = true;

    try {
      const settings = readSettings();
      const today = getTodayDate();
      const now = new Date();
      const completedMealIds = readCompletionIds('meals');
      const completedActivityIds = readCompletionIds('activities');
      const enabledSlots = [
        ...(settings.mealReminder ? mealReminderSlots : []),
        ...(settings.activityReminder ? activityReminderSlots : []),
      ];

      if (enabledSlots.length === 0) {
        return;
      }

      const [mealResponse, activityResponse] = await Promise.all([
        settings.mealReminder ? getMealsByDate(today) : Promise.resolve({ data: [] }),
        settings.activityReminder ? getActivitiesByDate(today) : Promise.resolve({ data: [] }),
      ]);

      const meals = extractMealsFromApi(mealResponse.data).map(normalizeMealFromApi);
      const activities = extractActivitiesFromApi(activityResponse.data).map(normalizeActivityFromApi);

      for (const slot of enabledSlots) {
        const slotDate = getSlotDate(today, slot.time);

        if (now < slotDate) {
          continue;
        }

        const { status, identity } = slot.kind === 'meal'
          ? getMealSlotReminderState(meals, completedMealIds, slot)
          : getActivitySlotReminderState(activities, completedActivityIds);
        const key = `${today}:${slot.id}:${status}:${identity}`;

        if (status === 'complete') {
          continue;
        }

        if (!isWebActiveNow()) {
          if (markOnce(key, sentStorageKey)) {
            await sendReminderEmail(buildReminderMessage(slot, status, t));
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

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      updateLastSeen();
    };
  }, [checkReminders, updateLastSeen]);

  const reminderText = useMemo(() => {
    if (!activeReminder) {
      return '';
    }

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
