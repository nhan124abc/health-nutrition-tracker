import {
  CategoryScale,
  Chart as ChartJS,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Col, Form, Row, Table } from 'react-bootstrap';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const initialMetrics = [
  { id: 1, date: '2026-05-01', weight: 68.2, bodyFat: 22.1, muscleMass: 31.2, waist: 82, hip: 96, chest: 91, notesKey: 'bodyMetricsPage.sampleNotes.startMonth' },
  { id: 2, date: '2026-05-10', weight: 67.8, bodyFat: 21.8, muscleMass: 31.4, waist: 81, hip: 96, chest: 91, notesKey: '' },
  { id: 3, date: '2026-05-21', weight: 67.4, bodyFat: 21.2, muscleMass: 31.7, waist: 80, hip: 95, chest: 92, notesKey: 'bodyMetricsPage.sampleNotes.afterThreeWeeks' },
];

const emptyMetric = {
  date: '2026-05-21',
  weight: '',
  bodyFat: '',
  muscleMass: '',
  waist: '',
  hip: '',
  chest: '',
  notes: '',
};

function BodyMetrics() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState(initialMetrics);
  const [form, setForm] = useState(emptyMetric);

  const chartData = useMemo(() => {
    const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));

    return {
      labels: sorted.map((item) => item.date.slice(5)),
      datasets: [
        {
          label: t('bodyMetricsPage.fields.weight'),
          data: sorted.map((item) => item.weight),
          borderColor: '#2f8f6b',
          backgroundColor: '#2f8f6b',
          tension: 0.3,
        },
        {
          label: 'BMI',
          data: sorted.map((item) => Number((item.weight / (1.72 ** 2)).toFixed(1))),
          borderColor: '#4f7cac',
          backgroundColor: '#4f7cac',
          tension: 0.3,
        },
        {
          label: t('bodyMetricsPage.fields.bodyFat'),
          data: sorted.map((item) => item.bodyFat),
          borderColor: '#e0a458',
          backgroundColor: '#e0a458',
          tension: 0.3,
        },
      ],
    };
  }, [metrics, t]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const addMetric = (event) => {
    event.preventDefault();
    setMetrics((current) => [
      ...current,
      {
        id: Date.now(),
        date: form.date,
        weight: Number(form.weight),
        bodyFat: Number(form.bodyFat),
        muscleMass: Number(form.muscleMass),
        waist: Number(form.waist),
        hip: Number(form.hip),
        chest: Number(form.chest),
        notes: form.notes,
        notesKey: '',
      },
    ]);
    setForm(emptyMetric);
  };

  const fields = [
    ['date', 'bodyMetricsPage.fields.date', 'date'],
    ['weight', 'bodyMetricsPage.fields.weight', 'number'],
    ['bodyFat', 'bodyMetricsPage.fields.bodyFat', 'number'],
    ['muscleMass', 'bodyMetricsPage.fields.muscleMass', 'number'],
    ['waist', 'bodyMetricsPage.fields.waist', 'number'],
    ['hip', 'bodyMetricsPage.fields.hip', 'number'],
    ['chest', 'bodyMetricsPage.fields.chest', 'number'],
    ['notes', 'common.notes', 'text'],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('bodyMetricsPage.badge')}</Badge>
          <h1>{t('bodyMetricsPage.title')}</h1>
          <p>{t('bodyMetricsPage.description')}</p>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={5}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('bodyMetricsPage.addTitle')}</Card.Title>
              <Form onSubmit={addMetric}>
                <Row className="g-3">
                  {fields.map(([name, labelKey, type]) => (
                    <Col md={name === 'notes' ? 12 : 6} key={name}>
                      <Form.Group>
                        <Form.Label>{t(labelKey)}</Form.Label>
                        <Form.Control type={type} name={name} value={form[name]} onChange={handleChange} required={name !== 'notes'} />
                      </Form.Group>
                    </Col>
                  ))}
                  <Col xs={12}>
                    <Button type="submit" variant="success">{t('bodyMetricsPage.saveMetric')}</Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('bodyMetricsPage.chartTitle')}</Card.Title>
              <div className="dashboard-chart dashboard-chart-bar">
                <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('bodyMetricsPage.historyTitle')}</Card.Title>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>{t('common.date')}</th>
                      <th className="text-end">{t('common.weight')}</th>
                      <th className="text-end">BMI</th>
                      <th className="text-end">{t('bodyMetricsPage.table.bodyFat')}</th>
                      <th className="text-end">{t('bodyMetricsPage.table.muscle')}</th>
                      <th className="text-end">{t('bodyMetricsPage.table.measurements')}</th>
                      <th>{t('common.notes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((item) => (
                      <tr key={item.id}>
                        <td>{item.date}</td>
                        <td className="text-end">{item.weight}kg</td>
                        <td className="text-end">{(item.weight / (1.72 ** 2)).toFixed(1)}</td>
                        <td className="text-end">{item.bodyFat}%</td>
                        <td className="text-end">{item.muscleMass}kg</td>
                        <td className="text-end">{item.waist}/{item.hip}/{item.chest}cm</td>
                        <td>{item.notes || (item.notesKey ? t(item.notesKey) : '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default BodyMetrics;
