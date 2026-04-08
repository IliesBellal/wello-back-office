import { Search } from 'lucide-react';
import { useCommandPaletteContext } from '@/hooks/useCommandPaletteContext';
import { cn } from '@/lib/utils';

/**
 * CommandPaletteSearchBar - Visible search trigger in header
 * Allows users to access Command Palette without knowing the keyboard shortcut
 * 
 * Features:
 * - Displays keyboard shortcut hint (Cmd+K / Ctrl+K)
 * - Opens Command Palette on click
 * - Responsive design (hides on mobile to save space)
 * - Matches design system styling
 */
export function CommandPaletteSearchBar() {
  const { open } = useCommandPaletteContext();

  const isWindows = typeof navigator !== 'undefined' && navigator.platform.includes('Win');
  const shortcutText = isWindows ? 'Ctrl+K' : 'Cmd+K';

  return (
    <button
      onClick={open}
      className={cn(
        // Base styles
        'flex items-center gap-3 px-4 py-2.5 rounded-lg',
        'bg-muted hover:bg-muted/80 transition-colors',
        'border border-border hover:border-border/80',
        'text-sm text-muted-foreground hover:text-foreground',
        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        // Hide on very small screens, show on md and up
        'hidden md:flex',
        // Responsive width
        'w-full max-w-sm'
      )}
      title="Ouvrir la recherche de commandes (Cmd+K)"
    >
      {/* Search Icon */}
      <Search className="w-4 h-4 flex-shrink-0 opacity-50" />

      {/* Placeholder Text */}
      <span className="flex-1 text-left truncate opacity-70">
        Chercher une commande, une page...
      </span>

      {/* Keyboard Shortcut Badge */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <kbd className="px-2 py-1 text-xs font-mono rounded-md bg-background border border-border/50 opacity-60">
          {shortcutText}
        </kbd>
      </div>
    </button>
  );
}
