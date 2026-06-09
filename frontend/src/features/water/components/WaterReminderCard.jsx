import { Card, Form } from 'react-bootstrap';

function WaterReminderCard({ onSettingChange, settings, t }) {
  return (
    <Card className="border-0 shadow-sm planner-side-card">
      <Card.Body>
        <Card.Title className="fw-bold mb-3">{t('waterPage.notificationTitle')}</Card.Title>
        <Form.Check
          type="switch"
          id="water-reminder-enabled"
          label={t('waterPage.reminderEnabled')}
          checked={settings.reminderEnabled}
          onChange={(event) => onSettingChange('reminderEnabled', event.target.checked)}
        />
        <Form.Group className="mt-3">
          <Form.Label>{t('waterPage.reminderInterval')}</Form.Label>
          <Form.Control
            type="number"
            min="15"
            step="15"
            value={settings.reminderIntervalMinutes}
            onChange={(event) => onSettingChange(
              'reminderIntervalMinutes',
              Number(event.target.value) || 60
            )}
            disabled={!settings.reminderEnabled}
          />
        </Form.Group>
      </Card.Body>
    </Card>
  );
}

export default WaterReminderCard;
