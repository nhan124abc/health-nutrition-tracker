import { Navigate } from 'react-router-dom';
import { getAccessToken, getDefaultRouteForCurrentUser } from '../api/api';

function PublicRoute({ children }) {
  if (getAccessToken()) {
    return <Navigate to={getDefaultRouteForCurrentUser()} replace />;
  }

  return children;
}

export default PublicRoute;
