import { Badge, Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

function PlaceholderPage({ titleKey, descriptionKey }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-4">
        <Badge bg="success" className="mb-2">
          {t(titleKey)}
        </Badge>
        <h1 className="h2 fw-bold mb-1">{t(titleKey)}</h1>
        <p className="text-secondary mb-0">{t(descriptionKey)}</p>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <p className="mb-0 text-secondary">{t('placeholder.message')}</p>
        </Card.Body>
      </Card>
    </>
  );
}

export default PlaceholderPage;
