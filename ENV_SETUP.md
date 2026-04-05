# Configuration des variables d'environnement

## 📋 Résumé de la configuration

Ce projet utilise **Vite** pour charger les variables d'environnement avec le préfixe `VITE_`.

## 🚀 Démarrage rapide

### 1. Configuration locale (développement)

Copier le fichier `.env.example` en `.env.local`:
```bash
cp .env.example .env.local
```

Puis modifiez `.env.local` avec vos valeurs locales:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCK=false
VITE_ENABLE_LOGS=true
```

### 2. Configuration staging

Créez un fichier `.env.staging`:
```bash
cp .env.example .env.staging
```

Modifiez avec vos valeurs staging:
```env
VITE_API_BASE_URL=https://api-staging.youromain.com
VITE_USE_MOCK=false
VITE_ENABLE_LOGS=false
```

### 3. Configuration production

Créez un fichier `.env.production`:
```bash
cp .env.example .env.production
```

Modifiez avec vos valeurs production:
```env
VITE_API_BASE_URL=https://api.youromain.com
VITE_USE_MOCK=false
VITE_ENABLE_LOGS=false
```

## 📦 Variables d'environnement disponibles

| Variable | Type | Description | Valeur par défaut |
|----------|------|-------------|-------------------|
| `VITE_API_BASE_URL` | URL | URL de base de l'API backend | `https://ib-welloresto-api.onrender.com` |
| `VITE_USE_MOCK` | Booléen | Utiliser des données simulées pour les tests | `false` |
| `VITE_ENABLE_LOGS` | Booléen | Activer les logs détaillés des requêtes API | `true` |

## 🔒 Sécurité

### ✅ Fichiers ignorés (protégés)
- `.env.local` - Votre configuration locale (secrets protégés)
- `.env.staging.local` - Overrides staging locaux
- `.env.production.local` - Overrides production locaux

### ✅ Fichiers partagés (commités)
- `.env.example` - Template avec les noms des variables
- Ce fichier de documentation

### 📝 Points importants:
- **N'JAMAIS** committer `.env.local` ou fichiers similaires
- `.gitignore` est configuré pour ignorer les fichiers `.env*.local`
- `.env.example` est partagé pour que d'autres développeurs connaissent les variables requises

## 🏃 Utilisation en développement

Démarrer le serveur de développement:
```bash
bun run dev
# ou
npm run dev
```

Vite charge automatiquement les variables de `.env` → `.env.local` (les `.local` surchargent les fichiers de base).

## 🔨 Commandes disponibles

```bash
# Développement avec variables d'environnement locales
bun run dev

# Build avec variables staging
bun run build --mode staging

# Build avec variables production
bun run build

# Preview de la dernière build
bun run preview
```

## 📄 Fichiers de configuration

- **vite.config.ts** - Configuration Vite (déjà configurée)
- **.env.example** - Template des variables (partagé)
- **.env.local** - Configuration locale (ignoré par Git)
- **.gitignore** - Règles de Git (fichiers .env*.local ignorés)

## ✨ Migration depuis Lovable

Puisque vous venez de Lovable, assurez-vous que:
1. ✅ Les noms des variables correspondent exactement
2. ✅ Les types de données sont respectés (booléens = 'true'/'false' en string)
3. ✅ Les valeurs par défaut dans le code fonctionnent si une variable est manquante

Les variables utilisées dans votre code existent déjà avec les mêmes noms (`VITE_*`), donc aucun changement de code n'est nécessaire.
