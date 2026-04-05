import { useContext } from 'react';
import { MFAContext } from './MFAContextDefinition';

export function useMFA() {
  const context = useContext(MFAContext);
  if (!context) {
    throw new Error('useMFA must be used within MFAProvider');
  }
  return context;
}
