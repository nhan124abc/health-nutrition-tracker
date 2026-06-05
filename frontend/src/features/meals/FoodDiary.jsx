import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, ProgressBar, Row, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBell, FaEdit, FaHistory, FaPlus, FaTint, FaTrash, FaUtensils } from 'react-icons/fa';
import { getProfile, updateProfile } from '../profile/profileService';
import { createMeal, deleteMealById, getMealById, getMealsByDate, updateMeal } from './mealService';


const mealTypes = [
  { key: 'breakfast', labelKey: 'foodDiaryPage.mealTypes.breakfast' },
  { key: 'lunch', labelKey: 'foodDiaryPage.mealTypes.lunch' },
  { key: 'dinner', labelKey: 'foodDiaryPage.mealTypes.dinner' },
  { key: 'morning_snack', labelKey: 'foodDiaryPage.mealTypes.morning_snack' },
  { key: 'afternoon_snack', labelKey: 'foodDiaryPage.mealTypes.afternoon_snack' },
  { key: 'evening_snack', labelKey: 'foodDiaryPage.mealTypes.evening_snack' },
];

const defaultWaterSettings = {
  goalMl: 2000,
  reminderEnabled: true,
  reminderIntervalMinutes: 90,
};
const quickWaterAmounts = [150, 250, 500, 750];

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
};

const mealTypeFromApi = {
  BREAKFAST: 'breakfast',
  MORNING_SNACK: 'morning_snack',
  LUNCH: 'lunch',
  AFTERNOON_SNACK: 'afternoon_snack',
  DINNER: 'dinner',
  EVENING_SNACK: 'evening_snack',
};

const mealTypeToApi = {
  breakfast: 'BREAKFAST',
  morning_snack: 'MORNING_SNACK',
  lunch: 'LUNCH',
  afternoon_snack: 'AFTERNOON_SNACK',
  dinner: 'DINNER',
  evening_snack: 'EVENING_SNACK',
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

function extractMealFromApi(data) {
  return data?.data || data?.meal || data;
}

function normalizeMealItemFromApi(item = {}) {
  const servingSize = item.serving || item.servingSize || item.servingSizeG || item.portion;

  return {
    id: item.id || item.foodId || `I${Date.now()}-${Math.random()}`,
    name: item.name || item.foodName || item.itemName || '',
    serving: typeof servingSize === 'number' ? `${servingSize}g` : servingSize || '100g',
    quantity: normalizeNumber(item.quantity || 1),
    totalWeight: normalizeNumber(item.totalWeightG),
    calories: normalizeNumber(item.calories || item.caloriesKcal),
    protein: normalizeNumber(item.protein || item.proteinG || item.proteinGrams),
    carbs: normalizeNumber(item.carbs || item.carbsG || item.carbohydrates || item.carbsGrams),
    fat: normalizeNumber(item.fat || item.fatG || item.fatGrams),
    fiber: normalizeNumber(item.fiber || item.fiberG || item.fiberGrams),
    sodium: normalizeNumber(item.sodium || item.sodiumMg),
  };
}

function normalizeMealFromApi(meal = {}) {
  const items = meal.items || meal.foodItems || meal.mealItems || [];
  const normalizedItems = items.map(normalizeMealItemFromApi);

  return {
    id: meal.id || meal.mealId,
    type: mealTypeFromApi[meal.mealType] || meal.type || 'breakfast',
    date: normalizeDate(meal.date || meal.mealDate || meal.createdAt),
    time: meal.time || meal.mealTime || '',
    notes: meal.notes || '',
    notesKey: '',
    totals: {
      calories: normalizeNumber(meal.totalCalories),
      protein: normalizeNumber(meal.totalProteinG),
      carbs: normalizeNumber(meal.totalCarbsG),
      fat: normalizeNumber(meal.totalFatG),
      fiber: normalizeNumber(meal.totalFiberG),
    },
    items: normalizedItems,
  };
}

function getMealTotals(meal) {
  const itemTotals = meal.items.reduce(
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

  return {
    calories: meal.totals?.calories || itemTotals.calories,
    protein: meal.totals?.protein || itemTotals.protein,
    carbs: meal.totals?.carbs || itemTotals.carbs,
    fat: meal.totals?.fat || itemTotals.fat,
    fiber: meal.totals?.fiber || itemTotals.fiber,
    sodium: itemTotals.sodium,
  };
}

function parseServingG(value) {
  const parsed = Number(String(value).replace(/[^\d.]/g, ''));
  return parsed || 100;
}

function mapMealToApi(form) {
  return {
    mealType: mealTypeToApi[form.type] || form.type,
    mealDate: form.date,
    mealTime: form.time || null,
    notes: form.notes,
    items: [
      {
        itemType: 'FOOD',
        foodName: form.itemName,
        servingSizeG: parseServingG(form.serving),
        quantity: Number(form.quantity) || 1,
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
        sodiumMg: 0,
      },
    ],
  };
}

function buildMealFallback(id, form) {
  return {
    id,
    ...mapMealToApi(form),
  };
}

function mapMealToForm(meal) {
  const firstItem = meal.items?.[0] || {};

  return {
    type: meal.type || emptyMeal.type,
    date: meal.date || '',
    time: meal.time || '',
    notes: meal.notes || '',
    itemName: firstItem.name || '',
    serving: firstItem.serving || emptyMeal.serving,
    quantity: firstItem.quantity || emptyMeal.quantity,
  };
}

function FoodDiary() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [meals, setMeals] = useState([]);
  const [showMealModal, setShowMealModal] = useState(false);
  const [form, setForm] = useState(() => ({ ...emptyMeal, date: getTodayDate() }));
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [loadingMealDetail, setLoadingMealDetail] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [mealError, setMealError] = useState('');
  const [selectedMealDetail, setSelectedMealDetail] = useState(null);
  const [editingMealId, setEditingMealId] = useState(null);
  const [waterLogs] = useState([]);
  const [waterSettings, setWaterSettings] = useState(defaultWaterSettings);
  const [waterAmount, setWaterAmount] = useState(250);
  const [waterGoalInput, setWaterGoalInput] = useState(defaultWaterSettings.goalMl);
  const [waterDraftAmounts, setWaterDraftAmounts] = useState({});
  const [waterReminderMessage, setWaterReminderMessage] = useState('');
  const [waterError, setWaterError] = useState('');

  const dayMeals = meals.filter((meal) => meal.date === selectedDate);
  const dayWaterLogs = waterLogs.filter((log) => log.date === selectedDate);
  const totalWaterMl = dayWaterLogs.reduce((sum, log) => sum + normalizeNumber(log.amountMl), 0);
  const waterProgress = Math.min((totalWaterMl / Math.max(waterSettings.goalMl, 1)) * 100, 100);
  const lastWaterLog = dayWaterLogs
    .slice()
    .sort((first, second) => new Date(second.loggedAt) - new Date(first.loggedAt))[0];

  const totals = useMemo(() => {
    return dayMeals.map(getMealTotals).reduce(
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

  const openMealDetail = async (meal) => {
    setMealError('');
    setSelectedMealDetail(meal);
    setLoadingMealDetail(true);

    try {
      const response = await getMealById(meal.id);
      setSelectedMealDetail(normalizeMealFromApi(extractMealFromApi(response.data)));
    } catch (error) {
      console.error('[FoodDiary] Error fetching meal detail:', error);
      setMealError(error.response?.data?.message || 'Could not load meal detail.');
    } finally {
      setLoadingMealDetail(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openMealModal = () => {
    setEditingMealId(null);
    setForm((current) => ({ ...current, date: selectedDate }));
    setShowMealModal(true);
  };

  const openEditMealModal = (meal) => {
    setMealError('');
    setEditingMealId(meal.id);
    setForm(mapMealToForm(meal));
    setShowMealModal(true);
  };

  const closeMealModal = () => {
    setShowMealModal(false);
    setEditingMealId(null);
    setForm({ ...emptyMeal, date: selectedDate });
  };

  const addMeal = async () => {
    if (savingMeal) {
      return;
    }

    setMealError('');
    setSavingMeal(true);

    try {
      const response = await createMeal(mapMealToApi(form));
      const createdMeal = normalizeMealFromApi(extractMealFromApi(response.data));

      setMeals((current) => {
        if (createdMeal.id && current.some((meal) => meal.id === createdMeal.id)) {
          return current;
        }

        return [...current, createdMeal];
      });
      setShowMealModal(false);
      setForm({ ...emptyMeal, date: selectedDate });
    } catch (error) {
      console.error('[FoodDiary] Error creating meal:', error);
      setMealError(error.response?.data?.message || 'Could not create meal.');
    } finally {
      setSavingMeal(false);
    }
  };

  const saveMeal = async () => {
    if (!editingMealId) {
      await addMeal();
      return;
    }

    if (!window.confirm(t('foodDiaryPage.confirmUpdateMeal'))) {
      return;
    }

    setMealError('');
    setSavingMeal(true);

    try {
      const payload = mapMealToApi(form);
      const response = await updateMeal(editingMealId, payload);
      const updatedMeal = normalizeMealFromApi(extractMealFromApi(response.data) || buildMealFallback(editingMealId, form));

      setMeals((current) => current.map((meal) => (meal.id === editingMealId ? updatedMeal : meal)));
      setSelectedMealDetail((current) => (current?.id === editingMealId ? updatedMeal : current));
      setShowMealModal(false);
      setEditingMealId(null);
      setForm({ ...emptyMeal, date: selectedDate });
    } catch (error) {
      console.error('[FoodDiary] Error updating meal:', error);
      setMealError(error.response?.data?.message || 'Could not update meal.');
    } finally {
      setSavingMeal(false);
    }
  };

  const removeMeal = async (mealId) => {
    if (!window.confirm(t('foodDiaryPage.confirmDeleteMeal'))) {
      return;
    }

    setMealError('');

    try {
      await deleteMealById(mealId);
      setMeals((current) => current.filter((meal) => meal.id !== mealId));
      setSelectedMealDetail((current) => (current?.id === mealId ? null : current));
    } catch (error) {
      console.error('[FoodDiary] Error deleting meal:', error);
      setMealError(error.response?.data?.message || 'Could not delete meal.');
    }
  };

  const addWaterLog = (amount = waterAmount) => {
    const normalizedAmount = Number(amount) || 0;

    if (normalizedAmount <= 0) {
      setWaterError(t('foodDiaryPage.water.invalidAmount'));
      return;
    }

    setWaterError(t('foodDiaryPage.water.backendUnavailable'));
  };

  const updateWaterLogAmount = (logId, amount) => {
    const normalizedAmount = Number(amount) || 0;

    if (normalizedAmount <= 0) {
      setWaterError(t('foodDiaryPage.water.invalidAmount'));
      return;
    }

    if (!window.confirm(t('foodDiaryPage.water.confirmUpdateLog'))) {
      return;
    }

    setWaterError(t('foodDiaryPage.water.backendUnavailable'));
  };

  const removeWaterLog = (logId) => {
    if (!window.confirm(t('foodDiaryPage.water.confirmDeleteLog'))) {
      return;
    }

    setWaterError(t('foodDiaryPage.water.backendUnavailable'));
  };

  const saveWaterGoal = async () => {
    const goalMl = Number(waterGoalInput) || 0;

    if (goalMl < 100 || goalMl > 10000) {
      setWaterError(t('foodDiaryPage.water.invalidGoal'));
      return;
    }

    setWaterError('');

    try {
      await updateProfile({ dailyWaterGoalMl: goalMl });
      setWaterSettings((current) => ({ ...current, goalMl }));
    } catch (error) {
      console.error('[FoodDiary] Error saving water goal:', error);
      setWaterError(error.response?.data?.message || t('foodDiaryPage.water.goalSaveError'));
    }
  };

  const updateWaterReminderSetting = (name, value) => {
    const nextSettings = { ...waterSettings, [name]: value };
    setWaterSettings(nextSettings);
  };

  const fieldLabels = [
    ['itemName', 'foodDiaryPage.fields.itemName'],
    ['serving', 'common.serving'],
    ['quantity', 'common.quantity'],
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

  useEffect(() => {
    let isMounted = true;

    async function fetchWaterGoal() {
      try {
        const response = await getProfile();
        const goalMl = normalizeNumber(response.data?.dailyWaterGoalMl);

        if (isMounted && goalMl > 0) {
          const nextSettings = { ...defaultWaterSettings, goalMl };
          setWaterSettings(nextSettings);
          setWaterGoalInput(goalMl);
        }
      } catch (error) {
        console.error('[FoodDiary] Error loading water goal:', error);
      }
    }

    fetchWaterGoal();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!waterSettings.reminderEnabled) {
      setWaterReminderMessage('');
      return undefined;
    }

    const updateReminder = () => {
      if (selectedDate !== getTodayDate()) {
        setWaterReminderMessage('');
        return;
      }

      if (totalWaterMl >= waterSettings.goalMl) {
        setWaterReminderMessage(t('foodDiaryPage.water.goalReached'));
        return;
      }

      if (!lastWaterLog) {
        setWaterReminderMessage(t('foodDiaryPage.water.reminderStart'));
        return;
      }

      const elapsedMinutes = Math.floor((Date.now() - new Date(lastWaterLog.loggedAt).getTime()) / 60000);

      if (elapsedMinutes >= waterSettings.reminderIntervalMinutes) {
        setWaterReminderMessage(t('foodDiaryPage.water.reminderDue', { minutes: elapsedMinutes }));
      } else {
        setWaterReminderMessage('');
      }
    };

    updateReminder();
    const timerId = window.setInterval(updateReminder, 60000);

    return () => window.clearInterval(timerId);
  }, [lastWaterLog, selectedDate, t, totalWaterMl, waterSettings]);
  
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
          {loadingMeals && <div className="alert alert-light border"> {t('foodDiaryPage.loadingMeals')}</div>}
          <div className="meal-card-stack">
            {!loadingMeals && dayMeals.length === 0 && (
              <Card className="border-0 shadow-sm meal-planner-card">
                <Card.Body className="text-secondary">
                  {t('foodDiaryPage.notFound')}
                </Card.Body>
              </Card>
            )}
            {dayMeals.map((meal) => {
              const type = mealTypes.find((item) => item.key === meal.type);
              const label = type ? t(type.labelKey) : meal.type;
              const mealTotals = getMealTotals(meal);
              const notes = meal.notes || (meal.notesKey ? t(meal.notesKey) : '');

              return (
                <Card className="border-0 shadow-sm meal-planner-card meal-summary-card" key={meal.id} role="button" tabIndex={0} onClick={() => openMealDetail(meal)} onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openMealDetail(meal);
                  }
                }}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="meal-icon"><FaUtensils /></span>
                        <div>
                          <Card.Title className="h5 fw-bold mb-0">{label} - {meal.time}</Card.Title>
                          <Card.Text className="text-secondary small mb-0">{notes || t('common.noNotes')}</Card.Text>
                        </div>
                      </div>
                      <div className="text-end">
                        <Badge bg="light" text="dark">{mealTotals.calories} kcal</Badge>
                        <div className="text-secondary small mt-1">{meal.items.length} {t('foodDiary.items')}</div>
                        <Button className="ms-2 mt-2" variant="outline-success" size="sm" onClick={(event) => {
                          event.stopPropagation();
                          openEditMealModal(meal);
                          }} aria-label={t('foodDiaryPage.updateMeal')}>
                          <FaEdit />
                        </Button>
                        <Button className="ms-2 mt-2" variant="outline-danger" size="sm" onClick={(event) => {
                          event.stopPropagation();
                          removeMeal(meal.id);
                          }} aria-label={t('foodDiaryPage.deleteMeal')}>
                          <FaTrash />
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        </Col>

        <Col lg={4}>
          <div className="planner-side-stack">
            <Card className="border-0 shadow-sm planner-side-card">
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

            <Card className="border-0 shadow-sm planner-side-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="water-glass"><FaTint /></span>
                  <div>
                    <Card.Title className="fw-bold mb-0">{t('foodDiaryPage.water.title')}</Card.Title>
                    <Card.Text className="text-secondary small mb-0">
                      {t('foodDiaryPage.water.totalToday', { total: totalWaterMl, goal: waterSettings.goalMl })}
                    </Card.Text>
                  </div>
                </div>
                <Badge bg={waterProgress >= 100 ? 'success' : 'info'}>{Math.round(waterProgress)}%</Badge>
              </div>

              <ProgressBar now={waterProgress} className="mb-3" />

              {waterError && <div className="alert alert-warning py-2">{waterError}</div>}
              {waterReminderMessage && (
                <div className="alert alert-info py-2 d-flex align-items-center gap-2">
                  <FaBell />
                  <span>{waterReminderMessage}</span>
                </div>
              )}

              <Form.Group className="mb-3">
                <Form.Label>{t('foodDiaryPage.water.goal')}</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="number"
                    min="100"
                    max="10000"
                    step="50"
                    value={waterGoalInput}
                    onChange={(event) => setWaterGoalInput(event.target.value)}
                  />
                  <Button variant="outline-success" onClick={saveWaterGoal}>{t('common.save')}</Button>
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('foodDiaryPage.water.addAmount')}</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="number"
                    min="1"
                    step="50"
                    value={waterAmount}
                    onChange={(event) => setWaterAmount(event.target.value)}
                  />
                  <Button variant="info" className="text-white" onClick={() => addWaterLog()}>
                    <FaPlus className="me-2" />
                    {t('foodDiaryPage.water.addLog')}
                  </Button>
                </div>
              </Form.Group>

              <div className="d-flex flex-wrap gap-2 mb-3">
                {quickWaterAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline-info"
                    size="sm"
                    onClick={() => addWaterLog(amount)}
                  >
                    +{amount} ml
                  </Button>
                ))}
              </div>

              <div className="border-top pt-3 mb-3">
                <Form.Check
                  type="switch"
                  id="water-reminder-enabled"
                  label={t('foodDiaryPage.water.reminderEnabled')}
                  checked={waterSettings.reminderEnabled}
                  onChange={(event) => updateWaterReminderSetting('reminderEnabled', event.target.checked)}
                />
                <Form.Group className="mt-2">
                  <Form.Label>{t('foodDiaryPage.water.reminderInterval')}</Form.Label>
                  <Form.Control
                    type="number"
                    min="15"
                    step="15"
                    value={waterSettings.reminderIntervalMinutes}
                    onChange={(event) => updateWaterReminderSetting('reminderIntervalMinutes', Number(event.target.value) || 60)}
                    disabled={!waterSettings.reminderEnabled}
                  />
                </Form.Group>
              </div>

              <div className="d-flex align-items-center gap-2 mb-2">
                <FaHistory className="text-secondary" />
                <h3 className="h6 fw-bold mb-0">{t('foodDiaryPage.water.history')}</h3>
              </div>

              {dayWaterLogs.length === 0 ? (
                <p className="text-secondary small mb-0">{t('foodDiaryPage.water.noHistory')}</p>
              ) : (
                <div className="table-responsive">
                  <Table size="sm" className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>{t('foodDiaryPage.water.time')}</th>
                        <th className="text-end">{t('foodDiaryPage.water.amount')}</th>
                        <th className="text-end">{t('admin.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayWaterLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{String(log.loggedAt).slice(11, 16)}</td>
                          <td className="text-end">
                            <Form.Control
                              type="number"
                              min="1"
                              size="sm"
                              className="text-end"
                              value={waterDraftAmounts[log.id] ?? log.amountMl}
                              onChange={(event) => {
                                const { value } = event.target;
                                setWaterDraftAmounts((current) => ({ ...current, [log.id]: value }));
                              }}
                            />
                          </td>
                          <td className="text-end">
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => updateWaterLogAmount(log.id, waterDraftAmounts[log.id] ?? log.amountMl)}
                              aria-label={t('foodDiaryPage.water.updateLog')}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeWaterLog(log.id)}
                              aria-label={t('foodDiaryPage.water.deleteLog')}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
            </Card>
          </div>
        </Col>
      </Row>

      <Modal show={showMealModal} onHide={closeMealModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingMealId ? t('foodDiaryPage.updateMealTitle') : t('foodDiaryPage.newMealTitle')}</Modal.Title>
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
          <Button variant="outline-secondary" onClick={closeMealModal}>{t('common.cancel')}</Button>
          <Button variant="success" onClick={saveMeal} disabled={savingMeal}>
            {editingMealId ? t('foodDiaryPage.updateMeal') : t('foodDiaryPage.saveMeal')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(selectedMealDetail)} onHide={() => setSelectedMealDetail(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedMealDetail && (() => {
              const type = mealTypes.find((item) => item.key === selectedMealDetail.type);
              const label = type ? t(type.labelKey) : selectedMealDetail.type;
              return `${label} - ${selectedMealDetail.time || selectedMealDetail.date}`;
            })()}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingMealDetail && <div className="alert alert-light border">Loading meal detail...</div>}
          {selectedMealDetail && (() => {
            const detailTotals = getMealTotals(selectedMealDetail);
            const notes = selectedMealDetail.notes || (selectedMealDetail.notesKey ? t(selectedMealDetail.notesKey) : '');

            return (
              <>
                <p className="text-secondary mb-3">{notes || t('common.noNotes')}</p>
                <div className="nutrition-detail-grid mb-4">
                  <div><span>{t('common.calories')}</span><strong>{detailTotals.calories} kcal</strong></div>
                  <div><span>{t('common.protein')}</span><strong>{detailTotals.protein}g</strong></div>
                  <div><span>{t('common.carbs')}</span><strong>{detailTotals.carbs}g</strong></div>
                  <div><span>{t('common.fat')}</span><strong>{detailTotals.fat}g</strong></div>
                  <div><span>{t('common.fiber')}</span><strong>{detailTotals.fiber}g</strong></div>
                  <div><span>{t('common.sodium')}</span><strong>{detailTotals.sodium}mg</strong></div>
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
                      {selectedMealDetail.items.map((item) => (
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
              </>
            );
          })()}
        </Modal.Body>
      </Modal>
    </>
  );
}

export default FoodDiary;
