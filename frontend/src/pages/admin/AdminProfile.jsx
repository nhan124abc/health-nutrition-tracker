import { Badge, Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaUserCircle } from 'react-icons/fa';
import { getCurrentUser } from '../../api/api';

function AdminProfile() {
  const { t } = useTranslation();
  const currentUser = getCurrentUser() || {};

  const profileRows = [
    [t('profilePage.fields.username'), currentUser.username || currentUser.fullName || currentUser.name || '-'],
    ['Email', currentUser.email || '-'],
    [t('admin.profile.role'), currentUser.role || '-'],
  ];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('admin.profile.badge')}</Badge>
          <h2>{t('admin.profile.title')}</h2>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm admin-card">
            <Card.Body>
              <div className="admin-profile-heading">
                <div className="admin-profile-avatar">
                  <FaUserCircle />
                </div>
                <div>
                  <h3>{currentUser.username || currentUser.fullName || currentUser.name || t('user.name')}</h3>
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
        </Col>
      </Row>
    </>
  );
}

export default AdminProfile;
