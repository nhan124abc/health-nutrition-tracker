export function normalizeSearchText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function isVietnameseSearchLanguage(language = '') {
  return String(language).toLowerCase().startsWith('vi');
}

export function textMatchesSearch(value, query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return normalizeSearchText(value).includes(normalizedQuery);
}

export function valuesMatchSearch(values = [], query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return values
    .filter((value) => value !== null && value !== undefined)
    .some((value) => normalizeSearchText(value).includes(normalizedQuery));
}
