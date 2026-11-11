/**
 * Point d'entrée de l'assistant, monté une fois dans App.tsx.
 *
 * Le bouton flottant n'apparaît que sur les pages du back-office (celles qui
 * rendent DashboardLayout → <AssistantAnchor />) et pour une personne
 * connectée. Le panneau est chargé au premier survol / toucher du bouton.
 * Raccourci : ⌘J / Ctrl+J.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
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
  /** Page ouverte depuis l'assistant sur mobile : « Vous êtes sur … ». */
  const [notice, setNotice] = useState<{ label: string; key: number } | null>(null);

  const onRedirect = (label: string) => {
    setOpen(false);
    if (isMobile) setNotice({ label, key: Date.now() });
  };

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
      <AnimatePresence>
        {notice && visible && !open && (
          <RedirectNotice
            key={notice.key}
            label={notice.label}
            onBack={() => {
              setNotice(null);
              setOpen(true);
            }}
            onDone={() => setNotice((n) => (n?.key === notice.key ? null : n))}
          />
        )}
      </AnimatePresence>
      {mounted && (
        <Suspense fallback={null}>
          <AssistantPanel open={open && visible} onClose={() => setOpen(false)} onRedirect={onRedirect} />
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
          {open ? <X className="h-6 w-6" strokeWidth={2.2} /> : <ChatBubbleIcon className="h-[26px] w-[26px]" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * Bulle de discussion : cercle parfait (r = 8,5) avec une courte pointe en
 * bas à gauche, trait unique et arrondi, sans décor.
 */
function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M12 3.5a8.5 8.5 0 1 1-4.1 15.95L4 20.5l.91-3.81A8.5 8.5 0 0 1 12 3.5z" />
    </svg>
  );
}

/**
 * « Vous êtes sur … » après une redirection sur mobile, au-dessus de la barre
 * de navigation et à gauche du bouton flottant ; « Revenir » rouvre la
 * conversation là où elle en était.
 */
function RedirectNotice({ label, onBack, onDone }: { label: string; onBack: () => void; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = window.setTimeout(() => done.current(), 4500);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      className="fixed left-4 right-[5.5rem] z-[55] flex min-h-[48px] items-center gap-3 rounded-2xl border border-border/70 bg-white py-2 pl-4 pr-2 shadow-[0_8px_24px_-8px_rgb(15_23_42/0.25)] bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] dark:bg-card"
    >
      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        <span className="text-muted-foreground">Vous êtes sur </span>
        <span className="font-medium">{label}</span>
      </p>
      <button
        type="button"
        onClick={onBack}
        className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        Revenir
      </button>
    </motion.div>
  );
}
