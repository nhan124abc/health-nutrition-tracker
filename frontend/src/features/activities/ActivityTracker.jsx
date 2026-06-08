import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';

const activityTypes = [
  { id: 'run', nameKey: 'activityPage.types.running', category: 'cardio', met: 8.3 },
  { id: 'walk', nameKey: 'activityPage.types.walking', category: 'cardio', met: 3.8 },
  { id: 'strength', nameKey: 'activityPage.types.strength', category: 'strength', met: 5.0 },
  { id: 'cycling', nameKey: 'activityPage.types.cycling', category: 'cardio', met: 7.5 },
];

const initialLogs = [
  {
    id: 'A001',
    typeId: 'run',
    customName: '',
    date: '2026-05-21',
    time: '06:30',
    duration: 35,
    userWeight: 67,
    calories: 325,
    distance: 5.2,
    avgHeartRate: 142,
    maxHeartRate: 168,
    sets: '',
    reps: '',
    strengthWeight: '',
    steps: 5200,
    notesKey: 'activityPage.sampleNotes.morningRun',
  },
  {
    id: 'A002',
    typeId: 'strength',
    customName: 'Upper body',
    date: '2026-05-21',
    time: '18:00',
    duration: 40,
    userWeight: 67,
    calories: 225,
    distance: '',
    avgHeartRate: 118,
    maxHeartRate: 145,
    sets: 12,
    reps: 10,
    strengthWeight: 45,
    steps: '',
    notesKey: '',
  },
];

const emptyLog = {
  typeId: 'run',
  customName: '',
  date: '2026-05-21',
  time: '19:00',
  duration: 30,
  userWeight: 67,
  distance: '',
  avgHeartRate: '',
  maxHeartRate: '',
  sets: '',
  reps: '',
  strengthWeight: '',
  steps: '',
  notes: '',
};

function ActivityTracker() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState('2026-05-21');
  const [category, setCategory] = useState('all');
  const [logs, setLogs] = useState(initialLogs);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyLog);
  const [editingLogId, setEditingLogId] = useState(null);

  const filteredTypes = category === 'all' ? activityTypes : activityTypes.filter((type) => type.category === category);
  const dayLogs = logs.filter((log) => log.date === selectedDate);

  const summary = useMemo(() => {
    return dayLogs.reduce(
      (sum, log) => ({
        calories: sum.calories + log.calories,
        minutes: sum.minutes + Number(log.duration),
        steps: sum.steps + Number(log.steps || 0),
      }),
      { calories: 0, minutes: 0, steps: 0 }
    );
  }, [dayLogs]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const calculateCalories = () => {
    const type = activityTypes.find((item) => item.id === form.typeId);
    return Math.round(((type?.met || 4) * 3.5 * Number(form.userWeight || 0) * Number(form.duration || 0)) / 200);
  };

  const openCreateModal = () => {
    setEditingLogId(null);
    setForm({ ...emptyLog, date: selectedDate });
    setShowModal(true);
  };

  const openEditModal = (log) => {
    setEditingLogId(log.id);
    setForm({
      ...emptyLog,
      ...log,
      notes: log.notes || '',
      notesKey: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLogId(null);
    setForm({ ...emptyLog, date: selectedDate });
  };

  const saveLog = () => {
    const savedLog = {
      ...form,
      calories: calculateCalories(),
      notesKey: '',
    };

    if (editingLogId) {
      setLogs((current) => current.map((log) => (log.id === editingLogId ? { ...savedLog, id: editingLogId } : log)));
    } else {
      setLogs((current) => [
        ...current,
        {
          ...savedLog,
          id: `A${Date.now()}`,
        },
      ]);
    }

    closeModal();
  };

  const removeLog = (id) => {
    setLogs((current) => current.filter((log) => log.id !== id));
  };

  const fieldLabels = [
    ['customName', 'activityPage.fields.customName', 'text'],
    ['date', 'common.date', 'date'],
    ['time', 'activityPage.fields.logTime', 'time'],
    ['duration', 'activityPage.fields.durationMinutes', 'number'],
    ['userWeight', 'activityPage.fields.userWeight', 'number'],
    ['distance', 'activityPage.fields.distance', 'number'],
    ['avgHeartRate', 'activityPage.fields.avgHeartRate', 'number'],
    ['maxHeartRate', 'activityPage.fields.maxHeartRate', 'number'],
    ['sets', 'activityPage.fields.sets', 'number'],
    ['reps', 'activityPage.fields.reps', 'number'],
    ['strengthWeight', 'activityPage.fields.strengthWeight', 'number'],
    ['steps', 'common.steps', 'number'],
    ['notes', 'common.notes', 'text'],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <Badge bg="success" className="mb-2">{t('activityPage.badge')}</Badge>
          <h1>{t('activityPage.title')}</h1>
          <p>{t('activityPage.description')}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input className="form-control page-date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <Button variant="success" onClick={openCreateModal}>
            <FaPlus className="me-2" />
            {t('activityPage.addActivity')}
          </Button>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
                <Card.Title className="fw-bold mb-0">{t('activityPage.listTitle')}</Card.Title>
                <Form.Select className="page-date-input" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="all">{t('activityPage.allCategories')}</option>
                  <option value="cardio">{t('activityPage.categories.cardio')}</option>
                  <option value="strength">{t('activityPage.categories.strength')}</option>
                </Form.Select>
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
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {dayLogs.map((log) => {
                      const type = activityTypes.find((item) => item.id === log.typeId);
                      const typeName = type ? t(type.nameKey) : '';
                      const notes = log.notes || (log.notesKey ? t(log.notesKey) : '');

                      return (
                        <tr key={log.id}>
                          <td>
                            <strong>{log.customName || typeName}</strong>
                            <div className="text-secondary small">{t(`activityPage.categories.${type?.category}`)} - {notes || t('common.noNotes')}</div>
                          </td>
                          <td>{log.time}</td>
                          <td className="text-end">{log.duration} {t('common.minutes')}</td>
                          <td className="text-end">{log.calories}</td>
                          <td className="text-end">{log.avgHeartRate || '-'} / {log.maxHeartRate || '-'}</td>
                          <td className="text-end">
                            {type?.category === 'strength'
                              ? `${log.sets} ${t('activityPage.fields.sets')} - ${log.reps} ${t('activityPage.fields.reps')} - ${log.strengthWeight}kg`
                              : `${log.distance || '-'} km - ${log.steps || '-'} ${t('common.steps')}`}
                          </td>
                          <td className="text-end">
                            <Button variant="outline-primary" size="sm" onClick={() => openEditModal(log)} aria-label={t('activityPage.updateLog')}>
                              <FaEdit />
                            </Button>
                          </td>
                          <td className="text-end">
                            <Button variant="outline-danger" size="sm" onClick={() => removeLog(log.id)} aria-label={t('activityPage.deleteLog')}>
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm sticky-panel">
            <Card.Body>
              <Card.Title className="fw-bold mb-3">{t('common.dailySummary')}</Card.Title>
              <div className="quick-grid">
                <span>{t('common.caloriesOut')}<strong>{summary.calories}</strong></span>
                <span>{t('activityPage.activityCount')}<strong>{dayLogs.length}</strong></span>
                <span>{t('common.activeMinutes')}<strong>{summary.minutes}</strong></span>
                <span>{t('common.steps')}<strong>{summary.steps}</strong></span>
              </div>
              <hr />
              <h3 className="h6 fw-bold">{t('activityPage.typeTitle')}</h3>
              <div className="d-grid gap-2">
                {filteredTypes.map((type) => (
                  <div className="type-pill" key={type.id}>
                    <span>{t(type.nameKey)}</span>
                    <Badge bg="light" text="dark">{t(`activityPage.categories.${type.category}`)}</Badge>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingLogId ? t('activityPage.updateLogTitle') : t('activityPage.newLogTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('activityPage.fields.activityType')}</Form.Label>
                <Form.Select name="typeId" value={form.typeId} onChange={handleChange}>
                  {activityTypes.map((type) => <option value={type.id} key={type.id}>{t(type.nameKey)}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            {fieldLabels.map(([name, labelKey, type]) => (
              <Col md={4} key={name}>
                <Form.Group>
                  <Form.Label>{t(labelKey)}</Form.Label>
                  <Form.Control type={type} name={name} value={form[name]} onChange={handleChange} />
                </Form.Group>
              </Col>
            ))}
          </Row>
          <div className="planner-modal-calories mt-3">
            {t('activityPage.estimatedCalories')}: <strong>{calculateCalories()} kcal</strong>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeModal}>{t('common.cancel')}</Button>
          <Button variant="success" onClick={saveLog}>
            {editingLogId ? t('activityPage.updateLog') : t('activityPage.saveActivity')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ActivityTracker;
