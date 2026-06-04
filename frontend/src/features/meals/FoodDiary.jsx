import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, ProgressBar, Row, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash, FaUtensils } from 'react-icons/fa';
import { createMeal, deleteMealById, getMealsByDate } from './mealService';
const mealTypes = [
  { key: 'breakfast', labelKey: 'foodDiaryPage.mealTypes.breakfast' },
  { key: 'lunch', labelKey: 'foodDiaryPage.mealTypes.lunch' },
  { key: 'dinner', labelKey: 'foodDiaryPage.mealTypes.dinner' },
  { key: 'snack', labelKey: 'foodDiaryPage.mealTypes.snack' },
];

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const emptyMeal = {
  type: 'breakfast',
  date: '',
  time: '',
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

const mealTypeFromApi = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack',
};

const mealTypeToApi = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
  snack: 'SNACK',
};

function normalizeNumber(value) {
  return Number(value) || 0;
}

function normalizeDate(value) {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
}

function extractMealsFromApi(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.data || data?.content || data?.items || data?.meals || [];
}

function normalizeMealItemFromApi(item = {}) {
  return {
    id: item.id || item.foodId || `I${Date.now()}-${Math.random()}`,
    name: item.name || item.foodName || item.itemName || '',
    serving: item.serving || item.servingSize || item.portion || '100g',
    quantity: normalizeNumber(item.quantity || 1),
    calories: normalizeNumber(item.calories || item.caloriesKcal),
    protein: normalizeNumber(item.protein || item.proteinGrams),
    carbs: normalizeNumber(item.carbs || item.carbohydrates || item.carbsGrams),
    fat: normalizeNumber(item.fat || item.fatGrams),
    fiber: normalizeNumber(item.fiber || item.fiberGrams),
    sodium: normalizeNumber(item.sodium || item.sodiumMg),
  };
}

function normalizeMealFromApi(meal = {}) {
  const items = meal.items || meal.foodItems || meal.mealItems || [];

  return {
    id: meal.id || meal.mealId,
    type: mealTypeFromApi[meal.mealType] || meal.type || 'breakfast',
    date: normalizeDate(meal.date || meal.mealDate || meal.createdAt),
    time: meal.time || meal.mealTime || '',
    notes: meal.notes || '',
    notesKey: '',
    items: items.map(normalizeMealItemFromApi),
  };
}

function mapMealToApi(form) {
  return {
    mealType: mealTypeToApi[form.type] || form.type,
    date: form.date,
    mealDate: form.date,
    time: form.time,
    mealTime: form.time,
    notes: form.notes,
    items: [
      {
        name: form.itemName,
        foodName: form.itemName,
        serving: form.serving,
        quantity: Number(form.quantity) || 1,
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        fiber: Number(form.fiber) || 0,
        sodium: Number(form.sodium) || 0,
      },
    ],
  };
}

function FoodDiary() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [meals, setMeals] = useState([]);
  const [showMealModal, setShowMealModal] = useState(false);
  const [form, setForm] = useState(() => ({ ...emptyMeal, date: getTodayDate() }));
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [mealError, setMealError] = useState('');

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

  const openMealModal = () => {
    setForm((current) => ({ ...current, date: selectedDate }));
    setShowMealModal(true);
  };

  const addMeal = async () => {
    setMealError('');

    try {
      const response = await createMeal(mapMealToApi(form));
      setMeals((current) => [...current, normalizeMealFromApi(response.data)]);
      setShowMealModal(false);
      setForm({ ...emptyMeal, date: selectedDate });
    } catch (error) {
      console.error('[FoodDiary] Error creating meal:', error);
      setMealError(error.response?.data?.message || 'Could not create meal.');
    }
  };

  const removeMeal = async (mealId) => {
    setMealError('');

    try {
      await deleteMealById(mealId);
      setMeals((current) => current.filter((meal) => meal.id !== mealId));
    } catch (error) {
      console.error('[FoodDiary] Error deleting meal:', error);
      setMealError(error.response?.data?.message || 'Could not delete meal.');
    }
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

  useEffect(() => {
    let isMounted = true;

    async function fetchMeals() {
      setLoadingMeals(true);
      setMealError('');

      try {
        const response = await getMealsByDate(selectedDate);
        const responseMeals = extractMealsFromApi(response.data);
        const normalizedMeals = responseMeals.map(normalizeMealFromApi);

        if (isMounted) {
          setMeals(normalizedMeals);
        }
      } catch (error) {
        console.error('[FoodDiary] Error fetching meals:', error);

        if (isMounted) {
          setMeals([]);
          setMealError(error.response?.data?.message || 'Could not load meals.');
        }
      } finally {
        if (isMounted) {
          setLoadingMeals(false);
        }
      }
    }

    fetchMeals();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);
  
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
          <Button variant="success" onClick={openMealModal}>
            <FaPlus className="me-2" />
            {t('foodDiaryPage.createMeal')}
          </Button>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          {mealError && <div className="alert alert-danger">{mealError}</div>}
          {loadingMeals && <div className="alert alert-light border">Loading meals...</div>}
          <div className="meal-card-stack">
            {!loadingMeals && dayMeals.length === 0 && (
              <Card className="border-0 shadow-sm meal-planner-card">
                <Card.Body className="text-secondary">
                  No meals found for this date.
                </Card.Body>
              </Card>
            )}
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
