import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { activityFields } from '../activityUtils';

function ActivityFormModal({
  activityTypes,
  editingLogId,
  estimatedCalories,
  form,
  onChange,
  onClose,
  onSave,
  saving,
  show,
  t,
}) {
  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {editingLogId ? t('activityPage.updateLogTitle') : t('activityPage.newLogTitle')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label>{t('activityPage.fields.activityType')}</Form.Label>
              <Form.Select name="typeId" value={form.typeId} onChange={onChange} disabled={saving}>
                <option value="">{t('activityPage.selectType')}</option>
                {activityTypes.map((type) => (
                  <option value={type.id} key={type.id}>{type.nameVi || type.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          {activityFields.map(([name, labelKey, type]) => (
            <Col md={4} key={name}>
              <Form.Group>
                <Form.Label>{t(labelKey)}</Form.Label>
                <Form.Control type={type} name={name} value={form[name]} onChange={onChange} disabled={saving} />
              </Form.Group>
            </Col>
          ))}
        </Row>
        <div className="planner-modal-calories mt-3">
          {t('activityPage.estimatedCalories')}: <strong>{estimatedCalories} kcal</strong>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button variant="success" onClick={onSave} disabled={saving}>
          {saving
            ? t('activityPage.saving')
            : t(editingLogId ? 'activityPage.updateActivity' : 'activityPage.saveActivity')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ActivityFormModal;
