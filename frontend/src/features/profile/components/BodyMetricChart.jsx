import {
  CategoryScale,
  Chart as ChartJS,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Card } from 'react-bootstrap';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

function BodyMetricChart({ metrics, t }) {
  const chartData = useMemo(() => {
    const sorted = [...metrics].sort((first, second) =>
      String(first.recordedAt).localeCompare(String(second.recordedAt))
    );

    return {
      labels: sorted.map((item) => String(item.recordedAt).slice(5)),
      datasets: [
        {
          label: t('bodyMetricsPage.fields.weight'),
          data: sorted.map((item) => item.weightKg),
          borderColor: '#2f8f6b',
          backgroundColor: '#2f8f6b',
          tension: 0.3,
        },
        {
          label: t('bodyMetricsPage.fields.waist'),
          data: sorted.map((item) => item.waistCm),
          borderColor: '#4f7cac',
          backgroundColor: '#4f7cac',
          tension: 0.3,
        },
        {
          label: t('bodyMetricsPage.fields.hip'),
          data: sorted.map((item) => item.hipCm),
          borderColor: '#e0a458',
          backgroundColor: '#e0a458',
          tension: 0.3,
        },
        {
          label: t('bodyMetricsPage.fields.chest'),
          data: sorted.map((item) => item.chestCm),
          borderColor: '#c9829b',
          backgroundColor: '#c9829b',
          tension: 0.3,
        },
      ],
    };
  }, [metrics, t]);

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <Card.Title className="fw-bold mb-3">{t('bodyMetricsPage.chartTitle')}</Card.Title>
        {metrics.length === 0 ? (
          <p className="text-secondary mb-0">{t('profilePage.noMetrics')}</p>
        ) : (
          <div className="dashboard-chart dashboard-chart-bar">
            <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

export default BodyMetricChart;
