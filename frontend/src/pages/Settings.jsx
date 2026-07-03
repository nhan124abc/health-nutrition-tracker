import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Nav, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBell, FaLock } from 'react-icons/fa';
import { changePassword } from '../features/auth/authService';
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
  const [activeTab, setActiveTab] = useState('notifications');
  const [settings, setSettings] = useState(readStoredNotificationSettings);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState('');
  const [error, setError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

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

  const updatePasswordField = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordError('');
    setPasswordSuccess('');
  };

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError(t('settingsPage.security.required'));
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t('settingsPage.security.passwordTooShort'));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('settingsPage.security.passwordMismatch'));
      return;
    }

    setPasswordSaving(true);

    try {
      await changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess(t('settingsPage.security.success'));
    } catch (requestError) {
      setPasswordError(requestError.response?.data?.message || t('settingsPage.security.saveError'));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('settingsPage.title')}</h1>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Nav
            variant="tabs"
            activeKey={activeTab}
            onSelect={(key) => key && setActiveTab(key)}
            className="mb-4"
          >
            <Nav.Item>
              <Nav.Link eventKey="notifications">
                <FaBell className="me-2" />
                {t('settingsPage.notifications.title')}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="security">
                <FaLock className="me-2" />
                {t('settingsPage.security.title')}
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {activeTab === 'notifications' && (
            <>
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
            </>
          )}

          {activeTab === 'security' && (
            <>
              <div className="d-flex align-items-center gap-2 mb-3">
                <FaLock className="text-success" />
                <Card.Title className="fw-bold mb-0">{t('settingsPage.security.title')}</Card.Title>
              </div>
              {passwordError && <Alert variant="danger">{passwordError}</Alert>}
              {passwordSuccess && <Alert variant="success">{passwordSuccess}</Alert>}
              <Form onSubmit={submitPasswordChange}>
                <Form.Group className="mb-3" controlId="currentPassword">
                  <Form.Label>{t('settingsPage.security.currentPassword')}</Form.Label>
                  <Form.Control
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={updatePasswordField}
                    disabled={passwordSaving}
                    autoComplete="current-password"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="newPassword">
                  <Form.Label>{t('settingsPage.security.newPassword')}</Form.Label>
                  <Form.Control
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={updatePasswordField}
                    disabled={passwordSaving}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <Form.Text>{t('settingsPage.security.passwordHint')}</Form.Text>
                </Form.Group>
                <Form.Group className="mb-4" controlId="confirmPassword">
                  <Form.Label>{t('settingsPage.security.confirmPassword')}</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={updatePasswordField}
                    disabled={passwordSaving}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="success" disabled={passwordSaving}>
                  {passwordSaving ? t('settingsPage.security.saving') : t('settingsPage.security.save')}
                </Button>
              </Form>
            </>
          )}
        </Card.Body>
      </Card>
    </>
  );
}

export default Settings;
