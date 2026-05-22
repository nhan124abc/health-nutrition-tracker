import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEn from './locales/translation_en.json';
import translationVi from './locales/translation_vi.json';

const supportedLanguages = ['vi', 'en'];

function detectBrowserLanguage() {
  const storedLanguage = localStorage.getItem('i18nextLng');

  if (supportedLanguages.includes(storedLanguage)) {
    return storedLanguage;
  }

  const browserLanguage = navigator.language?.split('-')[0];
  return supportedLanguages.includes(browserLanguage) ? browserLanguage : 'vi';
}

i18n.use(initReactI18next).init({
  resources: {
    vi: {
      translation: translationVi,
    },
    en: {
      translation: translationEn,
    },
  },
  lng: detectBrowserLanguage(),
  fallbackLng: 'vi',
  supportedLngs: supportedLanguages,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language.split('-')[0];
});

document.documentElement.lang = i18n.language.split('-')[0];

export default i18n;
