import { useState } from 'react';
import { Button, Card, Modal, Table } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';
import { getActivityCompletionId } from '../../../utils/completionStorage';
import { getLocalizedName } from '../../../utils/localizedName';

function ActivityLogTable({ activityTypes = [], completedIds = [], language, loading, logs, onToggleComplete, t }) {
  const [selectedLog, setSelectedLog] = useState(null);

  const getActivityType = (log) => activityTypes.find((type) => String(type.id) === String(log.typeId));

  const getActivityName = (log) => {
    const activityType = getActivityType(log);
    return activityType ? getLocalizedName(activityType, language) : log.customName;
  };

  const formatValue = (value, suffix = '') => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return `${value}${suffix}`;
  };

  const selectedLogMetrics = selectedLog ? [
    [t('common.calories'), formatValue(selectedLog.calories, ' kcal')],
    [t('activityPage.fields.durationMinutes'), formatValue(selectedLog.duration, ` ${t('common.minutes')}`)],
    [t('activityPage.fields.distance'), formatValue(selectedLog.distance, ' km')],
    [t('activityPage.fields.avgHeartRate'), formatValue(selectedLog.avgHeartRate, ' bpm')],
    [t('activityPage.fields.maxHeartRate'), formatValue(selectedLog.maxHeartRate, ' bpm')],
    [t('activityPage.fields.userWeight'), formatValue(selectedLog.userWeight, ' kg')],
  ] : [];

  const selectedLogRows = selectedLog ? [
    [t('activityPage.fields.activityType'), t(`activityPage.categories.${selectedLog.category}`, selectedLog.category)],
    [t('common.date'), selectedLog.date || '-'],
    [t('activityPage.fields.logTime'), selectedLog.time || '-'],
    [t('activityPage.fields.sets'), formatValue(selectedLog.sets)],
    [t('activityPage.fields.reps'), formatValue(selectedLog.reps)],
    [t('activityPage.fields.strengthWeight'), formatValue(selectedLog.strengthWeight, ' kg')],
  ] : [];

  const openLogDetail = (log) => {
    setSelectedLog(log);
  };

  const handleRowKeyDown = (event, log) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openLogDetail(log);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
            <Card.Title className="fw-bold mb-0">{t('activityPage.listTitle')}</Card.Title>
          </div>
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('common.activity')}</th>
                  <th>{t('activityPage.fields.logTime')}</th>
                  <th className="text-end">{t('common.duration')}</th>
                  <th className="text-end">{t('common.calories')}</th>
                  <th className="text-end">HR</th>
                  <th className="text-end">{t('common.details')}</th>
                  <th className="text-end">{t('activityPage.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const completed = completedIds.includes(getActivityCompletionId(log));
                  const activityName = getActivityName(log);

                  return (
                  <tr
                    className={`clickable-row${completed ? ' is-completed' : ''}`}
                    key={log.id}
                    onClick={() => openLogDetail(log)}
                    onKeyDown={(event) => handleRowKeyDown(event, log)}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <strong>{activityName}</strong>
                      <div className="text-secondary small">
                        {t(`activityPage.categories.${log.category}`)} - {log.notes || t('common.noNotes')}
                      </div>
                    </td>
                    <td>{log.time}</td>
                    <td className="text-end">{log.duration} {t('common.minutes')}</td>
                    <td className="text-end">{log.calories}</td>
                    <td className="text-end">{log.avgHeartRate || '-'} / {log.maxHeartRate || '-'}</td>
                    <td className="text-end">
                      {log.category === 'strength'
                        ? `${log.sets || '-'} ${t('activityPage.fields.sets')} - ${log.reps || '-'} ${t('activityPage.fields.reps')} - ${log.strengthWeight || '-'}kg`
                        : `${log.distance || '-'} km`}
                    </td>
                    <td className="text-end">
                      <Button
                        variant="link"
                        size="sm"
                        className="completion-action"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleComplete?.(log);
                        }}
                        aria-pressed={completed}
                        aria-label={t(completed ? 'activityPage.activityCompleted' : 'activityPage.markActivityCompleted')}
                        title={t(completed ? 'activityPage.activityCompleted' : 'activityPage.markActivityCompleted')}
                      >
                        <FaCheck />
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          {!loading && logs.length === 0 && (
            <p className="text-secondary text-center mb-0 py-4">{t('activityPage.notFound')}</p>
          )}
        </Card.Body>
      </Card>

      <Modal show={Boolean(selectedLog)} onHide={() => setSelectedLog(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedLog ? `${getActivityName(selectedLog)} - ${selectedLog.time || selectedLog.date}` : ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <>
              <h3 className="h5 fw-bold mb-1">{getActivityName(selectedLog)}</h3>
              <p className="text-secondary mb-3">{selectedLog.notes || t('common.noNotes')}</p>
              <div className="nutrition-detail-grid mb-4">
                {selectedLogMetrics.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="table-responsive">
                <Table size="sm" hover className="align-middle mb-0">
                  <tbody>
                    {selectedLogRows.map(([label, value]) => (
                      <tr key={label}>
                        <th className="text-secondary fw-semibold">{label}</th>
                        <td className="text-end">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

export default ActivityLogTable;
