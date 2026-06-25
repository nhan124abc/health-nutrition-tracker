import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { clearAuthTokens, getCurrentUserRole, hasUsableAccessToken } from '../api/api';
import { getAuthenticatedUser, isLockedAccountError } from '../features/auth/authService';

function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const { t } = useTranslation();
  const [status, setStatus] = useState(() => (
    hasUsableAccessToken() ? 'checking' : 'unauthenticated'
  ));
  const [lockedAccount, setLockedAccount] = useState(false);

  useEffect(() => {
    let active = true;
    if (!hasUsableAccessToken()) {
      clearAuthTokens();
      setLockedAccount(false);
      setStatus('unauthenticated');
      return undefined;
    }

    setStatus('checking');
    setLockedAccount(false);
    getAuthenticatedUser()
      .then(() => active && setStatus('authenticated'))
      .catch((error) => {
        const isLocked = isLockedAccountError(error);
        clearAuthTokens();
        if (active) {
          setLockedAccount(isLocked);
          setStatus('unauthenticated');
        }
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
    return <Navigate to="/login" replace state={{ from: location, accountLocked: lockedAccount }} />;
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
