import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { OTPVerification } from '@/components/auth';
import { AuthData } from '@/types/auth';
import { Mail, Lock, Eye, EyeOff, Shield, Check } from 'lucide-react';

// Animated background component
const AnimatedBackground = () => {
  const floatingElements = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: 12 + i * 3,
    delay: i * 0.3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-white via-slate-50 to-slate-100">
      {/* Animated gradient blobs - very subtle */}
      {floatingElements.map((elem) => (
        <motion.div
          key={elem.id}
          className="absolute rounded-full blur-3xl opacity-5"
          style={{
            width: Math.random() * 200 + 100,
            height: Math.random() * 200 + 100,
            background: `linear-gradient(135deg, #0ea5e9, #06b6d4)`,
            left: `${elem.x}%`,
            top: `${elem.y}%`,
          }}
          animate={{
            x: [0, 70, -70, 0],
            y: [0, -70, 70, 0],
            scale: [1, 1.3, 0.7, 1],
          }}
          transition={{
            duration: elem.duration,
            delay: elem.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Subtle lines decoration */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(15, 23, 42, 0.1) 25%, rgba(15, 23, 42, 0.1) 26%, transparent 27%, transparent 74%, rgba(15, 23, 42, 0.1) 75%, rgba(15, 23, 42, 0.1) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(15, 23, 42, 0.1) 25%, rgba(15, 23, 42, 0.1) 26%, transparent 27%, transparent 74%, rgba(15, 23, 42, 0.1) 75%, rgba(15, 23, 42, 0.1) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
};

// Input field with icon
const InputWithIcon = ({
  icon: Icon,
  type,
  placeholder,
  value,
  onChange,
  label,
  showToggle,
  isPasswordVisible,
  onTogglePassword,
  ...props
}: {
  icon: any;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  showToggle?: boolean;
  isPasswordVisible?: boolean;
  onTogglePassword?: () => void;
  [key: string]: any;
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={label} className="text-sm font-semibold text-slate-700">
        {label}
      </Label>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
        <Input
          id={label}
          type={showToggle && isPasswordVisible ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full h-12 pl-12 pr-12 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400
            focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
            backdrop-blur-sm transition-all duration-200 hover:border-slate-300"
          {...props}
        />
        {showToggle && (
          <motion.button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPasswordVisible ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
};

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
    if (pendingAuthData?.token) {
      try {
        setIsLoading(true);
        const response = await authService.loginWithToken(pendingAuthData.token);

        if (response.data.status === '1') {
          setAuthData(response.data);
          setShowMFAModal(false);
          setPendingAuthData(null);
          toast({
            title: 'Connexion réussie',
            description: `Bienvenue ${response.data.first_name}!`,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authService.login({ email, password });

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
          if (response.data.mfa_status === 'pending') {
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
              description: `Bienvenue ${response.data.first_name}!`,
            });
            navigate('/');
          }
          break;
      }
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' },
    },
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Glassmorphism card */}
        <motion.div
          className="backdrop-blur-sm bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden
            hover:shadow-xl transition-all duration-300"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.08)' }}
        >
          {/* Header */}
          <motion.div className="px-6 md:px-8 pt-8 md:pt-10 pb-6 text-center" variants={itemVariants}>
            {/* Logo and branding */}
            <motion.div
              className="mb-6 flex justify-center"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl blur-xl opacity-40" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center
                  shadow-md border border-blue-200">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.h1
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-2"
              variants={itemVariants}
            >
              Wello Resto
            </motion.h1>

            <motion.p className="text-sm md:text-base text-slate-600 font-medium" variants={itemVariants}>
              Espace de gestion professionnel
            </motion.p>
          </motion.div>

          {/* Form */}
          <motion.form onSubmit={handleSubmit} className="px-6 md:px-8 py-6 md:py-8 space-y-5" variants={containerVariants}>
            {/* Email field */}
            <motion.div variants={itemVariants}>
              <InputWithIcon
                icon={Mail}
                type="email"
                placeholder="votre.email@restaurant.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                label="Adresse email"
                required
              />
            </motion.div>

            {/* Password field - hidden by default, shown after valid email */}
            <motion.div
              variants={itemVariants}
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: isValidEmail(email) ? 1 : 0,
                height: isValidEmail(email) ? 'auto' : 0,
              }}
              transition={{ duration: 0.25 }}
            >
              {isValidEmail(email) && (
                <InputWithIcon
                  icon={Lock}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  label="Mot de passe sécurisé"
                  showToggle
                  isPasswordVisible={showPasswordField}
                  onTogglePassword={() => setShowPasswordField(!showPasswordField)}
                  required
                />
              )}
            </motion.div>

            {/* Submit button */}
            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={isLoading || !isValidEmail(email) || !password}
                className="w-full h-12 md:h-13 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold
                  rounded-lg shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300 relative overflow-hidden group hover:from-blue-700 hover:to-blue-700"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-700 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                        <Check className="w-5 h-5" />
                      </motion.div>
                    </>
                  )}
                </span>
              </motion.button>
            </motion.div>
          </motion.form>

          {/* Security badge footer */}
          <motion.div
            className="px-6 md:px-8 pb-6 md:pb-8 flex items-center justify-center gap-2 text-xs text-slate-600 bg-gradient-to-t from-slate-50 to-transparent pt-4"
            variants={itemVariants}
          >
            <Shield className="w-4 h-4 text-green-600" />
            <span>Connexion sécurisée SSL 256-bit</span>
          </motion.div>
        </motion.div>

        {/* Bottom accent */}
        <motion.div
          className="mt-6 text-center text-xs text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p>Version 1.0 • © 2024-2026 Wello Resto</p>
        </motion.div>
      </motion.div>

      {/* MFA Modal */}
      <OTPVerification
        mode="mfa"
        isOpen={showMFAModal}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
        token={pendingAuthData?.token}
      />
    </div>
  );
};

export default Login;
