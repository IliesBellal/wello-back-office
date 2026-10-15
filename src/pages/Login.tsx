import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { OTPVerification } from '@/components/auth';
import { AuthData, type AuthResponse } from '@/types/auth';
import { publicTunnelApi, isPublicApiError } from '@/services/publicTunnelApi';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { decodeJwtPayload } from '@/lib/decodeJwtPayload';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

/** Logo officiel (PNG avec marges) recadré à son contenu. */
const WelloLogo = ({ className }: { className?: string }) => (
  <div role="img" aria-label="Wello Resto" className={`relative aspect-[2105/460] overflow-hidden ${className ?? ''}`}>
    <img
      src="/wello_resto_logo.png"
      alt=""
      draggable={false}
      className="absolute max-w-none select-none"
      style={{ width: '110.9%', left: '-5.23%', top: '-21.7%' }}
    />
  </div>
);

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Rendered on the right of the label (e.g. "Mot de passe oublié ?"). */
  labelAside?: ReactNode;
  showToggle?: boolean;
  isPasswordVisible?: boolean;
  onTogglePassword?: () => void;
}

const Field = ({
  id,
  type,
  label,
  labelAside,
  showToggle,
  isPasswordVisible,
  onTogglePassword,
  className,
  ...props
}: FieldProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-[13px] font-semibold text-[#2a3a63]">
        {label}
      </Label>
      {labelAside}
    </div>
    <div className="relative">
      <Input
        id={id}
        type={showToggle && isPasswordVisible ? 'text' : type}
        className={`h-11 rounded-lg border-[#dbe5f7] bg-white px-3.5 text-[#0b1230] shadow-[0_1px_2px_rgba(5,8,23,0.04)]
          placeholder:text-[#9aa8cb] hover:border-[#b9c8ea]
          focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0
          transition-[border-color,box-shadow] duration-150 ${showToggle ? 'pr-11' : ''} ${className ?? ''}`}
        {...props}
      />
      {showToggle && (
        <button
          type="button"
          onClick={onTogglePassword}
          aria-label={isPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#7e90bd]
            transition-colors hover:bg-[#edf3fc] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {isPasswordVisible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      )}
    </div>
  </div>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [pendingAuthData, setPendingAuthData] = useState<AuthData | null>(null);
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const { toast } = useToast();

  // Email validation function
  const isValidEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleMFASuccess = async () => {
    if (pendingAuthData?.session.token) {
      try {
        setIsLoading(true);
        const response = await authService.loginWithToken(pendingAuthData.session.token);

        if (response.data.status === '1') {
          setAuthData(response.data);
          setShowMFAModal(false);
          setPendingAuthData(null);
          toast({
            title: 'Connexion réussie',
            description: `Bienvenue ${response.data.user.first_name}!`,
          });
          navigate('/');
        } else {
          toast({
            title: 'Erreur de connexion',
            description: 'Impossible de finaliser la connexion.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Erreur de connexion',
          description: 'Une erreur est survenue lors de la finalisation de la connexion.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMFACancel = () => {
    setShowMFAModal(false);
    setPendingAuthData(null);
    toast({
      title: 'Connexion annulée',
      description: 'Veuillez vous reconnecter.',
      variant: 'destructive',
    });
  };

  /** Shared by the password and Google paths: both end on an /auth/login
   * response, which may still require MFA. */
  const handleAuthResponse = (response: AuthResponse) => {
    switch (response.data.status) {
      case '0':
      case 'user_not_found':
        toast({
          title: 'Compte introuvable',
          description: 'Email ou mot de passe incorrect',
          variant: 'destructive',
        });
        break;

      case '3':
      case 'account_disabled':
        toast({
          title: 'Compte désactivé',
          description: 'Votre compte a été désactivé.',
          variant: 'destructive',
        });
        break;

      case 'user_not_allowed':
        toast({
          title: 'Accès refusé',
          description: 'Vous n\'avez pas la permission d\'accéder à cette application.',
          variant: 'destructive',
        });
        break;

      case '1':
      case 'success':
        if (response.data.session.mfa_status === 'pending') {
          setPendingAuthData(response.data);
          setShowMFAModal(true);
          toast({
            title: 'Vérification requise',
            description: 'Veuillez saisir le code de sécurité envoyé à votre email.',
          });
        } else {
          setAuthData(response.data);
          toast({
            title: 'Connexion réussie',
            description: `Bienvenue ${response.data.user.first_name}!`,
          });
          navigate('/');
        }
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      handleAuthResponse(await authService.login({ email, password }));
    } catch (error) {
      toast({
        title: 'Erreur de connexion',
        description: 'Email ou mot de passe incorrect',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * POST /v1/auth/google (ib-welloresto-api googleauth module). An unknown
   * Google identity goes straight into the signup tunnel with that same
   * id_token, landing on its "confirm your name" step.
   */
  const handleGoogleCredential = async (idToken: string) => {
    setIsLoading(true);
    try {
      const { token } = await publicTunnelApi.post<{ token: string }>('/v1/auth/google', { id_token: idToken });
      handleAuthResponse(await authService.loginWithToken(token));
    } catch (error) {
      const code = isPublicApiError(error) ? error.code : undefined;
      if (code === 'google_account_not_found') {
        navigate('/creer-mon-compte', { state: { googleIdToken: idToken } });
        return;
      }
      if (code === 'google_account_has_password') {
        const claimedEmail = decodeJwtPayload<{ email?: string }>(idToken)?.email;
        if (claimedEmail) setEmail(claimedEmail);
        toast({
          title: 'Connectez-vous avec votre mot de passe',
          description:
            'Un compte existe déjà avec cette adresse e-mail. Connectez-vous avec votre mot de passe, puis associez Google depuis Paramètres > Mon Profil.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Connexion Google impossible',
        description:
          code === 'google_email_not_verified'
            ? "L'adresse e-mail de ce compte Google n'est pas vérifiée."
            : 'La connexion avec Google a échoué. Réessayez ou connectez-vous avec votre e-mail.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const emailIsValid = isValidEmail(email);

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f8fafd] px-4 py-8">
      <div className="flex w-full max-w-[400px] flex-1 flex-col justify-center">
        <WelloLogo className="mx-auto mb-8 h-9" />

        <div className="rounded-2xl border border-[#dbe5f7] bg-white px-6 py-8 shadow-[0_1px_3px_rgba(5,8,23,0.04)] sm:px-8">
          <h1 className="text-center text-2xl font-bold tracking-tight text-[#0b1230]">Connexion</h1>
          <p className="mt-1.5 text-center text-sm text-[#506390]">Accédez à votre espace de gestion.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field
              id="login-email"
              type="email"
              label="Adresse e-mail"
              placeholder="vous@restaurant.fr"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {/* Password: revealed once the email looks valid */}
            {emailIsValid && (
              <Field
                id="login-password"
                type="password"
                label="Mot de passe"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showToggle
                isPasswordVisible={showPasswordField}
                onTogglePassword={() => setShowPasswordField(!showPasswordField)}
                required
                labelAside={
                  <Link
                    to="/forgot-password"
                    className="text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                }
              />
            )}

            <button
              type="submit"
              disabled={isLoading || !emailIsValid || !password}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-semibold text-white
                transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2
                disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Connexion en cours…
                </>
              ) : (
                'Se connecter'
              )}
            </button>

            <div className="flex items-center gap-3 text-xs text-[#7e90bd]" aria-hidden>
              <span className="h-px flex-1 bg-[#dbe5f7]" />
              ou
              <span className="h-px flex-1 bg-[#dbe5f7]" />
            </div>

            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isLoading} />
          </form>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#506390]">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Connexion chiffrée et sécurisée
        </p>
      </div>

      <footer className="pt-6 text-xs text-[#7e90bd]">© 2024-2026 Wello Resto</footer>

      {/* MFA Modal */}
      <OTPVerification
        mode="mfa"
        isOpen={showMFAModal}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
        token={pendingAuthData?.session.token}
        recipient={pendingAuthData?.session.mfa_recipient}
      />
    </div>
  );
};

export default Login;
