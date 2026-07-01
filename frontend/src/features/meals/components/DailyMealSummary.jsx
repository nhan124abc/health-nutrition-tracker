import { Card, ProgressBar } from 'react-bootstrap';
import { formatCalories } from '../mealUtils';

function DailyMealSummary({ calorieGoal = 2000, mealCount, t, totals }) {
  const percent = Math.round((totals.calories / Math.max(calorieGoal, 1)) * 100);
  const roundedCalories = formatCalories(totals.calories);
  const roundedGoal = formatCalories(calorieGoal);
  const status = percent > 100
    ? { variant: 'danger', text: t('foodDiaryPage.summary.over', { calories: formatCalories(totals.calories - calorieGoal) }) }
    : percent >= 90
      ? { variant: 'warning', text: t('foodDiaryPage.summary.nearLimit') }
      : percent < 60
        ? { variant: 'info', text: t('foodDiaryPage.summary.remaining', { calories: formatCalories(calorieGoal - totals.calories) }) }
        : { variant: 'success', text: t('foodDiaryPage.summary.reasonable') };
  return (
    <Card className="border-0 shadow-sm planner-side-card sticky-panel">
      <Card.Body>
        <Card.Title className="fw-bold mb-3">{t('foodDiaryPage.dailySummary')}</Card.Title>
        <div className="display-6 fw-bold">{roundedCalories} kcal</div>
        <p className="text-secondary">{t('foodDiaryPage.mealsLogged', { count: mealCount })}</p>
        <div className={`alert alert-${status.variant} py-2 small`}>{status.text}</div>
        <div className="d-flex justify-content-between small mb-1"><span>{t('foodDiaryPage.summary.progress')}</span><strong>{roundedCalories} / {roundedGoal} kcal</strong></div>
        <ProgressBar now={Math.min(percent, 100)} variant={status.variant} className="mb-3" />
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
