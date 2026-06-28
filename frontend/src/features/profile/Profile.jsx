import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Modal, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ErrorModal from '../../components/ErrorModal';
import { useLocation } from 'react-router-dom';
import { FaPrint } from 'react-icons/fa';
import { getCurrentUser } from '../../api/api';
import authConfig from '../../config/authConfig';
import { getAuthenticatedUser, updateAuthenticatedUserAvatar, uploadAuthenticatedUserAvatar } from '../auth/authService';
import ProfileEditForm from './components/ProfileEditForm';
import ProfileOverview from './components/ProfileOverview';
import ProfileTabs from './components/ProfileTabs';
import { createBodyMetric, getBodyMetrics, getProfile, updateAccountProfile, updateProfile } from './profileService';
import {
  buildBodyMetricFormFromProfile,
  extractBodyMetricFromApi,
  extractMetricRows,
  extractProfileFromApi,
  getApiErrorMessage,
  initialProfile,
  mergeProfileAvatar,
  mapBodyMetricToApi,
  mapProfileFromApi,
  mapProfileToApi,
  saveStoredProfileAvatar,
} from './profileUtils';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_SIZE_MB = MAX_AVATAR_SIZE_BYTES / (1024 * 1024);

function withImageCacheBust(url, version) {
  if (!url) {
    return '';
  }

  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
}

function updateStoredAccount(accountPatch = {}) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return currentUser;
  }

  const nextName = accountPatch.fullName?.trim();
  const updatedUser = {
    ...currentUser,
    ...accountPatch,
    ...(nextName ? { fullName: nextName, name: nextName, username: nextName } : {}),
  };

  localStorage.setItem(authConfig.userKey, JSON.stringify(updatedUser));
  return updatedUser;
}

function Profile() {
  const { t } = useTranslation();
  const location = useLocation();
  const avatarInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'overview');
  const [profile, setProfile] = useState(initialProfile);
  const [editProfile, setEditProfile] = useState(initialProfile);
  const [account, setAccount] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarDraftUrl, setAvatarDraftUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarMarkedForRemoval, setAvatarMarkedForRemoval] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  useEffect(() => {
    if (activeTab === 'metrics' || activeTab === 'notifications') {
      setActiveTab('overview');
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setError('');

      try {
        const [profileResponse, metricsResponse, accountResponse] = await Promise.allSettled([
          getProfile(),
          getBodyMetrics({ page: 0, size: 20 }),
          getAuthenticatedUser(),
        ]);

        if (!isMounted) {
          return;
        }

        if (profileResponse.status === 'fulfilled') {
          const currentAccount = accountResponse.status === 'fulfilled'
            ? updateStoredAccount(accountResponse.value.data)
            : getCurrentUser();
          const loadedProfile = mergeProfileAvatar(
            mapProfileFromApi(extractProfileFromApi(profileResponse.value.data)),
            currentAccount
          );
          setProfile(loadedProfile);
          setEditProfile(loadedProfile);
          setAvatarDraftUrl(null);
          setAvatarFile(null);
          setAvatarMarkedForRemoval(false);
          setAvatarVersion(Date.now());
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

        setAccount(accountResponse.status === 'fulfilled' ? accountResponse.value.data : getCurrentUser());
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

  useEffect(() => () => {
    if (avatarDraftUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarDraftUrl);
    }
  }, [avatarDraftUrl]);

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
    setEditProfile((current) => ({ ...current, [name]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    setAvatarError('');

    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    const hasAllowedExtension = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png');
    const hasAllowedType = file.type === 'image/jpeg' || file.type === 'image/png';

    if (!hasAllowedExtension || !hasAllowedType) {
      setAvatarError(t('profilePage.avatar.invalidType'));
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError(t('profilePage.avatar.tooLarge', { size: MAX_AVATAR_SIZE_MB }));
      event.target.value = '';
      return;
    }

    if (avatarDraftUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarDraftUrl);
    }

    setAvatarFile(file);
    setAvatarMarkedForRemoval(false);
    setAvatarDraftUrl(URL.createObjectURL(file));
    event.target.value = '';
  };

  const handleAvatarRemove = () => {
    setAvatarError('');
    if (avatarDraftUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarDraftUrl);
    }
    setAvatarFile(null);
    setAvatarMarkedForRemoval(true);
    setAvatarDraftUrl('');

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);
    setError('');
    setSaving(true);

    try {
      let savedAvatarUrl = editProfile.avatarUrl || '';

      if (avatarFile) {
        const avatarResponse = await uploadAuthenticatedUserAvatar(avatarFile);
        savedAvatarUrl = avatarResponse.data?.avatarUrl || avatarResponse.data?.data?.avatarUrl || '';
      } else if (avatarMarkedForRemoval) {
        const avatarResponse = await updateAuthenticatedUserAvatar('');
        savedAvatarUrl = avatarResponse.data?.avatarUrl || avatarResponse.data?.data?.avatarUrl || '';
      }

      const profileToSave = {
        ...editProfile,
        avatarUrl: savedAvatarUrl,
      };
      const profilePayload = mapProfileToApi(profileToSave);
      if (avatarMarkedForRemoval) {
        // Empty string is an explicit delete; null means "leave unchanged" to user-service.
        profilePayload.avatarUrl = '';
      }
      const [response, accountResponse] = await Promise.all([
        updateProfile(profilePayload),
        updateAccountProfile({ fullName: profileToSave.username.trim() }),
      ]);
      const responseProfile = mapProfileFromApi(extractProfileFromApi(response.data));
      const updatedAccount = updateStoredAccount({ ...accountResponse.data, avatarUrl: savedAvatarUrl });
      const mergedProfile = mergeProfileAvatar(
        {
          ...responseProfile,
          avatarUrl: savedAvatarUrl,
        },
        updatedAccount
      );
      const updatedProfile = avatarMarkedForRemoval
        ? { ...mergedProfile, avatarUrl: '' }
        : mergedProfile;

      setProfile(updatedProfile);
      setEditProfile(updatedProfile);
      setAccount(updatedAccount);
      saveStoredProfileAvatar(updatedAccount, updatedProfile.avatarUrl);
      if (avatarDraftUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarDraftUrl);
      }
      setAvatarDraftUrl(null);
      setAvatarFile(null);
      setAvatarMarkedForRemoval(false);
      setAvatarVersion(Date.now());
      window.dispatchEvent(new CustomEvent('profile:updated', { detail: updatedProfile }));

      if (Number(profile.weight) !== Number(updatedProfile.weight) && Number(updatedProfile.weight) > 0) {
        createBodyMetric(mapBodyMetricToApi(buildBodyMetricFormFromProfile(updatedProfile, metrics)))
          .then((metricResponse) => {
            const createdMetric = extractBodyMetricFromApi(metricResponse.data);
            setMetrics((current) => [
              createdMetric,
              ...current.filter((item) => item.id !== createdMetric.id),
            ]);
          })
          .catch((syncError) => {
            console.error('[Profile] Error syncing body metric weight:', syncError);
          });
      }

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
          <h1>{t('profilePage.title')}</h1>
        </div>
        <Button variant="outline-success" onClick={printProfile}>
          <FaPrint className="me-2" />
          {t('profilePage.printProfile')}
        </Button>
      </div>

      <ErrorModal error={error} onClose={() => setError('')} />
      <ErrorModal error={avatarError} onClose={() => setAvatarError('')} />

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
            <ProfileOverview
              account={account}
              avatarVersion={avatarVersion}
              bmi={bmi}
              profile={profile}
              t={t}
              withImageCacheBust={withImageCacheBust}
            />
          )}

          {activeTab === 'edit' && (
            <ProfileEditForm
              avatarError={avatarError}
              avatarInputRef={avatarInputRef}
              avatarPreviewUrl={withImageCacheBust(
                avatarDraftUrl === null ? editProfile.avatarUrl : avatarDraftUrl,
                avatarVersion
              )}
              maxAvatarSizeMb={MAX_AVATAR_SIZE_MB}
              onAvatarChange={handleAvatarChange}
              onAvatarRemove={handleAvatarRemove}
              onChange={handleChange}
              onSubmit={handleSubmit}
              profile={editProfile}
              saving={saving}
              t={t}
            />
          )}

        </>
      )}

      <Modal show={saved} onHide={() => setSaved(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('profilePage.updateSuccess.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t('profilePage.updateSuccess.message')}</Modal.Body>
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
