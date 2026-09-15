import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Lock } from 'lucide-react';

/**
 * LOT A Semaine 3, Chantier 14 — forced on first POS access for an account
 * created via Google (auth_provider='google') with no password yet: the
 * POS/kiosk run on shared tablets with no Google sign-in, so an owner who
 * signed up via Google otherwise has no way to unlock their own till.
 *
 * Reached only through ProtectedRoute's redirect (needsPasswordSet query) —
 * never linked to directly, and deliberately has no "back"/"skip" affordance:
 * it is mandatory, not a preference screen. POST /v1/auth/password/set
 * itself has existed since LOT A Semaine 2, Chantier 8 — this page is its
 * first frontend caller.
 */
const SetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.setPassword(newPassword);
      // Invalidate rather than trust a client-side flag: the next
      // ProtectedRoute check re-fetches and will genuinely see false.
      await queryClient.invalidateQueries({ queryKey: ['auth', 'needs-password-set'] });
      toast({ title: 'Mot de passe défini', description: 'Vous pouvez désormais vous connecter au POS avec ce mot de passe.' });
      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de définir le mot de passe. Réessayez dans un instant.',
      );
    } finally {
      setIsLoading(false);
    }
  };

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
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-md border border-blue-200">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              Définissez un mot de passe
            </h1>
            <p className="text-sm text-slate-600">
              Votre compte a été créé avec Google. Le POS et les bornes ne peuvent pas
              utiliser Google — définissez un mot de passe pour continuer.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 md:px-8 pb-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  placeholder="8 caractères minimum"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmez le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Retapez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <motion.button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold
                rounded-lg shadow-md hover:shadow-xl hover:from-blue-700 hover:to-blue-700
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
            >
              <span className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    Enregistrement...
                  </>
                ) : (
                  'Définir le mot de passe'
                )}
              </span>
            </motion.button>
          </form>

          <div className="px-6 md:px-8 pb-6 md:pb-8 pt-2 bg-gradient-to-t from-slate-50 to-transparent text-center">
            <button
              type="button"
              onClick={logout}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SetPassword;
