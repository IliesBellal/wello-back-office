# ⚡ Quick Start - Système de Formulaires Standardisé

## Installation (3 étapes)

### 1. Importer les composants

```tsx
import {
  SettingsPageContainer,
  SettingsGrid,
  SettingsCard,
  SettingsFieldsGrid,
} from '@/components/settings';
import { Store, Clock } from 'lucide-react';
```

### 2. Structure de base

```tsx
export const MySettingsPage = () => {
  return (
    <SettingsPageContainer>
      <SettingsGrid>
        {/* Vos cartes ici */}
      </SettingsGrid>
    </SettingsPageContainer>
  );
};
```

### 3. Ajouter vos cartes

```tsx
<SettingsCard
  title="Ma Carte"
  description="Description"
  icon={Store}
>
  <SettingsFieldsGrid columns="double">
    <Input placeholder="Champ 1" />
    <Input placeholder="Champ 2" />
  </SettingsFieldsGrid>
</SettingsCard>
```

---

## Patterns courants

### Pattern 1: Formulaire simple

```tsx
<SettingsCard title="Informations de Base" icon={Store}>
  <SettingsFieldsGrid columns="double">
    <Input placeholder="Nom" />
    <Input placeholder="Email" />
    <Input placeholder="Téléphone" />
    <Input placeholder="Adresse" />
  </SettingsFieldsGrid>
</SettingsCard>
```

### Pattern 2: Paramètres avec toggles

```tsx
<SettingsCard title="Options" icon={Settings}>
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Option 1</Label>
      <Switch onCheckedChange={...} />
    </div>
    <div className="flex items-center justify-between">
      <Label>Option 2</Label>
      <Switch onCheckedChange={...} />
    </div>
  </div>
</SettingsCard>
```

### Pattern 3: Section avec titre

```tsx
<SettingsCard
  title="Sections multiples"
  colSpan="full"
>
  <div className="space-y-6">
    <div>
      <h4 className="font-semibold mb-3">Section 1</h4>
      <SettingsFieldsGrid columns="triple">
        <Input />
        <Input />
        <Input />
      </SettingsFieldsGrid>
    </div>
    <div className="border-t pt-6">
      <h4 className="font-semibold mb-3">Section 2</h4>
      <SettingsFieldsGrid columns="double">
        <Input />
        <Input />
      </SettingsFieldsGrid>
    </div>
  </div>
</SettingsCard>
```

---

## Breakpoints responsifs

| Appareil | Cartes | Champs |
|----------|--------|--------|
| Mobile | 1 colonne | 1 colonne |
| Tablet | 2 colonnes | 2 colonnes |
| Desktop | 3 colonnes | Configurable |

---

## Props cheat sheet

### SettingsCard
```tsx
<SettingsCard
  title="Requis"
  description="Optionnel"
  icon={Store}
  colSpan="auto" // ou "full"
  className="custom"
>
  Contenu
</SettingsCard>
```

### SettingsFieldsGrid
```tsx
<SettingsFieldsGrid
  columns="single"  // "double" ou "triple"
  className="custom"
>
  Champs
</SettingsFieldsGrid>
```

---

## Exemples complets

### Exemple 1: Restaurant Settings

```tsx
import { useSettingsStore } from '@/store/settings';
import { Store, MapPin, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SettingsPageContainer,
  SettingsGrid,
  SettingsCard,
  SettingsFieldsGrid,
} from '@/components/settings';

export const RestaurantSettings = () => {
  const { data, update } = useSettingsStore();

  return (
    <SettingsPageContainer>
      <SettingsGrid>
        {/* Identité */}
        <SettingsCard
          title="Identité"
          description="Informations du restaurant"
          icon={Store}
        >
          <SettingsFieldsGrid columns="double">
            <div>
              <Label>Nom</Label>
              <Input value={data.name} onChange={e => update('name', e.target.value)} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={data.phone} onChange={e => update('phone', e.target.value)} />
            </div>
          </SettingsFieldsGrid>
        </SettingsCard>

        {/* Localisation */}
        <SettingsCard
          title="Localisation"
          description="Adresse et coordonnées"
          icon={MapPin}
        >
          <SettingsFieldsGrid columns="single">
            <div>
              <Label>Adresse</Label>
              <Input value={data.address} onChange={e => update('address', e.target.value)} />
            </div>
            <div>
              <Label>Code postal</Label>
              <Input value={data.zip} onChange={e => update('zip', e.target.value)} />
            </div>
          </SettingsFieldsGrid>
        </SettingsCard>

        {/* Horaires */}
        <SettingsCard
          title="Délais"
          description="Temps d'attente"
          icon={Clock}
        >
          <SettingsFieldsGrid columns="single">
            <div>
              <Label>Temps moyen (min)</Label>
              <Input type="number" value={data.waitTime} onChange={e => update('waitTime', parseInt(e.target.value))} />
            </div>
          </SettingsFieldsGrid>
        </SettingsCard>
      </SettingsGrid>
    </SettingsPageContainer>
  );
};
```

### Exemple 2: Feature Toggles

```tsx
import { useFeatures } from '@/hooks/useFeatures';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  SettingsPageContainer,
  SettingsGrid,
  SettingsCard,
} from '@/components/settings';

export const FeatureFlags = () => {
  const { features, toggleFeature } = useFeatures();

  return (
    <SettingsPageContainer>
      <SettingsGrid>
        <SettingsCard
          title="Fonctionnalités"
          description="Activez ou désactivez les fonctionnalités"
          colSpan="full"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(features).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{key}</Label>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => toggleFeature(key)}
                />
              </div>
            ))}
          </div>
        </SettingsCard>
      </SettingsGrid>
    </SettingsPageContainer>
  );
};
```

---

## Conseils pro

1. **Groupez logiquement**: Mettez les champs connexes dans la même carte
2. **Utilisez les colonnes**: `columns="double"` pour max 2 champs par ligne
3. **Icônes visuelles**: Ajoutez toujours une icône pour le contexte
4. **Description claire**: Aidez les utilisateurs avec des descriptions
5. **Mobile-first**: Testez toujours sur mobile d'abord

---

## Troubleshooting

**Q: Mes champs s'étirent sur toute la ligne?**
→ Utilisez `<SettingsFieldsGrid columns="double")`

**Q: Comment faire 4+ colonnes?**
→ Utilisez directement Tailwind: `grid grid-cols-4`

**Q: Puis-je mélanger SettingsFieldsGrid avec du contenu perso?**
→ Oui! Mélangez librement avec du JSX standard

**Q: Comment ajouter des actions (Save, Reset)?**
→ Mettez les boutons en dehors de SettingsGrid, après l'enfant

---

## Documentation complète

→ Consultez `SETTINGS_SYSTEM_GUIDE.md` pour plus de détails
→ Consultez `SETTINGS_UI_OPTIMIZATION.md` pour la vision globale

---

**Next steps**: 
1. ✅ Comprenez les 4 composants
2. ✅ Essayez les patterns courants
3. ✅ Lisez la documentation complète
4. ✅ Appliquez à vos pages!
