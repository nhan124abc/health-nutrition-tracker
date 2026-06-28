export function isVietnamese(language = '') {
  return String(language).toLowerCase().startsWith('vi');
}

export function getLocalizedName(item = {}, language = '') {
  const englishName = item.name || item.nameEn || '';
  const vietnameseName = item.nameVi || '';
  return isVietnamese(language) ? vietnameseName || englishName : englishName || vietnameseName;
}
