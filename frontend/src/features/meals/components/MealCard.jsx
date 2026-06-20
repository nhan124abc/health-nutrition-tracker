import { Badge, Card } from 'react-bootstrap';
import { FaUtensils } from 'react-icons/fa';
import { getMealTotals, mealTypes } from '../mealUtils';

function MealCard({ meal, onOpen, t }) {
  const type = mealTypes.find((item) => item.key === meal.type);
  const label = type ? t(type.labelKey) : meal.type;
  const mealTotals = getMealTotals(meal);
  const notes = meal.notes || (meal.notesKey ? t(meal.notesKey) : '');

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(meal);
    }
  };

  return (
    <Card className="border-0 shadow-sm meal-planner-card meal-summary-card" role="button" tabIndex={0} onClick={() => onOpen(meal)} onKeyDown={handleKeyDown}>
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
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default MealCard;
