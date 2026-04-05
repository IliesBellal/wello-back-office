# Système de Vérification OTP

Composants React réutilisables pour la validation OTP (One-Time Password) avec 3 cas d'usage : MFA, vérification email et vérification téléphone.

## 📁 Structure

```
/components/auth/
├── OTPVerification.tsx       # Composant modal principal
├── OTPInput.tsx              # Input 6 chiffres avec gestion focus
├── useOTPVerification.ts     # Hook custom pour la logique
├── index.ts                  # Exports
└── README.md                 # Cette documentation

/contexts/
└── MFAContext.tsx            # Provider pour l'intercepteur 401 MFA
```

## 🚀 Utilisation

### 1. Intercepteur MFA Automatique (Déjà configuré)

Le système MFA est déjà intégré dans l'application via le `MFAProvider` dans `App.tsx`. Lorsque l'API retourne une erreur 401 avec `status: "mfa_required"`, le modal OTP s'ouvre automatiquement.

**Réponse API attendue pour déclencher le MFA :**
```json
{
  "status": "mfa_required",
  "message": "Vérification de sécurité requise"
}
```

Après validation réussie, la requête initiale est automatiquement retentée.

### 2. Utilisation Manuelle (Email ou Téléphone)

Pour utiliser le composant OTP manuellement (par exemple, lors de l'inscription) :

```tsx
import { useState } from 'react';
import { OTPVerification } from '@/components/auth';

function RegisterPage() {
  const [showOTP, setShowOTP] = useState(false);

  const handleEmailVerification = () => {
    setShowOTP(true);
  };

  const handleSuccess = () => {
    console.log('Email vérifié avec succès!');
    setShowOTP(false);
    // Continuer le processus d'inscription
  };

  return (
    <>
      <button onClick={handleEmailVerification}>
        Vérifier mon email
      </button>

      <OTPVerification
        mode="email"  // ou "tel" pour téléphone
        isOpen={showOTP}
        onSuccess={handleSuccess}
        onCancel={() => setShowOTP(false)}
      />
    </>
  );
}
```

## 🎨 Props du Composant OTPVerification

| Prop | Type | Description |
|------|------|-------------|
| `mode` | `"mfa" \| "email" \| "tel"` | Type de vérification |
| `isOpen` | `boolean` | État d'ouverture du modal |
| `onSuccess` | `() => void` | Callback après validation réussie |
| `onCancel` | `() => void` | Callback lors de l'annulation |

## 📡 Endpoints API Utilisés

### POST /auth/verify
Vérifie le code OTP saisi.

**Payload :**
```json
{
  "mode": "mfa",
  "code": "123456"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Code validé avec succès"
}
```

### POST /auth/send-verification
Renvoie un nouveau code OTP.

**Payload :**
```json
{
  "mode": "email"
}
```

### GET /mfa/fallback-sms
Envoie le code par SMS (uniquement pour le mode MFA).

**Réponse :**
```json
{
  "success": true,
  "phone": "06 XX XX XX XX",
  "message": "SMS envoyé"
}
```

## ✨ Fonctionnalités

### OTPInput
- ✅ 6 inputs numériques
- ✅ Focus automatique sur le suivant
- ✅ Support du copier-coller
- ✅ Navigation au clavier (flèches, backspace)
- ✅ Animation d'erreur (shake)
- ✅ États disabled et error

### OTPVerification
- ✅ Auto-submit dès 6 chiffres saisis
- ✅ Bouton "Renvoyer le code" avec cooldown de 60s
- ✅ Fallback SMS pour MFA (avec cooldown)
- ✅ Messages contextuels selon le mode
- ✅ Affichage des erreurs API
- ✅ États de chargement clairs
- ✅ Timer visible pour les cooldowns

### Intercepteur MFA
- ✅ Détection automatique des 401 avec `mfa_required`
- ✅ Ouverture automatique du modal
- ✅ Retry automatique de la requête après validation
- ✅ Gestion des erreurs et annulations

## 🎯 Messages Contextuels

| Mode | Titre | Description |
|------|-------|-------------|
| `mfa` | Vérification de sécurité requise | Pour votre sécurité, veuillez saisir le code... |
| `email` | Vérifiez votre adresse email | Un code à 6 chiffres a été envoyé... |
| `tel` | Vérifiez votre numéro de téléphone | Un code à 6 chiffres a été envoyé par SMS... |

## 🔧 Personnalisation

### Modifier les durées de cooldown

Dans `useOTPVerification.ts`, changez la valeur de `setCooldown(60)` :

```ts
setCooldown(90); // 90 secondes au lieu de 60
```

### Modifier le nombre de chiffres

Dans `OTPInput.tsx`, changez la prop `length` :

```tsx
<OTPInput length={8} ... />  // 8 chiffres au lieu de 6
```

## 🧪 Testing

Pour tester le système OTP :

1. **Mode MFA** : Configurer l'API pour retourner `status: "mfa_required"` sur certains endpoints
2. **Mode Email/Tel** : Utiliser le composant manuellement comme dans l'exemple ci-dessus
3. **Fallback SMS** : Tester uniquement en mode MFA

## 📝 Notes Importantes

- Le header `X-App-Source: backoffice` est automatiquement ajouté à tous les appels API (voir `/memories/repo/API_HEADER_DIRECTIVE.md`)
- Le MFAProvider doit être placé au-dessus de l'AuthProvider dans la hiérarchie des providers
- Les codes OTP sont automatiquement effacés après une erreur pour faciliter la ressaisie
- Le focus automatique est géré pour une meilleure UX mobile et desktop

## 🐛 Dépannage

**Le modal MFA ne s'ouvre pas automatiquement**
- Vérifier que le MFAProvider enveloppe bien AuthProvider dans App.tsx
- Vérifier que l'API retourne bien `status: "mfa_required"` dans le JSON

**Le code n'est pas accepté**
- Vérifier que l'endpoint `/auth/verify` fonctionne correctement
- Vérifier que le payload contient bien `mode` et `code`

**Le bouton "Renvoyer" est toujours désactivé**
- Vérifier le state `cooldown` dans le hook
- Vérifier que la réponse de `/auth/send-verification` a `success: true`
