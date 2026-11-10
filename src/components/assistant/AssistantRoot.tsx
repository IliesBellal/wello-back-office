/**
 * Point d'entrée de l'assistant, monté une fois dans App.tsx.
 *
 * Le bouton flottant n'apparaît que sur les pages du back-office (celles qui
 * rendent DashboardLayout → <AssistantAnchor />) et pour une personne
 * connectée. Le panneau est chargé au premier survol / toucher du bouton.
 * Raccourci : ⌘J / Ctrl+J.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useAssistantAnchored } from './anchor';
import { useIsMobileNow } from './useIsMobileNow';

const loadPanel = () => import('./AssistantPanel');
const AssistantPanel = lazy(loadPanel);

/** Pages plein écran avec leurs propres commandes flottantes (éditeur de plan de salle). */
const HIDDEN_ON = ['/locations'];
const FAB_SEEN_KEY = 'wello.assistant.fab_seen.v1';

export function AssistantRoot() {
  const anchored = useAssistantAnchored();
  const { authData } = useAuth();
  const isMobile = useIsMobileNow();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const toggle = () => {
    setMounted(true);
    setOpen((o) => !o);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setMounted(true);
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Déconnexion ou page hors back-office : on referme.
  useEffect(() => {
    if (!anchored || !authData) setOpen(false);
  }, [anchored, authData]);

  if (!authData) return null;
  const visible = anchored && !HIDDEN_ON.some((p) => location.pathname.startsWith(p));

  return (
    <>
      {visible && !(isMobile && open) && <AssistantFab open={open} onClick={toggle} />}
      {mounted && (
        <Suspense fallback={null}>
          <AssistantPanel open={open && visible} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

function AssistantFab({ open, onClick }: { open: boolean; onClick: () => void }) {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(FAB_SEEN_KEY) === '1';
    } catch {
      return true;
    }
  });
  const prefetch = () => void loadPanel();

  return (
    <motion.button
      type="button"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.25 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.93 }}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      onClick={() => {
        if (!seen) {
          setSeen(true);
          try {
            localStorage.setItem(FAB_SEEN_KEY, '1');
          } catch {
            /* stockage indisponible */
          }
        }
        onClick();
      }}
      aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant"}
      aria-expanded={open}
      title="Assistant · ⌘J"
      className={cn(
        'fixed z-[55] flex items-center justify-center rounded-full text-white',
        'right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] h-14 w-14',
        'md:bottom-6 md:right-6 md:h-[52px] md:w-[52px]',
        'bg-gradient-to-br from-[hsl(var(--primary-gradient-from))] to-[hsl(var(--primary-gradient-to))]',
        'shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.65),inset_0_1px_0_rgb(255_255_255/0.25)]',
        'outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
      )}
    >
      {!seen && <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" aria-hidden />}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={open ? 'close' : 'open'}
          initial={{ rotate: -45, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 45, opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.15 }}
          className="flex"
        >
          {open ? <X className="h-6 w-6" strokeWidth={2.2} /> : <Sparkles className="h-6 w-6" strokeWidth={2} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
