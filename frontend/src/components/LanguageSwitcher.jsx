import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'vi', flag: 'vn', labelKey: 'language.vi' },
  { code: 'en', flag: 'us', labelKey: 'language.en' },
];

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language?.split('-')[0] || 'vi';

  const handleChangeLanguage = (language) => {
    localStorage.setItem('i18nextLng', language);
    i18n.changeLanguage(language);
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
