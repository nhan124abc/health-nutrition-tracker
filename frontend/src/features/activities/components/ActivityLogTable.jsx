import { Button, Card, Table } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';
import { getActivityCompletionId } from '../../../utils/completionStorage';

function ActivityLogTable({ completedIds = [], loading, logs, onToggleComplete, t }) {
  return (
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

                return (
                <tr className={completed ? 'is-completed' : ''} key={log.id}>
                  <td>
                    <strong>{log.customName}</strong>
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
                      onClick={() => onToggleComplete?.(log)}
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
  );
}

export default ActivityLogTable;
