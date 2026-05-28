import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import LanguageSwitcher from '../components/LanguageSwitcher';

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
      await api.post('/auth/register', {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('auth.registerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="auth-page">
      <Button as={Link} to="/" variant="outline-secondary" className="auth-page-back">
        <FaArrowLeft />
        {t('auth.backToHome')}
      </Button>
      <Row className="min-vh-100 align-items-center justify-content-center px-3">
        <Col xs={12} md={8} lg={5} xl={4}>
          <Card className="auth-card border-0 shadow-sm">
            <Card.Body className="p-4 p-md-5">
              <div className="d-flex align-items-center justify-content-end mb-3">
                <LanguageSwitcher />
              </div>
              <div className="mb-4">
                <div className="auth-brand">{t('app.name')}</div>
                <h1 className="h3 fw-bold mb-2">{t('auth.registerTitle')}</h1>
                <p className="text-secondary mb-0">{t('auth.registerDescription')}</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="fullName">
                  <Form.Label>{t('auth.fullName')}</Form.Label>
                  <Form.Control
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Nguyen Van A"
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
                    placeholder="name@example.com"
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
                    placeholder={t('auth.passwordMin')}
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
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    required
                  />
                </Form.Group>

                <Button className="w-100" variant="success" type="submit" disabled={loading}>
                  {loading ? t('auth.creatingAccount') : t('home.actions.register')}
                </Button>
              </Form>

              <p className="text-center text-secondary mt-4 mb-0">
                {t('auth.alreadyAccount')} <Link to="/login">{t('home.actions.login')}</Link>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Register;
