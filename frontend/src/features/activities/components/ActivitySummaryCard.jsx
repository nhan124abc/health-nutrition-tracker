import { Card, ProgressBar } from 'react-bootstrap';
import { getLocalizedName } from '../../../utils/localizedName';

function ActivitySummaryCard({ activityGoal = 0, activityTypes, language, logCount, summary, t }) {
  const percent = activityGoal > 0 ? Math.round((summary.calories / activityGoal) * 100) : 0;
  return (
    <Card className="border-0 shadow-sm sticky-panel">
      <Card.Body>
        <Card.Title className="fw-bold mb-3">{t('common.dailySummary')}</Card.Title>
        <div className="quick-grid">
          <span>{t('common.caloriesOut')}<strong>{summary.calories}</strong></span>
          <span>{t('activityPage.activityCount')}<strong>{logCount}</strong></span>
          <span>{t('common.activeMinutes')}<strong>{summary.minutes}</strong></span>
        </div>
        {activityGoal > 0 && <>
          <div className={`alert alert-${percent >= 100 ? 'success' : 'warning'} py-2 small mt-3 mb-2`}>
            {percent >= 100
              ? t('activityPage.summary.goalComplete')
              : t('activityPage.summary.remaining', { calories: Math.max(0, activityGoal - summary.calories) })}
          </div>
          <ProgressBar now={Math.min(percent, 100)} variant={percent >= 100 ? 'success' : 'warning'} />
        </>}
        <hr />
        <h3 className="h6 fw-bold">{t('activityPage.typeTitle')}</h3>
        <div className="d-grid gap-2">
          {activityTypes.map((type) => (
            <div className="type-pill" key={type.id}>
              <span>{getLocalizedName(type, language)}</span>
              <span className="text-secondary small">{t(`activityPage.categories.${type.category}`)}</span>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

export default ActivitySummaryCard;
