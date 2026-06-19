import { Card } from 'react-bootstrap';

function FoodDetailCard({ food, t }) {
  if (!food) {
    return (
      <Card className="border-0 shadow-sm sticky-panel">
        <Card.Body className="text-secondary">{t('nutritionPage.noSelection')}</Card.Body>
      </Card>
    );
  }

  const details = [
    [t('common.calories'), `${food.calories} kcal`],
    [t('common.protein'), `${food.protein} g`],
    [t('common.carbs'), `${food.carbs} g`],
    [t('common.fat'), `${food.fat} g`],
    [t('common.fiber'), `${food.fiber} g`],
    [t('common.sugar'), `${food.sugar} g`],
    [t('common.sodium'), `${food.sodium} mg`],
  ];

  return (
    <Card className="border-0 shadow-sm sticky-panel">
      <Card.Body>
        <h2 className="h4 fw-bold mb-1">{food.nameVi || food.name}</h2>
        <p className="text-secondary">
          {food.name} - {food.servingDescription || food.servingSize}
        </p>
        <div className="nutrition-detail-grid">
          {details.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

export default FoodDetailCard;
