import { useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveAuthTokens } from '../../api/api';

function OAuth2Redirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refresh');
    const error = searchParams.get('error');

    if (error || !token) {
      navigate('/login?oauthError=oauth2_login_failed', { replace: true });
      return;
    }

    saveAuthTokens({ accessToken: token, refreshToken });
    navigate('/dashboard', { replace: true });
  }, [navigate, searchParams]);

  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center">
      <Spinner animation="border" role="status" />
    </main>
  );
}

export default OAuth2Redirect;
