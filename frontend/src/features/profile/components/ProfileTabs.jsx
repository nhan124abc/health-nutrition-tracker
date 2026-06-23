import { Card, Nav } from 'react-bootstrap';
import { FaEdit, FaIdCard } from 'react-icons/fa';

function ProfileTabs({ activeTab, onSelect, t }) {
  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body className="py-2">
        <Nav variant="pills" activeKey={activeTab} onSelect={(key) => onSelect(key || 'overview')} className="gap-2 profile-tab-nav">
          <Nav.Item><Nav.Link eventKey="overview"><FaIdCard className="me-2" />{t('profilePage.tabs.overview')}</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="edit"><FaEdit className="me-2" />{t('profilePage.tabs.edit')}</Nav.Link></Nav.Item>
        </Nav>
      </Card.Body>
    </Card>
  );
}

export default ProfileTabs;
