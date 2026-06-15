import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { clearAuthTokens, getCurrentUserRole, hasUsableAccessToken } from '../api/api';
import { getAuthenticatedUser } from '../features/auth/authService';

function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const { t } = useTranslation();
  const [status, setStatus] = useState(() => (
    hasUsableAccessToken() ? 'checking' : 'unauthenticated'
  ));

  useEffect(() => {
    let active = true;
    if (!hasUsableAccessToken()) {
      clearAuthTokens();
      setStatus('unauthenticated');
      return undefined;
    }

    setStatus('checking');
    getAuthenticatedUser()
      .then(() => active && setStatus('authenticated'))
      .catch(() => {
        clearAuthTokens();
        if (active) setStatus('unauthenticated');
      });

    return () => { active = false; };
  }, [location.pathname]);

  if (status === 'checking') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center text-secondary">
        {t('app.loading')}
      </div>
    );
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (allowedRoles?.length) {
    const role = getCurrentUserRole();
    if (!allowedRoles.some((item) => item.toUpperCase() === role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
}

export default ProtectedRoute;
