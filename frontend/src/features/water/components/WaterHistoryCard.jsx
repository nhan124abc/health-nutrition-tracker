import { Card, Form, Table } from 'react-bootstrap';
import { FaHistory } from 'react-icons/fa';
import CrudActions from '../../../components/CrudActions';

function WaterHistoryCard({
  draftAmounts,
  logs,
  onDelete,
  onDraftChange,
  onUpdate,
  t,
}) {
  return (
    <Card className="border-0 shadow-sm planner-side-card">
      <Card.Body>
        <div className="d-flex align-items-center gap-2 mb-3">
          <FaHistory className="text-secondary" />
          <Card.Title className="fw-bold mb-0">{t('waterPage.history')}</Card.Title>
        </div>

        {logs.length === 0 ? (
          <p className="text-secondary small mb-0">{t('waterPage.noHistory')}</p>
        ) : (
          <div className="table-responsive">
            <Table size="sm" hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('waterPage.time')}</th>
                  <th className="text-end">{t('waterPage.amount')}</th>
                  <th className="text-end">{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{String(log.loggedAt).slice(11, 16)}</td>
                    <td className="text-end">
                      <Form.Control
                        type="number"
                        min="1"
                        max="10000"
                        size="sm"
                        className="text-end"
                        value={draftAmounts[log.id] ?? log.amountMl}
                        onChange={(event) => onDraftChange(log.id, event.target.value)}
                      />
                    </td>
                    <td className="text-end">
                      <CrudActions
                        editLabel={t('waterPage.updateLog')}
                        deleteLabel={t('waterPage.deleteLog')}
                        onEdit={() => onUpdate(log, draftAmounts[log.id] ?? log.amountMl)}
                        onDelete={() => onDelete(log)}
                      />
                    </td>
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

export default WaterHistoryCard;
