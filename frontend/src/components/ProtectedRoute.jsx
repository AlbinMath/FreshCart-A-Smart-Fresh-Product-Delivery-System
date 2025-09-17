import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Generic protected route with optional role checks
// - requireAdmin: keep backward compatibility
// - allowedRoles: array of roles permitted to view this route
function ProtectedRoute({ children, requireAdmin = false, allowedRoles = null }) {
  const { currentUser, getUserProfile } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  const profile = getUserProfile();

  // Block deactivated users from protected routes (except profile)
  if (profile && profile.isActive === false) {
    // Allow access only to profile page to show the blocked message
    const pathname = window.location.pathname;
    if (!pathname.startsWith('/profile')) {
      return <Navigate to="/profile?blocked=1" replace />;
    }
  }

  if (requireAdmin) {
    if (profile && profile.role !== 'admin') {
      return <Navigate to="/" />;
    }
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = profile?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/" />;
    }
  }

  return children;
}

export default ProtectedRoute;

