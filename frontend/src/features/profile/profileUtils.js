export const initialProfile = {
  username: '',
  avatarUrl: '',
  birthDate: '',
  gender: '',
  height: '',
  weight: '',
  activityLevel: '',
  healthGoal: '',
  targetWeight: '',
  bmr: '',
  tdee: '',
  activityFactor: '',
  dailyCalorieGoal: '',
  dailyProteinGoal: '',
  dailyCarbsGoal: '',
  dailyFatGoal: '',
  dailyWaterGoal: '',
  bio: '',
  timezone: 'Asia/Bangkok',
  planStartDate: '',
  planDurationWeeks: '',
  dailyActivityGoalKcal: '',
  weeklyWeightMilestones: [],
};

export const profileFields = [
  ['username', 'profilePage.fields.username', 'text'],
  ['birthDate', 'profile.birthDate', 'date'],
  ['height', 'profile.height', 'number'],
  ['weight', 'profile.weight', 'number'],
  ['targetWeight', 'profilePage.fields.targetWeight', 'number'],
  ['dailyWaterGoal', 'profilePage.fields.dailyWaterGoal', 'number'],
];

export const notificationFields = [
  ['mealReminder', 'profilePage.notifications.mealReminder'],
  ['waterReminder', 'profilePage.notifications.waterReminder'],
  ['weightReminder', 'profilePage.notifications.weightReminder'],
  ['weeklyReport', 'profilePage.notifications.weeklyReport'],
];

export const requiredProfileFields = [
  ['username', 'profilePage.fields.username'],
  ['birthDate', 'profile.birthDate'],
  ['gender', 'profile.gender'],
  ['height', 'profile.height'],
  ['weight', 'profile.weight'],
  ['activityLevel', 'profile.activityLevel'],
  ['healthGoal', 'profilePage.fields.healthGoal'],
  ['targetWeight', 'profilePage.fields.targetWeight'],
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
  ['waist', 'bodyMetricsPage.fields.waist', 'number'],
  ['hip', 'bodyMetricsPage.fields.hip', 'number'],
  ['chest', 'bodyMetricsPage.fields.chest', 'number'],
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
  GAIN_WEIGHT: 'gain_weight',
  GAIN_MUSCLE: 'gain_muscle',
  CUTTING: 'cutting',
  BODY_RECOMPOSITION: 'body_recomposition',
  IMPROVE_FITNESS: 'improve_health',
};

const goalToApi = {
  lose_weight: 'LOSE_WEIGHT',
  maintain: 'MAINTAIN_WEIGHT',
  gain_weight: 'GAIN_WEIGHT',
  gain_muscle: 'GAIN_MUSCLE',
  cutting: 'CUTTING',
  body_recomposition: 'BODY_RECOMPOSITION',
  improve_health: 'IMPROVE_FITNESS',
};

function getAvatarStorageKey(account = {}) {
  const accountKey = account.id || account.email || account.username || account.sub;

  return accountKey ? `profileAvatar:${accountKey}` : '';
}

export const goalFormulaKeys = {
  lose_weight: 'profilePage.goalFormulas.loseWeight',
  maintain: 'profilePage.goalFormulas.maintain',
  gain_weight: 'profilePage.goalFormulas.gainWeight',
  gain_muscle: 'profilePage.goalFormulas.gainMuscle',
  cutting: 'profilePage.goalFormulas.cutting',
  body_recomposition: 'profilePage.goalFormulas.bodyRecomposition',
  improve_health: 'profilePage.goalFormulas.improveHealth',
};

export const goalOptions = [
  { value: 'lose_weight', labelKey: 'profilePage.goals.loseWeight', formulaKey: goalFormulaKeys.lose_weight },
  { value: 'maintain', labelKey: 'profilePage.goals.maintain', formulaKey: goalFormulaKeys.maintain },
  { value: 'gain_weight', labelKey: 'profilePage.goals.gainWeight', formulaKey: goalFormulaKeys.gain_weight },
  { value: 'gain_muscle', labelKey: 'profilePage.goals.gainMuscle', formulaKey: goalFormulaKeys.gain_muscle },
  { value: 'cutting', labelKey: 'profilePage.goals.cutting', formulaKey: goalFormulaKeys.cutting },
  { value: 'body_recomposition', labelKey: 'profilePage.goals.bodyRecomposition', formulaKey: goalFormulaKeys.body_recomposition },
  { value: 'improve_health', labelKey: 'profilePage.goals.improveHealth', formulaKey: goalFormulaKeys.improve_health },
];

function emptyToNull(value) {
  return value === '' ? null : value;
}

function normalizeNumber(value) {
  return value === '' ? null : Number(value);
}

function getRegisteredName(account = {}) {
  return account.fullName || account.name || account.username || '';
}

function withRegisteredName(profile = {}, account = {}) {
  const registeredName = getRegisteredName(account);

  return {
    ...profile,
    username: registeredName || profile.fullName || profile.name || profile.username || '',
  };
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

export function getLatestBodyMetric(metrics = []) {
  return [...metrics]
    .filter(Boolean)
    .sort((first, second) => String(second.recordedAt || second.date).localeCompare(String(first.recordedAt || first.date)))[0] || {};
}

export function buildBodyMetricFormFromProfile(profile = {}, metrics = []) {
  const latestMetric = getLatestBodyMetric(metrics);

  return {
    ...emptyBodyMetric,
    date: getTodayDate(),
    weight: profile.weight || latestMetric.weightKg || latestMetric.weight || '',
    waist: latestMetric.waistCm ?? latestMetric.waist ?? '',
    hip: latestMetric.hipCm ?? latestMetric.hip ?? '',
    chest: latestMetric.chestCm ?? latestMetric.chest ?? '',
  };
}

export function extractBodyMetricFromApi(data) {
  return data?.data || data?.metric || data;
}

export function mapProfileFromApi(data = {}) {
  return {
    username: data.fullName || data.name || data.username || '',
    avatarUrl: data.avatarUrl || data.profilePictureUrl || data.pictureUrl || '',
    birthDate: data.dateOfBirth || '',
    gender: data.gender?.toLowerCase() || '',
    height: data.heightCm ?? '',
    weight: data.weightKg ?? '',
    activityLevel: activityFromApi[data.activityLevel] || '',
    healthGoal: goalFromApi[data.goal] || '',
    targetWeight: data.targetWeightKg ?? '',
    bmr: data.bmr ?? '',
    tdee: data.tdee ?? '',
    activityFactor: data.activityFactor ?? '',
    dailyCalorieGoal: data.dailyCalorieGoal ?? '',
    dailyProteinGoal: data.dailyProteinGoalG ?? '',
    dailyCarbsGoal: data.dailyCarbsGoalG ?? '',
    dailyFatGoal: data.dailyFatGoalG ?? '',
    dailyWaterGoal: data.dailyWaterGoalMl ?? '',
    bio: data.bio || '',
    timezone: data.timezone || initialProfile.timezone,
    planStartDate: data.planStartDate || '',
    planDurationWeeks: data.planDurationWeeks ?? '',
    dailyActivityGoalKcal: data.dailyActivityGoalKcal ?? '',
    weeklyWeightMilestones: data.weeklyWeightMilestones || [],
  };
}

export function getStoredProfileAvatar(account) {
  const storageKey = getAvatarStorageKey(account);

  if (!storageKey) {
    return '';
  }

  return localStorage.getItem(storageKey) || '';
}

export function saveStoredProfileAvatar(account, avatarUrl) {
  const storageKey = getAvatarStorageKey(account);

  if (!storageKey) {
    return;
  }

  if (avatarUrl) {
    localStorage.setItem(storageKey, avatarUrl);
    return;
  }

  localStorage.removeItem(storageKey);
}

export function mergeProfileAvatar(profile, account) {
  const profileWithRegisteredName = withRegisteredName(profile, account);

  if (profile.avatarUrl) {
    saveStoredProfileAvatar(account, profile.avatarUrl);
    return profileWithRegisteredName;
  }

  return {
    ...profileWithRegisteredName,
    avatarUrl: getStoredProfileAvatar(account),
  };
}

export function extractProfileFromApi(data) {
  return data?.data || data?.profile || data || {};
}

function hasProfileValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value === 'string') {
    return value.trim() !== '' && value.trim() !== '0';
  }

  return true;
}

export function getMissingRequiredProfileFields(profile = {}) {
  return requiredProfileFields.filter(([name]) => !hasProfileValue(profile[name]));
}

export function isProfileComplete(profile = {}) {
  return getMissingRequiredProfileFields(profile).length === 0;
}

export function mapProfileToApi(profile, options = {}) {
  const { includeManualCalorieGoal = true } = options;
  const payload = {
    username: emptyToNull(profile.username),
    avatarUrl: emptyToNull(profile.avatarUrl),
    dateOfBirth: emptyToNull(profile.birthDate),
    gender: profile.gender ? profile.gender.toUpperCase() : null,
    heightCm: normalizeNumber(profile.height),
    weightKg: normalizeNumber(profile.weight),
    activityLevel: activityToApi[profile.activityLevel] || null,
    goal: goalToApi[profile.healthGoal] || null,
    targetWeightKg: normalizeNumber(profile.targetWeight),
    dailyWaterGoalMl: normalizeNumber(profile.dailyWaterGoal),
    bio: profile.bio,
    timezone: emptyToNull(profile.timezone),
  };

  if (includeManualCalorieGoal) {
    payload.dailyCalorieGoal = normalizeNumber(profile.dailyCalorieGoal);
  }

  return payload;
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
