import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  ListGroup,
  Modal,
  ProgressBar,
  Row,
  Table,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaChevronLeft,
  FaChevronRight,
  FaMinus,
  FaPen,
  FaPlus,
  FaRedo,
  FaRunning,
  FaTint,
  FaTrash,
  FaUtensils,
} from 'react-icons/fa';

const mealSections = [
  { key: 'breakfast', labelKey: 'planner.breakfast' },
  { key: 'lunch', labelKey: 'planner.lunch' },
  { key: 'dinner', labelKey: 'planner.dinner' },
  { key: 'snacks', labelKey: 'planner.snacks' },
];

const foodCatalog = [
  { id: 1, name: 'Oatmeal with banana', caloriesPer100g: 160, carbs: 27, fat: 3, protein: 6 },
  { id: 2, name: 'Chicken breast', caloriesPer100g: 165, carbs: 0, fat: 4, protein: 31 },
  { id: 3, name: 'Brown rice', caloriesPer100g: 111, carbs: 23, fat: 1, protein: 3 },
  { id: 4, name: 'Greek yogurt', caloriesPer100g: 97, carbs: 4, fat: 5, protein: 9 },
  { id: 5, name: 'Salmon', caloriesPer100g: 208, carbs: 0, fat: 13, protein: 20 },
  { id: 6, name: 'Boiled vegetables', caloriesPer100g: 35, carbs: 7, fat: 0, protein: 2 },
  { id: 7, name: 'Apple', caloriesPer100g: 52, carbs: 14, fat: 0, protein: 0 },
  { id: 8, name: 'Almonds', caloriesPer100g: 579, carbs: 22, fat: 50, protein: 21 },
];

const initialMeals = {
  breakfast: [
    createMealItem(foodCatalog[0], 180),
    createMealItem(foodCatalog[3], 120),
  ],
  lunch: [
    createMealItem(foodCatalog[1], 150),
    createMealItem(foodCatalog[2], 180),
  ],
  dinner: [
    createMealItem(foodCatalog[4], 160),
    createMealItem(foodCatalog[5], 220),
  ],
  snacks: [createMealItem(foodCatalog[6], 150)],
};

const regenerateMeals = {
  breakfast: [foodCatalog[3], foodCatalog[6], foodCatalog[7]],
  lunch: [foodCatalog[1], foodCatalog[2], foodCatalog[5]],
  dinner: [foodCatalog[4], foodCatalog[5], foodCatalog[2]],
  snacks: [foodCatalog[6], foodCatalog[7], foodCatalog[3]],
};

const macroGoals = {
  calories: 2000,
  carbs: 250,
  fat: 65,
  protein: 120,
};

const workouts = [
  { id: 1, name: 'Morning run', calories: 260 },
  { id: 2, name: 'Strength training', calories: 180 },
];

function createMealItem(food, grams) {
  return {
    id: `${food.id}-${Date.now()}-${Math.random()}`,
    foodId: food.id,
    name: food.name,
    grams,
    calories: Math.round((food.caloriesPer100g * grams) / 100),
    carbs: Math.round((food.carbs * grams) / 100),
    fat: Math.round((food.fat * grams) / 100),
    protein: Math.round((food.protein * grams) / 100),
  };
}

function FoodDiary() {
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meals, setMeals] = useState(initialMeals);
  const [waterMl, setWaterMl] = useState(1250);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [activeMealKey, setActiveMealKey] = useState('breakfast');
  const [editingItemId, setEditingItemId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState(foodCatalog[0].id);
  const [grams, setGrams] = useState(100);

  const selectedFood = foodCatalog.find((food) => food.id === Number(selectedFoodId));

  const filteredFoods = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) {
      return foodCatalog;
    }

    return foodCatalog.filter((food) => food.name.toLowerCase().includes(keyword));
  }, [searchTerm]);

  const nutritionTotals = useMemo(() => {
    const allItems = Object.values(meals).flat();

    return allItems.reduce(
      (totals, item) => ({
        calories: totals.calories + item.calories,
        carbs: totals.carbs + item.carbs,
        fat: totals.fat + item.fat,
        protein: totals.protein + item.protein,
      }),
      { calories: 0, carbs: 0, fat: 0, protein: 0 }
    );
  }, [meals]);

  const workoutCalories = workouts.reduce((total, workout) => total + workout.calories, 0);
  const waterGoal = 2500;
  const waterPercent = Math.min(Math.round((waterMl / waterGoal) * 100), 100);
  const modalCalories = selectedFood ? Math.round((selectedFood.caloriesPer100g * Number(grams || 0)) / 100) : 0;

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const formattedDate = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'vi-VN', {
    day: 'numeric',
    month: 'long',
  }).format(selectedDate);
  const dateTitle = isToday ? t('planner.todayDate', { date: formattedDate }) : formattedDate;

  const shiftDate = (days) => {
    setSelectedDate((current) => {
      const nextDate = new Date(current);
      nextDate.setDate(current.getDate() + days);
      return nextDate;
    });
  };

  const openAddFoodModal = (mealKey) => {
    setActiveMealKey(mealKey);
    setEditingItemId(null);
    setSearchTerm('');
    setSelectedFoodId(foodCatalog[0].id);
    setGrams(100);
    setShowFoodModal(true);
  };

  const openEditFoodModal = (mealKey, item) => {
    setActiveMealKey(mealKey);
    setEditingItemId(item.id);
    setSearchTerm(item.name);
    setSelectedFoodId(item.foodId);
    setGrams(item.grams);
    setShowFoodModal(true);
  };

  const handleSaveFood = () => {
    if (!selectedFood || Number(grams) <= 0) {
      return;
    }

    const nextItem = createMealItem(selectedFood, Number(grams));

    setMeals((current) => ({
      ...current,
      [activeMealKey]: editingItemId
        ? current[activeMealKey].map((item) => (item.id === editingItemId ? { ...nextItem, id: item.id } : item))
        : [...current[activeMealKey], nextItem],
    }));
    setShowFoodModal(false);
  };

  const handleRemoveFood = (mealKey, itemId) => {
    setMeals((current) => ({
      ...current,
      [mealKey]: current[mealKey].filter((item) => item.id !== itemId),
    }));
  };

  const handleRegenerateMeal = (mealKey) => {
    const nextFoods = regenerateMeals[mealKey];
    setMeals((current) => ({
      ...current,
      [mealKey]: nextFoods.map((food, index) => createMealItem(food, 120 + index * 40)),
    }));
  };

  const adjustWater = (amount) => {
    setWaterMl((current) => Math.max(0, Math.min(waterGoal, current + amount)));
  };

  const renderMealCard = (meal) => {
    const items = meals[meal.key];
    const mealCalories = items.reduce((total, item) => total + item.calories, 0);

    return (
      <Card className="meal-planner-card border-0 shadow-sm" key={meal.key}>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="meal-icon">
                <FaUtensils />
              </span>
              <div>
                <Card.Title className="h5 fw-bold mb-0">{t(meal.labelKey)}</Card.Title>
                <Card.Text className="text-secondary small mb-0">
                  {mealCalories} {t('planner.kcal')}
                </Card.Text>
              </div>
            </div>
            <Badge bg="light" text="dark">
              {items.length} {t('planner.items')}
            </Badge>
          </div>

          <div className="table-responsive">
            <Table size="sm" hover className="meal-food-table align-middle mb-3">
              <thead>
                <tr>
                  <th>{t('planner.food')}</th>
                  <th className="text-end">{t('planner.quantity')}</th>
                  <th className="text-end">{t('planner.calories')}</th>
                  <th className="meal-action-cell" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="meal-food-row">
                    <td>{item.name}</td>
                    <td className="text-end">{item.grams}g</td>
                    <td className="text-end">{item.calories}</td>
                    <td className="meal-action-cell">
                      <div className="meal-row-actions">
                        <button type="button" onClick={() => openEditFoodModal(meal.key, item)} aria-label={t('planner.edit')}>
                          <FaPen />
                        </button>
                        <button type="button" onClick={() => handleRemoveFood(meal.key, item.id)} aria-label={t('planner.remove')}>
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <Button variant="success" size="sm" onClick={() => openAddFoodModal(meal.key)}>
              <FaUtensils className="me-2" />
              {t('buttons.addFood')}
            </Button>
            <Button variant="outline-success" size="sm" onClick={() => handleRegenerateMeal(meal.key)}>
              <FaRedo className="me-2" />
              {t('planner.regenerate')}
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  };

  return (
    <>
      <div className="meal-planner-page">
        <Row className="g-4">
          <Col lg={8}>
            <div className="d-flex flex-column flex-sm-row justify-content-between gap-3 mb-4">
              <div>
                <Badge bg="success" className="mb-2">
                  {t('planner.badge')}
                </Badge>
                <h1 className="h2 fw-bold mb-0">{dateTitle}</h1>
              </div>
              <div className="date-switcher">
                <Button variant="light" onClick={() => shiftDate(-1)} aria-label={t('planner.previousDay')}>
                  <FaChevronLeft />
                </Button>
                <Button variant="light" onClick={() => shiftDate(1)} aria-label={t('planner.nextDay')}>
                  <FaChevronRight />
                </Button>
              </div>
            </div>

            <div className="meal-card-stack">{mealSections.map(renderMealCard)}</div>
          </Col>

          <Col lg={4}>
            <div className="planner-side-stack">
              <Card className="border-0 shadow-sm planner-side-card">
                <Card.Body>
                  <Card.Title className="fw-bold">{t('planner.macros')}</Card.Title>
                  <div className="macro-calorie-progress mb-4">
                    <div className="d-flex justify-content-between mb-2">
                      <span>{t('planner.calories')}</span>
                      <strong>
                        {nutritionTotals.calories} / {macroGoals.calories} {t('planner.kcal')}
                      </strong>
                    </div>
                    <ProgressBar
                      now={Math.min((nutritionTotals.calories / macroGoals.calories) * 100, 100)}
                      variant="success"
                    />
                  </div>

                  {[
                    { key: 'carbs', variant: 'warning' },
                    { key: 'fat', variant: 'danger' },
                    { key: 'protein', variant: 'primary' },
                  ].map((macro) => (
                    <div className="macro-row" key={macro.key}>
                      <div className="d-flex justify-content-between small mb-1">
                        <span>{t(`planner.${macro.key}`)}</span>
                        <strong>
                          {nutritionTotals[macro.key]}g / {macroGoals[macro.key]}g
                        </strong>
                      </div>
                      <ProgressBar
                        now={Math.min((nutritionTotals[macro.key] / macroGoals[macro.key]) * 100, 100)}
                        variant={macro.variant}
                      />
                    </div>
                  ))}
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm planner-side-card">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <Card.Title className="fw-bold mb-0">{t('planner.waterTracker')}</Card.Title>
                    <span className="water-glass">
                      <FaTint />
                    </span>
                  </div>
                  <div className="display-6 fw-bold text-info mb-2">{waterMl}ml</div>
                  <ProgressBar now={waterPercent} variant="info" label={`${waterPercent}%`} className="mb-3" />
                  <div className="d-flex gap-2">
                    <Button variant="outline-info" className="flex-fill" onClick={() => adjustWater(-250)}>
                      <FaMinus />
                    </Button>
                    <Button variant="info" className="flex-fill text-white" onClick={() => adjustWater(250)}>
                      <FaPlus />
                    </Button>
                  </div>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm planner-side-card">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <Card.Title className="fw-bold mb-0">{t('planner.workoutTracker')}</Card.Title>
                    <span className="workout-icon">
                      <FaRunning />
                    </span>
                  </div>
                  <div className="h3 fw-bold mb-3">
                    {workoutCalories} {t('planner.kcal')}
                  </div>
                  <ListGroup variant="flush">
                    {workouts.map((workout) => (
                      <ListGroup.Item className="px-0 d-flex justify-content-between" key={workout.id}>
                        <span>{workout.name}</span>
                        <strong>{workout.calories}</strong>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </div>

      <Modal show={showFoodModal} onHide={() => setShowFoodModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingItemId ? t('planner.editFood') : t('planner.addFood')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="plannerFoodSearch">
            <Form.Label>{t('planner.searchFood')}</Form.Label>
            <InputGroup>
              <InputGroup.Text>{t('buttons.lookup')}</InputGroup.Text>
              <Form.Control
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('foodDiary.searchPlaceholder')}
              />
            </InputGroup>
          </Form.Group>

          <ListGroup className="food-search-results mb-3">
            {filteredFoods.map((food) => (
              <ListGroup.Item
                action
                active={food.id === Number(selectedFoodId)}
                key={food.id}
                onClick={() => setSelectedFoodId(food.id)}
                className="d-flex justify-content-between"
              >
                <span>{food.name}</span>
                <span>{food.caloriesPer100g} {t('planner.kcal')}/100g</span>
              </ListGroup.Item>
            ))}
          </ListGroup>

          <Form.Group controlId="plannerFoodGrams">
            <Form.Label>{t('planner.grams')}</Form.Label>
            <Form.Control
              type="number"
              min="1"
              value={grams}
              onChange={(event) => setGrams(event.target.value)}
            />
          </Form.Group>

          <div className="planner-modal-calories mt-3">
            {t('planner.estimatedCalories')}: <strong>{modalCalories} {t('planner.kcal')}</strong>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowFoodModal(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button variant="success" onClick={handleSaveFood}>
            {t('buttons.save')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default FoodDiary;
