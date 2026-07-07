import { useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDefaultRouteForCurrentUser, saveAuthTokens } from '../../api/api';
import { fillMissingProfileFromGuestSession } from '../../utils/guestProfileSession';

function OAuth2Redirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refresh');
    const error = searchParams.get('error');

    if (error || !token) {
      navigate(`/login?oauthError=${error || 'oauth2_login_failed'}`, { replace: true });
      return;
    }

    saveAuthTokens({ accessToken: token, refreshToken });
    fillMissingProfileFromGuestSession()
      .catch((profileError) => {
        console.error('[OAuth2Redirect] Could not import guest profile data:', profileError);
      })
      .finally(() => {
        navigate(getDefaultRouteForCurrentUser(), { replace: true });
      });
  }, [navigate, searchParams]);

  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center">
      <Spinner animation="border" role="status" />
    </main>
  );
}

export default OAuth2Redirect;
