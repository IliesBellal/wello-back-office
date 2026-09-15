import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthData, ModuleCapability } from '@/types/auth';
import { hasModuleAccess } from '@/lib/moduleAccess';
import { authService } from '@/services/authService';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredModule?: ModuleCapability;
  fallbackPath?: string;
  accessCheck?: (authData: AuthData | null | undefined) => boolean;
}

export function ProtectedRoute({
  children,
  requiredModule,
  fallbackPath = '/',
  accessCheck,
}: ProtectedRouteProps) {
  const { authData } = useAuth();
  const location = useLocation();

  // LOT A Semaine 3, Chantier 14 — "forcé au premier accès POS" for a
  // Google-origin account with no password yet. Cached by react-query per
  // user/merchant token (staleTime avoids re-checking on every navigation);
  // SetPassword.tsx invalidates this exact key once the password is set.
  const { data: needsPasswordSet } = useQuery({
    queryKey: ['auth', 'needs-password-set', authData?.session.token],
    queryFn: authService.needsPasswordSet,
    enabled: !!authData && authData.session.mfa_status !== 'pending',
    staleTime: 5 * 60 * 1000,
  });

  // Pas connecté du tout
  if (!authData) {
    return <Navigate to="/login" replace />;
  }

  // Connecté mais MFA pending (devrait être géré sur la page Login, mais par sécurité)
  if (authData.session.mfa_status === 'pending') {
    return <Navigate to="/login" replace />;
  }

  if (needsPasswordSet && location.pathname !== '/set-password') {
    return <Navigate to="/set-password" replace />;
  }

  if (!hasModuleAccess(authData, requiredModule)) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (accessCheck && !accessCheck(authData)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Connecté et vérifié (ou pas de MFA requis)
  return <>{children}</>;
}
