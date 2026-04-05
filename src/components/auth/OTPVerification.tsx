import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { OTPInput } from './OTPInput';
import { useOTPVerification } from './useOTPVerification';
import { Shield, Mail, Phone, Loader2 } from 'lucide-react';

type OTPMode = 'mfa' | 'email' | 'tel';

interface OTPVerificationProps {
  mode: OTPMode;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  token?: string; // Bearer token for MFA verification
}

const MODE_CONFIG = {
  mfa: {
    icon: Shield,
    title: 'Vérification de sécurité requise',
    description: 'Pour votre sécurité, veuillez saisir le code à 6 chiffres envoyé à votre adresse email.',
  },
  email: {
    icon: Mail,
    title: 'Vérifiez votre adresse email',
    description: 'Un code à 6 chiffres a été envoyé à votre adresse email. Veuillez le saisir ci-dessous.',
  },
  tel: {
    icon: Phone,
    title: 'Vérifiez votre numéro de téléphone',
    description: 'Un code à 6 chiffres a été envoyé par SMS à votre numéro de téléphone.',
  },
};

export function OTPVerification({
  mode,
  isOpen,
  onSuccess,
  onCancel,
  token,
}: OTPVerificationProps) {
  const {
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
  } = useOTPVerification({ mode, onSuccess, token });

  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  // Reset code when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode('');
    }
  }, [isOpen, setCode]);

  const handleOpenChange = (open: boolean) => {
    if (!open && !isVerifying) {
      onCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* OTP Input */}
          <div className="space-y-2">
            <OTPInput
              value={code}
              onChange={setCode}
              onComplete={handleComplete}
              disabled={isVerifying}
              error={!!error}
            />
            {error && (
              <p className="text-sm text-destructive text-center animate-in fade-in">
                {error}
              </p>
            )}
            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Vérification en cours...</span>
              </div>
            )}
          </div>

          {/* Resend Code Button */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas reçu le code ?
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resendCode}
              disabled={cooldown > 0 || isResending || isVerifying}
              className="min-w-[180px]"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : cooldown > 0 ? (
                `Renvoyer (${cooldown}s)`
              ) : (
                'Renvoyer le code'
              )}
            </Button>
          </div>

          {/* SMS Fallback (MFA only) */}
          {mode === 'mfa' && (
            <div className="flex flex-col items-center gap-2 pt-2 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Vous ne recevez pas l&apos;email ?
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={sendSMSFallback}
                disabled={cooldown > 0 || isSendingSMS || isVerifying}
                className="text-primary hover:text-primary/90"
              >
                {isSendingSMS ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi SMS...
                  </>
                ) : (
                  'Envoyer par SMS'
                )}
              </Button>
              {maskedPhone && (
                <p className="text-xs text-muted-foreground animate-in fade-in">
                  SMS envoyé au {maskedPhone}
                </p>
              )}
            </div>
          )}

          {/* Cancel Button */}
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isVerifying}
            className="w-full"
          >
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
