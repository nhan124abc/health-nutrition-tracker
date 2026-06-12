import { Navigate } from 'react-router-dom';
import {
  clearAuthTokens,
  getDefaultRouteForCurrentUser,
  hasUsableAccessToken,
} from '../api/api';

function PublicRoute({ children }) {
  if (hasUsableAccessToken()) {
    return <Navigate to={getDefaultRouteForCurrentUser()} replace />;
  }

  clearAuthTokens();

  return children;
}

export default PublicRoute;
