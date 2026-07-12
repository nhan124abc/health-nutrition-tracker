import { Card } from 'react-bootstrap';
import CrudActions from '../../../components/CrudActions';
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
            <CrudActions
              editLabel={t('activityPage.editAction')}
              deleteLabel={t('activityPage.deleteAction')}
              onEdit={canEdit ? () => onEdit?.(activity) : null}
              onDelete={canDelete ? () => onDelete?.(activity) : null}
            />
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
