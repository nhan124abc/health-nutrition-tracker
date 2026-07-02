import { Fragment } from 'react';
import { Card, Table } from 'react-bootstrap';
import CrudActions from '../../../components/CrudActions';

function ProfileMetrics({
  metrics,
  onDelete,
  onEdit,
  editingMetric,
  t,
  titleKey = 'profilePage.metricHistory',
}) {
  const showActions = Boolean(onDelete);
  const canEdit = Boolean(onEdit);
  const formatMetricValue = (value, suffix = '') => (
    value === null || value === undefined || value === '' ? '-' : `${value}${suffix}`
  );
  const isEditingMetric = (metric) => editingMetric?.id === metric.id;
  const handleSelectMetric = (metric) => {
    if (onEdit) {
      onEdit(metric);
    }
  };
  const handleMetricKeyDown = (event, metric) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectMetric(metric);
    }
  };

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
                  <th className="text-end">{t('bodyMetricsPage.table.bodyFat')}</th>
                  <th className="text-end">{t('bodyMetricsPage.table.bmi')}</th>
                  <th className="text-end">{t('bodyMetricsPage.table.bmr')}</th>
                  <th className="text-end">{t('bodyMetricsPage.table.measurements')}</th>
                  {showActions && <th className="text-end">{t('admin.table.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {metrics.map((item) => (
                  <Fragment key={item.id}>
                    <tr
                      className={`${canEdit ? 'body-metric-history-row' : ''} ${isEditingMetric(item) ? 'is-selected' : ''}`.trim()}
                      role={canEdit ? 'button' : undefined}
                      tabIndex={canEdit ? 0 : undefined}
                      onClick={() => handleSelectMetric(item)}
                      onKeyDown={(event) => handleMetricKeyDown(event, item)}
                      aria-expanded={canEdit ? isEditingMetric(item) : undefined}
                    >
                      <td>{String(item.recordedAt || item.date).slice(0, 10)}</td>
                      <td className="text-end">{formatMetricValue(item.weightKg ?? item.weight, 'kg')}</td>
                      <td className="text-end">{formatMetricValue(item.bodyFatPercentage ?? item.bodyFat, '%')}</td>
                      <td className="text-end">{formatMetricValue(item.bmi)}</td>
                      <td className="text-end">{formatMetricValue(item.bmr, ' kcal')}</td>
                      <td className="text-end">{item.waistCm ?? item.waist ?? '-'}/{item.hipCm ?? item.hip ?? '-'}/{item.chestCm ?? item.chest ?? '-'}cm</td>
                      {showActions && (
                        <td className="text-end">
                          <CrudActions
                            deleteLabel={t('bodyMetricsPage.deleteMetric')}
                            onDelete={onDelete ? () => onDelete(item) : undefined}
                            stopPropagation
                          />
                        </td>
                      )}
                    </tr>
                  </Fragment>
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
