import { Badge, Card } from 'react-bootstrap';

function ActivitySummaryCard({ activityTypes, logCount, summary, t }) {
  return (
    <Card className="border-0 shadow-sm sticky-panel">
      <Card.Body>
        <Card.Title className="fw-bold mb-3">{t('common.dailySummary')}</Card.Title>
        <div className="quick-grid">
          <span>{t('common.caloriesOut')}<strong>{summary.calories}</strong></span>
          <span>{t('activityPage.activityCount')}<strong>{logCount}</strong></span>
          <span>{t('common.activeMinutes')}<strong>{summary.minutes}</strong></span>
        </div>
        <hr />
        <h3 className="h6 fw-bold">{t('activityPage.typeTitle')}</h3>
        <div className="d-grid gap-2">
          {activityTypes.map((type) => (
            <div className="type-pill" key={type.id}>
              <span>{type.nameVi || type.name}</span>
              <Badge bg="light" text="dark">{t(`activityPage.categories.${type.category}`)}</Badge>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

export default ActivitySummaryCard;
