import { useEffect, useState } from 'react';
import { Card, Col, Form, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBell } from 'react-icons/fa';

const settingsStorageKey = 'userSettings';

const defaultSettings = {
  mealReminder: true,
  waterReminder: true,
  bodyMetricsReminder: true,
  activityReminder: true,
  weeklyReport: true,
};

function readStoredSettings() {
  try {
    return JSON.parse(localStorage.getItem(settingsStorageKey)) || {};
  } catch {
    return {};
  }
}

function Settings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(() => ({
    ...defaultSettings,
    ...readStoredSettings(),
  }));

  useEffect(() => {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('settings:notificationsChanged', { detail: settings }));
  }, [settings]);

  const updateNotification = (event) => {
    const { checked, name } = event.target;
    setSettings((current) => ({ ...current, [name]: checked }));
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('settingsPage.title')}</h1>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <FaBell className="text-success" />
                <Card.Title className="fw-bold mb-0">{t('settingsPage.notifications.title')}</Card.Title>
              </div>
              <div className="settings-option-list">
                {Object.keys(defaultSettings).map((name) => (
                  <Form.Check
                    key={name}
                    type="switch"
                    id={`setting-${name}`}
                    name={name}
                    checked={settings[name]}
                    onChange={updateNotification}
                    label={t(`settingsPage.notifications.${name}`)}
                  />
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Settings;
