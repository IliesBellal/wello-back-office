import React, { createContext, useContext, useState } from 'react';
import { AuthData, normalizeAuthData, parseStoredAuthData } from '@/types/auth';

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
