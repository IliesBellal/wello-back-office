# Command Palette - Usage Guide

## Quick Start

The Command Palette is now fully integrated into your WelloResto backoffice and accessible in multiple ways:

### 📍 Where to Find It

1. **Visible Search Bar** - In the header (middle section) - **For all users**
   - Click the search bar directly
   - Shows keyboard shortcut hint (Cmd+K / Ctrl+K)
   - Best for users unfamiliar with keyboard shortcuts

2. **Keyboard Shortcut** - **For power users**
   - Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
   - Opens instantly from anywhere in the app

## What's Inside

### 🗺️ Navigation (38+ auto-generated routes)
Search for any page in your application:
- "Accueil" → Dashboard
- "Menu" → Menu Management
- "TVA" → Déclaration de TVA
- "Clients" → Customer Lists
- "Utilisateurs" → Users Page
- etc.

### ⚙️ Quick Actions (3 built-in callbacks)
- **Créer une nouvelle commande** - Open new order creation modal
- **Activer mode sombre** - Toggle dark/light theme
- **Déconnexion** - Sign out safely

### 🔍 Fuzzy Search Examples

Try typing:

| Query | Results |
|-------|---------|
| "cmd" | Commandes (orders) |
| "tva" | Déclaration de TVA |
| "sombre" | Activer mode sombre |
| "util" | Utilisateurs |
| "stok" | Stocks (typo-tolerant!) |
| "decon" | Déconnexion |

**Smart matching:**
- Typos are forgiven (within reason)
- Partial matches work
- Earlier matches score higher
- Keywords are weighted

## Keyboard Controls

| Key | Action |
|-----|--------|
| `Cmd+K` / `Ctrl+K` | Open/close palette |
| `↑` `↓` | Navigate results |
| `Enter` | Execute command |
| `Esc` | Close palette |

## Visual Access

The search bar appears in the header for visual discoverability:
- **Desktop**: Visible at all times (max-width: 1000px)
- **Mobile**: Hidden to save space (show on user request)
- Shows keyboard shortcut hint for power users
- Displays "Chercher une commande, une page..."

Results are grouped by category (always visible):

1. **Navigation** - All routes from your app
2. **Actions** - Custom actions (new order, theme, logout)
3. **Settings** - Settings-related items
4. **System** - System functions

## Architecture

```
App.tsx
├─ CommandPaletteProvider (global wrapper)
│  ├─ Manages state (isOpen, keyboard listeners)
│  ├─ Routes command execution
│  └─ Renders CommandPaletteDialog
│     ├─ Search input (fuzzy filter)
│     ├─ Results (by category)
│     └─ Navigation footer

commandRegistry.ts (Smart Registry)
├─ Auto-generated from navigationConfig.ts
│  └─ No duplication! Updates to nav sync automatically
├─ Manual commands
│  ├─ New Order Modal
│  ├─ Toggle Theme
│  └─ Logout
└─ Export: commandRegistry array + interfaces

useFuzzySearch.ts (Fuzzy Matching)
├─ Intelligent scoring algorithm
├─ Label (1.5x weight) > Keywords (1.2x) > Description
└─ Memoized for performance

useCommandPalette.ts (State Management)
├─ Keyboard listener (Cmd+K / Ctrl+K / Esc)
├─ Context provisioning
└─ Action routing

useCommandPaletteContext.ts (Hook)
└─ For accessing palette from descendants
```

## Adding New Commands

### 1. New Route? (Automatic!)
Just add to `navigationConfig.ts` → It appears in Command Palette automatically!

### 2. New Custom Action? (2-step)

**Step 1:** Add to `commandRegistry.ts`:
```typescript
{
  id: 'action-export',
  label: 'Exporter données',
  description: 'Exporter commandes en CSV',
  category: 'Actions',
  icon: Download,
  keywords: ['exporter', 'export', 'csv', 'données'],
  action: {
    type: 'callback' as const,
    name: 'exportData',
  },
}
```

**Step 2:** Add handler in `CommandPalette.tsx`:
```typescript
case 'exportData': {
  toast.info('Export en cours...');
  downloadCSV(); // your export function
  break;
}
```

Done! Command is live immediately.

## Performance Notes

✅ **Optimized for speed:**
- Fuzzy search is memoized (doesn't re-compute on every keystroke)
- Dialog is lazy-rendered (only appears when open)
- Navigation commands auto-generated once (at app start)
- No external dependencies for search algorithm

## FAQ

**Q: Why doesn't my new route appear in Command Palette?**  
A: Make sure it's in `navigationConfig.ts` with a valid `path` field.

**Q: How do I customize the search behavior?**  
A: Edit `calculateFuzzyScore()` in `useFuzzySearch.ts` to adjust weights.

**Q: Can I hide certain commands?**  
A: Add a filter in `CommandPaletteDialog` conditional rendering, or add a visibility flag to `CommandRegistry`.

**Q: How do I add keyboard aliases? (e.g., `:q` for exit)**  
A: Extend the search logic in `CommandPaletteDialog` to parse special syntax.

**Q: Does it work on mobile?**  
A: Currently Cmd+K is desktop. Mobile support via on-screen button coming in V2.

## Theme Support

The Command Palette automatically follows your app's theme:
- Light mode → Light palette
- Dark mode → Dark palette (via next-themes)

No special configuration needed!

## Next Steps

1. **Test it**: Press `Cmd+K` or `Ctrl+K`
2. **Try fuzzy search**: Type something like "tva" or "stk" (typo!)
3. **Try keyboard nav**: Use ↑↓ arrows and Enter
4. **Add custom actions**: Follow the "Adding New Commands" guide above
5. **Expand as needed**: The registry grows with your app

## Troubleshooting

If Command Palette doesn't open:
- Check console for errors
- Verify Cmd/Ctrl key press
- Ensure `CommandPaletteProvider` wraps the app (it does in App.tsx)

If search results are wrong:
- Check `commandRegistry.ts` for typos in labels/keywords
- Verify fuzzy score threshold (currently 20 minimum)
- Add more keywords to items with weak matches

## Architecture Philosophy

🎯 **Smart defaults, minimal setup, maximum extensibility**

- Auto-generated registry prevents code duplication
- Dual action types (navigate + callback) cover 95% of use cases
- Fuzzy search has no dependencies (smaller bundle, faster)
- Tailwind styling integrates seamlessly with your design system
- Keyboard controls are ergonomic (Cmd+K is standard Mac shortcut)
