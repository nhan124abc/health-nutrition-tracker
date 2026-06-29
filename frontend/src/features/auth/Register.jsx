import { useState } from 'react';
import { Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ErrorModal from '../../components/ErrorModal';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { FaArrowLeft } from 'react-icons/fa';
import { register } from './authService';

function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`, {
        state: { email: form.email },
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('auth.registerError'));
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
              <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                <Link to="/" className="admin-back-link mb-0" aria-label={t('auth.backToHome')} title={t('auth.backToHome')}>
                  <FaArrowLeft />
                </Link>
                <LanguageSwitcher />
              </div>
              <div className="mb-4">
                <div className="auth-brand">{t('app.name')}</div>
                <h1 className="h3 fw-bold mb-2">{t('auth.registerTitle')}</h1>
              </div>

              <ErrorModal error={error} onClose={() => setError('')} />

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="fullName">
                  <Form.Label>{t('auth.fullName')}</Form.Label>
                  <Form.Control
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="registerEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="registerPassword">
                  <Form.Label>{t('auth.password')}</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={form.password}
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
                  {loading ? t('auth.creatingAccount') : t('home.actions.register')}
                </Button>
              </Form>

              <div className="auth-register-prompt">
                <span>{t('auth.alreadyAccount')}</span>
                <Link to="/login" className="auth-register-link">
                  {t('home.actions.login')}
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Register;
