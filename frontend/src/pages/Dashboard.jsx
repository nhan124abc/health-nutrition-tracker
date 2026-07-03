import { useEffect, useState } from 'react';
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Carousel, Col, ProgressBar, Row } from 'react-bootstrap';
import { FaBullseye, FaLightbulb } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import GoalFireworks from '../components/GoalFireworks';
import { getActivitiesByDate } from '../features/activities/activityService';
import {
  extractActivitiesFromApi,
  getActivitySummary,
  normalizeActivityFromApi,
} from '../features/activities/activityUtils';
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
  normalizeDailyWaterFromApi,
  normalizeNumber,
} from '../features/water/waterUtils';
import { getTodayWater } from '../features/water/waterService';
import { getHealthInsights } from '../features/analytics/analyticsService';

ChartJS.register(ArcElement, Tooltip, Legend);

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
  targetWeight: 0,
  healthGoal: '',
  streak: 0,
  streakActive: false,
  planStartDate: '',
  planDurationWeeks: '',
  dailyActivityGoalKcal: 0,
  weeklyWeightMilestones: [],
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

function getLatestTimestamp(records, fields) {
  return records.reduce((latest, record) => {
    const timestamp = fields
      .map((field) => record?.[field])
      .filter(Boolean)
      .map((value) => new Date(value).getTime())
      .filter(Number.isFinite)
      .sort((left, right) => right - left)[0];

    return timestamp && timestamp > latest ? timestamp : latest;
  }, 0);
}

function getStreakStatus(days) {
  let streak = 0;
  let index = days.length - 1;
  const latestActiveDay = [...days]
    .reverse()
    .find((day) => day.mealCount > 0 || day.activityCount > 0);

  if (!latestActiveDay?.lastActivityAt) {
    return { streak: 0, active: false };
  }

  const hoursSinceLastActivity = (Date.now() - latestActiveDay.lastActivityAt) / (60 * 60 * 1000);
  if (hoursSinceLastActivity >= 24) {
    return { streak: 0, active: false };
  }

  index = days.findIndex((day) => day.date === latestActiveDay.date);
  for (; index >= 0; index -= 1) {
    if (days[index].mealCount === 0 && days[index].activityCount === 0) {
      break;
    }
    streak += 1;
  }

  return {
    streak,
    active: latestActiveDay.date === getTodayDate(),
  };
}

function Dashboard() {
  const { i18n, t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [dailySummary, setDailySummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showFireworks, setShowFireworks] = useState(false);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setLoadError('');

      const dates = getSevenDates(selectedDate);
      const dayRequests = dates.flatMap((date) => [
        getMealsByDate(date),
        getActivitiesByDate(date),
      ]);
      const [profileResult, metricsResult, waterResult, ...dayResults] = await Promise.allSettled([
        getProfile(),
        getBodyMetrics({ page: 0, size: 1 }),
        selectedDate === getTodayDate() ? getTodayWater() : Promise.resolve(null),
        ...dayRequests,
      ]);

      if (!isMounted) {
        return;
      }

      const days = dates.map((date, index) => {
        const mealResult = dayResults[index * 2];
        const activityResult = dayResults[index * 2 + 1];
        const rawMeals = mealResult.status === 'fulfilled'
          ? extractMealsFromApi(mealResult.value.data)
          : [];
        const rawActivities = activityResult.status === 'fulfilled'
          ? extractActivitiesFromApi(activityResult.value.data)
          : [];
        const meals = rawMeals.map(normalizeMealFromApi);
        const activities = rawActivities.map(normalizeActivityFromApi);
        const totals = getMealsTotals(meals);
        const activity = getActivitySummary(activities);
        const lastActivityAt = Math.max(
          getLatestTimestamp(rawMeals, ['updatedAt', 'createdAt']),
          getLatestTimestamp(rawActivities, ['createdAt', 'loggedAt'])
        );

        return {
          date,
          ...totals,
          mealCount: meals.length,
          caloriesBurned: normalizeNumber(activity.calories),
          activityCount: activities.length,
          activeMinutes: normalizeNumber(activity.minutes),
          lastActivityAt,
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
      const dailyWater = waterResult.status === 'fulfilled' && waterResult.value
        ? normalizeDailyWaterFromApi(waterResult.value.data)
        : { totalAmountMl: 0, goalMl: 0 };
      const failedRequests = [profileResult, metricsResult, waterResult, ...dayResults]
        .filter((result) => result.status === 'rejected');
      const streakStatus = getStreakStatus(days);

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
        waterIntake: dailyWater.totalAmountMl,
        waterGoal: dailyWater.goalMl
          || normalizeNumber(profile.dailyWaterGoal)
          || emptySummary.waterGoal,
        weight: normalizeNumber(latestWeight),
        targetWeight: normalizeNumber(profile.targetWeight),
        healthGoal: profile.healthGoal || '',
        streak: streakStatus.streak,
        streakActive: streakStatus.active,
        planStartDate: profile.planStartDate || '',
        planDurationWeeks: profile.planDurationWeeks || '',
        dailyActivityGoalKcal: profile.dailyActivityGoalKcal || 0,
        weeklyWeightMilestones: profile.weeklyWeightMilestones || [],
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

  useEffect(() => {
    let isMounted = true;

    setInsightsLoading(true);
    setInsightsError(false);
    getHealthInsights({ unreadOnly: false })
      .then((response) => {
        if (!isMounted) return;
        const data = response.data?.data ?? response.data ?? [];
        setInsights(Array.isArray(data) ? data.slice(0, 5) : []);
      })
      .catch((error) => {
        console.error('[Dashboard] Error loading health insights:', error);
        if (isMounted) {
          setInsights([]);
          setInsightsError(true);
        }
      })
      .finally(() => {
        if (isMounted) setInsightsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [i18n.language]);

  const goalPercent = Math.round((dailySummary.caloriesConsumed / Math.max(dailySummary.calorieGoal, 1)) * 100);
  const waterPercent = Math.round((dailySummary.waterIntake / Math.max(dailySummary.waterGoal, 1)) * 100);

  const calorieProgressVariant = goalPercent > 100 
    ? 'danger' 
    : goalPercent >= 90 
    ? 'warning' 
    : 'success';

  const currentHour = new Date().getHours();
  const isLate = currentHour >= 20;

  const getCalorieStatusLabel = () => {
    if (goalPercent > 100) return <span className="text-danger small fw-bold">{t('dashboardPage.status.calorieOver', { percent: goalPercent })}</span>;
    if (goalPercent >= 90) return <span className="text-warning small fw-bold">{t('dashboardPage.status.calorieNearLimit', { percent: goalPercent })}</span>;
    if (isLate && goalPercent < 70) return <span className="text-info small fw-semibold">{t('dashboardPage.status.calorieLowLate')}</span>;
    return <span className="text-success small fw-semibold">{t('dashboardPage.status.calorieReasonable', { percent: goalPercent })}</span>;
  };

  const activityPercent = dailySummary.dailyActivityGoalKcal > 0
    ? Math.round((dailySummary.caloriesBurned / dailySummary.dailyActivityGoalKcal) * 100)
    : 0;
  const completedGoals = [
    dailySummary.waterGoal > 0 && waterPercent >= 100 ? 'water' : null,
    dailySummary.dailyActivityGoalKcal > 0 && activityPercent >= 100 ? 'activity' : null,
  ].filter(Boolean);
  const completedGoalsKey = completedGoals.sort().join('-');

  useEffect(() => {
    if (loading || selectedDate !== getTodayDate() || !completedGoalsKey) {
      return undefined;
    }

    const storageKey = `goalFireworks:${selectedDate}:${completedGoalsKey}`;
    if (localStorage.getItem(storageKey)) {
      return undefined;
    }

    localStorage.setItem(storageKey, 'shown');
    setShowFireworks(true);
    const timeoutId = window.setTimeout(() => setShowFireworks(false), 2400);

    return () => window.clearTimeout(timeoutId);
  }, [completedGoalsKey, loading, selectedDate]);

  const activityProgressVariant = activityPercent >= 100 
    ? 'success' 
    : 'primary';

  const getActivityStatusLabel = () => {
    if (!dailySummary.dailyActivityGoalKcal) {
      return <span className="text-secondary small">{t('dashboardPage.status.noGoal')}</span>;
    }
    if (activityPercent >= 120) return <span className="text-success small fw-bold">{t('dashboardPage.status.activityExcellent', { percent: activityPercent })}</span>;
    if (activityPercent >= 100) return <span className="text-success small fw-bold">{t('dashboardPage.status.activityComplete', { percent: activityPercent })}</span>;
    return <span className="text-primary small fw-semibold">{t('dashboardPage.status.activityRemaining', { calories: Math.max(0, dailySummary.dailyActivityGoalKcal - dailySummary.caloriesBurned) })}</span>;
  };

  const getNextWeightMilestone = () => {
    if (!dailySummary.planStartDate || !dailySummary.weeklyWeightMilestones || dailySummary.weeklyWeightMilestones.length === 0) {
      return null;
    }
    const today = new Date();
    const nextMilestone = dailySummary.weeklyWeightMilestones.find(m => new Date(m.date) >= today);
    return nextMilestone || dailySummary.weeklyWeightMilestones[dailySummary.weeklyWeightMilestones.length - 1];
  };

  const nextMilestone = getNextWeightMilestone();

  const healthGoalLabel = dailySummary.healthGoal
    ? t(`profilePage.goals.${dailySummary.healthGoal}`)
    : t('dashboardPage.goalBanner.notSet');
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

  return (
    <>
      <GoalFireworks visible={showFireworks} />
      <div className="page-heading">
        <div>
          <h1>{t('dashboardPage.title')}</h1>
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

      {!loading && (
        <Card className="dashboard-goal-card border-0 shadow-sm mb-4">
          <Card.Body>
            <div className="dashboard-goal-header">
              <div className="dashboard-goal-icon"><FaBullseye /></div>
              <div className="flex-grow-1">
                <div className="dashboard-goal-eyebrow">{t('dashboardPage.goalBanner.eyebrow')}</div>
                <h2>{healthGoalLabel}</h2>
              </div>
              <Button as={Link} to="/goals" variant="light">
                {t('dashboardPage.goalBanner.update')}
              </Button>
            </div>

            <Row className="g-3 dashboard-goal-metrics">
              <Col lg={3} md={6}>
                <div className="dashboard-goal-metric">
                  <span>{t('dashboardPage.goalBanner.targetWeight')}</span>
                  <strong>
                    {dailySummary.weight || '-'} kg
                    <small> → {dailySummary.targetWeight || '-'} kg</small>
                  </strong>
                  {nextMilestone && (
                    <div className="text-secondary small mt-1" style={{ fontSize: '0.82rem' }}>
                      {t('dashboardPage.goalBanner.weekMilestone', { week: nextMilestone.weekNumber })}: <strong>{nextMilestone.targetWeightKg} kg</strong> ({new Date(`${nextMilestone.date}T12:00:00`).toLocaleDateString(i18n.language, { month: '2-digit', day: '2-digit' })})
                    </div>
                  )}
                </div>
              </Col>
              <Col lg={3} md={6}>
                <div className="dashboard-goal-metric">
                  <div className="d-flex justify-content-between gap-2">
                    <span>{t('dashboardPage.goals.calorie')}</span>
                    {getCalorieStatusLabel()}
                  </div>
                  <strong>{dailySummary.caloriesConsumed} / {dailySummary.calorieGoal} kcal</strong>
                  <ProgressBar now={Math.min(goalPercent, 100)} variant={calorieProgressVariant} />
                </div>
              </Col>
              <Col lg={3} md={6}>
                <div className="dashboard-goal-metric">
                  <div className="d-flex justify-content-between gap-2">
                    <span>{t('dashboardPage.goals.water')}</span>
                    <b>{waterPercent}%</b>
                  </div>
                  <strong>{dailySummary.waterIntake} / {dailySummary.waterGoal} ml</strong>
                  <ProgressBar now={Math.min(waterPercent, 100)} variant="info" />
                </div>
              </Col>
              <Col lg={3} md={6}>
                <div className="dashboard-goal-metric">
                  <div className="d-flex justify-content-between gap-2">
                    <span>{t('dashboardPage.goals.activity')}</span>
                    {getActivityStatusLabel()}
                  </div>
                  <strong>{dailySummary.caloriesBurned} / {dailySummary.dailyActivityGoalKcal || 300} kcal</strong>
                  <ProgressBar now={Math.min(activityPercent, 100)} variant={activityProgressVariant} />
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      <Row className="g-4">
        <Col lg={8}>
          <Card className="dashboard-insight-card border-0 shadow-sm h-100">
            <Card.Body>
              <div className="dashboard-insight-header">
                <div className="d-flex align-items-center gap-2">
                  <span className="dashboard-insight-icon" aria-hidden="true"><FaLightbulb /></span>
                  <Card.Title className="fw-bold mb-0">{t('dashboardPage.insights.title')}</Card.Title>
                </div>
                <Button as={Link} to="/health-insights" variant="link" className="dashboard-insight-view-all">
                  {t('dashboardPage.insights.viewAll')}
                </Button>
              </div>

              {insightsLoading ? (
                <div className="dashboard-insight-state">{t('healthInsightsPage.loading')}</div>
              ) : insightsError ? (
                <div className="dashboard-insight-state">{t('healthInsightsPage.loadError')}</div>
              ) : insights.length === 0 ? (
                <div className="dashboard-insight-state">{t('healthInsightsPage.empty')}</div>
              ) : (
                <Carousel
                  className="dashboard-insight-carousel"
                  controls={insights.length > 1}
                  indicators={insights.length > 1}
                  interval={insights.length > 1 ? 7000 : null}
                  pause="hover"
                >
                  {insights.map((insight, index) => {
                    const typeClass = String(insight.insightType || 'UNKNOWN').toLowerCase().replaceAll('_', '-');
                    const dateValue = insight.validDate || insight.createdAt;

                    return (
                      <Carousel.Item key={insight.id}>
                        <article className={`dashboard-insight-slide dashboard-insight-${typeClass}`}>
                          <div className="dashboard-insight-meta">
                            <Badge pill className="dashboard-insight-type">
                              {t(
                                `healthInsightsPage.types.${insight.insightType}`,
                                insight.insightType || t('healthInsightsPage.types.UNKNOWN')
                              )}
                            </Badge>
                            <span className="dashboard-insight-position">{index + 1} / {insights.length}</span>
                          </div>
                          <div className="dashboard-insight-copy">
                            <h3>{insight.title}</h3>
                            <p>{insight.content}</p>
                          </div>
                          {dateValue && (
                            <small className="dashboard-insight-date">
                              {t('healthInsightsPage.updatedAt', {
                                date: new Date(dateValue).toLocaleDateString(i18n.language, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                }),
                              })}
                            </small>
                          )}
                        </article>
                      </Carousel.Item>
                    );
                  })}
                </Carousel>
              )}
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
      </Row>
    </>
  );
}

export default Dashboard;
