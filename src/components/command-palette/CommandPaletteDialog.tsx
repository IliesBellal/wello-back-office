import { useState, useMemo } from 'react';
import { Command } from 'cmdk';
import { commandRegistry, commandCategories } from '@/config/commandRegistry';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';
import { CommandAction } from '@/hooks/useCommandPalette';
import { Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (action: CommandAction) => void;
}

/**
 * CommandPaletteDialog - Main UI component
 * Displays searchable list of commands grouped by category
 * 
 * Features:
 * - Fuzzy search with real-time filtering
 * - Keyboard navigation (Up/Down arrows)
 * - Section grouping with visible headers
 * - Icons and descriptions for each command
 * - Command badges (if needed)
 */
export function CommandPaletteDialog({
  isOpen,
  onClose,
  onExecute,
}: CommandPaletteDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get fuzzy search results
  const searchResults = useFuzzySearch(searchQuery, commandRegistry);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, typeof searchResults> = {};

    commandCategories.forEach((category) => {
      groups[category] = [];
    });

    searchResults.forEach((result) => {
      groups[result.item.category].push(result);
    });

    // Filter out empty categories
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [searchResults]);

  // Calculate total items count
  const totalItems = groupedResults.reduce((acc, [_, items]) => acc + items.length, 0);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < totalItems - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter': {
        e.preventDefault();
        // Execute the selected command
        let currentIndex = 0;
        for (const [_, items] of groupedResults) {
          if (currentIndex + items.length > selectedIndex) {
            const itemIndex = selectedIndex - currentIndex;
            const selectedItem = items[itemIndex];
            if (selectedItem) {
              const action = selectedItem.item.action;
              onExecute(action as CommandAction);
            }
            break;
          }
          currentIndex += items.length;
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[25vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-lg border border-border bg-background shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="border-b border-border p-4 flex items-center gap-3">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Chercher une commande, une page, une action..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>

        {/* Results List */}
        <div className="max-h-[300px] overflow-y-auto">
          {totalItems === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune commande trouvée pour "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {groupedResults.map(([category, items], categoryIdx) => (
                <div key={category}>
                  {/* Category Header */}
                  {categoryIdx > 0 && (
                    <div className="border-t border-border/50" />
                  )}
                  <div className="px-4 py-2 mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider first:mt-0">
                    {category}
                  </div>

                  {/* Category Items */}
                  {items.map((result, itemIdx) => {
                    const globalIndex = groupedResults
                      .slice(0, categoryIdx)
                      .reduce((sum, [_, cItems]) => sum + cItems.length, 0) + itemIdx;

                    const Icon = result.item.icon;

                    return (
                      <button
                        key={result.item.id}
                        onClick={() => {
                          const action = result.item.action;
                          onExecute(action as CommandAction);
                        }}
                        className={cn(
                          'w-full px-4 py-3 flex items-center gap-3 text-sm transition-colors',
                          'hover:bg-accent cursor-pointer',
                          globalIndex === selectedIndex && 'bg-accent'
                        )}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-foreground">
                            {result.item.label}
                          </div>
                          {result.item.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {result.item.description}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="border-t border-border/50 bg-muted/30 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            {totalItems > 0 && (
              <span>
                <kbd className="px-2 py-1 rounded bg-background border border-border text-xs">
                  {selectedIndex + 1}
                </kbd>
                <span className="ml-1">/{totalItems}</span>
              </span>
            )}
          </div>
          <div className="flex gap-4">
            <span>
              <kbd className="px-2 py-1 rounded bg-background border border-border text-xs">
                ↑↓
              </kbd>
              <span className="ml-1">Naviguer</span>
            </span>
            <span>
              <kbd className="px-2 py-1 rounded bg-background border border-border text-xs">
                Esc
              </kbd>
              <span className="ml-1">Fermer</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
