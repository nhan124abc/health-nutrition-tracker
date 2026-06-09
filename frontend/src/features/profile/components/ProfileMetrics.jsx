import { Card, Table } from 'react-bootstrap';

function ProfileMetrics({ metrics, t, titleKey = 'profilePage.metricHistory' }) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <Card.Title className="fw-bold mb-3">{t(titleKey)}</Card.Title>
        {metrics.length === 0 ? (
          <p className="text-secondary mb-0">{t('profilePage.noMetrics')}</p>
        ) : (
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
                    <td>{String(item.recordedAt || item.date).slice(0, 10)}</td>
                    <td className="text-end">{item.weightKg ?? item.weight ?? '-'}kg</td>
                    <td className="text-end">{item.bmi ?? '-'}</td>
                    <td className="text-end">{item.bodyFatPercentage ?? item.bodyFat ?? '-'}%</td>
                    <td className="text-end">{item.muscleMassKg ?? item.muscleMass ?? '-'}kg</td>
                    <td className="text-end">{item.waistCm ?? item.waist ?? '-'}/{item.hipCm ?? item.hip ?? '-'}/{item.chestCm ?? item.chest ?? '-'}cm</td>
                    <td>{item.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

export default ProfileMetrics;
