import { useEffect, useState } from 'react';
import { Alert, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBell } from 'react-icons/fa';
import {
  canSyncNotificationSettings,
  defaultNotificationSettings,
  getNotificationSettings,
  persistNotificationSettings,
  readStoredNotificationSettings,
  updateNotificationSettings,
} from '../features/reminders/notificationSettingsService';

function Settings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(readStoredNotificationSettings);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      if (!canSyncNotificationSettings()) {
        setLoading(false);
        return;
      }

      try {
        const syncedSettings = await getNotificationSettings();
        if (!mounted) return;
        persistNotificationSettings(syncedSettings);
        setSettings(syncedSettings);
      } catch {
        if (mounted) {
          setError(t('settingsPage.notifications.loadError'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [t]);

  const updateNotification = async (event) => {
    const { checked, name } = event.target;
    const nextSettings = {
      ...settings,
      [name]: checked,
    };
    const previousSettings = settings;

    setError('');
    setSavingName(name);
    setSettings(nextSettings);
    persistNotificationSettings(nextSettings);

    if (!canSyncNotificationSettings()) {
      setSavingName('');
      return;
    }

    try {
      const syncedSettings = await updateNotificationSettings(nextSettings);
      setSettings(syncedSettings);
      persistNotificationSettings(syncedSettings);
    } catch {
      setSettings(previousSettings);
      persistNotificationSettings(previousSettings);
      setError(t('settingsPage.notifications.saveError'));
    } finally {
      setSavingName('');
    }
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
                {loading && <Spinner animation="border" size="sm" className="ms-auto" />}
              </div>
              {error && <Alert variant="warning">{error}</Alert>}
              <div className="settings-option-list">
                {Object.keys(defaultNotificationSettings).map((name) => (
                  <Form.Check
                    key={name}
                    type="switch"
                    id={`setting-${name}`}
                    name={name}
                    checked={settings[name]}
                    disabled={loading || savingName === name}
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
