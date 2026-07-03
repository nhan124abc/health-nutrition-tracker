import { useEffect, useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { Card, Col, Form, Row } from 'react-bootstrap';
import { getActivitySummary } from '../features/activities/activityService';
import { getMealsByDate } from '../features/meals/mealService';
import {
  extractMealsFromApi,
  getMealsTotals,
  normalizeMealFromApi,
} from '../features/meals/mealUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

function toLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(range, selectedDate) {
  const today = new Date();
  const baseDate = selectedDate ? new Date(`${selectedDate}T12:00:00`) : today;
  const start = new Date(baseDate);

  if (range === 'daily') {
    return [toLocalDate(baseDate)];
  }

  if (range === 'weekly') {
    start.setDate(baseDate.getDate() - 6);
  } else {
    start.setDate(1);
  }

  const dates = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    dates.push(toLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length);
}

function calculateStreak(days) {
  let streak = 0;

  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].mealCount === 0 && days[index].activityCount === 0) {
      break;
    }
    streak += 1;
  }

  return streak;
}

function Reports() {
  const { i18n, t } = useTranslation();
  const [range, setRange] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(() => toLocalDate(new Date()));
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      setLoading(true);
      setLoadError('');

      const dates = getDateRange(range, selectedDate);
      const results = await Promise.allSettled(
        dates.flatMap((date) => [
          getMealsByDate(date),
          getActivitySummary(date),
        ])
      );

      if (!isMounted) {
        return;
      }

      const reportDays = dates.map((date, index) => {
        const mealResult = results[index * 2];
        const activityResult = results[index * 2 + 1];
        const meals = mealResult.status === 'fulfilled'
          ? extractMealsFromApi(mealResult.value.data).map(normalizeMealFromApi)
          : [];
        const mealTotals = getMealsTotals(meals);
        const activity = activityResult.status === 'fulfilled'
          ? activityResult.value.data || {}
          : {};

        return {
          date,
          ...mealTotals,
          mealCount: meals.length,
          caloriesBurned: Number(activity.caloriesBurned) || 0,
          activityCount: Number(activity.activityCount) || 0,
          activeMinutes: Number(activity.totalActiveMinutes) || 0,
        };
      });

      setDays(reportDays);

      if (results.some((result) => result.status === 'rejected')) {
        setLoadError(t('reportsPage.partialLoadError'));
      }
      setLoading(false);
    }

    loadReports().catch((error) => {
      console.error('[Reports] Error loading reports:', error);
      if (isMounted) {
        setLoadError(error.response?.data?.message || t('reportsPage.loadError'));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [range, selectedDate, t]);

  const labelFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, range === 'weekly'
      ? { weekday: 'short', day: '2-digit' }
      : range === 'daily'
        ? { weekday: 'short', month: '2-digit', day: '2-digit' }
        : { day: '2-digit' }),
    [i18n.language, range]
  );

  const labels = days.map((day) => labelFormatter.format(new Date(`${day.date}T12:00:00`)));
  const averageCaloriesIn = average(days.map((day) => day.calories));
  const averageCaloriesOut = average(days.map((day) => day.caloriesBurned));
  const averageNetCalories = average(days.map((day) => day.calories - day.caloriesBurned));
  const streak = calculateStreak(days);
  const totalMeals = days.reduce((sum, day) => sum + day.mealCount, 0);
  const totalActivities = days.reduce((sum, day) => sum + day.activityCount, 0);
  const totalActiveMinutes = days.reduce((sum, day) => sum + day.activeMinutes, 0);

  const caloriesData = {
    labels,
    datasets: [
      {
        label: t('common.caloriesIn'),
        data: days.map((day) => day.calories),
        backgroundColor: '#2f8f6b',
        borderRadius: 6,
      },
      {
        label: t('common.caloriesOut'),
        data: days.map((day) => day.caloriesBurned),
        backgroundColor: '#4f7cac',
        borderRadius: 6,
      },
    ],
  };

  const macroData = {
    labels,
    datasets: [
      { label: t('common.protein'), data: days.map((day) => day.protein), borderColor: '#2f8f6b', tension: 0.3 },
      { label: t('common.carbs'), data: days.map((day) => day.carbs), borderColor: '#4f7cac', tension: 0.3 },
      { label: t('common.fat'), data: days.map((day) => day.fat), borderColor: '#e0a458', tension: 0.3 },
    ],
  };

  const metricCards = [
    [t('reportsPage.metrics.avgIn'), `${averageCaloriesIn} kcal`, t('reportsPage.metrics.mealCount', { count: totalMeals })],
    [t('reportsPage.metrics.avgOut'), `${averageCaloriesOut} kcal`, t('reportsPage.metrics.activityCount', { count: totalActivities })],
    [t('reportsPage.metrics.avgNet'), `${averageNetCalories} kcal`, t('reportsPage.metrics.activeMinutes', { count: totalActiveMinutes })],
    [t('reportsPage.metrics.streak'), `${streak} ${t('common.days')}`, t('reportsPage.metrics.streakHelper')],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('reportsPage.title')}</h1>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Form.Select className="page-date-input" value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="daily">{t('reportsPage.daily')}</option>
            <option value="weekly">{t('common.sevenDays')}</option>
            <option value="monthly">{t('common.thisMonth')}</option>
          </Form.Select>
          {range === 'daily' && (
            <Form.Control
              className="page-date-input"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          )}
        </div>
      </div>

      {loading && <div className="alert alert-light border">{t('reportsPage.loading')}</div>}
      {loadError && <div className="alert alert-warning">{loadError}</div>}

      <Row className="g-3 mb-4">
        {metricCards.map(([label, value, helper]) => (
          <Col md={6} xl={3} key={label}>
            <Card className="metric-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className="small text-secondary">{label}</div>
                <div className="metric-value">{value}</div>
                <div className="small text-success fw-semibold">{helper}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('reportsPage.caloriesTitle')}</Card.Title>
              <div className="dashboard-chart dashboard-chart-bar">
                <Bar data={caloriesData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('reportsPage.macroTitle')}</Card.Title>
              <div className="dashboard-chart dashboard-chart-bar">
                <Line data={macroData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Reports;
