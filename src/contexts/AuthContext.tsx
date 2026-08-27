import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthData, normalizeAuthData, parseStoredAuthData } from '@/types/auth';
import { rolesApi } from '@/services/welloApi';
import { qk } from '@/lib/queryKeys';

interface AuthContextType {
  authData: AuthData | null;
  setAuthData: (data: AuthData | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthDataState] = useState<AuthData | null>(() => {
    return parseStoredAuthData(localStorage.getItem('authData'));
  });

  const setAuthData = (data: AuthData | null) => {
    const normalizedData = data ? normalizeAuthData(data) : null;
    setAuthDataState(normalizedData);
    if (normalizedData) {
      localStorage.setItem('authData', JSON.stringify(normalizedData));
    } else {
      localStorage.removeItem('authData');
    }
  };

  const logout = () => {
    setAuthData(null);
  };

  // RBAC lot 9 — single background revalidation instance for the whole app
  // (deliberately here, not inside usePermissions: that hook is mounted by
  // ~10 components, and an effect there would re-run the same sync work
  // that many times for one useful write). First paint is always the
  // synchronous authData already in context/localStorage; this only
  // silently corrects it afterwards if GET /me/permissions disagrees — no
  // screen ever awaits this query.
  const { data: freshPermissions } = useQuery({
    queryKey: authData ? qk.myPermissions(authData.user.id, authData.merchant.id) : (["me", "permissions", "none"] as const),
    queryFn: rolesApi.getMyPermissions,
    enabled: !!authData,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (!freshPermissions || !authData) return;
    const same =
      freshPermissions.is_admin === authData.access.admin &&
      freshPermissions.permissions.length === authData.permissions.length &&
      freshPermissions.permissions.every((k) => authData.permissions.includes(k));
    if (!same) {
      setAuthData({
        ...authData,
        permissions: freshPermissions.permissions,
        access: { ...authData.access, admin: freshPermissions.is_admin },
      });
    }
  }, [freshPermissions, authData]);

  return (
    <AuthContext.Provider value={{ authData, setAuthData, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
