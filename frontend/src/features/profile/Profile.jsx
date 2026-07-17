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
  getMinimumAllowedBirthDate,
  initialProfile,
  isAtLeastAge,
  mergeProfileAvatar,
  mapBodyMetricToApi,
  mapProfileFromApi,
  mapProfileToApi,
  saveStoredProfileAvatar,
} from './profileUtils';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_SIZE_MB = MAX_AVATAR_SIZE_BYTES / (1024 * 1024);

function hasValidProfileValues(profile = {}) {
  const height = Number(profile.height);
  const weight = Number(profile.weight);
  const targetWeight = Number(profile.targetWeight);
  const dailyWaterGoal = Number(profile.dailyWaterGoal);

  return Boolean(profile.username?.trim())
    && Number.isFinite(height) && height >= 30 && height <= 300
    && Number.isFinite(weight) && weight >= 2 && weight <= 500
    && Number.isFinite(targetWeight) && targetWeight >= 2 && targetWeight <= 500
    && (profile.dailyWaterGoal === '' || profile.dailyWaterGoal == null
      || (Number.isFinite(dailyWaterGoal) && dailyWaterGoal >= 100 && dailyWaterGoal <= 4000))
    && Boolean(profile.gender && profile.activityLevel && profile.healthGoal);
}

function withImageCacheBust(url, version) {
  if (!url) {
    return '';
  }

  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
}

function ProfilePrintDocument({ account, bmi, metrics = [], profile, t }) {
  const formatValue = (value, unit = '') => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return unit ? `${value} ${unit}` : value;
  };
  const formatMetricValue = (value, unit = '') => formatValue(value, unit);
  const formatMetricDate = (metric) => String(metric.recordedAt || metric.date || '-').slice(0, 10);
  const formatMeasurements = (metric) => {
    const waist = metric.waistCm ?? metric.waist ?? '-';
    const hip = metric.hipCm ?? metric.hip ?? '-';
    const chest = metric.chestCm ?? metric.chest ?? '-';

    return `${waist}/${hip}/${chest} cm`;
  };
  const printableMetrics = metrics.slice(0, 10);

  const profileRows = [
    [t('profilePage.fields.username'), profile.username],
    [t('profile.birthDate'), profile.birthDate],
    [t('profile.gender'), profile.gender ? t(`profile.${profile.gender}`) : ''],
    [
      t('profile.activityLevel'),
      profile.activityLevel
        ? t(`profile.${profile.activityLevel === 'very_active' ? 'veryActive' : profile.activityLevel}`)
        : '',
    ],
    [t('profile.height'), formatValue(profile.height, 'cm')],
    [t('profile.weight'), formatValue(profile.weight, 'kg')],
    [t('profilePage.fields.targetWeight'), formatValue(profile.targetWeight, 'kg')],
  ];

  const healthRows = [
    ['BMI', bmi],
    [t('health.bmr', 'BMR'), formatValue(profile.bmr, 'kcal')],
    [t('health.tdee'), formatValue(profile.tdee, 'kcal')],
    [t('common.goal'), profile.healthGoal ? t(`profilePage.goals.${profile.healthGoal}`) : ''],
    [t('common.calories'), formatValue(profile.dailyCalorieGoal, 'kcal')],
    [t('common.water'), formatValue(profile.dailyWaterGoal, 'ml')],
    [t('common.protein'), formatValue(profile.dailyProteinGoal, 'g')],
    [t('common.carbs'), formatValue(profile.dailyCarbsGoal, 'g')],
    [t('common.fat'), formatValue(profile.dailyFatGoal, 'g')],
  ];

  return (
    <section className="profile-print-document" aria-label={t('profilePage.printProfile')}>
      <header className="profile-print-header">
        <div>
          <h1>{t('profilePage.healthProfile')}</h1>
          <p>{new Date().toLocaleDateString()}</p>
        </div>
        {account?.email && <strong>{account.email}</strong>}
      </header>

      <div className="profile-print-section">
        <h2>{t('profilePage.healthProfile')}</h2>
        <div className="profile-print-grid">
          {profileRows.map(([label, value]) => (
            <div className="profile-print-row" key={label}>
              <span>{label}</span>
              <strong>{value || '-'}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="profile-print-section">
        <h2>{t('common.goal')}</h2>
        <div className="profile-print-grid">
          {healthRows.map(([label, value]) => (
            <div className="profile-print-row" key={label}>
              <span>{label}</span>
              <strong>{value || '-'}</strong>
            </div>
          ))}
        </div>
      </div>

      {profile.bio && (
        <div className="profile-print-section">
          <h2>{t('common.bio')}</h2>
          <p className="profile-print-note">{profile.bio}</p>
        </div>
      )}

      <div className="profile-print-section">
        <h2>{t('profilePage.metricHistory')}</h2>
        {printableMetrics.length === 0 ? (
          <p className="profile-print-note">{t('profilePage.noMetrics')}</p>
        ) : (
          <table className="profile-print-table">
            <thead>
              <tr>
                <th>{t('common.date')}</th>
                <th>{t('common.weight')}</th>
                <th>{t('bodyMetricsPage.table.bodyFat')}</th>
                <th>{t('bodyMetricsPage.table.bmi')}</th>
                <th>{t('bodyMetricsPage.table.bmr')}</th>
                <th>{t('bodyMetricsPage.table.tdee')}</th>
                <th>{t('bodyMetricsPage.table.measurements')}</th>
              </tr>
            </thead>
            <tbody>
              {printableMetrics.map((metric, index) => (
                <tr key={metric.id || `${formatMetricDate(metric)}-${index}`}>
                  <td>{formatMetricDate(metric)}</td>
                  <td>{formatMetricValue(metric.weightKg ?? metric.weight, 'kg')}</td>
                  <td>{formatMetricValue(metric.bodyFatPercentage ?? metric.bodyFat, '%')}</td>
                  <td>{formatMetricValue(metric.bmi)}</td>
                  <td>{formatMetricValue(metric.bmr, 'kcal')}</td>
                  <td>{formatMetricValue(metric.tdee, 'kcal')}</td>
                  <td>{formatMeasurements(metric)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
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
  const [ageError, setAgeError] = useState('');
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
    setAgeError('');

    if (!isAtLeastAge(editProfile.birthDate, 16)) {
      setAgeError(t('profilePage.validationMinimumAge'));
      return;
    }

    if (!hasValidProfileValues(editProfile)) {
      setError(t('profilePage.validationInvalidMetrics'));
      return;
    }

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
    const cleanupPrintMode = () => {
      document.body.classList.remove('printing-profile');
    };

    document.body.classList.add('printing-profile');
    window.addEventListener('afterprint', cleanupPrintMode, { once: true });
    window.print();
    window.setTimeout(cleanupPrintMode, 1000);
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

      {!loading && (
        <ProfilePrintDocument
          account={account}
          bmi={bmi}
          metrics={metrics}
          profile={profile}
          t={t}
        />
      )}

      <ErrorModal error={error} onClose={() => setError('')} />
      <ErrorModal
        error={ageError}
        onClose={() => setAgeError('')}
        title={t('profilePage.validationMinimumAgeTitle')}
      />
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
              maxBirthDate={getMinimumAllowedBirthDate(16)}
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
