# Guide de Refactoring de Navigation

## 📋 Vue d'ensemble

Cette refactorisation unifie la gestion de la navigation entre desktop et mobile en utilisant:
- **Configuration centralisée** (`navigationConfig.ts`)
- **Composant réutilisable** (`NavigationItems.tsx`)
- **Composants adaptés** (Sidebar et MobileSidebar)

## 🎯 Objectifs atteints

✅ **Unification**: Un seul composant `NavigationItems` pour desktop/mobile  
✅ **Data-Driven**: Structure du menu dans `navigationConfig.ts`  
✅ **Restructuration**: "Plan de salle" est maintenant un sous-item de "Réservations"  
✅ **Maintenance**: Réduit la duplication de code  
✅ **Accessibilité**: Support clavier et ARIA labels  

---

## 📁 Structure des fichiers

```
src/
├── config/
│   └── navigationConfig.ts        # ✨ Configuration centralisée du menu
│
├── components/
│   ├── navigation/
│   │   ├── NavigationItems.tsx    # ✨ Composant réutilisable (nouveau!)
│   │   ├── Sidebar.tsx             # 🔄 Mise à jour: utilise NavigationItems
│   │   ├── SidebarItem.tsx         # ℹ️ Conservé pour compatibilité (optionnel)
│   │   ├── CollapsibleItem.tsx     # ℹ️ Conservé pour compatibilité (optionnel)
│   │   └── SubItemsPopover.tsx     # ℹ️ Conservé pour compatibilité (optionnel)
│   │
│   ├── mobile/
│   │   ├── MobileHeader.tsx        # Utilise MobileSidebar dans un Sheet
│   │   └── MobileSidebar.tsx       # 🔄 Mise à jour: utilise NavigationItems
│   │
│   └── dashboard/
│       └── DashboardLayout.tsx     # Intègre Sidebar (desktop) et MobileHeader (mobile)
```

---

## 🔧 Configuration: navigationConfig.ts

### Structure d'un item de navigation

```typescript
interface NavigationItem {
  id: string;                              // Identifiant unique
  label: string;                           // Texte affiché
  icon: IconComponent;                     // Icône Lucide
  path?: string | null;                    // Optionnel si subItems existe
  badge?: number;                          // Optionnel: badge de notification
  subItems?: NavigationSubItem[];           // Optionnel: sous-items
}

interface NavigationSubItem {
  id: string;
  label: string;
  icon: IconComponent;
  path: string;
  badge?: number;
}
```

### Exemple: Section "Réservations" avec "Plan de salle"

```typescript
{
  id: 'reservations',
  label: 'Réservations',
  icon: LayoutGrid,
  subItems: [
    {
      id: 'floor-plan',
      label: 'Plan de salle',
      icon: LayoutGrid,
      path: '/locations',
    },
    // Ajouter d'autres sous-items ici
  ],
}
```

---

## 🎨 Composant NavigationItems

### Utilisation en Desktop

```typescript
<NavigationItems
  items={navigationConfig}
  variant="desktop"
  isCollapsed={!isExpanded}
  collapsibleState={collapsibleState}
  onToggleCollapsible={toggleSubItem}
/>
```

**Caractéristiques:**
- Gère l'état d'expansion/réduction
- Affiche les collapsibles agrandies
- Icônes avec popover en mode réduit
- Styling desktop avec borders et highlights

### Utilisation en Mobile

```typescript
<NavigationItems
  items={navigationConfig}
  variant="mobile"
  onItemClick={onClose}  // Ferme le drawer après clic
/>
```

**Caractéristiques:**
- Gère automatiquement l'état des collapsibles
- Tous les items visibles
- Touch-friendly (min 44px)
- Fermeture automatique du drawer

### Props complètes

```typescript
interface NavigationItemsProps {
  // Obligatoires
  items: NavigationItem[];
  variant: 'desktop' | 'mobile';
  
  // Optionnels
  onItemClick?: () => void;                    // Callback au clic
  isCollapsed?: boolean;                       // Desktop: état réduit
  collapsibleState?: Record<string, boolean>;  // Desktop: état des collapsibles
  onToggleCollapsible?: (itemId: string) => void; // Desktop: toggle collapsible
}
```

---

## 📚 Intégration au Layout

Le `DashboardLayout.tsx` utilise déjà correctement les nouveaux composants:

```typescript
// Desktop: Sidebar complet
{!isMobile && <Sidebar />}

// Mobile: MobileHeader avec Sheet contenant MobileSidebar
{isMobile ? <MobileHeader /> : <Header />}
```

**Aucune modification nécessaire au Layout!**

---

## ➕ Comment ajouter un nouvel item

### Étape 1: Ajouter à navigationConfig.ts

```typescript
{
  id: 'mon-section',
  label: 'Ma nouvelle section',
  icon: MyIcon,
  subItems: [
    {
      id: 'mon-item',
      label: 'Mon item',
      icon: MyItemIcon,
      path: '/mon-chemin',
    }
  ]
}
```

### Étape 2: Créer la route correspondante

```typescript
// Dans votre router configuration
{
  path: '/mon-chemin',
  element: <MonComponent />,
}
```

**C'est tout!** Les deux Sidebar (desktop/mobile) se mettront à jour automatiquement.

---

## 🎯 Ajout de sous-items

### Exemple: Ajouter des pages sous "Réservations"

```typescript
{
  id: 'reservations',
  label: 'Réservations',
  icon: LayoutGrid,
  subItems: [
    {
      id: 'floor-plan',
      label: 'Plan de salle',
      icon: LayoutGrid,
      path: '/locations',
    },
    {
      id: 'reservations-list',      // ✨ Nouveau
      label: 'Liste des réservations',
      icon: Calendar,
      path: '/reservations/list',
    },
    {
      id: 'reservations-settings',   // ✨ Nouveau
      label: 'Paramètres réservations',
      icon: Settings,
      path: '/reservations/settings',
    },
  ],
}
```

---

## 🏷️ Badges de notification

```typescript
{
  id: 'orders',
  label: 'Commandes',
  icon: ShoppingCart,
  path: '/orders',
  badge: 5,  // Affiche un badge rouge avec "5"
}
```

---

## 🎁 Icônes disponibles

Toutes les icônes viennent de **Lucide React**. Liste complète:
https://lucide.dev/

Icônes commune utilisées dans le back-office:
- `LayoutDashboard` - Tableau de bord
- `ShoppingCart` - Commandes
- `UtensilsCrossed` - Menu/Restaurant
- `Users` - Utilisateurs/Clients
- `Settings` - Paramètres
- `BarChart3` - Rapports/Analytics
- `Wallet` - Comptabilité/Paiements
- `Package` - Produits/Stock
- `LayoutGrid` - Grille/Plan
- `Tag` - Tags/Étiquettes
- `Gift` - Promotions/Fidélité
- `Link2` - Intégrations
- `TrendingUp` - Tendances

---

## 💾 localStorage & État de la Sidebar

Le hook `useSidebar()` gère:
- **isExpanded**: État d'expansion (localStorage: `sidebar-expanded`)
- **collapsibleState**: État des sections collapsibles (localStorage: `sidebar-collapsibles`)
- **toggleExpanded()**: Bascule l'expansion
- **toggleSubItem(id)**: Bascule un sous-menu

Pas de configuration nécessaire - cela fonctionne automatiquement!

---

## 🔄 Migration depuis l'ancien système

### Composants obsolètes (peuvent être supprimés)

- `SidebarItem.tsx` - Remplacé par NavigationItems
- `CollapsibleItem.tsx` - Remplacé par NavigationItems
- `SubItemsPopover.tsx` - Toujours utilisé par NavigationItems en mode réduit

### Ancienne approche (dans Sidebar)

```typescript
// ❌ Ancienne façon
{navigationConfig.map((item) => {
  if (!hasSubItems && item.path) {
    return <SidebarItem key={item.id} item={item} isCollapsed={!isExpanded} />;
  }
  if (hasSubItems) {
    return <CollapsibleItem key={item.id} item={item} isCollapsed={!isExpanded} />;
  }
})}
```

### Nouvelle approche (recommandée)

```typescript
// ✨ Nouvelle façon = une ligne!
<NavigationItems
  items={navigationConfig}
  variant="desktop"
  isCollapsed={!isExpanded}
  collapsibleState={collapsibleState}
  onToggleCollapsible={toggleSubItem}
/>
```

---

## 🚀 Cas d'usage avancés

### Masquer un item pour certains rôles

```typescript
// Dans navigationConfig ou dans NavigationItems
const filteredConfig = navigationConfig.filter(item => {
  if (item.id === 'users' && userRole !== 'admin') {
    return false;
  }
  return true;
});

<NavigationItems items={filteredConfig} variant="desktop" {...props} />
```

### Items avec chemins dynamiques

```typescript
{
  id: 'merchant-settings',
  label: `Paramètres - ${businessName}`,
  icon: Settings,
  path: `/settings/merchant/${merchantId}`,
}
```

### Icône personnalisée vs Badge

```typescript
{
  id: 'critical-alerts',
  label: 'Alertes',
  icon: AlertTriangle,
  path: '/alerts',
  badge: urgentCount > 0 ? urgentCount : undefined,
}
```

---

## 🧪 Vérification du refactoring

Avant et après devraient fonctionner identiquement:

- ✅ Navigation desktop: Expand/collapse, sous-items, active states
- ✅ Navigation mobile: Collapsibles, défilement, fermeture
- ✅ Badges: Affichés correctement
- ✅ Active states: Highlighting correct
- ✅ Routes: Tous les liens pointent aux bons endroits

---

## 📖 Prochaines étapes possibles

1. **Permissions par rôle**: Filtrer les items selon `userRole`
2. **Dynamique**: Charger la config depuis l'API
3. **Thèmes**: Ajouter des variantes de couleur par section
4. **Analytics**: Tracker les clics de navigation
5. **Breadcrumbs**: Utiliser la même config pour afficher le chemin

---

## ❓ FAQ

**Q: Dois-je mettre à jour mon Layout?**  
A: Non! Le layout fonctionne déjà avec les nouveaux composants.

**Q: Comment ajouter un niveau supplémentaire (4+ niveaux)?**  
A: Actuellement limité à 2 niveaux (item + subItems). Pour 3+ niveaux, étendre NavigationItems avec `subItems` récursifs.

**Q: Les anciens composants (SidebarItem, CollapsibleItem) sont-ils encore utilisés?**  
A: Non, pas de dépendances externes. Peuvent être supprimés.

**Q: Quelle est la performance impact?**  
A: Améliorée! Moins de code, consolidation de la logique, moins de re-renders.
