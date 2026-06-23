import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import {
  requestPasswordReset,
  resetPassword as submitPasswordReset,
  verifyPasswordResetOtp,
} from './authService';

function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [form, setForm] = useState({ email: '', otp: '', newPassword: '', confirmPassword: '' });
  const [messageKey, setMessageKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const requestOtp = async (event) => {
    event.preventDefault();
    setError('');
    setMessageKey('');
    setLoading(true);

    try {
      await requestPasswordReset(form.email);
      setMessageKey('auth.otpSent');
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.sendOtpError'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setError('');
    setMessageKey('');
    setLoading(true);

    try {
      await verifyPasswordResetOtp({
        email: form.email,
        otp: form.otp,
      });
      setMessageKey('auth.otpVerified');
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.otpVerifyError'));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessageKey('');

    if (form.newPassword !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await submitPasswordReset({
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword,
      });
      setMessageKey('auth.resetSuccess');
      setTimeout(() => navigate('/login', { replace: true }), 800);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.resetError'));
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
                <h1 className="h3 fw-bold mb-2">{t('auth.forgotTitle')}</h1>
              </div>

              {messageKey && <Alert variant="success">{t(messageKey)}</Alert>}
              {error && <Alert variant="danger">{error}</Alert>}

              {step === 'request' ? (
                <Form onSubmit={requestOtp}>
                  <Form.Group className="mb-4" controlId="forgotEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Button className="w-100" variant="success" type="submit" disabled={loading}>
                    {loading ? t('auth.sending') : t('auth.sendOtp')}
                  </Button>
                </Form>
              ) : step === 'otp' ? (
                <Form onSubmit={verifyOtp}>
                  <Form.Group className="mb-4" controlId="otp">
                    <Form.Label>OTP</Form.Label>
                    <Form.Control
                      name="otp"
                      value={form.otp}
                      onChange={handleChange}
                      placeholder={t('auth.otpPlaceholder')}
                      required
                    />
                  </Form.Group>
                  <Button className="w-100" variant="success" type="submit" disabled={loading}>
                    {loading ? t('auth.verifyingOtp') : t('auth.verifyOtp')}
                  </Button>
                  <Button
                    className="w-100 mt-2"
                    variant="outline-secondary"
                    type="button"
                    disabled={loading}
                    onClick={() => setStep('request')}
                  >
                    {t('auth.changeEmail')}
                  </Button>
                </Form>
              ) : (
                <Form onSubmit={resetPassword}>
                  <Form.Group className="mb-3" controlId="newPassword">
                    <Form.Label>{t('auth.newPassword')}</Form.Label>
                    <Form.Control
                      type="password"
                      name="newPassword"
                      value={form.newPassword}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-4" controlId="confirmPassword">
                    <Form.Label>{t('auth.confirmPassword')}</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Button className="w-100" variant="success" type="submit" disabled={loading}>
                    {loading ? t('auth.resetting') : t('auth.resetPassword')}
                  </Button>
                </Form>
              )}

              <div className="auth-form-meta justify-content-center mt-4 mb-0">
                <Link to="/login" className="auth-subtle-link">
                  {t('auth.backToLogin')}
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default ForgotPassword;
