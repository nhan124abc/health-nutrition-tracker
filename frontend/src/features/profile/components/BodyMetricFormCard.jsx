import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { bodyMetricFields } from '../profileUtils';

function BodyMetricFormCard({ form, onChange, onSubmit, saving, t }) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <Card.Title className="fw-bold mb-3">{t('bodyMetricsPage.addTitle')}</Card.Title>
        <Form onSubmit={onSubmit}>
          <Row className="g-3">
            {bodyMetricFields.map(([name, labelKey, type]) => (
              <Col md={name === 'notes' ? 12 : 6} key={name}>
                <Form.Group>
                  <Form.Label>{t(labelKey)}</Form.Label>
                  <Form.Control
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={onChange}
                    disabled={saving}
                    required={name === 'date'}
                  />
                </Form.Group>
              </Col>
            ))}
            <Col xs={12}>
              <Button type="submit" variant="success" disabled={saving}>
                {saving ? t('bodyMetricsPage.saving') : t('bodyMetricsPage.saveMetric')}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default BodyMetricFormCard;
