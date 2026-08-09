import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, WelloApiResponse } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';

type OTPMode = 'mfa' | 'email' | 'tel';

interface UseOTPVerificationProps {
  mode: OTPMode;
  onSuccess?: () => void;
  token?: string; // Bearer token for MFA verification
  // Masked recipient known upfront (e.g. mfa mode: the email was already sent
  // as a side effect of login/the request that triggered mfa_required).
  initialRecipient?: string;
}

interface VerifyResponse {
  message?: string;
  status?: 'success' | 'error';
}

interface SendVerificationResponse {
  message?: string;
  status?: 'success' | 'error';
  recipient?: string;
}

interface FallbackSMSResponse {
  status?: 'success' | 'error';
  recipient?: string;
  message?: string;
}

export function useOTPVerification({ mode, onSuccess, token, initialRecipient }: UseOTPVerificationProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  // Masked recipient currently displayed - starts from whatever the caller already
  // knew, then gets replaced whenever a send/resend/SMS-fallback returns a fresh one
  // (e.g. switching from the masked email to the masked phone on SMS fallback).
  const [recipient, setRecipient] = useState<string | undefined>(initialRecipient);

  // Ref to prevent duplicate verification calls (React Strict Mode safety)
  const isVerifyingRef = useRef(false);

  // OTPVerification stays mounted across MFA prompts (isOpen just toggles), so
  // re-sync whenever the caller hands us a new recipient (e.g. a fresh mfa_required).
  useEffect(() => {
    setRecipient(initialRecipient);
  }, [initialRecipient]);

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

  // Send verification code (initial send and resend)
  const requestVerificationCode = useCallback(async (options?: { ignoreCooldown?: boolean; isInitialSend?: boolean }) => {
    if (cooldown > 0 && !options?.ignoreCooldown) return;

    setIsResending(true);
    setError(null);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.post<WelloApiResponse<SendVerificationResponse> | SendVerificationResponse>('/auth/send-verification', {
        mode,
      }, { headers });

      const responseData = 'data' in response ? response.data : response;

      if (responseData.status === 'success') {
        setCooldown(60);
        setCode(''); // Clear existing code
        if (responseData.recipient) {
          setRecipient(responseData.recipient);
        }
        toast({
          title: options?.isInitialSend ? 'Code envoyé' : 'Code renvoyé',
          description: responseData.message || 'Un nouveau code a été envoyé.',
        });
      } else {
        toast({
          title: 'Échec de l\'envoi',
          description: responseData.message || 'Impossible de renvoyer le code.',
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

  const resendCode = useCallback(async () => {
    await requestVerificationCode();
  }, [requestVerificationCode]);

  const sendInitialCode = useCallback(async () => {
    await requestVerificationCode({ ignoreCooldown: true, isInitialSend: true });
  }, [requestVerificationCode]);

  // Fallback to SMS (MFA only)
  const sendSMSFallback = useCallback(async () => {
    if (cooldown > 0 || mode !== 'mfa') return;

    setIsSendingSMS(true);
    setError(null);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.get<WelloApiResponse<FallbackSMSResponse> | FallbackSMSResponse>('/auth/mfa/fallback-sms', { headers });
      const responseData = 'data' in response ? response.data : response;

      if (responseData.status === 'success') {
        setCooldown(60);
        setCode(''); // Clear existing code
        if (responseData.recipient) {
          setRecipient(responseData.recipient);
        }
        toast({
          title: 'SMS envoyé',
          description: responseData.recipient
            ? `Un code a été envoyé au ${responseData.recipient}`
            : 'Un code a été envoyé par SMS.',
        });
      } else {
        toast({
          title: 'Échec de l\'envoi SMS',
          description: responseData.message || 'Impossible d\'envoyer le SMS.',
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
    recipient,
    handleComplete,
    resendCode,
    sendInitialCode,
    sendSMSFallback,
  };
}
