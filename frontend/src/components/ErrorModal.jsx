import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

function ErrorModal({ error, onClose, title }) {
  const { t } = useTranslation();

  return (
    <Modal show={Boolean(error)} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title || t('goalPlannerPage.errors.title', 'Notice')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{error}</Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={onClose}>{t('common.close')}</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ErrorModal;
