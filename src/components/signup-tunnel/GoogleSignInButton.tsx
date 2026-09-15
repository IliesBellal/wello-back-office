import { useEffect, useRef, useState } from 'react';
import { loadGoogleIdentityServices, getGoogleClientId } from '@/lib/googleIdentityLoader';

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}

/**
 * Renders Google's own button (not a custom-styled one — GSI requires its
 * button to be rendered by Google's script for the credential flow to work)
 * inside a full-width container, matching screen 1's "action principale,
 * pleine largeur" requirement (LOT A Semaine 3, Chantier 14, §5.2).
 */
export const GoogleSignInButton = ({ onCredential, disabled }: GoogleSignInButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          width: containerRef.current.offsetWidth || 400,
        });
      } catch (error) {
        setLoadError("Impossible de charger la connexion Google. Réessayez ou créez un compte avec votre e-mail.");
        console.error('Google Identity Services initialization failed', error);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div
        ref={containerRef}
        className={disabled ? 'pointer-events-none opacity-50' : ''}
        style={{ width: '100%' }}
      />
      {loadError && <p className="text-xs text-destructive mt-2">{loadError}</p>}
    </div>
  );
};
