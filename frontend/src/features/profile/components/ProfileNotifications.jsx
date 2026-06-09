import { Alert, Card, Col, Form, Row } from 'react-bootstrap';
import { notificationFields } from '../profileUtils';

function ProfileNotifications({ onChange, settings, t }) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <Card.Title className="fw-bold mb-3">{t('profilePage.notificationSettings')}</Card.Title>
        <Row className="g-3">
          {notificationFields.map(([name, labelKey]) => (
            <Col md={6} key={name}>
              <Form.Check
                type="switch"
                id={`notification-${name}`}
                name={name}
                label={t(labelKey)}
                checked={settings[name]}
                onChange={onChange}
              />
            </Col>
          ))}
        </Row>
        <Alert variant="light" className="border mt-4 mb-0">{t('profilePage.notifications.localOnly')}</Alert>
      </Card.Body>
    </Card>
  );
}

export default ProfileNotifications;
