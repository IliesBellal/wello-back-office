import { useEffect, useRef, useState } from 'react';
import { loadGoogleIdentityServices, getGoogleClientId } from '@/lib/googleIdentityLoader';
import { cn } from '@/lib/utils';
import { AuthProviderButton, GoogleLogo } from './AuthProviderButton';

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}

type GsiStatus = 'loading' | 'ready' | 'unavailable';

/**
 * Renders Google's own button (not a custom-styled one — GSI requires its
 * button to be rendered by Google's script for the credential flow to work)
 * inside a full-width container, matching screen 1's "action principale,
 * pleine largeur" requirement (LOT A Semaine 3, Chantier 14, §5.2).
 *
 * Until GSI is ready — or when it can't load (missing client id, script
 * blocked) — a look-alike placeholder with the Google logo is shown instead,
 * greyed out and flagged "Indisponible pour le moment" on failure.
 */
export const GoogleSignInButton = ({ onCredential, disabled }: GoogleSignInButtonProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [status, setStatus] = useState<GsiStatus>('loading');

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const google = await loadGoogleIdentityServices();
        if (cancelled || !containerRef.current) return;

        google.accounts.id.initialize({
          client_id: getGoogleClientId(),
          callback: (response) => onCredentialRef.current(response.credential),
        });
        google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          // Measured on the always-visible wrapper: the GSI container itself is
          // hidden until ready. GSI caps the width at 400px.
          width: Math.min(wrapperRef.current?.offsetWidth || 400, 400),
        });
        setStatus('ready');
      } catch (error) {
        if (cancelled) return;
        setStatus('unavailable');
        console.error('Google Identity Services initialization failed', error);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div ref={wrapperRef}>
      <div
        ref={containerRef}
        className={cn(status === 'ready' ? 'flex justify-center' : 'hidden', disabled && 'pointer-events-none opacity-50')}
      />
      {status === 'loading' && (
        <AuthProviderButton icon={<GoogleLogo />} label="Continuer avec Google" />
      )}
      {status === 'unavailable' && (
        <AuthProviderButton
          icon={<GoogleLogo />}
          label="Continuer avec Google"
          hint="Indisponible pour le moment"
          disabled
        />
      )}
    </div>
  );
};
