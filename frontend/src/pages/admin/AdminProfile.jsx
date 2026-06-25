import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Nav, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaIdCard, FaTimes, FaUserCircle } from 'react-icons/fa';
import { getCurrentUser } from '../../api/api';
import authConfig from '../../config/authConfig';
import { updateAuthenticatedUserAvatar, uploadAuthenticatedUserAvatar } from '../../features/auth/authService';
import { updateAccountProfile } from '../../features/profile/profileService';
import { getStoredProfileAvatar, saveStoredProfileAvatar } from '../../features/profile/profileUtils';

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
  const [activeTab, setActiveTab] = useState('overview');

  const displayName = currentUser.fullName || currentUser.name || currentUser.username || t('user.name');
  const profileRows = [
    [t('admin.profile.fullName'), displayName],
    ['Email', currentUser.email || '-'],
    [t('admin.profile.role'), currentUser.role || '-'],
  ];

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
    setAvatarError('');
    setAvatarSaved(false);
    setSavingProfile(true);

    try {
      let savedAvatarUrl = avatarUrl;

      if (avatarFile) {
        const avatarResponse = await uploadAuthenticatedUserAvatar(avatarFile);
        savedAvatarUrl = avatarResponse.data?.avatarUrl || '';
      } else if (avatarMarkedForRemoval) {
        const avatarResponse = await updateAuthenticatedUserAvatar('');
        savedAvatarUrl = avatarResponse.data?.avatarUrl || '';
      }

      const response = await updateAccountProfile({ fullName: (draftUser.fullName || draftUser.name || '').trim() });
      const updatedUser = updateStoredAccount({ ...response.data, avatarUrl: savedAvatarUrl });

      setCurrentUser(updatedUser);
      setDraftUser(updatedUser);
      applyAvatar(savedAvatarUrl);
      setAvatarSaved(Boolean(avatarFile || avatarMarkedForRemoval));
      setSaved(true);
      window.dispatchEvent(new CustomEvent('admin:profile-updated', { detail: updatedUser }));
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Không thể lưu hồ sơ admin.');
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

      {activeTab === 'overview' && (
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

      {activeTab === 'edit' && (
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
                  {avatarError && <Alert variant="danger" className="py-2 mb-0">{avatarError}</Alert>}
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
                    <Form.Control name="fullName" value={draftUser.fullName || draftUser.name || ''} onChange={handleChange} />
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
                {profileError && (
                  <Col xs={12}>
                    <Alert variant="danger" className="mb-0">{profileError}</Alert>
                  </Col>
                )}
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
