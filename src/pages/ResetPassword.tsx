import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ArrowLeft, Check, Eye, EyeOff, Lock } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 8;

/**
 * "Mot de passe oublié" — step 2: the destination of the emailed link.
 *
 * The token comes from the query string (?token=...). A password rejected for
 * being too short does not consume the link, so the user can fix it and submit
 * again with the same URL. Every session is closed on success, hence the
 * redirect to /login rather than an automatic sign-in.
 *
 * See docs/PASSWORD_RESET.md in the API repo.
 */
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    !isLoading &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      toast({
        title: 'Mot de passe réinitialisé',
        description: 'Toutes vos sessions ont été fermées. Connectez-vous à nouveau.',
      });
      setTimeout(() => navigate('/login'), 2500);
    } catch (error) {
      toast({
        title: 'Échec de la réinitialisation',
        description:
          error instanceof Error
            ? error.message
            : 'Ce lien est invalide, expiré ou déjà utilisé.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // No token in the URL: the link was mangled (mail clients truncate long URLs).
  // Say so up front rather than letting the user type a password for nothing.
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white via-slate-50 to-slate-100">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 text-center space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">Lien incomplet</h1>
              <p className="text-sm text-slate-600">
                Ce lien de réinitialisation ne contient pas de jeton. Il a probablement été
                tronqué par votre messagerie. Copiez-le entièrement, ou demandez-en un nouveau.
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="block w-full h-12 leading-[3rem] bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold
                rounded-lg shadow-md hover:from-blue-700 hover:to-blue-700 transition-all"
            >
              Demander un nouveau lien
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white via-slate-50 to-slate-100">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 md:px-8 pt-8 md:pt-10 pb-6 text-center">
            <div className="mb-6 flex justify-center">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-md border ${
                  done
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gradient-to-br from-blue-600 to-cyan-600 border-blue-200'
                }`}
              >
                {done ? (
                  <Check className="w-8 h-8 text-green-600" />
                ) : (
                  <Lock className="w-8 h-8 text-white" />
                )}
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              {done ? 'C\'est fait' : 'Nouveau mot de passe'}
            </h1>
            <p className="text-sm text-slate-600">
              {done
                ? 'Redirection vers la page de connexion...'
                : `Choisissez un mot de passe d'au moins ${MIN_PASSWORD_LENGTH} caractères.`}
            </p>
          </div>

          {!done && (
            <form onSubmit={handleSubmit} className="px-6 md:px-8 pb-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {tooShort && (
                  <p className="text-xs text-amber-600">
                    Encore {MIN_PASSWORD_LENGTH - password.length} caractère(s).
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {mismatch && (
                  <p className="text-xs text-red-600">Les deux mots de passe diffèrent.</p>
                )}
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                Toutes vos sessions ouvertes seront fermées, y compris sur les tablettes de
                caisse. Vous devrez vous reconnecter partout.
              </div>

              <motion.button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold
                  rounded-lg shadow-md hover:shadow-xl hover:from-blue-700 hover:to-blue-700
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                whileHover={{ scale: canSubmit ? 1.02 : 1 }}
                whileTap={{ scale: canSubmit ? 0.98 : 1 }}
              >
                <span className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      Réinitialisation...
                    </>
                  ) : (
                    'Réinitialiser mon mot de passe'
                  )}
                </span>
              </motion.button>
            </form>
          )}

          <div className="px-6 md:px-8 pb-6 md:pb-8 pt-2 bg-gradient-to-t from-slate-50 to-transparent">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
