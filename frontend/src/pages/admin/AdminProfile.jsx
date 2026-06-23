import { useRef, useState } from 'react';
import { Button, Card, Col, Form, Modal, Nav, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaIdCard, FaTrash, FaUpload, FaUserCircle } from 'react-icons/fa';
import { getCurrentUser } from '../../api/api';
import authConfig from '../../config/authConfig';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_SIZE_MB = MAX_AVATAR_SIZE_BYTES / (1024 * 1024);

function AdminProfile() {
  const { t } = useTranslation();
  const avatarInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser() || {});
  const [draftUser, setDraftUser] = useState(() => getCurrentUser() || {});
  const [avatarDraftUrl, setAvatarDraftUrl] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const avatarPreviewUrl = avatarDraftUrl === null ? draftUser.avatarUrl : avatarDraftUrl;

  const profileRows = [
    [t('admin.profile.fullName'), currentUser.fullName || currentUser.name || currentUser.username || '-'],
    ['Email', currentUser.email || '-'],
    [t('admin.profile.role'), currentUser.role || '-'],
  ];
  const displayName = currentUser.fullName || currentUser.name || currentUser.username || t('user.name');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraftUser((current) => ({ ...current, [name]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    setAvatarError('');

    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    const hasAllowedExtension = fileName.endsWith('.jpg') || fileName.endsWith('.png');
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

    const reader = new FileReader();
    reader.onload = () => setAvatarDraftUrl(reader.result || '');
    reader.onerror = () => setAvatarError(t('profilePage.avatar.readError'));
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = () => {
    setAvatarError('');
    setAvatarDraftUrl('');

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const updatedUser = {
      ...currentUser,
      ...draftUser,
      name: draftUser.fullName || draftUser.name || '',
      avatarUrl: avatarDraftUrl === null ? draftUser.avatarUrl : avatarDraftUrl,
    };

    localStorage.setItem(authConfig.userKey, JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setDraftUser(updatedUser);
    setAvatarDraftUrl(null);
    setSaved(true);
    window.dispatchEvent(new CustomEvent('admin:profile-updated', { detail: updatedUser }));
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
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={t('admin.profile.title')} />
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
                  <div className="profile-avatar-preview">
                    {avatarPreviewUrl ? (
                      <img src={avatarPreviewUrl} alt={t('profilePage.avatar.previewAlt')} />
                    ) : (
                      <FaUserCircle />
                    )}
                  </div>
                  <div className="profile-avatar-controls">
                    <div>
                      <div className="fw-bold">{t('profilePage.avatar.title')}</div>
                      <div className="text-secondary small">
                        {t('profilePage.avatar.help', { size: MAX_AVATAR_SIZE_MB })}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <Button as="label" htmlFor="admin-avatar-input" variant="outline-success">
                        <FaUpload className="me-2" />
                        {avatarPreviewUrl ? t('profilePage.avatar.update') : t('profilePage.avatar.add')}
                      </Button>
                      {avatarPreviewUrl && (
                        <Button type="button" variant="outline-secondary" onClick={handleAvatarRemove}>
                          <FaTrash className="me-2" />
                          {t('profilePage.avatar.remove')}
                        </Button>
                      )}
                    </div>
                    <Form.Control
                      ref={avatarInputRef}
                      id="admin-avatar-input"
                      className="visually-hidden"
                      type="file"
                      accept=".jpg,.png,image/jpeg,image/png"
                      onChange={handleAvatarChange}
                    />
                    {avatarError && <div className="text-danger small">{avatarError}</div>}
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
                      <Form.Control type="email" name="email" value={draftUser.email || ''} onChange={handleChange} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>{t('admin.profile.role')}</Form.Label>
                      <Form.Control value={draftUser.role || ''} disabled readOnly />
                    </Form.Group>
                  </Col>
                  <Col xs={12} className="d-flex justify-content-end">
                    <Button variant="success" type="submit">
                      {t('common.save')}
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
