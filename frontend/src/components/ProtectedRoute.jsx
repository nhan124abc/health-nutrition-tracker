import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken, getCurrentUserRole } from '../api/api';

function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();

  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length) {
    const currentRole = getCurrentUserRole();
    const canAccess = allowedRoles.some((role) => role.toUpperCase() === currentRole);

    if (!canAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
