import React, { createContext, useState, ReactNode } from 'react';

export interface ProductCreateSheetContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const ProductCreateSheetContext = createContext<ProductCreateSheetContextType | undefined>(undefined);

interface ProductCreateSheetProviderProps {
  children: ReactNode;
}

export function ProductCreateSheetProvider({ children }: ProductCreateSheetProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ProductCreateSheetContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </ProductCreateSheetContext.Provider>
  );
}

export function useProductCreateSheet() {
  const context = React.useContext(ProductCreateSheetContext);
  if (!context) {
    throw new Error('useProductCreateSheet must be used within ProductCreateSheetProvider');
  }
  return context;
}
