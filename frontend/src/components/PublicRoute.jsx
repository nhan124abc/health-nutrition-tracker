import { Navigate } from 'react-router-dom';
import { getAccessToken } from '../api/api';

function PublicRoute({ children }) {
  if (getAccessToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default PublicRoute;
