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
import { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Col, Form, Row } from 'react-bootstrap';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

function Reports() {
  const { t } = useTranslation();
  const [range, setRange] = useState('weekly');

  const labels = range === 'weekly'
    ? t('common.weekdayShort', { returnObjects: true })
    : Array.from({ length: 30 }, (_, index) => `${index + 1}`);

  const caloriesData = {
    labels,
    datasets: [
      {
        label: t('common.caloriesIn'),
        data: labels.map((_, index) => 1700 + ((index * 83) % 420)),
        backgroundColor: '#2f8f6b',
        borderRadius: 6,
      },
      {
        label: t('common.caloriesOut'),
        data: labels.map((_, index) => 300 + ((index * 47) % 360)),
        backgroundColor: '#4f7cac',
        borderRadius: 6,
      },
    ],
  };

  const macroData = {
    labels,
    datasets: [
      { label: t('common.protein'), data: labels.map((_, i) => 95 + ((i * 7) % 35)), borderColor: '#2f8f6b', tension: 0.3 },
      { label: t('common.carbs'), data: labels.map((_, i) => 170 + ((i * 11) % 70)), borderColor: '#4f7cac', tension: 0.3 },
      { label: t('common.fat'), data: labels.map((_, i) => 48 + ((i * 5) % 25)), borderColor: '#e0a458', tension: 0.3 },
    ],
  };

  const metricCards = [
    [t('reportsPage.metrics.avgIn'), '1,886 kcal', '+3.2%'],
    [t('reportsPage.metrics.avgOut'), '472 kcal', '+8.5%'],
    [t('reportsPage.metrics.avgNet'), '1,414 kcal', '-2.1%'],
    [t('reportsPage.metrics.streak'), t('reportsPage.metrics.excellent'), t('reportsPage.metrics.streakHelper')],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('reportsPage.badge')}</Badge>
          <h1>{t('reportsPage.title')}</h1>
          <p>{t('reportsPage.description')}</p>
        </div>
        <Form.Select className="page-date-input" value={range} onChange={(event) => setRange(event.target.value)}>
          <option value="weekly">{t('common.sevenDays')}</option>
          <option value="monthly">{t('common.thisMonth')}</option>
        </Form.Select>
      </div>

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
