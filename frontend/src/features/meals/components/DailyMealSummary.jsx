import { Card, ProgressBar } from 'react-bootstrap';

function DailyMealSummary({ mealCount, t, totals }) {
  return (
    <Card className="border-0 shadow-sm planner-side-card sticky-panel">
      <Card.Body>
        <Card.Title className="fw-bold mb-3">{t('foodDiaryPage.dailySummary')}</Card.Title>
        <div className="display-6 fw-bold">{totals.calories} kcal</div>
        <p className="text-secondary">{t('foodDiaryPage.mealsLogged', { count: mealCount })}</p>
        <ProgressBar now={Math.min((totals.calories / 2000) * 100, 100)} className="mb-3" />
        <div className="nutrition-detail-grid">
          <div><span>{t('common.protein')}</span><strong>{totals.protein}g</strong></div>
          <div><span>{t('common.carbs')}</span><strong>{totals.carbs}g</strong></div>
          <div><span>{t('common.fat')}</span><strong>{totals.fat}g</strong></div>
          <div><span>{t('common.fiber')}</span><strong>{totals.fiber}g</strong></div>
          <div><span>{t('common.sodium')}</span><strong>{totals.sodium}mg</strong></div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default DailyMealSummary;
