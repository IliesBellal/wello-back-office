/**
 * EXEMPLE D'UTILISATION DU SYSTÈME OTP
 * 
 * Ce fichier montre comment utiliser le composant OTPVerification
 * pour la vérification email ou téléphone (usage manuel).
 * 
 * Pour le MFA, le système est automatique via l'intercepteur 401.
 */

import { useState } from 'react';
import { OTPVerification } from './OTPVerification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function OTPVerificationExample() {
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);

  const handleEmailSuccess = () => {
    console.log('✅ Email vérifié avec succès!');
    setShowEmailOTP(false);
    // Continuer le processus (inscription, etc.)
  };

  const handlePhoneSuccess = () => {
    console.log('✅ Téléphone vérifié avec succès!');
    setShowPhoneOTP(false);
    // Continuer le processus
  };

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Exemples de Vérification OTP</h1>

      {/* Exemple Email */}
      <Card>
        <CardHeader>
          <CardTitle>Vérification Email</CardTitle>
          <CardDescription>
            Utilisez ce composant pour vérifier l'adresse email d'un utilisateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Après l'inscription ou la modification d'email, demandez à l'utilisateur
            de saisir le code reçu par email.
          </p>
          <Button onClick={() => setShowEmailOTP(true)}>
            Vérifier mon email
          </Button>

          <OTPVerification
            mode="email"
            isOpen={showEmailOTP}
            onSuccess={handleEmailSuccess}
            onCancel={() => setShowEmailOTP(false)}
          />
        </CardContent>
      </Card>

      {/* Exemple Téléphone */}
      <Card>
        <CardHeader>
          <CardTitle>Vérification Téléphone</CardTitle>
          <CardDescription>
            Utilisez ce composant pour vérifier le numéro de téléphone d'un utilisateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Après l'inscription ou la modification du numéro, demandez à l'utilisateur
            de saisir le code reçu par SMS.
          </p>
          <Button onClick={() => setShowPhoneOTP(true)}>
            Vérifier mon téléphone
          </Button>

          <OTPVerification
            mode="tel"
            isOpen={showPhoneOTP}
            onSuccess={handlePhoneSuccess}
            onCancel={() => setShowPhoneOTP(false)}
          />
        </CardContent>
      </Card>

      {/* Exemple MFA */}
      <Card>
        <CardHeader>
          <CardTitle>Vérification MFA (Automatique)</CardTitle>
          <CardDescription>
            Le MFA est géré automatiquement par l'intercepteur 401
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Lorsque l'API retourne une erreur 401 avec <code>status: "mfa_required"</code>,
            le modal OTP s'ouvre automatiquement. Après validation, la requête est retentée.
          </p>
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
            <p className="text-xs font-mono">
              {`// Réponse API pour déclencher MFA`}
              <br />
              {`{`}
              <br />
              {`  "status": "mfa_required",`}
              <br />
              {`  "message": "Vérification requise"`}
              <br />
              {`}`}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            ℹ️ Pas besoin d'utiliser le composant manuellement pour le MFA.
          </p>
        </CardContent>
      </Card>

      {/* Code d'exemple */}
      <Card>
        <CardHeader>
          <CardTitle>Code d'exemple</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-xs">
            {`import { useState } from 'react';
import { OTPVerification } from '@/components/auth';

function MyComponent() {
  const [showOTP, setShowOTP] = useState(false);

  const handleSuccess = () => {
    console.log('Vérifié!');
    setShowOTP(false);
  };

  return (
    <>
      <button onClick={() => setShowOTP(true)}>
        Vérifier
      </button>

      <OTPVerification
        mode="email"
        isOpen={showOTP}
        onSuccess={handleSuccess}
        onCancel={() => setShowOTP(false)}
      />
    </>
  );
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
