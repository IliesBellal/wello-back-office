import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { ModuleCapability } from '@/types/auth';
import { hasModuleAccess } from '@/lib/moduleAccess';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredModule?: ModuleCapability;
  fallbackPath?: string;
}

export function ProtectedRoute({ children, requiredModule, fallbackPath = '/' }: ProtectedRouteProps) {
  const { authData } = useAuth();

  // Pas connecté du tout
  if (!authData) {
    return <Navigate to="/login" replace />;
  }

  // Connecté mais MFA pending (devrait être géré sur la page Login, mais par sécurité)
  if (authData.session.mfa_status === 'pending') {
    return <Navigate to="/login" replace />;
  }

  if (!hasModuleAccess(authData, requiredModule)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Connecté et vérifié (ou pas de MFA requis)
  return <>{children}</>;
}
