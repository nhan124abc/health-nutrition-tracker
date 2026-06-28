import { Button, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { mealTypes } from '../mealUtils';
import { getLocalizedName } from '../../../utils/localizedName';

function MealFormModal({
  editingMealId,
  foodSelection,
  foods,
  form,
  loadingFoods,
  onAddFood,
  onChange,
  onClose,
  onFoodSelectionChange,
  onRemoveFood,
  onSave,
  savingMeal,
  show,
  t,
}) {
  const { i18n } = useTranslation();
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
          <Col md={6}>
            <Form.Group>
              <Form.Label>{t('foodDiaryPage.fields.food')}</Form.Label>
              <Form.Select
                name="foodId"
                value={foodSelection.foodId}
                onChange={onFoodSelectionChange}
                disabled={loadingFoods}
              >
                <option value="">
                  {loadingFoods
                    ? t('foodDiaryPage.loadingFoods')
                    : t('foodDiaryPage.selectFood')}
                </option>
                {foods.map((food) => (
                  <option value={food.id} key={food.id}>
                    {getLocalizedName(food, i18n.language)}
                    {food.brand ? ` - ${food.brand}` : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>{t('foodDiaryPage.fields.servingSize')}</Form.Label>
              <Form.Control
                min="1"
                name="serving"
                type="number"
                value={foodSelection.serving}
                onChange={onFoodSelectionChange}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>{t('common.quantity')}</Form.Label>
              <Form.Control
                min="0.1"
                name="quantity"
                step="0.1"
                type="number"
                value={foodSelection.quantity}
                onChange={onFoodSelectionChange}
              />
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Button
              variant="outline-success"
              onClick={onAddFood}
              disabled={!foodSelection.foodId || loadingFoods}
            >
              {t('foodDiaryPage.addFood')}
            </Button>
          </Col>
          <Col xs={12}>
            <div className="table-responsive">
              <Table hover className="align-middle meal-food-table mb-0">
                <thead>
                  <tr>
                    <th>{t('common.food')}</th>
                    <th>{t('common.serving')}</th>
                    <th>{t('common.quantityShort')}</th>
                    <th className="text-end">{t('common.calories')}</th>
                    <th className="text-end">{t('foodDiaryPage.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary py-4">
                        {t('foodDiaryPage.noFoodsSelected')}
                      </td>
                    </tr>
                  )}
                  {form.items.map((item, index) => (
                    <tr key={`${item.foodId}-${index}`}>
                      <td>
                        <strong>{getLocalizedName(item, i18n.language)}</strong>
                        {item.brand && <div className="small text-secondary">{item.brand}</div>}
                      </td>
                      <td>{item.serving}</td>
                      <td>{item.quantity}</td>
                      <td className="text-end">{Math.round(item.totalCalories)}</td>
                      <td className="text-end">
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => onRemoveFood(index)}
                        >
                          {t('foodDiaryPage.removeFood')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="success" onClick={onSave} disabled={savingMeal || form.items.length === 0}>
          {editingMealId ? t('foodDiaryPage.updateMeal') : t('foodDiaryPage.saveMeal')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default MealFormModal;
