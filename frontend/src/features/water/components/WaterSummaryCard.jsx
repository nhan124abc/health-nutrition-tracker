import { Badge, Button, Card, Form, ProgressBar } from 'react-bootstrap';
import { FaBell, FaPlus, FaTint } from 'react-icons/fa';
import { quickWaterAmounts } from '../waterUtils';

function WaterSummaryCard({
  error,
  goalInput,
  notice,
  onAddWater,
  onGoalInputChange,
  onSaveGoal,
  onWaterAmountChange,
  progress,
  reminderMessage,
  settings,
  t,
  totalWaterMl,
  waterAmount,
}) {
  return (
    <Card className="border-0 shadow-sm planner-side-card">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="water-glass"><FaTint /></span>
            <div>
              <Card.Title className="fw-bold mb-0">{t('waterPage.todayTitle')}</Card.Title>
              <Card.Text className="text-secondary small mb-0">
                {t('waterPage.totalToday', { total: totalWaterMl, goal: settings.goalMl })}
              </Card.Text>
            </div>
          </div>
          <Badge bg={progress >= 100 ? 'success' : 'info'}>{Math.round(progress)}%</Badge>
        </div>

        <ProgressBar now={progress} className="mb-3" />

        {error && <div className="alert alert-warning py-2">{error}</div>}
        {notice && <div className="alert alert-success py-2">{notice}</div>}
        {reminderMessage && (
          <div className="alert alert-info py-2 d-flex align-items-center gap-2">
            <FaBell />
            <span>{reminderMessage}</span>
          </div>
        )}

        <Form.Group className="mb-3">
          <Form.Label>{t('waterPage.goal')}</Form.Label>
          <div className="d-flex gap-2">
            <Form.Control
              type="number"
              min="100"
              max="10000"
              step="50"
              value={goalInput}
              onChange={(event) => onGoalInputChange(event.target.value)}
            />
            <Button variant="outline-success" onClick={onSaveGoal}>{t('common.save')}</Button>
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{t('waterPage.addAmount')}</Form.Label>
          <div className="d-flex gap-2">
            <Form.Control
              type="number"
              min="1"
              step="50"
              value={waterAmount}
              onChange={(event) => onWaterAmountChange(event.target.value)}
            />
            <Button variant="info" className="text-white" onClick={() => onAddWater()}>
              <FaPlus className="me-2" />
              {t('waterPage.addLog')}
            </Button>
          </div>
        </Form.Group>

        <div className="d-flex flex-wrap gap-2">
          {quickWaterAmounts.map((amount) => (
            <Button
              key={amount}
              variant="outline-info"
              size="sm"
              onClick={() => onAddWater(amount)}
            >
              +{amount} ml
            </Button>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

export default WaterSummaryCard;
