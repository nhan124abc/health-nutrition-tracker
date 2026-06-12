export const defaultWaterSettings = {
  goalMl: 2000,
  reminderEnabled: true,
  reminderIntervalMinutes: 90,
};

export const quickWaterAmounts = [150, 250, 500, 750];
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

export function formatLocalDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function extractWaterDataFromApi(data) {
  return data?.data || data?.water || data || {};
}

export function normalizeDailyWaterFromApi(data) {
  const water = extractWaterDataFromApi(data);

  return {
    date: water.date || '',
    totalAmountMl: normalizeNumber(water.totalAmountMl ?? water.totalWaterMl),
    goalMl: normalizeNumber(water.goalMl ?? water.dailyWaterGoalMl),
  };
}

export function normalizeWaterLogFromApi(data) {
  const log = extractWaterDataFromApi(data);
  const loggedAt = log.loggedAt || '';

  return {
    id: log.id ?? log.waterLogId,
    date: String(loggedAt).slice(0, 10),
    amountMl: normalizeNumber(log.amountMl),
    loggedAt,
  };
}

export function normalizeWaterLogsFromApi(data) {
  const logs = Array.isArray(data)
    ? data
    : data?.content || data?.data || data?.waterLogs || [];

  return Array.isArray(logs) ? logs.map(normalizeWaterLogFromApi) : [];
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
