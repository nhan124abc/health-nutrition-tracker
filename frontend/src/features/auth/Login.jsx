import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaFacebookF, FaGoogle } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getDefaultRouteForCurrentUser, saveAuthTokens } from '../../api/api';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import authConfig from '../../config/authConfig';
import { login } from './authService';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const oauthError = new URLSearchParams(location.search).get('oauthError');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(form);
      saveAuthTokens(response.data);

      if (!response.data?.accessToken && !response.data?.token) {
        throw new Error(t('auth.missingToken'));
      }

      navigate(
        from ? `${from.pathname}${from.search}${from.hash}` : getDefaultRouteForCurrentUser(),
        { replace: true }
      );
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const oauthUrl = (provider) =>
    `${authConfig.apiBaseUrl}${authConfig.endpoints.oauthAuthorize(provider)}`;

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
                <h1 className="h3 fw-bold mb-2">{t('auth.loginTitle')}</h1>
                <p className="text-secondary mb-0">{t('auth.loginDescription')}</p>
              </div>

              {(error || oauthError) && (
                <Alert variant="danger">{error || t('auth.oauthLoginError')}</Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-2" controlId="password">
                  <Form.Label>{t('auth.password')}</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <div className="text-end mb-4">
                  <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
                </div>

                <Button className="w-100" variant="success" type="submit" disabled={loading}>
                  {loading ? t('auth.loggingIn') : t('auth.loginTitle')}
                </Button>
              </Form>

              <div className="auth-divider">{t('auth.or')}</div>

              <div className="d-grid gap-2">
                <Button as="a" href={oauthUrl('google')} variant="outline-secondary">
                  <FaGoogle className="me-2" />
                  {t('auth.loginWithGoogle')}
                </Button>
                <Button as="a" href={oauthUrl('facebook')} variant="outline-secondary">
                  <FaFacebookF className="me-2" />
                  {t('auth.loginWithFacebook')}
                </Button>
              </div>

              <p className="text-center text-secondary mt-4 mb-0">
                {t('auth.noAccount')} <Link to="/register">{t('auth.registerNow')}</Link>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Login;
