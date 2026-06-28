import { useState } from 'react';
import ErrorModal from '../../../components/ErrorModal';
import { Button, Card, Form, Modal, Table } from 'react-bootstrap';
import { FaHistory } from 'react-icons/fa';
import CrudActions from '../../../components/CrudActions';

function WaterHistoryCard({
  logs,
  onDelete,
  onUpdate,
  t,
}) {
  const [editingLog, setEditingLog] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditModal = (log) => {
    setEditingLog(log);
    setEditingAmount(log.amountMl);
    setEditError('');
  };

  const closeEditModal = () => {
    if (saving) {
      return;
    }

    setEditingLog(null);
    setEditingAmount('');
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editingLog) {
      return;
    }

    const normalizedAmount = Number(editingAmount) || 0;

    if (normalizedAmount <= 0 || normalizedAmount > 10000) {
      setEditError(t('waterPage.invalidAmount'));
      return;
    }

    setEditError('');
    setSaving(true);

    try {
      await onUpdate(editingLog, normalizedAmount);
      setEditingLog(null);
      setEditingAmount('');
      setEditError('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
                          size="sm"
                          className="text-end water-history-readonly-input"
                          value={log.amountMl}
                          readOnly
                          aria-label={t('waterPage.amount')}
                        />
                      </td>
                      <td className="text-end">
                        <CrudActions
                          editLabel={t('waterPage.editLog')}
                          deleteLabel={t('waterPage.deleteLog')}
                          onEdit={() => openEditModal(log)}
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

      <Modal show={Boolean(editingLog)} onHide={closeEditModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('waterPage.editLogTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>{t('waterPage.amount')}</Form.Label>
            <Form.Control
              type="number"
              min="1"
              max="10000"
              value={editingAmount}
              onChange={(event) => {
                setEditingAmount(event.target.value);
                setEditError('');
              }}
              disabled={saving}
              autoFocus
            />
            <ErrorModal error={editError} onClose={() => setEditError('')} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeEditModal} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="success" onClick={saveEdit} disabled={saving}>
            {saving ? t('waterPage.savingLog') : t('common.save')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default WaterHistoryCard;
