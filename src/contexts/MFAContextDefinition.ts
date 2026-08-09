import { createContext } from 'react';

export interface MFAContextValue {
  showMFAModal: (recipient?: string) => Promise<void>;
}

export const MFAContext = createContext<MFAContextValue | undefined>(undefined);
