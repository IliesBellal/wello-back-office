import React, { createContext, useState, ReactNode } from 'react';

export interface OrganizeModalContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const OrganizeModalContext = createContext<OrganizeModalContextType | undefined>(undefined);

interface OrganizeModalProviderProps {
  children: ReactNode;
}

export function OrganizeModalProvider({ children }: OrganizeModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <OrganizeModalContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </OrganizeModalContext.Provider>
  );
}

export function useOrganizeModal() {
  const context = React.useContext(OrganizeModalContext);
  if (!context) {
    throw new Error('useOrganizeModal must be used within OrganizeModalProvider');
  }
  return context;
}
