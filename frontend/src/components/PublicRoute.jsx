import { Navigate } from 'react-router-dom';
import { clearAuthTokens, hasUsableAccessToken } from '../api/api';

function PublicRoute({ children }) {
  if (hasUsableAccessToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  clearAuthTokens();

  return children;
}

export default PublicRoute;
