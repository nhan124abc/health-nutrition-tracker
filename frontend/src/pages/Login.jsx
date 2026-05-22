import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', form);
      const token = response.data?.token || response.data?.accessToken;

      if (!token) {
        throw new Error('Backend không trả về JWT token.');
      }

      localStorage.setItem('jwtToken', token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="login-page">
      <Row className="min-vh-100 align-items-center justify-content-center px-3">
        <Col xs={12} sm={10} md={7} lg={5} xl={4}>
          <Card className="border-0 shadow-lg">
            <Card.Body className="p-4 p-md-5">
              <div className="mb-4 text-center">
                <img src="/logo192.png" alt="Health Nutrition" className="auth-logo mb-3" />
                <h1 className="h3 fw-bold mb-2">Đăng nhập</h1>
                <p className="text-secondary mb-0">Theo dõi sức khỏe và dinh dưỡng hằng ngày.</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
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

                <Form.Group className="mb-4" controlId="password">
                  <Form.Label>Mật khẩu</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu"
                    required
                  />
                </Form.Group>

                <Button className="w-100" variant="success" type="submit" disabled={loading}>
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
              </Form>

              <p className="text-center text-secondary mt-4 mb-0">
                Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Login;
