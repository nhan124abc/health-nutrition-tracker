import { Card } from 'react-bootstrap';
import { getLocalizedName } from '../../../utils/localizedName';

function getCategoryLabel(activity = {}, language = '') {
  return getLocalizedName({
    name: activity.categoryName || activity.category,
    nameVi: activity.categoryNameVi,
  }, language);
}

function ActivityTypeDetailCard({ activity, language, t }) {
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
        <h2 className="h4 fw-bold mb-1">{getLocalizedName(activity, language)}</h2>
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
