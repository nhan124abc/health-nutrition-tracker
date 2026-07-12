import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Col, Form, Modal, Nav, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ErrorModal from '../../components/ErrorModal';
import { FaEdit, FaIdCard, FaTimes, FaUserCircle } from 'react-icons/fa';
import { getCurrentUser } from '../../api/api';
import authConfig from '../../config/authConfig';
import { updateAuthenticatedUserAvatar, uploadAuthenticatedUserAvatar } from '../../features/auth/authService';
import { getProfile, updateAccountProfile, updateProfile } from '../../features/profile/profileService';
import {
  extractProfileFromApi,
  getApiErrorMessage,
  getMinimumAllowedBirthDate,
  getStoredProfileAvatar,
  goalFormulaKeys,
  goalOptions,
  initialProfile,
  isAtLeastAge,
  mapProfileFromApi,
  mapProfileToApi,
  profileFields,
  requiredProfileFields,
  saveStoredProfileAvatar,
} from '../../features/profile/profileUtils';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_SIZE_MB = MAX_AVATAR_SIZE_BYTES / (1024 * 1024);
const requiredProfileFieldNames = new Set(requiredProfileFields.map(([name]) => name));

function hasValidProfileValues(profile = {}, fullName = '') {
  const height = Number(profile.height);
  const weight = Number(profile.weight);
  const targetWeight = Number(profile.targetWeight);
  const dailyWaterGoal = Number(profile.dailyWaterGoal);

  return Boolean(fullName.trim())
    && Number.isFinite(height) && height >= 30 && height <= 300
    && Number.isFinite(weight) && weight >= 2 && weight <= 500
    && Number.isFinite(targetWeight) && targetWeight >= 2 && targetWeight <= 500
    && (profile.dailyWaterGoal === '' || profile.dailyWaterGoal == null
      || (Number.isFinite(dailyWaterGoal) && dailyWaterGoal >= 100 && dailyWaterGoal <= 10000))
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

function updateStoredAccount(accountPatch = {}) {
  const currentUser = getCurrentUser() || {};
  const updatedUser = { ...currentUser, ...accountPatch };
  localStorage.setItem(authConfig.userKey, JSON.stringify(updatedUser));
  return updatedUser;
}

function AdminProfile() {
  const { t } = useTranslation();
  const avatarInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser() || {});
  const [draftUser, setDraftUser] = useState(() => getCurrentUser() || {});
  const [avatarUrl, setAvatarUrl] = useState(() => currentUser.avatarUrl || getStoredProfileAvatar(currentUser));
  const [avatarUrlDraft, setAvatarUrlDraft] = useState(() => currentUser.avatarUrl || getStoredProfileAvatar(currentUser));
  const [avatarError, setAvatarError] = useState('');
  const [avatarSaved, setAvatarSaved] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarDraftLoadFailed, setAvatarDraftLoadFailed] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [avatarMarkedForRemoval, setAvatarMarkedForRemoval] = useState(false);
  const [avatarPendingChange, setAvatarPendingChange] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [ageError, setAgeError] = useState('');
  const [healthProfile, setHealthProfile] = useState(initialProfile);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const displayName = currentUser.fullName || currentUser.name || currentUser.username || t('user.name');
  const bmi = useMemo(() => {
    const height = Number(healthProfile.height);
    const weight = Number(healthProfile.weight);

    if (!height || !weight) {
      return null;
    }

    return (weight / ((height / 100) ** 2)).toFixed(1);
  }, [healthProfile.height, healthProfile.weight]);
  const profileRows = [
    [t('admin.profile.fullName'), displayName],
    ['Email', currentUser.email || '-'],
    [t('admin.profile.role'), currentUser.role || '-'],
    [t('profile.birthDate'), healthProfile.birthDate || '-'],
    [t('profile.gender'), healthProfile.gender ? t(`profile.${healthProfile.gender}`) : '-'],
    [
      t('profile.activityLevel'),
      healthProfile.activityLevel
        ? t(`profile.${healthProfile.activityLevel === 'very_active' ? 'veryActive' : healthProfile.activityLevel}`)
        : '-',
    ],
    [t('profile.height'), healthProfile.height ? `${healthProfile.height} cm` : '-'],
    [t('profile.weight'), healthProfile.weight ? `${healthProfile.weight} kg` : '-'],
    [t('profilePage.fields.targetWeight'), healthProfile.targetWeight ? `${healthProfile.targetWeight} kg` : '-'],
    [t('profilePage.fields.healthGoal'), healthProfile.healthGoal ? t(`profilePage.goals.${healthProfile.healthGoal}`) : '-'],
    ['BMI', bmi || '-'],
    [t('health.bmr', 'BMR'), healthProfile.bmr ? `${healthProfile.bmr} kcal` : '-'],
    [t('health.tdee'), healthProfile.tdee ? `${healthProfile.tdee} kcal` : '-'],
    [t('common.calories'), healthProfile.dailyCalorieGoal ? `${healthProfile.dailyCalorieGoal} kcal` : '-'],
    [t('common.water'), healthProfile.dailyWaterGoal ? `${healthProfile.dailyWaterGoal} ml` : '-'],
    [t('common.protein'), healthProfile.dailyProteinGoal ? `${healthProfile.dailyProteinGoal} g` : '-'],
    [t('common.carbs'), healthProfile.dailyCarbsGoal ? `${healthProfile.dailyCarbsGoal} g` : '-'],
    [t('common.fat'), healthProfile.dailyFatGoal ? `${healthProfile.dailyFatGoal} g` : '-'],
    [t('common.timezone'), healthProfile.timezone || '-'],
    [t('common.bio'), healthProfile.bio || '-'],
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadHealthProfile() {
      setProfileLoading(true);
      setProfileError('');

      try {
        const response = await getProfile();
        if (!isMounted) {
          return;
        }
        const loadedProfile = mapProfileFromApi(extractProfileFromApi(response.data));
        setHealthProfile({
          ...loadedProfile,
          username: loadedProfile.username || displayName,
          avatarUrl: avatarUrl || loadedProfile.avatarUrl,
        });
      } catch (error) {
        if (isMounted) {
          setProfileError(getApiErrorMessage(error, t('profilePage.loadError')));
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    }

    loadHealthProfile();

    return () => {
      isMounted = false;
    };
  }, [avatarUrl, displayName, t]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    setAvatarDraftLoadFailed(false);
  }, [avatarUrlDraft]);

  useEffect(() => () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
  }, [avatarPreviewUrl]);

  const applyAvatar = (nextAvatarUrl) => {
    setAvatarUrl(nextAvatarUrl);
    setAvatarUrlDraft(nextAvatarUrl);
    setAvatarVersion(Date.now());
    setAvatarLoadFailed(false);
    setAvatarDraftLoadFailed(false);
    setAvatarFile(null);
    setAvatarMarkedForRemoval(false);
    setAvatarPendingChange(false);
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl('');
    }
    saveStoredProfileAvatar(currentUser, nextAvatarUrl);
    window.dispatchEvent(new CustomEvent('admin:avatarUpdated', { detail: { avatarUrl: nextAvatarUrl } }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraftUser((current) => ({ ...current, [name]: value }));
  };

  const handleHealthProfileChange = (event) => {
    const { name, value } = event.target;
    setHealthProfile((current) => ({ ...current, [name]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    setAvatarError('');
    setAvatarSaved(false);

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

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarMarkedForRemoval(false);
    setAvatarPendingChange(true);
    setAvatarPreviewUrl(nextPreviewUrl);
    setAvatarUrlDraft(nextPreviewUrl);
    setAvatarDraftLoadFailed(false);
    event.target.value = '';
  };

  const handleAvatarRemove = () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl('');
    }
    setAvatarFile(null);
    setAvatarMarkedForRemoval(true);
    setAvatarPendingChange(true);
    setAvatarUrlDraft('');
    setAvatarSaved(false);
    setAvatarDraftLoadFailed(false);

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);
    setProfileError('');
    setAgeError('');
    setAvatarError('');
    setAvatarSaved(false);

    if (!isAtLeastAge(healthProfile.birthDate, 16)) {
      setAgeError(t('profilePage.validationMinimumAge'));
      return;
    }

    const nextName = (draftUser.fullName || draftUser.name || healthProfile.username || '').trim();
    if (!hasValidProfileValues(healthProfile, nextName)) {
      setProfileError(t('profilePage.validationInvalidMetrics'));
      return;
    }

    setSavingProfile(true);

    try {
      let savedAvatarUrl = avatarUrl;

      if (avatarFile) {
        const avatarResponse = await uploadAuthenticatedUserAvatar(avatarFile);
        savedAvatarUrl = avatarResponse.data?.avatarUrl || avatarResponse.data?.data?.avatarUrl || '';
      } else if (avatarMarkedForRemoval) {
        const avatarResponse = await updateAuthenticatedUserAvatar('');
        savedAvatarUrl = avatarResponse.data?.avatarUrl || avatarResponse.data?.data?.avatarUrl || '';
      }

      const profileToSave = {
        ...healthProfile,
        username: nextName,
        avatarUrl: savedAvatarUrl,
      };
      const [response, profileResponse] = await Promise.all([
        updateAccountProfile({ fullName: nextName }),
        updateProfile(mapProfileToApi(profileToSave)),
      ]);
      const updatedUser = updateStoredAccount({ ...response.data, avatarUrl: savedAvatarUrl });
      const updatedHealthProfile = {
        ...mapProfileFromApi(extractProfileFromApi(profileResponse.data)),
        avatarUrl: savedAvatarUrl,
      };

      setCurrentUser(updatedUser);
      setDraftUser(updatedUser);
      setHealthProfile(updatedHealthProfile);
      applyAvatar(savedAvatarUrl);
      setAvatarSaved(Boolean(avatarFile || avatarMarkedForRemoval));
      setSaved(true);
      window.dispatchEvent(new CustomEvent('admin:profile-updated', { detail: updatedUser }));
    } catch (error) {
      setProfileError(getApiErrorMessage(error, 'Không thể lưu hồ sơ admin.'));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h2>{t('admin.profile.title')}</h2>
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="py-2">
          <Nav
            variant="pills"
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key || 'overview')}
            className="gap-2 profile-tab-nav"
          >
            <Nav.Item>
              <Nav.Link eventKey="overview">
                <FaIdCard className="me-2" />
                {t('admin.profile.tabs.overview')}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="edit">
                <FaEdit className="me-2" />
                {t('admin.profile.tabs.edit')}
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Body>
      </Card>

      {profileLoading ? (
        <Card className="border-0 shadow-sm admin-card">
          <Card.Body className="py-5 text-center text-secondary">
            <Spinner animation="border" variant="success" className="mb-3" />
            <div>{t('profilePage.loading')}</div>
          </Card.Body>
        </Card>
      ) : activeTab === 'overview' && (
        <Card className="border-0 shadow-sm admin-card">
          <Card.Body>
            <div className="admin-profile-heading">
              <div className="admin-profile-avatar">
                {avatarUrl && !avatarLoadFailed ? (
                  <img
                    src={withImageCacheBust(avatarUrl, avatarVersion)}
                    alt={t('admin.profile.title')}
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <FaUserCircle />
                )}
              </div>
              <div>
                <h3>{displayName}</h3>
                <span>{currentUser.email || '-'}</span>
              </div>
            </div>

            <div className="profile-summary-list mt-4">
              {profileRows.map(([label, value]) => (
                <div className="profile-summary-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {activeTab === 'edit' && !profileLoading && (
        <Card className="border-0 shadow-sm admin-card">
          <Card.Body>
            <Card.Title className="fw-bold mb-3">{t('admin.profile.updateTitle')}</Card.Title>
            <Form onSubmit={handleSubmit}>
              <div className="profile-avatar-editor mb-3">
                <div className="profile-avatar-picker">
                  <button
                    type="button"
                    className="profile-avatar-preview profile-avatar-preview-button"
                    disabled={savingProfile}
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Chọn ảnh đại diện"
                    title="Chọn ảnh"
                  >
                    {avatarUrlDraft && !avatarDraftLoadFailed ? (
                      <img
                        src={withImageCacheBust(avatarUrlDraft, avatarVersion)}
                        alt={t('profilePage.avatar.previewAlt')}
                        onError={() => setAvatarDraftLoadFailed(true)}
                      />
                    ) : (
                      <FaUserCircle />
                    )}
                  </button>
                  {avatarUrlDraft && (
                    <button
                      type="button"
                      className="profile-avatar-remove"
                      disabled={savingProfile}
                      onClick={handleAvatarRemove}
                      aria-label="Xóa ảnh đại diện"
                      title="Xóa ảnh"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
                <div className="profile-avatar-controls">
                  <div>
                    <div className="fw-bold">{t('profilePage.avatar.title')}</div>
                    <div className="text-secondary small">
                      JPG hoặc PNG, tối đa {MAX_AVATAR_SIZE_MB}MB.
                    </div>
                  </div>
                  <Form.Control
                    ref={avatarInputRef}
                    id="admin-avatar-input"
                    className="visually-hidden"
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={handleAvatarChange}
                  />
                  {avatarPendingChange && (
                    <div className="profile-avatar-status profile-avatar-status-pending">Ảnh mới chưa lưu</div>
                  )}
                  {avatarSaved && <div className="profile-avatar-status profile-avatar-status-saved">Đã lưu ảnh đại diện</div>}
                </div>
              </div>

              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('admin.profile.fullName')}</Form.Label>
                    <Form.Control name="fullName" value={draftUser.fullName || draftUser.name || ''} onChange={handleChange} required />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" name="email" value={draftUser.email || ''} disabled readOnly />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('admin.profile.role')}</Form.Label>
                    <Form.Control value={draftUser.role || ''} disabled readOnly />
                  </Form.Group>
                </Col>
                {profileFields
                  .filter(([name]) => name !== 'username')
                  .map(([name, labelKey, type]) => (
                    <Col md={6} key={name}>
                      <Form.Group>
                        <Form.Label>
                          {t(labelKey)}
                          {requiredProfileFieldNames.has(name) && <span className="text-danger ms-1">*</span>}
                        </Form.Label>
                        <Form.Control
                          type={type}
                          name={name}
                          value={healthProfile[name]}
                          onChange={handleHealthProfileChange}
                          disabled={savingProfile}
                          max={name === 'birthDate' ? getMinimumAllowedBirthDate(16) : undefined}
                          min={name === 'height' ? 30 : name === 'weight' || name === 'targetWeight' ? 2 : name === 'dailyWaterGoal' ? 100 : undefined}
                          step={type === 'number' ? '0.1' : undefined}
                          required={requiredProfileFieldNames.has(name)}
                        />
                      </Form.Group>
                    </Col>
                  ))}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>
                      {t('profile.gender')}
                      <span className="text-danger ms-1">*</span>
                    </Form.Label>
                    <Form.Select name="gender" value={healthProfile.gender} onChange={handleHealthProfileChange} disabled={savingProfile} required>
                      <option value="">{t('profilePage.selectGender')}</option>
                      <option value="male">{t('profile.male')}</option>
                      <option value="female">{t('profile.female')}</option>
                      <option value="other">{t('profile.other')}</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>
                      {t('profile.activityLevel')}
                      <span className="text-danger ms-1">*</span>
                    </Form.Label>
                    <Form.Select name="activityLevel" value={healthProfile.activityLevel} onChange={handleHealthProfileChange} disabled={savingProfile} required>
                      <option value="">{t('profile.selectActivity')}</option>
                      <option value="sedentary">{t('profile.sedentary')}</option>
                      <option value="light">{t('profile.light')}</option>
                      <option value="moderate">{t('profile.moderate')}</option>
                      <option value="active">{t('profile.active')}</option>
                      <option value="very_active">{t('profile.veryActive')}</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>
                      {t('profilePage.fields.healthGoal')}
                      <span className="text-danger ms-1">*</span>
                    </Form.Label>
                    <Form.Select name="healthGoal" value={healthProfile.healthGoal} onChange={handleHealthProfileChange} disabled={savingProfile} required>
                      <option value="">{t('profilePage.selectGoal')}</option>
                      {goalOptions.map((goal) => (
                        <option value={goal.value} key={goal.value}>{t(goal.labelKey)}</option>
                      ))}
                    </Form.Select>
                    {healthProfile.healthGoal && (
                      <Form.Text className="text-secondary">
                        {t(goalFormulaKeys[healthProfile.healthGoal])}
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>{t('common.bio')}</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="bio"
                      value={healthProfile.bio}
                      onChange={handleHealthProfileChange}
                      disabled={savingProfile}
                    />
                  </Form.Group>
                </Col>
                <ErrorModal
                  error={avatarError || profileError}
                  onClose={() => { setAvatarError(''); setProfileError(''); }}
                />
                <ErrorModal
                  error={ageError}
                  onClose={() => setAgeError('')}
                  title={t('profilePage.validationMinimumAgeTitle')}
                />
                <Col xs={12} className="d-flex justify-content-end">
                  <Button variant="success" type="submit" disabled={savingProfile}>
                    {savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      <Modal show={saved} onHide={() => setSaved(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('admin.profile.updateTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t('admin.profile.saved')}</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setSaved(false)}>
            {t('common.close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default AdminProfile;
