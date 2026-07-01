import { valuesMatchSearch } from '../../utils/searchText';

export const emptyLog = {
  typeId: '',
  customName: '',
  date: '',
  time: '',
  duration: 30,
  userWeight: 67,
  distance: '',
  avgHeartRate: '',
  maxHeartRate: '',
  sets: '',
  reps: '',
  strengthWeight: '',
  notes: '',
};

export const activityFields = [
  ['customName', 'activityPage.fields.customName', 'text'],
  ['date', 'common.date', 'date'],
  ['time', 'activityPage.fields.logTime', 'time'],
  ['duration', 'activityPage.fields.durationMinutes', 'number'],
  ['userWeight', 'activityPage.fields.userWeight', 'number'],
  ['distance', 'activityPage.fields.distance', 'number'],
  ['avgHeartRate', 'activityPage.fields.avgHeartRate', 'number'],
  ['maxHeartRate', 'activityPage.fields.maxHeartRate', 'number'],
  ['sets', 'activityPage.fields.sets', 'number'],
  ['reps', 'activityPage.fields.reps', 'number'],
  ['strengthWeight', 'activityPage.fields.strengthWeight', 'number'],
  ['notes', 'common.notes', 'text'],
];

export function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeNumber(value) {
  return value === null || value === undefined || value === '' ? '' : Number(value);
}

function emptyToNull(value) {
  return value === '' || value === null || value === undefined ? null : value;
}

export function extractActivitiesFromApi(data) {
  if (Array.isArray(data)) {
    return data;
  }

  const nestedData = data?.data;

  if (Array.isArray(nestedData)) {
    return nestedData;
  }

  return nestedData?.content
    || nestedData?.items
    || nestedData?.activities
    || data?.content
    || data?.items
    || data?.activities
    || [];
}

export function extractActivityTypesFromApi(data) {
  if (Array.isArray(data)) {
    return data;
  }

  const nestedData = data?.data;

  if (Array.isArray(nestedData)) {
    return nestedData;
  }

  return nestedData?.content
    || nestedData?.items
    || nestedData?.activityTypes
    || data?.content
    || data?.items
    || data?.activityTypes
    || [];
}

export function normalizeActivityType(type = {}) {
  const category = type.category || type.activityCategory || {};
  const categoryValue = typeof category === 'object'
    ? category.code || category.name || category.category || 'OTHER'
    : category;

  return {
    id: type.id ?? type.activityTypeId,
    name: type.name || type.activityName || '',
    nameVi: type.nameVi || '',
    category: String(categoryValue || 'OTHER').toLowerCase(),
    categoryName: typeof category === 'object' ? category.name || category.code || '' : String(categoryValue || ''),
    categoryNameVi: typeof category === 'object' ? category.nameVi || '' : '',
    description: type.description || '',
    descriptionVi: type.descriptionVi || '',
    met: Number(type.metValue || type.met || 4),
  };
}

export function deriveActivityCategoriesFromTypes(types = []) {
  const categoriesById = types.reduce((groups, type) => {
    const id = type.category || 'other';

    if (!groups.has(id)) {
      groups.set(id, {
        id,
        name: type.categoryName || id,
        nameVi: type.categoryNameVi || '',
      });
    }

    return groups;
  }, new Map());

  return Array.from(categoriesById.values());
}

export function filterActivityTypes(types = [], query = '', category = 'all', language = '') {
  const isVietnamese = String(language).toLowerCase().startsWith('vi');

  return types.filter((type) => {
    const searchableValues = [
      isVietnamese ? type.nameVi || type.name : type.name || type.nameVi,
      isVietnamese ? type.categoryNameVi || type.categoryName : type.categoryName || type.categoryNameVi,
    ];
    const matchesQuery = valuesMatchSearch(searchableValues, query);
    const matchesCategory = category === 'all' || String(type.category) === String(category);

    return matchesQuery && matchesCategory;
  });
}

export function normalizeActivityFromApi(activity = {}) {
  const loggedAt = activity.loggedAt
    || activity.createdAt
    || (activity.date && activity.time ? `${activity.date}T${activity.time}:00` : '');

  return {
    id: activity.id ?? activity.activityLogId,
    typeId: activity.activityTypeId ?? activity.typeId ?? '',
    customName: activity.activityName || activity.customName || '',
    category: String(activity.category || 'OTHER').toLowerCase(),
    date: String(loggedAt).slice(0, 10),
    time: String(loggedAt).slice(11, 16),
    duration: normalizeNumber(activity.durationMinutes ?? activity.duration),
    userWeight: normalizeNumber(activity.userWeightKg ?? activity.userWeight),
    calories: Number(activity.caloriesBurned ?? activity.calories ?? 0),
    distance: normalizeNumber(activity.distanceKm ?? activity.distance),
    avgHeartRate: normalizeNumber(activity.avgHeartRate),
    maxHeartRate: normalizeNumber(activity.maxHeartRate),
    sets: normalizeNumber(activity.sets),
    reps: normalizeNumber(activity.repsPerSet ?? activity.reps),
    strengthWeight: normalizeNumber(activity.weightKg ?? activity.strengthWeight),
    notes: activity.notes || '',
  };
}

export function mapActivityToApi(form, types) {
  const type = types.find((item) => String(item.id) === String(form.typeId));

  return {
    activityTypeId: type?.id || null,
    activityName: form.customName.trim() || type?.name || '',
    durationMinutes: Number(form.duration),
    loggedAt: form.date && form.time ? `${form.date}T${form.time}:00` : null,
    notes: form.notes || '',
    distanceKm: emptyToNull(form.distance),
    avgHeartRate: emptyToNull(form.avgHeartRate),
    maxHeartRate: emptyToNull(form.maxHeartRate),
    sets: emptyToNull(form.sets),
    repsPerSet: emptyToNull(form.reps),
    weightKg: emptyToNull(form.strengthWeight),
    userWeightKg: emptyToNull(form.userWeight),
  };
}

export function mapActivityToForm(activity) {
  return {
    ...emptyLog,
    ...activity,
  };
}

export function calculateActivityCalories(log, types) {
  const type = types.find((item) => String(item.id) === String(log.typeId));
  return Math.round(((type?.met || 4) * Number(log.userWeight || 0) * Number(log.duration || 0)) / 60);
}

export function getActivitySummary(logs) {
  return logs.reduce(
    (sum, log) => ({
      calories: sum.calories + Number(log.calories || 0),
      minutes: sum.minutes + Number(log.duration || 0),
    }),
    { calories: 0, minutes: 0 }
  );
}
