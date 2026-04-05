import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authData } = useAuth();

  // Pas connecté du tout
  if (!authData) {
    return <Navigate to="/login" replace />;
  }

  // Connecté mais MFA pending (devrait être géré sur la page Login, mais par sécurité)
  if (authData.mfa_status === 'pending') {
    return <Navigate to="/login" replace />;
  }

  // Connecté et vérifié (ou pas de MFA requis)
  return <>{children}</>;
}
