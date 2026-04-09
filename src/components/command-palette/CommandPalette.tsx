import React, { ReactNode, useCallback, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPalette, CommandPaletteContext, CommandAction, type CommandPaletteContextType } from '@/hooks/useCommandPalette';
import { CommandPaletteDialog } from './CommandPaletteDialog';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { ProductCreateSheetContext } from '@/contexts/ProductCreateSheetContext';

// Re-export context and type for use in custom hook
export { CommandPaletteContext };
export type { CommandPaletteContextType };

interface CommandPaletteProviderProps {
  children: ReactNode;
}

/**
 * CommandPaletteProvider - Top-level provider component
 * 
 * Responsibilities:
 * - Initialize command palette state
 * - Handle command execution (routing + callbacks)
 * - Provide context to child components
 * - Render dialog UI
 * 
 * Callbacks supported:
 * - navigate: Route-based navigation
 * - toggleTheme: Switch between light/dark mode
 * - logout: Sign out and redirect
 */
export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const productCreateSheetContext = useContext(ProductCreateSheetContext);

  // Handle command execution with routing + callbacks
  const handleExecuteCommand = useCallback(
    (action: CommandAction) => {
      if (action.type === 'navigate') {
        navigate(action.path);
        toast.success(`Navigating to ${action.path}`);
      } else if (action.type === 'callback') {
        // Route callbacks to appropriate handlers
        switch (action.name) {
          case 'openCreateProductSheet':
            if (productCreateSheetContext) {
              productCreateSheetContext.setIsOpen(true);
              navigate('/menu/products');
              toast.success('Ouverture du formulaire de création de produit');
            } else {
              toast.error('Impossible d\'ouvrir le formulaire de création de produit');
            }
            break;

          case 'toggleTheme': {
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
            toast.success(
              `Mode ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`
            );
            break;
          }
          case 'logout': {
            // TODO: Call logout service
            toast.info('Fonction "Déconnexion" - À implémenter');
            // navigate('/login');
            break;
          }

          default:
            console.warn(`Unknown callback: ${action.name}`);
        }
      }
    },
    [navigate, setTheme, theme]
  );

  // Setup command palette hook
  const commandPaletteState = useCommandPalette(handleExecuteCommand);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => commandPaletteState, [commandPaletteState]);

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CommandPaletteDialog
        isOpen={commandPaletteState.isOpen}
        onClose={commandPaletteState.close}
        onExecute={commandPaletteState.executeCommand}
      />
    </CommandPaletteContext.Provider>
  );
}
