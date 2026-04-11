## 👔 Module Équipe - Documentation Complète

### 🎯 Vue d'ensemble

Le module **Équipe** est une solution complète de gestion des ressources humaines pour ton back-office de restauration. Il vise à remplacer des outils RH tierces comme Combo avec une expérience "Wouaw", fluide et sereine.

**Route d'accès :** `/team`
**Navigation :** Équipe (menu latéral)

---

## 📊 Architecture du Module

### Structure des Dossiers

```
src/
├── components/team/
│   ├── PlanningTab.tsx           # Onglet planning principal
│   ├── EmployeesTab.tsx          # Onglet gestion employés (stub)
│   ├── TimesheetsTab.tsx         # Onglet pointages (stub)
│   ├── LeaveTab.tsx              # Onglet congés (stub)
│   ├── PlanningGrid.tsx          # Grille planning (employés x jours)
│   ├── DropZoneCell.tsx          # Zone de drop pour shifts
│   ├── ShiftCard.tsx             # Carte affichant un shift
│   ├── HourPerformanceIndicator.tsx  # Indicateur heures/contrat
│   ├── WeekNavigation.tsx        # Navigation de semaine
│   └── index.ts
├── pages/Team.tsx                # Page principale
├── types/team.ts                 # Types TypeScript
├── services/team/
│   └── mockData.ts               # Données mock + utilitaires
├── contexts/ShiftDragDropContext.tsx  # Contexte DnD
└── utils/calendarUtils.ts        # Utilitaires calendrier
```

---

## 🏗️ Composants en Détail

### 1. **PlanningTab** - Onglet Planning
**Fichier :** `src/components/team/PlanningTab.tsx`

**Responsabilités :**
- Gère l'état des shifts et la navigation de semaine
- Fournit les callbacks pour drag & drop
- Provider le contexte `ShiftDragDropProvider`

**Props :**
```typescript
interface PlanningTabProps {
  employees: Employee[];         // Liste des employés
  initialShifts: Shift[];         // Shifts initiaux (mock ou API)
  onShiftsUpdate?: (shifts: Shift[]) => void;  // Callback de mise à jour
}
```

**Fonctionnalités :**
- ✅ Vue semaine (lundi - samedi)
- ✅ Drag & drop des shifts
- ✅ Navigation semaine précédente/suivante
- ✅ Bouton "Aujourd'hui"
- ✅ Indicateur de performance heures/contrat

---

### 2. **PlanningGrid** - Grille de Planning
**Fichier :** `src/components/team/PlanningGrid.tsx`

**Structure visuelle :**
```
┌─────────────────────────────────────────┐
│ Employés │ Lun 15 │ Mar 16 │ ... │ Sam 20 │  (En-têtes jours)
├─────────────────────────────────────────┤
│ Marie ◇  │ [Cell │ [Cell │ ... │ [Cell  │  (Rangée 1)
│ (Perf)   │  +DnD │  +DnD │ ... │  +DnD  │
├─────────────────────────────────────────┤
│ Jean ◇   │ [Cell │ [Cell │ ... │ [Cell  │  (Rangée 2)
│ (Perf)   │  +DnD │  +DnD │ ... │  +DnD  │
└─────────────────────────────────────────┘
```

**Caractéristiques :**
- Grid CSS responsive (6 colonnes + colonne employé)
- Sticky header (jours restent visibles au scroll)
- Indicateur de performance sous chaque rangée
- Zones de drop configurées

---

### 3. **DropZoneCell** - Zone de Drop
**Fichier :** `src/components/team/DropZoneCell.tsx`

**Fonctionnement :**
- Accepte les shifts en drag & drop
- Affiche visuellement le hover/drop
- Bouton "+" pour ajouter un shift (si cellule vide)
- Intègre des ShiftCards

**États visuels :**
- Normal : border dashed grise, bg neutral-50
- Hover : border/bg bleu
- With dragged item : indication visuelle du drop possible

---

### 4. **ShiftCard** - Carte de Shift
**Fichier :** `src/components/team/ShiftCard.tsx`

**Affiche :**
```
┌────────────────────────────┐
│ 11:00 - 15:00       ☰ ✕   │  (Heures + icones)
│ 4h                         │  (Durée)
│ Shift du midi        │     │  (Notes optionnelles)
└────────────────────────────┘
```

**Couleurs par type de shift :**
- Morning : Amber
- Afternoon : Blue
- Evening : Purple
- Full : Green
- Custom : Gray

**Interactions :**
- Draggable (GripVertical icon)
- Bouton suppression (X)
- Statut visuel (cancelled = overlay diagonal)

---

### 5. **HourPerformanceIndicator** - Indicateur Perf
**Fichier :** `src/components/team/HourPerformanceIndicator.tsx`

**Affichage :**
```
┌─────────────────────────────────────────┐
│ 35.50h / 35.00h        [████░░░░░░]    │
│ ✓ Conforme (+0.50h)                    │
└─────────────────────────────────────────┘
```

**Logique :**
- **Match** (±30min) : ✓ Conforme (vert)
- **Under** (<-30min) : ⚠ Insuffisant (orange)
- **Over** (>+30min) : ↑ Excédent (bleu)

**Barre de progression :**
- Affiche ratio scheduled/contract (max 100%)
- Code couleur selon status

---

### 6. **WeekNavigation** - Navigation Semaine
**Fichier :** `src/components/team/WeekNavigation.tsx`

**Affiche :**
```
┌────────────────────────────────────────┐
│ [◄] [Aujourd'hui] [►]   Semaine 18 2026│
│                    lundi 13 mai - samedi 18 mai
└────────────────────────────────────────┘
```

**Actions :**
- Semaine précédente (-7j)
- Semaine suivante (+7j)
- Retour aujourd'hui

---

## 📦 Types TypeScript

### Employee
```typescript
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  contractType: 'CDI' | 'CDD' | 'Alternant' | 'Stagiaire';
  weeklyHours: number;           // Heures contractuelles
  startDate: Date;
  status: 'active' | 'inactive' | 'on_leave';
  avatar?: string;
  position?: string;
}
```

### Shift
```typescript
interface Shift {
  id: string;
  employeeId: string;
  date: Date;
  startTime: string;                    // HH:mm
  endTime: string;                      // HH:mm
  duration: number;                     // minutes
  shiftType?: 'morning' | 'afternoon' | 'evening' | 'full' | 'custom';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}
```

### LeaveDay
```typescript
interface LeaveDay {
  id: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  type: 'vacation' | 'sick' | 'personal' | 'unpaid';
  status: 'requested' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}
```

### Timesheet
```typescript
interface Timesheet {
  id: string;
  employeeId: string;
  date: Date;
  checkInTime?: string;                 // HH:mm
  checkOutTime?: string;                // HH:mm
  totalHours?: number;                  // minutes
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
}
```

---

## 🎯 Drag & Drop avec @dnd-kit

### Architecture

**Contexte :** `ShiftDragDropContext.tsx`

```typescript
const { draggedShift, activeDropZone, startDragShift, onDropShift } = useShiftDragDrop();
```

**Flux :**
1. Utilisateur clique sur ShiftCard
2. `startDragShift()` initialise le state
3. Utilisateur drop dans DropZoneCell
4. `onDropShift()` déclenche la mise à jour

**Bonnes pratiques :**
- Le Provider enveloppe tout le Planning
- State centralisé aux niveau PlanningTab
- Context pour l'accès transversal

---

## 📊 Données Mock

### Fichier : `src/services/team/mockData.ts`

**Contient :**
- `mockEmployees` : 5 employés pré-remplis
- `generateWeeklyShifts()` : génère les shifts mock
- Utilitaires : formatDuration, formatHours, calculateEmployeeHours

**Employés mock :**
1. Marie Dupont (Serveuse, CDI 35h)
2. Jean Martin (Chef, CDI 39h)
3. Sophie Bernard (Serveuse, CDD 30h)
4. Luc Rousseau (Cuisinier, CDI 35h)
5. Nathalie Leclerc (Serveur, Alternant 20h)

---

## 🚀 Utilisation / Integration Backend

### Étape 1 : Initialiser avec data réelle (au lieu du mock)

```typescript
// Dans Team.tsx ou via API
const { data: employees } = useQuery(['employees'], () => 
  employeeService.getAll()
);

const { data: shifts } = useQuery(['shifts', weekStartDate], () =>
  shiftService.getByWeek(weekStartDate)
);

return (
  <Team>
    <PlanningTab
      employees={employees || mockEmployees}
      initialShifts={shifts || []}
      onShiftsUpdate={handleShiftsUpdate}
    />
  </Team>
);
```

### Étape 2 : Persister les changements

```typescript
const handleShiftsUpdate = async (updatedShifts: Shift[]) => {
  try {
    await shiftService.updateWeeklyShifts(updatedShifts);
    // Invalider cache
    queryClient.invalidateQueries(['shifts']);
    toast.success('Planning mis à jour');
  } catch (err) {
    toast.error('Erreur lors de la mise à jour');
  }
};
```

### Étape 3 : API endpoints requis

```
GET  /api/employees              # Liste des employés
GET  /api/employees/:id          # Détail employé
POST /api/employees              # Créer employé
PUT  /api/employees/:id          # Modifier employé

GET  /api/shifts?week=2024-05-13 # Shifts d'une semaine
POST /api/shifts                 # Créer shift
PUT  /api/shifts/:id             # Modifier shift
DELETE /api/shifts/:id           # Supprimer shift

GET  /api/leaves?employee=:id    # Congés employé
POST /api/leaves                 # Demander congé
```

---

## 🎨 Personnalisation / Extensions

### Ajouter un type de shift

1. Mise à jour `Shift.shiftType` dans `types/team.ts`
2. Ajouter la couleur dans `ShiftCard.tsx`

```typescript
const shiftTypeColors: Record<string, string> = {
  // ... existing
  nightShift: 'bg-indigo-100 border-indigo-300 text-indigo-900',
};
```

### Implémenter l'onglet Employés

1. Remplacer le stub `EmployeesTab.tsx` par une vraie implémentation
2. Ajouter formulaires d'ajout/édition
3. Intégrer les services API

### Implémenter l'onglet Pointages

1. Créer interface pour clock-in/clock-out
2. Intégrer avec une API de pointage
3. Afficher rapports d'heures réelles vs planifiées

### Implémenter l'onglet Congés

1. Créer interface de demande de congé
2. Intégrer calendrier personne absence
3. Workflow d'approbation

---

## 🔗 Intégrations Utilitaires

### Calendrier

Fichier : `src/utils/calendarUtils.ts`

Fonctions utiles :
- `getWeekStartDate()` : lundi de la semaine
- `getWorkWeekDates()` : lun-sam
- `formatDateShort()` : "lun 15 avr"
- `isSameDay()` : comparaison dates

---

## 📱 Responsive Design

- Grid desktop : 6 colonnes + colonne employé
- Scroll horizontal sur petits écrans
- Sticky header (jours)
- Cartes shift adaptées

---

## ⚡ Performance

- Utilise React.memo sur ShiftCard
- Efficient re-renders via Context
- Pas de récalcul inutile des heures
- Shifts filtrés efficacement par date/employé

---

## 🐛 Troubleshooting

### Les shifts ne se glissent pas
- Vérifier que `ShiftDragDropProvider` enveloppe la grille
- Contrôler la console pour les erreurs de contexte

### Indicateur de performance ne s'affiche pas
- Vérifier que `weeklyHours` est défini sur l'employé
- Vérifier le calcul des shifts de la semaine

### Dates incorrectes
- Vérifier timezones avec `calendarUtils`
- `getWeekStartDate()` commence au lundi (0 = dimanche)

---

## 📝 Prochaines Étapes

Pour finaliser le module :

1. ✅ Planning drag & drop (FAIT)
2. ⏳ Intégration API (backend)
3. ⏳ Implémenter onglet Employés
4. ⏳ Implémenter onglet Pointages
5. ⏳ Implémenter onglet Congés
6. ⏳ Validation des données
7. ⏳ Tests unitaires
8. ⏳ Animations (framer-motion?)
9. ⏳ Export PDF / Plannings
10. ⏳ Notifications d'absence

---

**Module créé** : 👔 Équipe  
**Status** : ✅ Planning opérationnel (avec mock data)  
**Tech** : React • TypeScript • @dnd-kit • Tailwind CSS • Shadcn/UI
