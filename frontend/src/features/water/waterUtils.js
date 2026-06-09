export const defaultWaterSettings = {
  goalMl: 2000,
  reminderEnabled: true,
  reminderIntervalMinutes: 90,
};

export const quickWaterAmounts = [150, 250, 500, 750];
export const waterLogsStorageKey = 'healthNutritionWaterLogs';
export const waterSettingsStorageKey = 'healthNutritionWaterSettings';

export function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function normalizeNumber(value) {
  return Number(value) || 0;
}

export function readStoredJson(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    console.error(`[WaterTracker] Could not read ${key}:`, error);
    return fallback;
  }
}
