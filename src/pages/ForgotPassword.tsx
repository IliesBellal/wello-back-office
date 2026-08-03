import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react';

/**
 * "Mot de passe oublié" — step 1: ask for the account, trigger the email.
 *
 * The backend answers 200 whether or not the account exists, to avoid becoming
 * an account-enumeration oracle. This screen mirrors that: on success it shows
 * a deliberately neutral message ("if an account matches...") and never
 * confirms that an email was actually sent.
 *
 * See docs/PASSWORD_RESET.md in the API repo.
 */
const ForgotPassword = () => {
  const [login, setLogin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await authService.forgotPassword(login.trim());
      setSubmitted(true);
    } catch (error) {
      // Only a genuine server/network failure lands here — an unknown account
      // still returns 200.
      toast({
        title: 'Erreur',
        description:
          error instanceof Error
            ? error.message
            : "Impossible d'envoyer la demande. Réessayez dans un instant.",
        variant: 'destructive',
      });
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
                {submitted ? (
                  <MailCheck className="w-8 h-8 text-white" />
                ) : (
                  <KeyRound className="w-8 h-8 text-white" />
                )}
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              {submitted ? 'Demande enregistrée' : 'Mot de passe oublié'}
            </h1>
            <p className="text-sm text-slate-600">
              {submitted
                ? 'Si un compte correspond, un email de réinitialisation vient de partir.'
                : 'Saisissez votre email ou votre identifiant. Nous vous enverrons un lien pour choisir un nouveau mot de passe.'}
            </p>
          </div>

          {submitted ? (
            <div className="px-6 md:px-8 pb-6 space-y-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-2">
                <p>
                  Le lien est valable <strong>30 minutes</strong> et ne peut être utilisé
                  qu'une seule fois.
                </p>
                <p>
                  Rien reçu ? Vérifiez vos courriers indésirables, puis vérifiez l'adresse
                  saisie auprès d'un administrateur.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setLogin('');
                }}
                className="w-full h-11 rounded-lg border border-slate-200 text-slate-700 font-medium
                  hover:bg-slate-50 transition-colors"
              >
                Faire une autre demande
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 md:px-8 pb-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login">Email ou identifiant</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="login"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    placeholder="votre.email@restaurant.fr"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading || !login.trim()}
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
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le lien'
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

export default ForgotPassword;
