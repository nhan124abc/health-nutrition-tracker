export const initialProfile = {
  username: '',
  birthDate: '',
  gender: '',
  height: '',
  weight: '',
  activityLevel: '',
  healthGoal: '',
  targetWeight: '',
  dailyCalorieGoal: '',
  dailyWaterGoal: '',
  bio: '',
  timezone: 'Asia/Bangkok',
};

export const profileFields = [
  ['username', 'profilePage.fields.username', 'text'],
  ['birthDate', 'profile.birthDate', 'date'],
  ['height', 'profile.height', 'number'],
  ['weight', 'profile.weight', 'number'],
  ['targetWeight', 'profilePage.fields.targetWeight', 'number'],
  ['dailyCalorieGoal', 'health.dailyCalorieGoal', 'number'],
  ['dailyWaterGoal', 'profilePage.fields.dailyWaterGoal', 'number'],
  ['timezone', 'common.timezone', 'text'],
];

export const notificationFields = [
  ['mealReminder', 'profilePage.notifications.mealReminder'],
  ['waterReminder', 'profilePage.notifications.waterReminder'],
  ['weightReminder', 'profilePage.notifications.weightReminder'],
  ['weeklyReport', 'profilePage.notifications.weeklyReport'],
];

export const emptyBodyMetric = {
  date: '',
  weight: '',
  bodyFat: '',
  muscleMass: '',
  waist: '',
  hip: '',
  chest: '',
  notes: '',
};

export const bodyMetricFields = [
  ['date', 'bodyMetricsPage.fields.date', 'date'],
  ['weight', 'bodyMetricsPage.fields.weight', 'number'],
  ['bodyFat', 'bodyMetricsPage.fields.bodyFat', 'number'],
  ['muscleMass', 'bodyMetricsPage.fields.muscleMass', 'number'],
  ['waist', 'bodyMetricsPage.fields.waist', 'number'],
  ['hip', 'bodyMetricsPage.fields.hip', 'number'],
  ['chest', 'bodyMetricsPage.fields.chest', 'number'],
  ['notes', 'common.notes', 'text'],
];

const activityFromApi = {
  SEDENTARY: 'sedentary',
  LIGHTLY_ACTIVE: 'light',
  MODERATELY_ACTIVE: 'moderate',
  VERY_ACTIVE: 'active',
  EXTRA_ACTIVE: 'very_active',
};

const activityToApi = {
  sedentary: 'SEDENTARY',
  light: 'LIGHTLY_ACTIVE',
  moderate: 'MODERATELY_ACTIVE',
  active: 'VERY_ACTIVE',
  very_active: 'EXTRA_ACTIVE',
};

const goalFromApi = {
  LOSE_WEIGHT: 'lose_weight',
  MAINTAIN_WEIGHT: 'maintain',
  GAIN_MUSCLE: 'gain_muscle',
  IMPROVE_FITNESS: 'improve_health',
};

const goalToApi = {
  lose_weight: 'LOSE_WEIGHT',
  maintain: 'MAINTAIN_WEIGHT',
  gain_muscle: 'GAIN_MUSCLE',
  improve_health: 'IMPROVE_FITNESS',
};

function emptyToNull(value) {
  return value === '' ? null : value;
}

function normalizeNumber(value) {
  return value === '' ? null : Number(value);
}

export function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function mapBodyMetricToApi(metric) {
  return {
    recordedAt: metric.date,
    weightKg: normalizeNumber(metric.weight),
    bodyFatPercentage: normalizeNumber(metric.bodyFat),
    muscleMassKg: normalizeNumber(metric.muscleMass),
    waistCm: normalizeNumber(metric.waist),
    hipCm: normalizeNumber(metric.hip),
    chestCm: normalizeNumber(metric.chest),
    notes: metric.notes || '',
  };
}

export function extractBodyMetricFromApi(data) {
  return data?.data || data?.metric || data;
}

export function mapProfileFromApi(data = {}) {
  return {
    username: data.username || '',
    birthDate: data.dateOfBirth || '',
    gender: data.gender?.toLowerCase() || '',
    height: data.heightCm ?? '',
    weight: data.weightKg ?? '',
    activityLevel: activityFromApi[data.activityLevel] || '',
    healthGoal: goalFromApi[data.goal] || '',
    targetWeight: data.targetWeightKg ?? '',
    dailyCalorieGoal: data.dailyCalorieGoal ?? '',
    dailyWaterGoal: data.dailyWaterGoalMl ?? '',
    bio: data.bio || '',
    timezone: data.timezone || initialProfile.timezone,
  };
}

export function extractProfileFromApi(data) {
  return data?.data || data?.profile || data || {};
}

export function mapProfileToApi(profile) {
  return {
    username: emptyToNull(profile.username),
    dateOfBirth: emptyToNull(profile.birthDate),
    gender: profile.gender ? profile.gender.toUpperCase() : null,
    heightCm: normalizeNumber(profile.height),
    weightKg: normalizeNumber(profile.weight),
    activityLevel: activityToApi[profile.activityLevel] || null,
    goal: goalToApi[profile.healthGoal] || null,
    targetWeightKg: normalizeNumber(profile.targetWeight),
    dailyCalorieGoal: normalizeNumber(profile.dailyCalorieGoal),
    dailyWaterGoalMl: normalizeNumber(profile.dailyWaterGoal),
    bio: profile.bio,
    timezone: emptyToNull(profile.timezone),
  };
}

export function getApiErrorMessage(error, fallback) {
  const errors = error.response?.data?.errors;

  if (errors) {
    return Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join('\n');
  }

  return error.response?.data?.message || fallback;
}

export function extractMetricRows(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.content)) {
    return data.content;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return data?.data?.content || data?.items || data?.metrics || [];
}
