import { useEffect, useMemo, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Col, ProgressBar, Row } from 'react-bootstrap';
import { getActivitySummary } from '../features/activities/activityService';
import { getMealsByDate } from '../features/meals/mealService';
import {
  extractMealsFromApi,
  getMealsTotals,
  normalizeMealFromApi,
} from '../features/meals/mealUtils';
import { getBodyMetrics, getProfile } from '../features/profile/profileService';
import {
  extractMetricRows,
  extractProfileFromApi,
  mapProfileFromApi,
} from '../features/profile/profileUtils';
import {
  normalizeNumber,
  readStoredJson,
  waterLogsStorageKey,
} from '../features/water/waterUtils';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const emptySummary = {
  caloriesConsumed: 0,
  caloriesBurned: 0,
  calorieGoal: 2000,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sodium: 0,
  mealCount: 0,
  activityCount: 0,
  activeMinutes: 0,
  waterIntake: 0,
  waterGoal: 2000,
  weight: 0,
  streak: 0,
};

function toLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return toLocalDate(new Date());
}

function getSevenDates(endDate) {
  const end = new Date(`${endDate}T12:00:00`);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (6 - index));
    return toLocalDate(date);
  });
}

function getWaterIntake(date) {
  const logs = readStoredJson(waterLogsStorageKey, []);
  return logs
    .filter((log) => log.date === date)
    .reduce((sum, log) => sum + normalizeNumber(log.amountMl), 0);
}

function getStreak(days) {
  let streak = 0;

  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].mealCount === 0 && days[index].activityCount === 0) {
      break;
    }
    streak += 1;
  }

  return streak;
}

function Dashboard() {
  const { i18n, t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [dailySummary, setDailySummary] = useState(emptySummary);
  const [week, setWeek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setLoadError('');

      const dates = getSevenDates(selectedDate);
      const dayRequests = dates.flatMap((date) => [
        getMealsByDate(date),
        getActivitySummary(date),
      ]);
      const [profileResult, metricsResult, ...dayResults] = await Promise.allSettled([
        getProfile(),
        getBodyMetrics({ page: 0, size: 1 }),
        ...dayRequests,
      ]);

      if (!isMounted) {
        return;
      }

      const days = dates.map((date, index) => {
        const mealResult = dayResults[index * 2];
        const activityResult = dayResults[index * 2 + 1];
        const meals = mealResult.status === 'fulfilled'
          ? extractMealsFromApi(mealResult.value.data).map(normalizeMealFromApi)
          : [];
        const totals = getMealsTotals(meals);
        const activity = activityResult.status === 'fulfilled'
          ? activityResult.value.data || {}
          : {};

        return {
          date,
          ...totals,
          mealCount: meals.length,
          caloriesBurned: normalizeNumber(activity.caloriesBurned),
          activityCount: normalizeNumber(activity.activityCount),
          activeMinutes: normalizeNumber(activity.totalActiveMinutes),
        };
      });

      const selectedDay = days.find((day) => day.date === selectedDate) || {};
      const profile = profileResult.status === 'fulfilled'
        ? mapProfileFromApi(extractProfileFromApi(profileResult.value.data))
        : {};
      const metrics = metricsResult.status === 'fulfilled'
        ? extractMetricRows(metricsResult.value.data)
        : [];
      const latestWeight = metrics[0]?.weightKg ?? profile.weight ?? 0;
      const failedRequests = [profileResult, metricsResult, ...dayResults]
        .filter((result) => result.status === 'rejected');

      setWeek(days);
      setDailySummary({
        ...emptySummary,
        caloriesConsumed: selectedDay.calories || 0,
        caloriesBurned: selectedDay.caloriesBurned || 0,
        calorieGoal: normalizeNumber(profile.dailyCalorieGoal) || emptySummary.calorieGoal,
        protein: selectedDay.protein || 0,
        carbs: selectedDay.carbs || 0,
        fat: selectedDay.fat || 0,
        fiber: selectedDay.fiber || 0,
        sodium: selectedDay.sodium || 0,
        mealCount: selectedDay.mealCount || 0,
        activityCount: selectedDay.activityCount || 0,
        activeMinutes: selectedDay.activeMinutes || 0,
        waterIntake: getWaterIntake(selectedDate),
        waterGoal: normalizeNumber(profile.dailyWaterGoal) || emptySummary.waterGoal,
        weight: normalizeNumber(latestWeight),
        streak: getStreak(days),
      });

      if (failedRequests.length > 0) {
        setLoadError(t('dashboardPage.partialLoadError'));
      }
      setLoading(false);
    }

    loadDashboard().catch((error) => {
      console.error('[Dashboard] Error loading dashboard:', error);
      if (isMounted) {
        setLoadError(error.response?.data?.message || t('dashboardPage.loadError'));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, t]);

  const netCalories = dailySummary.caloriesConsumed - dailySummary.caloriesBurned;
  const goalPercent = Math.round((dailySummary.caloriesConsumed / Math.max(dailySummary.calorieGoal, 1)) * 100);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: '2-digit' }),
    [i18n.language]
  );

  const macroData = {
    labels: [t('common.protein'), t('common.carbs'), t('common.fat')],
    datasets: [
      {
        data: [dailySummary.protein * 4, dailySummary.carbs * 4, dailySummary.fat * 9],
        backgroundColor: ['#2f8f6b', '#4f7cac', '#e0a458'],
        borderColor: '#ffffff',
        borderWidth: 4,
      },
    ],
  };

  const weeklyData = {
    labels: week.map((day) => dateFormatter.format(new Date(`${day.date}T12:00:00`))),
    datasets: [
      {
        label: t('common.caloriesIn'),
        data: week.map((day) => day.calories),
        backgroundColor: '#2f8f6b',
        borderRadius: 6,
      },
      {
        label: t('common.caloriesOut'),
        data: week.map((day) => day.caloriesBurned),
        backgroundColor: '#4f7cac',
        borderRadius: 6,
      },
    ],
  };

  const statCards = [
    [t('dashboardPage.stats.consumed'), `${dailySummary.caloriesConsumed} kcal`, t('dashboardPage.stats.goalPercent', { percent: goalPercent }), 'success'],
    [t('dashboardPage.stats.burned'), `${dailySummary.caloriesBurned} kcal`, t('dashboardPage.stats.activityCount', { count: dailySummary.activityCount }), 'primary'],
    [t('dashboardPage.stats.net'), `${netCalories} kcal`, t('dashboardPage.stats.netHelper'), 'warning'],
    [t('dashboardPage.stats.streak'), `${dailySummary.streak} ${t('common.days')}`, t('dashboardPage.stats.streakHelper'), 'danger'],
  ];

  const goals = [
    [t('dashboardPage.goals.calorie'), dailySummary.caloriesConsumed, dailySummary.calorieGoal, 'kcal'],
    [t('dashboardPage.goals.water'), dailySummary.waterIntake, dailySummary.waterGoal, 'ml'],
    [t('common.activeMinutes'), dailySummary.activeMinutes, 60, t('common.minutes')],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('dashboardPage.badge')}</Badge>
          <h1>{t('dashboardPage.title')}</h1>
          <p>{t('dashboardPage.description')}</p>
        </div>
        <input
          className="form-control page-date-input"
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
      </div>

      {loading && <div className="alert alert-light border">{t('dashboardPage.loading')}</div>}
      {loadError && <div className="alert alert-warning">{loadError}</div>}

      <Row className="g-3 mb-4">
        {statCards.map(([title, value, helper, variant]) => (
          <Col xs={12} md={6} xl={3} key={title}>
            <Card className="metric-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className={`small fw-semibold text-${variant} mb-2`}>{title}</div>
                <div className="metric-value">{value}</div>
                <div className="text-secondary small">{helper}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between gap-3 mb-3">
                <div>
                  <Card.Title className="fw-bold mb-1">{t('dashboardPage.weeklyTitle')}</Card.Title>
                  <Card.Text className="text-secondary small mb-0">{t('dashboardPage.weeklyDescription')}</Card.Text>
                </div>
                <Badge bg="light" text="dark">{t('common.weekly')}</Badge>
              </div>
              <div className="dashboard-chart dashboard-chart-bar">
                <Bar data={weeklyData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fw-bold mb-1">{t('dashboardPage.macroTitle')}</Card.Title>
              <Card.Text className="text-secondary small">{t('dashboardPage.macroDescription')}</Card.Text>
              <div className="dashboard-chart dashboard-chart-doughnut">
                <Doughnut data={macroData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('dashboardPage.goals.title')}</Card.Title>
              {goals.map(([label, value, goal, unit]) => (
                <div className="goal-row" key={label}>
                  <div className="d-flex justify-content-between">
                    <span>{label}</span>
                    <strong>{value} / {goal} {unit}</strong>
                  </div>
                  <ProgressBar now={Math.min((value / Math.max(goal, 1)) * 100, 100)} />
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('dashboardPage.quickTitle')}</Card.Title>
              <div className="quick-grid">
                <span>{t('common.meals')}<strong>{dailySummary.mealCount}</strong></span>
                <span>{t('common.protein')}<strong>{dailySummary.protein}g</strong></span>
                <span>{t('common.fiber')}<strong>{dailySummary.fiber}g</strong></span>
                <span>{t('common.sodium')}<strong>{dailySummary.sodium}mg</strong></span>
                <span>{t('common.weight')}<strong>{dailySummary.weight || '-'}kg</strong></span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Dashboard;
