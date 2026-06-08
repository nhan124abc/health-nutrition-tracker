import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { mealTypes } from '../mealUtils';

const fieldLabels = [
  ['itemName', 'foodDiaryPage.fields.itemName'],
  ['serving', 'common.serving'],
  ['quantity', 'common.quantity'],
];

function MealFormModal({ editingMealId, form, onChange, onClose, onSave, savingMeal, show, t }) {
  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{editingMealId ? t('foodDiaryPage.updateMealTitle') : t('foodDiaryPage.newMealTitle')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label>{t('foodDiaryPage.fields.mealType')}</Form.Label>
              <Form.Select name="type" value={form.type} onChange={onChange}>
                {mealTypes.map((type) => <option value={type.key} key={type.key}>{t(type.labelKey)}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>{t('foodDiaryPage.fields.mealDate')}</Form.Label>
              <Form.Control type="date" name="date" value={form.date} onChange={onChange} />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>{t('foodDiaryPage.fields.mealTime')}</Form.Label>
              <Form.Control type="time" name="time" value={form.time} onChange={onChange} />
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Form.Group>
              <Form.Label>{t('common.notes')}</Form.Label>
              <Form.Control name="notes" value={form.notes} onChange={onChange} />
            </Form.Group>
          </Col>
          {fieldLabels.map(([name, labelKey]) => (
            <Col md={4} key={name}>
              <Form.Group>
                <Form.Label>{t(labelKey)}</Form.Label>
                <Form.Control
                  type={['itemName', 'serving'].includes(name) ? 'text' : 'number'}
                  name={name}
                  value={form[name]}
                  onChange={onChange}
                />
              </Form.Group>
            </Col>
          ))}
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="success" onClick={onSave} disabled={savingMeal}>
          {editingMealId ? t('foodDiaryPage.updateMeal') : t('foodDiaryPage.saveMeal')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default MealFormModal;
