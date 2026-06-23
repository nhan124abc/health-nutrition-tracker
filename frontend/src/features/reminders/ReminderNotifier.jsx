import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
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
const activeHeartbeatMs = 2 * 60 * 1000;

const mealReminderSlots = [
  { id: 'breakfast', label: 'bua sang', path: '/meals', time: '08:00', type: 'breakfast' },
  { id: 'lunch', label: 'bua trua', path: '/meals', time: '12:00', type: 'lunch' },
  { id: 'dinner', label: 'bua toi', path: '/meals', time: '18:00', type: 'dinner' },
];

const activityReminderSlots = [
  { id: 'activity-morning', label: 'van dong buoi sang', path: '/activity', time: '09:00' },
  { id: 'activity-afternoon', label: 'van dong buoi chieu', path: '/activity', time: '15:00' },
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

function wasWebClosedAt(slotDate) {
  const lastSeenAt = Number(localStorage.getItem(lastSeenStorageKey) || 0);
  return !lastSeenAt || (lastSeenAt < slotDate.getTime() && Date.now() - lastSeenAt > activeHeartbeatMs);
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

function isMealSlotComplete(meals, completedIds, slot) {
  const slotMeals = meals.filter((meal) => meal.type === slot.type);
  return slotMeals.length > 0 && slotMeals.every((meal) => completedIds.includes(getMealCompletionId(meal)));
}

function isActivitySlotComplete(activities, completedIds) {
  return activities.length > 0 && activities.every((activity) => completedIds.includes(getActivityCompletionId(activity)));
}

function buildReminderMessage(slot) {
  return {
    subject: `Nhac ${slot.label} luc ${slot.time}`,
    message: `Ban chua tick hoan thanh ${slot.label} luc ${slot.time}. Hay mo Health Nutrition Tracker de cap nhat nhe.`,
  };
}

function ReminderNotifier() {
  const navigate = useNavigate();
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
        const key = `${today}:${slot.id}`;

        if (now < slotDate) {
          continue;
        }

        const complete = slot.type
          ? isMealSlotComplete(meals, completedMealIds, slot)
          : isActivitySlotComplete(activities, completedActivityIds);

        if (complete) {
          continue;
        }

        if (wasWebClosedAt(slotDate)) {
          if (markOnce(key, sentStorageKey)) {
            await sendReminderEmail(buildReminderMessage(slot));
          }
          continue;
        }

        if (markOnce(key, popupStorageKey)) {
          setActiveReminder(slot);
          break;
        }
      }
    } catch (error) {
      console.error('[ReminderNotifier] Could not check reminders:', error);
    } finally {
      checkingRef.current = false;
      updateLastSeen();
    }
  }, [updateLastSeen]);

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

    return `Da den gio ${activeReminder.label} (${activeReminder.time}) nhung ban chua tick hoan thanh.`;
  }, [activeReminder]);

  if (!activeReminder) {
    return null;
  }

  return (
    <Modal show centered onHide={() => setActiveReminder(null)}>
      <Modal.Header closeButton>
        <Modal.Title>Nhac nho suc khoe</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-secondary mb-0">{reminderText}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => setActiveReminder(null)}>
          De sau
        </Button>
        <Button
          variant="success"
          onClick={() => {
            const path = activeReminder.path;
            setActiveReminder(null);
            navigate(path);
          }}
        >
          Mo ngay
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ReminderNotifier;
