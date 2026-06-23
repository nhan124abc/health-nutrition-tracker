import { getCurrentUser } from '../api/api';

function getOwnerKey() {
  const user = getCurrentUser() || {};
  return user.email || user.username || user.id || 'guest';
}

function getStorageKey(scope) {
  return `completion:${scope}:${getOwnerKey()}`;
}

export function readCompletionIds(scope) {
  try {
    const value = JSON.parse(localStorage.getItem(getStorageKey(scope)));
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

export function saveCompletionIds(scope, ids) {
  localStorage.setItem(getStorageKey(scope), JSON.stringify([...new Set(ids.map(String))]));
}

export function toggleCompletionId(scope, id) {
  const normalizedId = String(id);
  const current = readCompletionIds(scope);
  const next = current.includes(normalizedId)
    ? current.filter((item) => item !== normalizedId)
    : [...current, normalizedId];

  saveCompletionIds(scope, next);
  return next;
}

export function getMealCompletionId(meal) {
  return String(meal.id || `${meal.date}-${meal.type}-${meal.time}`);
}

export function getActivityCompletionId(activity) {
  return String(activity.id || `${activity.date}-${activity.time}-${activity.customName}`);
}
