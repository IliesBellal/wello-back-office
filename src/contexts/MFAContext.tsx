import { useState, useCallback, useEffect, ReactNode } from 'react';
import { OTPVerification } from '@/components/auth/OTPVerification';
import { registerMFAHandler } from '@/services/apiClient';
import { MFAContext } from './MFAContextDefinition';

interface MFAProviderProps {
  children: ReactNode;
}

export function MFAProvider({ children }: MFAProviderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resolver, setResolver] = useState<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);

  const showMFAModal = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      setResolver({ resolve, reject });
      setIsModalOpen(true);
    });
  }, []);

  // Register MFA handler with apiClient on mount
  useEffect(() => {
    registerMFAHandler(showMFAModal);
  }, [showMFAModal]);

  const handleSuccess = useCallback(() => {
    setIsModalOpen(false);
    if (resolver) {
      resolver.resolve();
      setResolver(null);
    }
  }, [resolver]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    if (resolver) {
      resolver.reject(new Error('MFA verification cancelled'));
      setResolver(null);
    }
  }, [resolver]);

  return (
    <MFAContext.Provider value={{ showMFAModal }}>
      {children}
      <OTPVerification
        mode="mfa"
        isOpen={isModalOpen}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </MFAContext.Provider>
  );
}
