# Système de Formulaires de Paramétrage - Guide d'Utilisation

## Vue d'ensemble

Ce guide explique comment utiliser le nouveau système de formulaires de paramétrage (Settings System) qui a été standardisé dans le back-office Wello.

### Composants disponibles

1. **SettingsPageContainer** - Conteneur principal avec max-width et padding
2. **SettingsGrid** - Grille responsive pour organiser les cartes (1 col mobile → 3 cols desktop)
3. **SettingsCard** - Carte individualisée avec titre, description et icône
4. **SettingsFieldsGrid** - Grille pour aligner les champs texte à l'intérieur d'une carte

---

## Structure de base

### Import des composants

```tsx
import { SettingsPageContainer } from '@/components/settings/SettingsPageContainer';
import { SettingsGrid } from '@/components/settings/SettingsGrid';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsFieldsGrid } from '@/components/settings/SettingsFieldsGrid';
```

### Layout standard

```tsx
export const YourSettingsPage = () => {
  return (
    <SettingsPageContainer>
      <SettingsGrid>
        {/* Vos cartes de paramètres ici */}
      </SettingsGrid>
    </SettingsPageContainer>
  );
};
```

---

## Exemples d'utilisation

### 1. Carte simple avec champs

```tsx
<SettingsCard
  title="Identité"
  description="Informations générales"
  icon={Store}
>
  <div className="space-y-4">
    <div>
      <Label htmlFor="name">Nom</Label>
      <Input id="name" value={data.name} onChange={...} />
    </div>
    <div>
      <Label htmlFor="phone">Téléphone</Label>
      <Input id="phone" value={data.phone} onChange={...} />
    </div>
  </div>
</SettingsCard>
```

### 2. Carte avec plusieurs champs côte à côte

```tsx
<SettingsCard
  title="Localisation"
  description="Adresse de votre établissement"
  icon={MapPin}
>
  <SettingsFieldsGrid columns="double">
    <div>
      <Label htmlFor="street">Rue</Label>
      <Input id="street" value={data.street} onChange={...} />
    </div>
    <div>
      <Label htmlFor="city">Ville</Label>
      <Input id="city" value={data.city} onChange={...} />
    </div>
  </SettingsFieldsGrid>
</SettingsCard>
```

### 3. Carte qui s'étend sur toute la largeur

```tsx
<SettingsCard
  title="Description"
  description="Texte long"
  colSpan="full"
>
  <textarea
    value={data.description}
    onChange={...}
    className="w-full"
  />
</SettingsCard>
```

---

## Props des composants

### SettingsPageContainer
- `children: ReactNode` - Contenu principal
- `className?: string` - Classes CSS additionnelles

### SettingsGrid
- `children: ReactNode` - Cartes de paramètres
- `className?: string` - Classes CSS additionnelles

### SettingsCard
- `title: string` - Titre de la carte (requis)
- `description?: string` - Description sous le titre
- `icon?: LucideIcon` - Icône affichée à côté du titre
- `children: ReactNode` - Contenu de la carte (requis)
- `colSpan?: 'full' | 'auto'` - Contrôle la largeur (full = sur toute la grille)
- `className?: string` - Classes CSS additionnelles

### SettingsFieldsGrid
- `children: ReactNode` - Champs du formulaire
- `columns?: 'single' | 'double' | 'triple'` - Nombre de colonnes (défaut: 'single')
- `className?: string` - Classes CSS additionnelles

---

## Responsive Breakpoints

Le système utilise les breakpoints Tailwind standard:

- **Mobile (< 768px)**: 1 colonne
- **Tablet (768px - 1024px)**: 2 colonnes
- **Desktop (> 1024px)**: 3 colonnes

Chaque SettingsCard occupe automatiquement 1 cellule de la grille. Utilisez `colSpan="full"` pour qu'une carte occupe toute la largeur.

---

## Exemple complet

```tsx
import { useState } from 'react';
import { Store, MapPin, Clock } from 'lucide-react';
import { SettingsPageContainer, SettingsGrid, SettingsCard, SettingsFieldsGrid } from '@/components/settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const RestaurantSettings = () => {
  const [data, setData] = useState({
    name: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    waitTime: 30,
  });

  return (
    <SettingsPageContainer>
      <SettingsGrid>
        {/* Identité */}
        <SettingsCard
          title="Identité"
          description="Informations principales"
          icon={Store}
        >
          <SettingsFieldsGrid columns="double">
            <div>
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
              />
            </div>
          </SettingsFieldsGrid>
        </SettingsCard>

        {/* Localisation */}
        <SettingsCard
          title="Localisation"
          description="Adresse physique"
          icon={MapPin}
        >
          <SettingsFieldsGrid columns="double">
            <div>
              <Label htmlFor="street">Rue</Label>
              <Input
                id="street"
                value={data.street}
                onChange={(e) => setData({ ...data, street: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={data.city}
                onChange={(e) => setData({ ...data, city: e.target.value })}
              />
            </div>
          </SettingsFieldsGrid>
        </SettingsCard>

        {/* Timing */}
        <SettingsCard
          title="Délais"
          description="Configuration des temps"
          icon={Clock}
        >
          <div>
            <Label htmlFor="wait">Temps d'attente moyen (min)</Label>
            <Input
              id="wait"
              type="number"
              value={data.waitTime}
              onChange={(e) => setData({ ...data, waitTime: parseInt(e.target.value) })}
            />
          </div>
        </SettingsCard>
      </SettingsGrid>
    </SettingsPageContainer>
  );
};
```

---

## Bonnes pratiques

1. **Largeur de contenu**: Le max-width est fixé à 7xl (80rem). N'ajoutez pas de padding supplémentaire.

2. **Espacement**: Utilisez `SettingsFieldsGrid` pour aligner les champs plutôt que d'ajouter du CSS personnalisé.

3. **Icônes**: Importez les icônes de `lucide-react` pour consistance visuelle.

4. **Groupement logique**: Regroup ez les champs connexes dans la même `SettingsCard`.

5. **Descriptions**: Fournissez toujours une description pour aider les utilisateurs.

---

## Files reutilisés

Pages actuellement refactorisées avec ce système:
- `/integrations/scannorder` (ScanNOrder.tsx)
- `/settings/establishment` (EstablishmentTab.tsx)

Ces pages servent de référence pour l'implémentation.

---

## Troubleshooting

**Q: Pourquoi mes champs s'étirent sur toute la ligne?**
A: Utilisez `SettingsFieldsGrid` avec `columns="double"` ou `columns="triple"` pour les mettre côte à côte.

**Q: Comment faire une carte pleine largeur?**
A: Ajoutez `colSpan="full"` à la SettingsCard.

**Q: Puis-je ajouter des classes Tailwind personnalisées?**
A: Oui, utilisez la prop `className` sur n'importe quel composant.

**Q: Comment personnaliser les couleurs?**
A: Utilisez directement les classes Tailwind sur le contenu. Le système fournit la structure, pas le style.
