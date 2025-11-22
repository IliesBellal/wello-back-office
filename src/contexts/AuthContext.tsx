import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthData } from '@/types/auth';

interface AuthContextType {
  authData: AuthData | null;
  setAuthData: (data: AuthData | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthDataState] = useState<AuthData | null>(() => {
    const stored = localStorage.getItem('authData');
    return stored ? JSON.parse(stored) : null;
  });

  const setAuthData = (data: AuthData | null) => {
    setAuthDataState(data);
    if (data) {
      localStorage.setItem('authData', JSON.stringify(data));
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
