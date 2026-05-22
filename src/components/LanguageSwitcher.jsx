import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'vi', flag: 'vn', labelKey: 'language.vi' },
  { code: 'en', flag: 'us', labelKey: 'language.en' },
];

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'vi').split('-')[0];

  const handleChangeLanguage = (language) => {
    localStorage.setItem('i18nextLng', language);
    i18n.changeLanguage(language);
    document.documentElement.lang = language;
  };

  return (
    <Dropdown align="end" className="language-dropdown">
      <Dropdown.Toggle variant="outline-success" className="language-dropdown-toggle" id="language-switcher">
        <span className={`fi fi-${currentLanguage === 'en' ? 'us' : 'vn'}`} />
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Header>{t('language.label')}</Dropdown.Header>
        {languages.map((language) => (
          <Dropdown.Item
            key={language.code}
            active={currentLanguage === language.code}
            onClick={() => handleChangeLanguage(language.code)}
          >
            <span className={`fi fi-${language.flag} me-2`} />
            {t(language.labelKey)}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default LanguageSwitcher;
