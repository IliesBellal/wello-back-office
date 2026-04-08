import { useContext } from 'react';
import { CommandPaletteContext, type CommandPaletteContextType } from '@/components/command-palette/CommandPalette';

/**
 * Hook to access command palette context from descendant components
 * Must be used within CommandPaletteProvider
 */
export function useCommandPaletteContext(): CommandPaletteContextType {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      'useCommandPaletteContext must be used within CommandPaletteProvider'
    );
  }
  return context;
}
