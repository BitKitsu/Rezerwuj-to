import { Navigate } from 'react-router-dom';
import { tokenManager } from '../services/api';

function ProtectedRoute({ children, requiredRole, requireCompany }) {
  const isAuthenticated = tokenManager.isAuthenticated();
  const user = tokenManager.getUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const requiredRolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userRoles = user?.roles || [];

    const hasAnyRequiredRole = requiredRolesArray.some((role) => userRoles.includes(role));

    if (!hasAnyRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  if (requireCompany) {
    if (!user?.companyId) {
      return <Navigate to="/account" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
