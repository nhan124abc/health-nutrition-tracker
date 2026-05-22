import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, ProgressBar, Row, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash, FaUtensils } from 'react-icons/fa';

const mealTypes = [
  { key: 'breakfast', labelKey: 'foodDiaryPage.mealTypes.breakfast' },
  { key: 'lunch', labelKey: 'foodDiaryPage.mealTypes.lunch' },
  { key: 'dinner', labelKey: 'foodDiaryPage.mealTypes.dinner' },
  { key: 'snack', labelKey: 'foodDiaryPage.mealTypes.snack' },
];

const initialMeals = [
  {
    id: 'M001',
    type: 'breakfast',
    date: '2026-05-21',
    time: '07:30',
    notesKey: 'foodDiaryPage.sampleNotes.lightBreakfast',
    items: [
      { id: 'I1', name: 'Greek yogurt', serving: '100g', quantity: 1, calories: 97, protein: 9, carbs: 4, fat: 5, fiber: 0, sodium: 36 },
      { id: 'I2', name: 'Banana', serving: '1 fruit', quantity: 1, calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3, sodium: 1 },
    ],
  },
  {
    id: 'M002',
    type: 'lunch',
    date: '2026-05-21',
    time: '12:15',
    notesKey: '',
    items: [
      { id: 'I3', name: 'Chicken breast', serving: '150g', quantity: 1, calories: 248, protein: 47, carbs: 0, fat: 6, fiber: 0, sodium: 111 },
      { id: 'I4', name: 'Brown rice', serving: '180g', quantity: 1, calories: 200, protein: 5, carbs: 41, fat: 2, fiber: 4, sodium: 9 },
    ],
  },
];

const emptyMeal = {
  type: 'breakfast',
  date: '2026-05-21',
  time: '18:30',
  notes: '',
  itemName: '',
  serving: '100g',
  quantity: 1,
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sodium: '',
};

function FoodDiary() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState('2026-05-21');
  const [meals, setMeals] = useState(initialMeals);
  const [showMealModal, setShowMealModal] = useState(false);
  const [form, setForm] = useState(emptyMeal);

  const dayMeals = meals.filter((meal) => meal.date === selectedDate);

  const totals = useMemo(() => {
    return dayMeals.flatMap((meal) => meal.items).reduce(
      (sum, item) => ({
        calories: sum.calories + item.calories,
        protein: sum.protein + item.protein,
        carbs: sum.carbs + item.carbs,
        fat: sum.fat + item.fat,
        fiber: sum.fiber + item.fiber,
        sodium: sum.sodium + item.sodium,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 }
    );
  }, [dayMeals]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const addMeal = () => {
    const item = {
      id: `I${Date.now()}`,
      name: form.itemName || t('foodDiaryPage.customFood'),
      serving: form.serving,
      quantity: Number(form.quantity),
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      fiber: Number(form.fiber) || 0,
      sodium: Number(form.sodium) || 0,
    };

    setMeals((current) => [
      ...current,
      {
        id: `M${Date.now()}`,
        type: form.type,
        date: form.date,
        time: form.time,
        notes: form.notes,
        notesKey: '',
        items: [item],
      },
    ]);
    setShowMealModal(false);
    setForm({ ...emptyMeal, date: selectedDate });
  };

  const removeMeal = (mealId) => {
    setMeals((current) => current.filter((meal) => meal.id !== mealId));
  };

  const fieldLabels = [
    ['itemName', 'foodDiaryPage.fields.itemName'],
    ['serving', 'common.serving'],
    ['quantity', 'common.quantity'],
    ['calories', 'common.calories'],
    ['protein', 'common.protein'],
    ['carbs', 'common.carbs'],
    ['fat', 'common.fat'],
    ['fiber', 'common.fiber'],
    ['sodium', 'common.sodium'],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('foodDiaryPage.badge')}</Badge>
          <h1>{t('foodDiaryPage.title')}</h1>
          <p>{t('foodDiaryPage.description')}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input className="form-control page-date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <Button variant="success" onClick={() => setShowMealModal(true)}>
            <FaPlus className="me-2" />
            {t('foodDiaryPage.createMeal')}
          </Button>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          <div className="meal-card-stack">
            {dayMeals.map((meal) => {
              const type = mealTypes.find((item) => item.key === meal.type);
              const label = type ? t(type.labelKey) : meal.type;
              const mealCalories = meal.items.reduce((sum, item) => sum + item.calories, 0);
              const notes = meal.notes || (meal.notesKey ? t(meal.notesKey) : '');

              return (
                <Card className="border-0 shadow-sm meal-planner-card" key={meal.id}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="meal-icon"><FaUtensils /></span>
                        <div>
                          <Card.Title className="h5 fw-bold mb-0">{label} - {meal.time}</Card.Title>
                          <Card.Text className="text-secondary small mb-0">{notes || t('common.noNotes')}</Card.Text>
                        </div>
                      </div>
                      <div className="text-end">
                        <Badge bg="light" text="dark">{mealCalories} kcal</Badge>
                        <Button className="ms-2" variant="outline-danger" size="sm" onClick={() => removeMeal(meal.id)} aria-label={t('foodDiaryPage.deleteMeal')}>
                          <FaTrash />
                        </Button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <Table size="sm" hover className="align-middle mb-0">
                        <thead>
                          <tr>
                            <th>{t('common.food')}</th>
                            <th>{t('common.serving')}</th>
                            <th className="text-end">{t('common.quantityShort')}</th>
                            <th className="text-end">{t('common.calories')}</th>
                            <th className="text-end">P/C/F</th>
                            <th className="text-end">{t('common.fiber')}</th>
                            <th className="text-end">{t('common.sodium')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meal.items.map((item) => (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td>{item.serving}</td>
                              <td className="text-end">{item.quantity}</td>
                              <td className="text-end">{item.calories}</td>
                              <td className="text-end">{item.protein}/{item.carbs}/{item.fat}g</td>
                              <td className="text-end">{item.fiber}g</td>
                              <td className="text-end">{item.sodium}mg</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm sticky-panel">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('foodDiaryPage.dailySummary')}</Card.Title>
              <div className="display-6 fw-bold">{totals.calories} kcal</div>
              <p className="text-secondary">{t('foodDiaryPage.mealsLogged', { count: dayMeals.length })}</p>
              <ProgressBar now={Math.min((totals.calories / 2000) * 100, 100)} className="mb-3" />
              <div className="nutrition-detail-grid">
                <div><span>{t('common.protein')}</span><strong>{totals.protein}g</strong></div>
                <div><span>{t('common.carbs')}</span><strong>{totals.carbs}g</strong></div>
                <div><span>{t('common.fat')}</span><strong>{totals.fat}g</strong></div>
                <div><span>{t('common.fiber')}</span><strong>{totals.fiber}g</strong></div>
                <div><span>{t('common.sodium')}</span><strong>{totals.sodium}mg</strong></div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showMealModal} onHide={() => setShowMealModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('foodDiaryPage.newMealTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('foodDiaryPage.fields.mealType')}</Form.Label>
                <Form.Select name="type" value={form.type} onChange={handleChange}>
                  {mealTypes.map((type) => <option value={type.key} key={type.key}>{t(type.labelKey)}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('foodDiaryPage.fields.mealDate')}</Form.Label>
                <Form.Control type="date" name="date" value={form.date} onChange={handleChange} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('foodDiaryPage.fields.mealTime')}</Form.Label>
                <Form.Control type="time" name="time" value={form.time} onChange={handleChange} />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label>{t('common.notes')}</Form.Label>
                <Form.Control name="notes" value={form.notes} onChange={handleChange} />
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
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowMealModal(false)}>{t('common.cancel')}</Button>
          <Button variant="success" onClick={addMeal}>{t('foodDiaryPage.saveMeal')}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default FoodDiary;
