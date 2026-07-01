import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { bodyMetricFields, bodyMetricResultFields } from '../profileUtils';

function BodyMetricFormCard({ form, onChange, onSubmit, saving, t }) {
  const hasCalculatedMetrics = bodyMetricResultFields.some(([name]) => form[name] !== '' && form[name] != null);

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
            {hasCalculatedMetrics && (
            <Col xs={12}>
              <div className="body-metric-result-panel">
                <div className="body-metric-result-header">
                  <span>{t('bodyMetricsPage.results.title')}</span>
                </div>
                <Row className="g-2">
                  {bodyMetricResultFields.map(([name, labelKey, type, unit]) => (
                    <Col sm={4} key={name}>
                      <Form.Group className="body-metric-result-tile">
                        <Form.Label>{t(labelKey)}</Form.Label>
                        <Form.Control
                          type={type}
                          name={name}
                          value={form[name]}
                          readOnly
                          disabled={saving}
                          min="0"
                          step="0.1"
                          placeholder="--"
                        />
                        <Form.Text>{unit}</Form.Text>
                      </Form.Group>
                    </Col>
                  ))}
                </Row>
              </div>
            </Col>
            )}
            <Col xs={12}>
              <div className="d-flex flex-wrap gap-2">
                <Button type="submit" variant="success" disabled={saving}>
                  {saving ? t('bodyMetricsPage.saving') : t('bodyMetricsPage.saveMetric')}
                </Button>
              </div>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default BodyMetricFormCard;
