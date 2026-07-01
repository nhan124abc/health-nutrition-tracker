export function isVietnamese(language = '') {
  return String(language).toLowerCase().startsWith('vi');
}

export function getLocalizedName(item = {}, language = '') {
  const englishName = item.name || item.nameEn || '';
  const vietnameseName = item.nameVi || '';
  return isVietnamese(language) ? vietnameseName || englishName : englishName || vietnameseName;
}

export function normalizeSearchText(value = '', language = '') {
  return String(value || '')
    .trim()
    .toLocaleLowerCase(isVietnamese(language) ? 'vi' : 'en');
}

export function includesLocalizedSearch(value = '', query = '', language = '') {
  const keyword = normalizeSearchText(query, language);
  return !keyword || normalizeSearchText(value, language).includes(keyword);
}

export function getLocalizedSearchValues(item = {}, language = '', extraValues = []) {
  const localizedName = getLocalizedName(item, language);
  return [localizedName, ...extraValues].filter(Boolean);
}
