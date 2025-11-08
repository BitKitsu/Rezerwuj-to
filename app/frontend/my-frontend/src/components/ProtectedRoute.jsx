import { Navigate } from 'react-router-dom';
import { tokenManager } from '../services/api';

function ProtectedRoute({ children }) {
  const isAuthenticated = tokenManager.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default ProtectedRoute;
