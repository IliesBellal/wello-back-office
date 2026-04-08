import { useEffect, useState, useRef, useCallback } from 'react';

export type CommandAction = 
  | { type: 'navigate'; path: string }
  | { type: 'callback'; name: string };

export interface CommandPaletteContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  executeCommand: (action: CommandAction) => void;
}

/**
 * Hook to manage command palette state and keyboard shortcuts
 * Handles Cmd+K / Ctrl+K for opening/closing
 * Provides state management for open/close actions
 */
export function useCommandPalette(
  onExecute?: (action: CommandAction) => void
): CommandPaletteContextType {
  const [isOpen, setIsOpen] = useState(false);
  const eventListenerRef = useRef<((event: KeyboardEvent) => void) | null>(null);

  // Setup keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      const isCommandKey = event.metaKey || event.ctrlKey;
      const isKKey = event.key === 'k' || event.key === 'K';

      if (isCommandKey && isKKey) {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }

      // Also handle Escape to close
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    eventListenerRef.current = handleKeyDown;
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (eventListenerRef.current) {
        window.removeEventListener('keydown', eventListenerRef.current as EventListener);
      }
    };
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const executeCommand = useCallback(
    (action: CommandAction) => {
      if (onExecute) {
        onExecute(action);
      }
      close();
    },
    [onExecute, close]
  );

  return {
    isOpen,
    open,
    close,
    toggle,
    executeCommand,
  };
}

/**
 * Create context for CommandPalette
 * This allows descendant components to access command palette state
 */
import { createContext } from 'react';

export const CommandPaletteContext = createContext<CommandPaletteContextType | null>(
  null
);
