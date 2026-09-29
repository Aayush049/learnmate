import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { paymentsAPI, Entitlement } from '../../api/payments';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [isCheckingEntitlement, setIsCheckingEntitlement] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkUserEntitlement() {
      if (!isAuthenticated || !user) {
        if (isMounted) setIsCheckingEntitlement(false);
        return;
      }

      // Admins bypass entitlement check
      if (user.is_admin) {
        if (isMounted) setIsCheckingEntitlement(false);
        return;
      }

      try {
        const ent = await paymentsAPI.getMyEntitlement();
        if (isMounted) {
          setEntitlement(ent);
        }
      } catch (err) {
        console.error('Failed to verify user entitlement:', err);
      } finally {
        if (isMounted) {
          setIsCheckingEntitlement(false);
        }
      }
    }

    if (!isLoading) {
      checkUserEntitlement();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, isLoading]);

  if (isLoading || isCheckingEntitlement) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full border-4 border-t-purple-600 border-purple-200 h-10 w-10 mb-3"></div>
        <p className="text-xs font-semibold text-gray-500">Verifying session & access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin bypass
  if (user?.is_admin) {
    return <>{children}</>;
  }

  // Student entitlement gate
  if (!entitlement?.has_active_entitlement) {
    return (
      <Navigate
        to="/pricing"
        state={{
          from: location,
          message: 'An active SSC JE Civil preparation pass is required to access this resource.',
        }}
        replace
      />
    );
  }

  return <>{children}</>;
};
