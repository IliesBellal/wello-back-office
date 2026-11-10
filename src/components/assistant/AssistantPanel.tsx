/**
 * Panneau de l'assistant : bulle flottante sur ordinateur, plein écran sur
 * mobile. Chargé à la demande (premier clic sur le bouton) pour ne rien
 * ajouter au chargement initial du back-office.
 */
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Info, SquarePen, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProductCreateSheetContext } from '@/contexts/ProductCreateSheetContext';
import { SEED_BLACKLIST } from '@/lib/assistant/defaultModel';
import { buildCatalog, prepareModel } from '@/lib/assistant/engine';
import { getModelStore } from '@/lib/assistant/modelStore';
import { CHANNEL_RECORDS } from '@/lib/assistant/channels';
import { AssistantTracker, detectDevice, detectPlatform } from '@/lib/assistant/tracking';
import type { EntityRecord } from '@/lib/assistant/types';
import { checkPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { AssistantMessage, AssistantOrb, TypingIndicator, UserBubble } from './AssistantBlocks';
import { AssistantComposer, type ComposerHandle } from './AssistantComposer';
import { AssistantInfo } from './AssistantInfo';
import { AssistantWelcome } from './AssistantWelcome';
import { cachedProducts, loadCatalog } from './catalog';
import { withNavigation } from './navIntents';
import { useAssistantConversation } from './useAssistantConversation';
import { useIsMobileNow } from './useIsMobileNow';

const ONBOARDED_KEY = 'wello.assistant.onboarded.v1';
/** Rouvert dans les 10 minutes : la conversation reprend où elle en était. */
const RESUME_WINDOW_MS = 10 * 60 * 1000;

const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* stockage indisponible */
  }
};

/**
 * Nom de l'établissement ; avec plusieurs établissements (franchise, même
 * enseigne), on ajoute la rue pour les distinguer.
 */
function merchantLabel(authData: ReturnType<typeof useAuth>['authData']): string | undefined {
  if (!authData) return undefined;
  const name = authData.merchant.business_name || authData.merchant.name;
  if ((authData.session.merchants?.length ?? 0) < 2) return name;
  const current = authData.session.merchants.find((m) => m.id === authData.session.merchant_id);
  const street = (current?.address || authData.merchant.address || '').split(',')[0].trim();
  return street ? `${name} · ${street}` : name;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AssistantPanel({ open, onClose }: Props) {
  const isMobile = useIsMobileNow();
  const { authData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const productSheet = useContext(ProductCreateSheetContext);

  // ─── Modèle, moteur, catalogue ────────────────────────────────────────────
  const merchantId = authData?.session.merchant_id ?? 'anonymous';
  const store = useMemo(() => getModelStore('backoffice', String(merchantId)), [merchantId]);
  const [model, setModel] = useState(() => store.current);
  const permissions = useMemo<Set<string> | '*'>(
    () => (authData?.access?.admin ? '*' : new Set<string>(authData?.permissions ?? [])),
    [authData],
  );
  const index = useMemo(() => prepareModel(withNavigation(model, authData), SEED_BLACKLIST), [model, authData]);
  const [records, setRecords] = useState<EntityRecord[]>(() => cachedProducts());
  // Produits et équipiers de l'établissement + canaux de vente (« CA borne »).
  const catalog = useMemo(() => buildCatalog(index, [...records, ...CHANNEL_RECORDS]), [index, records]);
  const products = useMemo(() => records.filter((r) => r.type === 'product'), [records]);

  // ─── Mesure d'usage : une session par ouverture ───────────────────────────
  const trackerRef = useRef<AssistantTracker | null>(null);
  const tracker = useMemo(
    () =>
      ({
        track: (...args: Parameters<AssistantTracker['track']>) => trackerRef.current?.track(...args) ?? '',
      }) as unknown as AssistantTracker,
    [],
  );

  const [infoOpen, setInfoOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(() => safeGet(ONBOARDED_KEY) !== '1');
  const composer = useRef<ComposerHandle>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const closedAt = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const conv = useAssistantConversation({
    index,
    catalog,
    products,
    baseContext: { permissions, path: location.pathname },
    tracker,
    actions: {
      merchantId: authData?.session.merchant_id ? String(authData.session.merchant_id) : undefined,
      merchantLabel: merchantLabel(authData),
      navigate,
      logout,
      queryClient,
      openCreateProduct: () => {
        if (!productSheet) return false;
        productSheet.setIsOpen(true);
        return true;
      },
    },
    closeAfter: (when) => {
      if (when === 'always' || isMobile) window.setTimeout(() => onCloseRef.current(), 450);
    },
  });
  const convRef = useRef(conv);
  convRef.current = conv;

  useEffect(
    () =>
      store.subscribe((m) => {
        setModel(m);
        trackerRef.current?.setModelVersion(m.version);
        trackerRef.current?.track('model_loaded', { data: { version: m.version, intents: m.intents.length, aliases: m.aliases.length } });
      }),
    [store],
  );

  useEffect(() => {
    if (!open) return;
    const c = convRef.current;
    if (closedAt.current && Date.now() - closedAt.current > RESUME_WINDOW_MS) c.reset();
    c.newSession();
    const t = new AssistantTracker({
      surface: 'backoffice',
      origin_path: location.pathname,
      device: detectDevice(),
      platform: detectPlatform(),
      model_version: store.current.version,
      online: navigator.onLine,
    });
    trackerRef.current = t;
    t.track('opened', {
      data: {
        path: location.pathname,
        model_version: store.current.version,
        model_source: store.isSeed ? 'seed' : 'server',
        catalog_size: cachedProducts().length,
        resumed: c.messages.length > 0,
      },
    });
    void store.refresh();
    void loadCatalog({ employees: checkPermission(authData, 'staff.schedule.manage') }).then((r) => {
      if (r.length) setRecords(r);
    });
    if (!isMobile) window.setTimeout(() => composer.current?.focus(), 150);
    return () => {
      t.track('closed', { data: { outcome: convRef.current.outcome(), turns: convRef.current.turns() } });
      t.end();
      trackerRef.current = null;
      closedAt.current = Date.now();
      setInfoOpen(false);
    };
    // Une session par ouverture : uniquement sur `open`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Échap pour fermer ; défilement de la page bloqué en plein écran.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    if (isMobile) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isMobile]);

  // Toujours voir le dernier message (l'accueil, lui, reste en haut).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (conv.messages.length === 0) el.scrollTo({ top: 0 });
    else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [conv.messages, conv.busy]);

  const markOnboarded = (action: string) => {
    if (!onboarding) return;
    safeSet(ONBOARDED_KEY, '1');
    setOnboarding(false);
    tracker.track('onboarding_seen', { data: { action } });
  };

  const openInfo = (from: string) => {
    markOnboarded('info');
    tracker.track('learning_info_opened', { data: { from } });
    setInfoOpen(true);
  };

  const runExample = (text: string, from: string) => {
    tracker.track('example_clicked', { data: { text, from } });
    setInfoOpen(false);
    conv.submit(text, 'chip');
  };

  const firstName = authData?.user.first_name;
  const empty = conv.messages.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="assistant-panel"
          role="dialog"
          aria-modal={isMobile}
          aria-label="Assistant"
          // Toutes les propriétés sont toujours fixées : un passage mobile ↔ ordinateur
          // pendant l'animation ne laisse jamais le panneau transparent.
          initial={isMobile ? { y: '100%', opacity: 1, scale: 1 } : { y: 12, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={isMobile ? { y: '100%', opacity: 1, scale: 1 } : { y: 12, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
          className={cn(
            'fixed z-[60] flex flex-col overflow-hidden',
            isMobile
              ? 'inset-0 bg-white pt-[env(safe-area-inset-top)] dark:bg-card'
              : 'bottom-[5.5rem] right-6 h-[min(680px,calc(100vh-7.5rem))] w-[400px] origin-bottom-right rounded-[28px] border border-border/70 bg-white dark:bg-card shadow-[0_24px_64px_-16px_rgb(15_23_42/0.28),0_2px_6px_rgb(15_23_42/0.06)]',
          )}
        >
          {infoOpen ? (
            <AssistantInfo index={index} onBack={() => setInfoOpen(false)} onExample={(t) => runExample(t, 'info')} />
          ) : (
            <>
              <header className={cn('flex h-14 shrink-0 items-center gap-3 border-b border-border/60 pl-4 pr-2', isMobile && 'bg-background')}>
                <AssistantOrb size={30} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-[15px] font-semibold">Assistant</p>
                  <button
                    type="button"
                    onClick={() => openInfo('header')}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Apprend de vos demandes
                  </button>
                </div>
                {!empty && (
                  <IconButton label="Nouvelle conversation" onClick={conv.reset}>
                    <SquarePen className="h-[18px] w-[18px]" />
                  </IconButton>
                )}
                <IconButton label="Comment je fonctionne" onClick={() => openInfo('header_icon')}>
                  <Info className="h-[18px] w-[18px]" />
                </IconButton>
                <IconButton label="Fermer l'assistant" onClick={onClose}>
                  {isMobile ? <ChevronDown className="h-5 w-5" /> : <X className="h-[18px] w-[18px]" />}
                </IconButton>
              </header>

              <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain px-4">
                {empty ? (
                  <AssistantWelcome
                    firstName={firstName}
                    index={index}
                    showOnboarding={onboarding}
                    onDismissOnboarding={() => markOnboarded('dismiss')}
                    onOpenInfo={() => openInfo('welcome')}
                    onExample={(t) => runExample(t, 'welcome')}
                    onQuickAction={(a) => {
                      markOnboarded('used');
                      tracker.track('chip_clicked', { intent_key: a.intentKey, data: { chip: a.id } });
                      conv.runIntent(a.intentKey);
                    }}
                  />
                ) : (
                  <div className="space-y-5 py-5">
                    {conv.messages.map((m, i) =>
                      m.role === 'user' ? (
                        <UserBubble key={m.id} message={m} />
                      ) : (
                        <AssistantMessage
                          key={m.id}
                          message={m}
                          index={index}
                          showAvatar={conv.messages[i - 1]?.role !== 'assistant'}
                          onExample={(t) => runExample(t, 'capabilities')}
                        />
                      ),
                    )}
                    {conv.busy && <TypingIndicator />}
                  </div>
                )}
              </div>

              <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
                <AssistantComposer
                  ref={composer}
                  disabled={conv.busy}
                  onSubmit={(text, input, extra) => {
                    markOnboarded('used');
                    conv.submit(text, input, extra);
                  }}
                  onVoiceStart={() => tracker.track('voice_started')}
                  onVoiceError={(error) => tracker.track('voice_error', { data: { error } })}
                  onVoiceResult={(info) => tracker.track('voice_result', { data: { confidence: info.confidence, duration_ms: info.durationMs, length: info.length } })}
                />
                {empty && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Une demande à la fois · Toujours votre accord avant d'agir
                  </p>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
