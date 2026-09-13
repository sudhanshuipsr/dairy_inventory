import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute Guard
 * Protects routes requiring authentication and optional role restrictions.
 *
 * Props:
 * - children: React.ReactNode
 * - allowedRoles?: string[] e.g. ['admin'] or ['admin', 'staff']
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, initialLoading } = useAuth();
  const location = useLocation();

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#f4f8f2] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-[#1e3a1e] text-[#f8f5f0] flex items-center justify-center text-2xl animate-bounce mx-auto shadow-lg shadow-[#1e3a1e]/20">
            🥛
          </div>
          <p className="text-xs font-bold text-[#1e3a1e]">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, redirect to login page keeping return path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required, ensure user has permission
  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export const AdminRoute = ({ children }) => {
  return <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>;
};

export default ProtectedRoute;
