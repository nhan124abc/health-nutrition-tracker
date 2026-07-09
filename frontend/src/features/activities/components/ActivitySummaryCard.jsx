import { Card, ProgressBar } from 'react-bootstrap';

function formatNumber(value) {
  return Math.round(Number(value) || 0);
}

function ActivitySummaryCard({ activityGoal = 0, logCount, logs = [], summary, t }) {
  const roundedCalories = formatNumber(summary.calories);
  const roundedMinutes = formatNumber(summary.minutes);
  const roundedGoal = formatNumber(activityGoal);
  const percent = roundedGoal > 0 ? Math.round((roundedCalories / roundedGoal) * 100) : 0;
  const categorySummary = logs.reduce((items, log) => {
    const category = log.category || 'other';
    const current = items[category] || { count: 0, minutes: 0 };
    return {
      ...items,
      [category]: {
        count: current.count + 1,
        minutes: current.minutes + formatNumber(log.duration),
      },
    };
  }, {});
  const categoryRows = Object.entries(categorySummary);

  return (
    <Card className="border-0 shadow-sm sticky-panel">
      <Card.Body>
        <Card.Title className="fw-bold mb-3">{t('common.dailySummary')}</Card.Title>
        <div className="quick-grid">
          <span>{t('common.caloriesOut')}<strong>{roundedCalories}</strong></span>
          <span>{t('activityPage.activityCount')}<strong>{logCount}</strong></span>
          <span>{t('common.activeMinutes')}<strong>{roundedMinutes}</strong></span>
        </div>
        {roundedGoal > 0 && <>
          <div className={`alert alert-${percent >= 100 ? 'success' : 'warning'} py-2 small mt-3 mb-2`}>
            {percent >= 100
              ? t('activityPage.summary.goalComplete')
              : t('activityPage.summary.remaining', { calories: Math.max(0, roundedGoal - roundedCalories) })}
          </div>
          <ProgressBar now={Math.min(percent, 100)} variant={percent >= 100 ? 'success' : 'warning'} />
        </>}
        <hr />
        <h3 className="h6 fw-bold">{t('activityPage.todayCategoryTitle')}</h3>
        <div className="d-grid gap-2">
          {categoryRows.length > 0 ? categoryRows.map(([category, item]) => (
            <div className="type-pill" key={category}>
              <span>{t(`activityPage.categories.${category}`, category)}</span>
              <span className="text-secondary small">
                {t('activityPage.categorySummary', { count: item.count, minutes: item.minutes })}
              </span>
            </div>
          )) : (
            <div className="type-pill text-secondary small">{t('activityPage.noCategorySummary')}</div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

export default ActivitySummaryCard;
