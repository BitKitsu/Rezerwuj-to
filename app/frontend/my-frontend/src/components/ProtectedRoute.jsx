import { Navigate } from 'react-router-dom';
import { tokenManager } from '../services/api';

function ProtectedRoute({ children, requiredRole }) {
  const isAuthenticated = tokenManager.isAuthenticated();
  const user = tokenManager.getUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !(user?.roles?.includes(requiredRole))) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
