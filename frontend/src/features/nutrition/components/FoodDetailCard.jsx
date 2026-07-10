import { Button, Card } from 'react-bootstrap';
import { getLocalizedName } from '../../../utils/localizedName';

function FoodDetailCard({ canDelete = false, canEdit = false, food, language, onDelete, onEdit, t }) {
  if (!food) {
    return (
      <Card className="border-0 shadow-sm sticky-panel nutrition-detail-card">
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
    <Card className="border-0 shadow-sm sticky-panel nutrition-detail-card">
      <Card.Body>
        <div className="d-flex align-items-start justify-content-between gap-3 mb-1">
          <h2 className="h4 fw-bold mb-0">{getLocalizedName(food, language)}</h2>
          {(canEdit || canDelete) && (
            <div className="d-flex flex-wrap justify-content-end gap-2">
              {canEdit && (
                <Button variant="outline-success" size="sm" onClick={() => onEdit?.(food)}>
                  {t('nutritionPage.editAction')}
                </Button>
              )}
              {canDelete && (
                <Button variant="outline-danger" size="sm" onClick={() => onDelete?.(food)}>
                  {t('nutritionPage.deleteAction')}
                </Button>
              )}
            </div>
          )}
        </div>
        <p className="text-secondary">
          {food.servingDescription || food.servingSize}
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
