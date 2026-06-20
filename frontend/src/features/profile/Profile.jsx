import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Modal, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { FaPrint } from 'react-icons/fa';
import { getCurrentUser } from '../../api/api';
import ProfileEditForm from './components/ProfileEditForm';
import ProfileMetrics from './components/ProfileMetrics';
import ProfileNotifications from './components/ProfileNotifications';
import ProfileOverview from './components/ProfileOverview';
import ProfileTabs from './components/ProfileTabs';
import { getBodyMetrics, getProfile, updateProfile } from './profileService';
import {
  extractMetricRows,
  extractProfileFromApi,
  getApiErrorMessage,
  initialProfile,
  mapProfileFromApi,
  mapProfileToApi,
} from './profileUtils';

function Profile() {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'overview');
  const [profile, setProfile] = useState(initialProfile);
  const [account, setAccount] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({
    mealReminder: true,
    waterReminder: true,
    weightReminder: false,
    weeklyReport: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setError('');

      try {
        const [profileResponse, metricsResponse] = await Promise.allSettled([
          getProfile(),
          getBodyMetrics({ page: 0, size: 20 }),
        ]);

        if (!isMounted) {
          return;
        }

        if (profileResponse.status === 'fulfilled') {
          setProfile(mapProfileFromApi(extractProfileFromApi(profileResponse.value.data)));
        } else {
          setError(getApiErrorMessage(profileResponse.reason, t('profilePage.loadError')));
        }

        if (metricsResponse.status === 'fulfilled') {
          setMetrics(extractMetricRows(metricsResponse.value.data));
        } else {
          setMetrics([]);
          setError((current) => current || getApiErrorMessage(
            metricsResponse.reason,
            t('profilePage.metricsLoadError')
          ));
        }

        setAccount(getCurrentUser());
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const bmi = useMemo(() => {
    const height = Number(profile.height);
    const weight = Number(profile.weight);

    if (!height || !weight) {
      return null;
    }

    return (weight / ((height / 100) ** 2)).toFixed(1);
  }, [profile.height, profile.weight]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleNotificationChange = (event) => {
    const { checked, name } = event.target;
    setNotificationSettings((current) => ({ ...current, [name]: checked }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);
    setError('');
    setSaving(true);

    try {
      const response = await updateProfile(mapProfileToApi(profile));
      const updatedProfile = mapProfileFromApi(extractProfileFromApi(response.data));

      setProfile(updatedProfile);
      window.dispatchEvent(new CustomEvent('profile:updated', { detail: updatedProfile }));
      setSaved(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t('profilePage.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const printProfile = () => {
    window.print();
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('profilePage.badge')}</Badge>
          <h1>{t('profilePage.title')}</h1>
        </div>
        <Button variant="outline-success" onClick={printProfile}>
          <FaPrint className="me-2" />
          {t('profilePage.printProfile')}
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <ProfileTabs activeTab={activeTab} onSelect={setActiveTab} t={t} />

      {loading ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="py-5 text-center text-secondary">
            <Spinner animation="border" variant="success" className="mb-3" />
            <div>{t('profilePage.loading')}</div>
          </Card.Body>
        </Card>
      ) : (
        <>
          {activeTab === 'overview' && (
            <ProfileOverview account={account} bmi={bmi} profile={profile} t={t} />
          )}

          {activeTab === 'edit' && (
            <ProfileEditForm
              onChange={handleChange}
              onSubmit={handleSubmit}
              profile={profile}
              saving={saving}
              t={t}
            />
          )}

          {activeTab === 'metrics' && (
            <ProfileMetrics metrics={metrics} t={t} />
          )}

          {activeTab === 'notifications' && (
            <ProfileNotifications
              onChange={handleNotificationChange}
              settings={notificationSettings}
              t={t}
            />
          )}
        </>
      )}

      <Modal show={saved} onHide={() => setSaved(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('profilePage.updateProfile')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t('profilePage.savedMessage')}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setSaved(false)}>
            {t('common.close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Profile;
