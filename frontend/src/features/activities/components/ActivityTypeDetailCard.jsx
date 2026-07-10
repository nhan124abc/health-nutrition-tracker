import { Button, Card } from 'react-bootstrap';
import { getLocalizedName } from '../../../utils/localizedName';

function getCategoryLabel(activity = {}, language = '') {
  return getLocalizedName({
    name: activity.categoryName || activity.category,
    nameVi: activity.categoryNameVi,
  }, language);
}

function ActivityTypeDetailCard({ activity, canDelete = false, canEdit = false, language, onDelete, onEdit, t }) {
  if (!activity) {
    return (
      <Card className="border-0 shadow-sm sticky-panel">
        <Card.Body className="text-secondary">{t('activityListPage.noSelection')}</Card.Body>
      </Card>
    );
  }

  const description = getLocalizedName({
    name: activity.description,
    nameVi: activity.descriptionVi,
  }, language);
  const details = [
    [t('common.category'), getCategoryLabel(activity, language) || '-'],
    [t('admin.table.met', 'MET'), activity.met || '-'],
    [t('activityPage.fields.durationMinutes'), `30 ${t('common.minutes')}`],
    [t('activityPage.estimatedCalories'), `${Math.round((Number(activity.met || 4) * 67 * 30) / 60)} kcal`],
  ];

  return (
    <Card className="border-0 shadow-sm sticky-panel">
      <Card.Body>
        <div className="d-flex align-items-start justify-content-between gap-3 mb-1">
          <h2 className="h4 fw-bold mb-0">{getLocalizedName(activity, language)}</h2>
          {(canEdit || canDelete) && (
            <div className="d-flex flex-wrap justify-content-end gap-2">
              {canEdit && (
                <Button variant="outline-success" size="sm" onClick={() => onEdit?.(activity)}>
                  {t('activityPage.editAction')}
                </Button>
              )}
              {canDelete && (
                <Button variant="outline-danger" size="sm" onClick={() => onDelete?.(activity)}>
                  {t('activityPage.deleteAction')}
                </Button>
              )}
            </div>
          )}
        </div>
        <p className="text-secondary">
          {description || getCategoryLabel(activity, language)}
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

export default ActivityTypeDetailCard;
