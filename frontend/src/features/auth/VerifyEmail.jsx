import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { confirmEmailVerification, sendEmailVerification } from './authService';

function VerifyEmail() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmail = useMemo(() => {
    const queryEmail = new URLSearchParams(location.search).get('email');
    return queryEmail || location.state?.email || '';
  }, [location.search, location.state]);

  const [form, setForm] = useState({ email: initialEmail, otp: '' });
  const [messageKey, setMessageKey] = useState(initialEmail ? 'auth.emailVerifyInitial' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resendOtp = async () => {
    setError('');
    setMessageKey('');
    setResending(true);

    try {
      await sendEmailVerification(form.email);
      setMessageKey('auth.emailVerifyResent');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.emailVerifySendError'));
    } finally {
      setResending(false);
    }
  };

  const verifyEmail = async (event) => {
    event.preventDefault();
    setError('');
    setMessageKey('');
    setLoading(true);

    try {
      await confirmEmailVerification({
        email: form.email,
        otp: form.otp,
      });
      setMessageKey('auth.emailVerifySuccess');
      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.emailVerifyError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="auth-page">
      <Row className="min-vh-100 align-items-center justify-content-center px-3">
        <Col xs={12} md={8} lg={5} xl={4}>
          <Card className="auth-card border-0 shadow-sm">
            <Card.Body className="p-4 p-md-5">
              <div className="d-flex justify-content-end mb-3">
                <LanguageSwitcher />
              </div>

              <div className="mb-4">
                <div className="auth-brand">{t('app.name')}</div>
                <h1 className="h3 fw-bold mb-2">{t('auth.verifyEmailTitle')}</h1>
                <p className="text-secondary mb-0">
                  {t('auth.verifyEmailDescription')}
                </p>
              </div>

              {messageKey && <Alert variant="success">{t(messageKey)}</Alert>}
              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={verifyEmail}>
                <Form.Group className="mb-3" controlId="verifyEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="verifyOtp">
                  <Form.Label>OTP</Form.Label>
                  <Form.Control
                    name="otp"
                    value={form.otp}
                    onChange={handleChange}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder={t('auth.otpInputPlaceholder')}
                    required
                  />
                </Form.Group>

                <Button className="w-100" variant="success" type="submit" disabled={loading}>
                  {loading ? t('auth.verifyingEmail') : t('auth.verifyEmail')}
                </Button>
              </Form>

              <Button
                className="w-100 mt-3"
                variant="outline-secondary"
                type="button"
                onClick={resendOtp}
                disabled={resending || !form.email}
              >
                {resending ? t('auth.resendingOtp') : t('auth.resendOtp')}
              </Button>

              <p className="text-center text-secondary mt-4 mb-0">
                <Link to="/login">{t('auth.backToLogin')}</Link>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default VerifyEmail;
