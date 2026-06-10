import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { basicFoodFields } from '../nutritionUtils';

function FoodFormModal({ categories, editingFoodId, food, onChange, onClose, onSave, saving, show, t }) {
  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {editingFoodId ? t('nutritionPage.updateFoodTitle') : t('nutritionPage.newFoodTitle')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3">
          {basicFoodFields.map(([name, labelKey]) => (
            <Col md={6} key={name}>
              <Form.Group>
                <Form.Label>{t(labelKey)}</Form.Label>
                <Form.Control
                  name={name}
                  value={food[name]}
                  onChange={onChange}
                  disabled={saving}
                  required={name === 'name' || name === 'servingSize'}
                />
              </Form.Group>
            </Col>
          ))}
          <Col md={6}>
            <Form.Group>
              <Form.Label>{t('common.category')}</Form.Label>
              <Form.Select name="categoryId" value={food.categoryId} onChange={onChange} disabled={saving}>
                <option value="">{t('nutritionPage.selectCategory')}</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.nameVi || category.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button variant="success" onClick={onSave} disabled={saving}>
          {saving
            ? t('nutritionPage.saving')
            : t(editingFoodId ? 'nutritionPage.updateFood' : 'nutritionPage.savePending')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default FoodFormModal;
