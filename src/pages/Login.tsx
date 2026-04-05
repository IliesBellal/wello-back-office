import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { OTPVerification } from '@/components/auth';
import { AuthData } from '@/types/auth';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [pendingAuthData, setPendingAuthData] = useState<AuthData | null>(null);
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const { toast } = useToast();

  const handleMFASuccess = async () => {
    // Après validation MFA réussie, appeler POST /auth/login avec le token pour récupérer le user
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
    // Annulation de la vérification MFA
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
            // Vérifier le statut MFA
            if (response.data.mfa_status === 'pending') {
              // Stocker les données temporairement et ouvrir le modal MFA
              setPendingAuthData(response.data);
              setShowMFAModal(true);
              toast({
                title: 'Vérification requise',
                description: 'Veuillez saisir le code de sécurité envoyé à votre email.',
              });
            } else {
              // Connexion directe si MFA déjà validé ou non requis
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mb-4">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Wello Resto</CardTitle>
          <CardDescription>
            Connectez-vous à votre espace de gestion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nom@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Modal MFA */}
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
