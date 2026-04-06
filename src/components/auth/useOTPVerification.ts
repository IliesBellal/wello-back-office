import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, WelloApiResponse } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';

type OTPMode = 'mfa' | 'email' | 'tel';

interface UseOTPVerificationProps {
  mode: OTPMode;
  onSuccess?: () => void;
  token?: string; // Bearer token for MFA verification
}

interface VerifyResponse {
  message?: string;
  status?: 'success' | 'error';
}

interface SendVerificationResponse {
  message?: string;
  status?: 'success' | 'error';
}

interface FallbackSMSResponse {
  status?: 'success' | 'error';
  phone?: string;
  message?: string;
}

export function useOTPVerification({ mode, onSuccess, token }: UseOTPVerificationProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  
  // Ref to prevent duplicate verification calls (React Strict Mode safety)
  const isVerifyingRef = useRef(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auto-verify when 6 digits are entered
  const handleComplete = useCallback(
    async (completeCode: string) => {
      if (completeCode.length !== 6) return;
      
      // Prevent duplicate API calls (React Strict Mode safety)
      if (isVerifyingRef.current) return;
      isVerifyingRef.current = true;

      setIsVerifying(true);
      setError(null);

      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await apiClient.post<WelloApiResponse<VerifyResponse>>('/auth/verify', {
          mode: mode,
          code: completeCode,
        }, { headers });

        if (response.data.status === 'success') {
          toast({
            title: 'Vérification réussie',
            description: response.data.message || 'Votre code a été validé avec succès.',
          });
          onSuccess?.();
        } else {
          setError(response.data.message || 'Code invalide');
          setCode(''); // Clear code on error
          toast({
            title: 'Code invalide',
            description: response.data.message || 'Le code saisi est incorrect.',
            variant: 'destructive',
          });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de la vérification.';
        setError(errorMessage);
        setCode(''); // Clear code on error
        toast({
          title: 'Erreur de vérification',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsVerifying(false);
        isVerifyingRef.current = false;
      }
    },
    [mode, onSuccess, token]
  );

  // Resend verification code
  const resendCode = useCallback(async () => {
    if (cooldown > 0) return;

    setIsResending(true);
    setError(null);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.post<SendVerificationResponse>('/auth/send-verification', {
        mode,
      }, { headers });

      if (response.status === 'success') {
        setCooldown(60);
        setCode(''); // Clear existing code
        toast({
          title: 'Code renvoyé',
          description: response.message || 'Un nouveau code a été envoyé.',
        });
      } else {
        toast({
          title: 'Échec de l\'envoi',
          description: response.message || 'Impossible de renvoyer le code.',
          variant: 'destructive',
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Impossible de renvoyer le code.';
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  }, [mode, cooldown, token]);

  // Fallback to SMS (MFA only)
  const sendSMSFallback = useCallback(async () => {
    if (cooldown > 0 || mode !== 'mfa') return;

    setIsSendingSMS(true);
    setError(null);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.get<FallbackSMSResponse>('/auth/mfa/fallback-sms', { headers });

      if (response.status === 'success') {
        setCooldown(60);
        setCode(''); // Clear existing code
        if (response.phone) {
          setMaskedPhone(response.phone);
        }
        toast({
          title: 'SMS envoyé',
          description: response.phone
            ? `Un code a été envoyé au ${response.phone}`
            : 'Un code a été envoyé par SMS.',
        });
      } else {
        toast({
          title: 'Échec de l\'envoi SMS',
          description: response.message || 'Impossible d\'envoyer le SMS.',
          variant: 'destructive',
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Impossible d\'envoyer le SMS.';
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSendingSMS(false);
    }
  }, [mode, cooldown, token]);

  return {
    code,
    setCode,
    isVerifying,
    isResending,
    isSendingSMS,
    error,
    cooldown,
    maskedPhone,
    handleComplete,
    resendCode,
    sendSMSFallback,
  };
}
