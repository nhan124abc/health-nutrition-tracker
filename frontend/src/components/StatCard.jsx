import { Card } from 'react-bootstrap';

function StatCard({ title, value, helper, variant = 'success' }) {
  return (
    <Card className="h-100 border-0 shadow-sm stat-card">
      <Card.Body>
        <div className={`small fw-semibold text-${variant} mb-2`}>{title}</div>
        <div className="display-6 fw-bold mb-1">{value}</div>
        <div className="text-secondary small">{helper}</div>
      </Card.Body>
    </Card>
  );
}

export default StatCard;
