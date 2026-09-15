import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleSignInButton } from '@/components/signup-tunnel/GoogleSignInButton';
import { decodeJwtPayload } from '@/lib/decodeJwtPayload';
import { Mail, User, Lock } from 'lucide-react';
import type { TunnelState } from './tunnelState';

interface GoogleIdTokenClaims {
  email?: string;
  given_name?: string;
  family_name?: string;
}

interface ScreenIdentityProps {
  state: TunnelState;
  onNext: (patch: Partial<TunnelState>) => void;
  /** Set when the final submission (screen 3) came back "email already used" — sends the visitor back here. */
  emailTakenError?: boolean;
}

/**
 * LOT A Semaine 3, Chantier 14, §5.2 — "Continuer avec Google" is the
 * primary, full-width action; the email/password path is revealed on
 * request and is NOT a visually-demoted fallback (same input sizing,
 * same button weight, once shown).
 */
export const ScreenIdentity = ({ state, onNext, emailTakenError }: ScreenIdentityProps) => {
  const [showEmailForm, setShowEmailForm] = useState(state.provider === 'password' && !!state.email);
  const [email, setEmail] = useState(state.email);
  const [password, setPassword] = useState(state.password);
  const [firstName, setFirstName] = useState(state.firstName);
  const [lastName, setLastName] = useState(state.lastName);
  const [error, setError] = useState<string | null>(null);
  /** Set once Google returns a credential — Google's own claims (given_name/
   * family_name) aren't guaranteed present, so first/last name are confirmed
   * here, editable, rather than sent straight through (a blank family_name
   * silently failed the API's required-field check with no way to fix it). */
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);

  const handleGoogleCredential = (idToken: string) => {
    const claims = decodeJwtPayload<GoogleIdTokenClaims>(idToken);
    setError(null);
    setGoogleIdToken(idToken);
    setEmail(claims?.email ?? '');
    setFirstName(claims?.given_name ?? '');
    setLastName(claims?.family_name ?? '');
  };

  const handleGoogleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Merci de renseigner votre prénom et votre nom.');
      return;
    }
    if (!googleIdToken) return;

    onNext({
      provider: 'google',
      idToken: googleIdToken,
      email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Tous les champs sont requis.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    onNext({
      provider: 'password',
      idToken: null,
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Créez votre compte</h1>
        <p className="text-sm text-slate-600">L'étape 1 sur 3 — votre identité.</p>
      </div>

      {emailTakenError && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-2">
          <p>Un compte existe déjà avec cette adresse e-mail.</p>
          <div className="flex flex-wrap gap-x-4">
            <Link to="/login" className="font-medium underline">Se connecter</Link>
            <Link to="/forgot-password" className="font-medium underline">Mot de passe oublié</Link>
          </div>
        </div>
      )}

      {googleIdToken ? (
        <form onSubmit={handleGoogleContinue} className="space-y-4">
          <p className="text-sm text-slate-600 text-center">
            Confirmez votre prénom et votre nom pour continuer.
          </p>

          <div className="space-y-2">
            <Label htmlFor="google-first-name">Prénom</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="google-first-name"
                autoComplete="given-name"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-last-name">Nom</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="google-last-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold
              rounded-lg shadow-md hover:shadow-xl hover:from-blue-700 hover:to-blue-700
              transition-all duration-300"
          >
            Continuer
          </button>

          <button
            type="button"
            onClick={() => setGoogleIdToken(null)}
            className="w-full text-sm text-slate-500 hover:text-slate-700 text-center underline transition-colors"
          >
            Utiliser un autre compte
          </button>
        </form>
      ) : (
        <>
          <GoogleSignInButton onCredential={handleGoogleCredential} />

          {!showEmailForm ? (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full text-sm text-slate-600 hover:text-slate-900 text-center underline transition-colors"
            >
              ou créer un compte avec mon adresse e-mail
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">Prénom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="first-name"
                    autoComplete="given-name"
                    autoFocus
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">Nom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="last-name"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="8 caractères minimum"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold
                  rounded-lg shadow-md hover:shadow-xl hover:from-blue-700 hover:to-blue-700
                  transition-all duration-300"
              >
                Continuer
              </button>
            </form>
          )}
        </>
      )}

      <p className="text-center text-sm text-slate-500">
        Déjà un compte ? <Link to="/login" className="underline hover:text-slate-700">Se connecter</Link>
      </p>
    </div>
  );
};
