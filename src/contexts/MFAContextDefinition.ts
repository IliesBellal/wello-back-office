import { createContext } from 'react';

export interface MFAContextValue {
  showMFAModal: () => Promise<void>;
}

export const MFAContext = createContext<MFAContextValue | undefined>(undefined);
