/**
 * Panneau « vitrine » de la page de connexion : un même châssis d'application
 * qui joue en boucle quatre usages réels (back-office, caisse, HACCP, commandes
 * en ligne). Reconstitution SIMPLIFIÉE, dans l'esprit de HeroDeviceCycle du
 * site vitrine (wello-resto-vitrine) : libellés de l'app, noms de produits en
 * barres grises, montants d'illustration, établissement fictif.
 *
 * Mécanique : le châssis est dessiné sur un canevas fixe (560 × 352) mis à
 * l'échelle de son conteneur ; chaque scène se monte à neuf (AnimatePresence)
 * et joue sa chronologie via `useStep`. Horloge arrêtée onglet masqué ;
 * `prefers-reduced-motion` : pas de lecture automatique, scènes rendues dans
 * leur état final, les onglets restent cliquables.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, animate, motion, useReducedMotion } from 'framer-motion';
import { Check, CreditCard, LayoutDashboard, ShoppingBag, Thermometer, Wifi, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const BLUE = '#0036d9';
const LINE = '#dbe5f7';
const INK = '#16213f';
const MUTED = '#7e90bd';
const CANVAS_W = 560;
const CANVAS_H = 352;
const SCENE_MS = 7000;

/** Chronologie d'une scène : `step` passe à 1, 2, … aux instants donnés (ms). */
function useStep(times: readonly number[]) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? times.length : 0);
  useEffect(() => {
    if (reduced) return;
    const ids = times.map((t, i) => window.setTimeout(() => setStep(i + 1), t));
    return () => ids.forEach(window.clearTimeout);
    // `times` est une constante de module.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return step;
}

function CountUp({ to, decimals = 0, suffix = '', delay = 0 }: { to: number; decimals?: number; suffix?: string; delay?: number }) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced) return;
    const controls = animate(0, to, { duration: 1.4, delay, ease: 'easeOut', onUpdate: setValue });
    return () => controls.stop();
  }, [to, delay, reduced]);
  return (
    <>
      {value.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  );
}

const eur = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

function SceneShell({ title, subtitle, badge, children }: { title: string; subtitle: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col px-5 pb-4 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-bold leading-tight" style={{ color: INK }}>{title}</p>
          <p className="text-[10px]" style={{ color: MUTED }}>{subtitle}</p>
        </div>
        {badge}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-lg border bg-white', className)} style={{ borderColor: LINE }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scène 1 — Back-office : accueil                                     */
/* ------------------------------------------------------------------ */

const HOURS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const REVENUE = [80, 340, 420, 195, 60, 45, 75, 180, 370, 450, 340, 160, 40];
const CH = { x0: 34, x1: 470, yZero: 118, yTop: 10, max: 500 };
const xOf = (i: number) => CH.x0 + ((CH.x1 - CH.x0) * i) / (HOURS.length - 1);
const yOf = (v: number) => CH.yZero - (v / CH.max) * (CH.yZero - CH.yTop);

/** Catmull-Rom → cubiques : la courbe passe par chaque relevé. */
function smoothPath(values: readonly number[]) {
  const pts = values.map((v, i) => [xOf(i), yOf(v)] as const);
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, Math.min(CH.yZero, p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, Math.min(CH.yZero, p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

const CURVE = smoothPath(REVENUE);
const AREA = `${CURVE} L${xOf(REVENUE.length - 1)} ${CH.yZero} L${CH.x0} ${CH.yZero} Z`;
const PEAK = { x: xOf(9), y: yOf(REVENUE[9]) };

function DashboardScene() {
  const kpis = [
    { label: 'CA Jour', to: 2755, decimals: 0, suffix: ' €' },
    { label: 'Commandes', to: 148, decimals: 0, suffix: '' },
    { label: 'Panier moyen', to: 18.6, decimals: 2, suffix: ' €' },
  ];
  return (
    <SceneShell
      title="Tableau de bord"
      subtitle="Aujourd'hui"
      badge={
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> En direct
        </span>
      }
    >
      <div className="flex h-full flex-col gap-2.5">
        <div className="grid grid-cols-3 gap-2.5">
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}>
              <Card className="px-3 py-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>{k.label}</p>
                <p className="mt-0.5 text-[19px] font-extrabold tabular-nums leading-tight" style={{ color: INK }}>
                  <CountUp to={k.to} decimals={k.decimals} suffix={k.suffix} delay={0.25 + i * 0.1} />
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2.5">
          <p className="text-[10px] font-bold" style={{ color: INK }}>Évolution du chiffre d'affaires</p>
          <p className="text-[9px]" style={{ color: MUTED }}>CA par heure sur la journée</p>
          <svg viewBox="0 0 480 140" className="mt-1 min-h-0 w-full flex-1" aria-hidden>
            <defs>
              <linearGradient id="login-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity="0.22" />
                <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 250, 500].map((v) => (
              <g key={v}>
                <line x1={CH.x0} x2={CH.x1} y1={yOf(v)} y2={yOf(v)} stroke={LINE} strokeWidth="1" strokeDasharray={v === 0 ? undefined : '3 4'} />
                <text x={CH.x0 - 6} y={yOf(v) + 3} textAnchor="end" fontSize="8" fill={MUTED}>{v}€</text>
              </g>
            ))}
            {[0, 3, 6, 9, 12].map((i) => (
              <text key={i} x={xOf(i)} y={CH.yZero + 14} textAnchor="middle" fontSize="8" fill={MUTED}>{HOURS[i]}</text>
            ))}
            <motion.path d={AREA} fill="url(#login-area)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }} />
            <motion.path
              d={CURVE}
              fill="none"
              stroke={BLUE}
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 1.8, ease: 'easeInOut' }}
            />
            <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.0, duration: 0.35 }} style={{ transformOrigin: `${PEAK.x}px ${PEAK.y}px` }}>
              <circle cx={PEAK.x} cy={PEAK.y} r="4" fill="white" stroke={BLUE} strokeWidth="2" />
              <rect x={PEAK.x - 24} y={PEAK.y - 24} width="48" height="16" rx="4" fill={INK} />
              <text x={PEAK.x} y={PEAK.y - 13} textAnchor="middle" fontSize="9" fontWeight="700" fill="white">450 €</text>
            </motion.g>
          </svg>
        </Card>
      </div>
    </SceneShell>
  );
}

/* ------------------------------------------------------------------ */
/* Scène 2 — Caisse : vente express, paiement carte                    */
/* ------------------------------------------------------------------ */

const POS_TIMES = [800, 1600, 2400, 3400, 4700] as const;
const TILES = [
  { bg: '#ffe9dc', bar: '#f6c3a4', w: '72%', price: 9.5 },
  { bg: '#e0f4ea', bar: '#a7dcc0', w: '58%', price: 4.8 },
  { bg: '#fff3cf', bar: '#f1d98a', w: '66%', price: 6.9 },
  { bg: '#ebe5fb', bar: '#c9bcf0', w: '52%', price: 5.2 },
  { bg: '#e0eefc', bar: '#a9cdf2', w: '70%', price: 3.4 },
  { bg: '#ffe9dc', bar: '#f6c3a4', w: '56%', price: 7.8 },
] as const;
/** Ordre des produits « tapés » par le serveur (index dans TILES). */
const POS_ORDER = [0, 2, 1] as const;

function PosScene() {
  const step = useStep(POS_TIMES);
  const lines = POS_ORDER.slice(0, Math.min(step, 3)).map((t) => TILES[t]);
  const total = lines.reduce((s, l) => s + l.price, 0);
  const paying = step === 4;
  const paid = step >= 5;

  return (
    <SceneShell title="Caisse" subtitle="Vente express" badge={<span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: `${BLUE}14`, color: BLUE }}>Salle</span>}>
      <div className="grid h-full grid-cols-[1fr_190px] gap-3">
        <div className="grid grid-cols-3 grid-rows-2 gap-2">
          {TILES.map((t, i) => {
            const tapped = POS_ORDER.indexOf(i as 0 | 1 | 2) === step - 1;
            return (
              <motion.div
                key={i}
                className="relative flex flex-col justify-end rounded-lg p-2"
                style={{ background: t.bg }}
                animate={tapped ? { scale: [1, 0.94, 1], boxShadow: [`0 0 0 0 ${BLUE}00`, `0 0 0 3px ${BLUE}55`, `0 0 0 0 ${BLUE}00`] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <span className="h-1.5 rounded-full" style={{ background: t.bar, width: t.w }} />
                <span className="mt-1.5 h-1 w-1/3 rounded-full bg-black/10" />
              </motion.div>
            );
          })}
        </div>

        <Card className="flex flex-col p-3">
          <p className="text-[10px] font-bold" style={{ color: INK }}>Ticket</p>
          <div className="mt-2 flex-1 space-y-2">
            <AnimatePresence initial={false}>
              {lines.map((l, i) => (
                <motion.div
                  key={i}
                  className="flex items-center justify-between gap-2"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="h-1.5 rounded-full" style={{ background: l.bar, width: l.w }} />
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: INK }}>{eur(l.price)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex items-baseline justify-between border-t pt-2" style={{ borderColor: LINE }}>
            <span className="text-[10px] font-semibold" style={{ color: MUTED }}>Total</span>
            <span className="text-[17px] font-extrabold tabular-nums" style={{ color: INK }}>{eur(total)}</span>
          </div>
          <motion.div
            className="mt-2 flex h-8 items-center justify-center gap-1.5 rounded-md text-[10px] font-bold text-white"
            animate={{ background: paid ? '#059669' : BLUE, opacity: step >= 3 ? 1 : 0.35 }}
            transition={{ duration: 0.3 }}
          >
            {paid ? (
              <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Paiement accepté</>
            ) : paying ? (
              <><Wifi className="h-3.5 w-3.5 rotate-90 animate-pulse" /> Présentez la carte…</>
            ) : (
              <><CreditCard className="h-3.5 w-3.5" /> Payer par carte</>
            )}
          </motion.div>
        </Card>
      </div>
    </SceneShell>
  );
}

/* ------------------------------------------------------------------ */
/* Scène 3 — HACCP : relevé de températures                            */
/* ------------------------------------------------------------------ */

const HACCP_TIMES = [900, 1900, 2900, 4000] as const;
const ZONES = [
  { name: 'Frigo', target: '0 → 4 °C', value: '2,8 °C' },
  { name: 'Chambre froide', target: '0 → 4 °C', value: '3,1 °C' },
  { name: 'Vitrine', target: '0 → 6 °C', value: '4,2 °C' },
] as const;

function HaccpScene() {
  const step = useStep(HACCP_TIMES);
  const saved = step >= 4;
  return (
    <SceneShell
      title="Relevé de températures"
      subtitle="Contrôle de fin de service"
      badge={<span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700">{Math.min(step, 3)}/3 zones</span>}
    >
      <div className="flex h-full flex-col gap-2.5">
        {ZONES.map((z, i) => {
          const done = step > i;
          const current = step === i;
          return (
            <Card key={z.name} className={cn('flex items-center gap-3 px-3.5 py-3 transition-colors', current && 'border-[#0036d9]/40')}>
              <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: done ? '#ecfdf5' : '#edf3fc', color: done ? '#059669' : BLUE }}>
                <Thermometer className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-[11px] font-bold" style={{ color: INK }}>{z.name}</p>
                <p className="text-[9px]" style={{ color: MUTED }}>Plage conforme : {z.target}</p>
              </div>
              <div className="flex w-20 items-center justify-end gap-2">
                {done ? (
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-[14px] font-extrabold tabular-nums" style={{ color: INK }}>
                    {z.value}
                  </motion.span>
                ) : (
                  <span className={cn('text-[14px] font-bold', current && 'animate-pulse')} style={{ color: MUTED }}>{current ? '…' : '—'}</span>
                )}
                <span
                  className={cn('flex h-4 w-4 items-center justify-center rounded-full', done ? 'bg-emerald-500 text-white' : 'border')}
                  style={done ? undefined : { borderColor: LINE }}
                >
                  {done && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                </span>
              </div>
            </Card>
          );
        })}
        <motion.div
          className="mt-auto flex h-9 items-center justify-center gap-1.5 rounded-md text-[11px] font-bold text-white"
          animate={{ background: saved ? '#059669' : BLUE, opacity: step >= 3 ? 1 : 0.35 }}
          transition={{ duration: 0.3 }}
        >
          {saved ? <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Relevé enregistré</> : 'Valider le relevé'}
        </motion.div>
      </div>
    </SceneShell>
  );
}

/* ------------------------------------------------------------------ */
/* Scène 4 — Commandes en ligne                                        */
/* ------------------------------------------------------------------ */

const ONLINE_TIMES = [600, 1400, 2200, 3000, 4200, 5400] as const;
const ORDERS = [
  { no: '1042', source: 'ScannOrder', color: BLUE, items: '3 articles', price: 26.8 },
  { no: '1043', source: 'Uber Eats', color: '#111827', items: '2 articles', price: 21.2 },
  { no: '1044', source: 'Deliveroo', color: '#00a99d', items: '4 articles', price: 38.5 },
  { no: '1045', source: 'ScannOrder', color: BLUE, items: '2 articles', price: 17.9 },
] as const;

const STATUS = {
  new: { label: 'Nouvelle', cls: 'bg-blue-50 text-blue-700' },
  prep: { label: 'En préparation', cls: 'bg-amber-50 text-amber-700' },
  ready: { label: 'Prête', cls: 'bg-emerald-50 text-emerald-700' },
} as const;

function statusFor(i: number, step: number): keyof typeof STATUS {
  if (i === 0) return step >= 5 ? 'ready' : 'prep';
  if (i === 1) return step >= 6 ? 'prep' : 'new';
  return 'new';
}

function OnlineScene() {
  const step = useStep(ONLINE_TIMES);
  const visible = ORDERS.slice(0, Math.min(step, ORDERS.length));
  return (
    <SceneShell title="Commandes en ligne" subtitle="Toutes vos sources, un seul écran" badge={<span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: `${BLUE}14`, color: BLUE }}>{visible.length} en cours</span>}>
      <div className="flex h-full flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {visible.map((o, i) => {
            const st = STATUS[statusFor(i, step)];
            return (
              <motion.div key={o.no} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <Card className="flex items-center gap-3 px-3.5 py-3">
                  <span className="rounded px-1.5 py-0.5 text-[8px] font-bold text-white" style={{ background: o.color }}>{o.source}</span>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold" style={{ color: INK }}>Commande n°{o.no}</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>{o.items}</p>
                  </div>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: INK }}>{eur(o.price)}</span>
                  <span className={cn('w-[78px] rounded-full py-0.5 text-center text-[9px] font-semibold transition-colors duration-300', st.cls)}>{st.label}</span>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {visible.length === 0 && <div className="flex-1" />}
      </div>
    </SceneShell>
  );
}

/* ------------------------------------------------------------------ */
/* Châssis                                                             */
/* ------------------------------------------------------------------ */

interface SceneDef {
  id: string;
  label: string;
  caption: string;
  icon: LucideIcon;
  Scene: () => JSX.Element;
}

const SCENES: SceneDef[] = [
  { id: 'dash', label: 'Back-office', caption: "Suivez votre chiffre d'affaires en temps réel.", icon: LayoutDashboard, Scene: DashboardScene },
  { id: 'pos', label: 'Caisse', caption: 'Encaissez en quelques gestes, sur tous vos terminaux.', icon: CreditCard, Scene: PosScene },
  { id: 'haccp', label: 'HACCP', caption: 'Gardez vos relevés de température en règle.', icon: Thermometer, Scene: HaccpScene },
  { id: 'online', label: 'Commandes en ligne', caption: 'Centralisez vos commandes, de toutes les plateformes.', icon: ShoppingBag, Scene: OnlineScene },
];

function ScaledCanvas({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / CANVAS_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full" style={{ height: CANVAS_H * scale }}>
      <div className="absolute left-0 top-0" style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}

export const LoginShowcase = ({ className }: { className?: string }) => {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (reduced || hidden) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % SCENES.length), SCENE_MS);
    return () => window.clearTimeout(id);
  }, [index, reduced, hidden]);

  const { Scene, caption } = SCENES[index];

  return (
    <MotionConfig reducedMotion="user">
      <figure className={cn('w-full', className)}>
        <div role="img" aria-label="Illustration animée : le back-office, la caisse, le suivi HACCP et les commandes en ligne de Wello Resto.">
          <ScaledCanvas>
            <div
              className="flex h-full w-full overflow-hidden rounded-2xl border border-white/20 bg-white"
              style={{ boxShadow: '0 40px 90px -24px rgba(0, 20, 120, 0.7), 0 0 0 1px rgba(255,255,255,0.06)' }}
            >
              {/* Rail de navigation : l'icône du module joué est surlignée. */}
              <div className="flex w-14 flex-col items-center gap-3 border-r py-4" style={{ background: '#f8fafd', borderColor: LINE }}>
                <span className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg text-[13px] font-extrabold text-white" style={{ background: BLUE }}>W</span>
                {SCENES.map((s, i) => (
                  <motion.span
                    key={s.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    animate={{ background: i === index ? `${BLUE}1a` : '#00000000', color: i === index ? BLUE : MUTED }}
                    transition={{ duration: 0.3 }}
                  >
                    <s.icon className="h-4 w-4" />
                  </motion.span>
                ))}
              </div>

              <div className="relative min-w-0 flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={SCENES[index].id}
                    className="absolute inset-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Scene />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </ScaledCanvas>
        </div>

        <figcaption className="mt-8">
          <p aria-live="polite" className="h-5 text-center text-sm font-medium text-white/85">{caption}</p>

          <div className="mt-5 grid grid-cols-4 gap-3" role="tablist" aria-label="Aperçus de l'application">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className="group text-left focus-visible:outline-none"
              >
                <span className="relative block h-0.5 overflow-hidden rounded-full bg-white/15 group-focus-visible:ring-2 group-focus-visible:ring-white/60 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#050817]">
                  {i === index && (
                    <motion.span
                      key={`${index}-${hidden}`}
                      className="absolute inset-y-0 left-0 bg-white"
                      initial={{ width: reduced ? '100%' : '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: reduced ? 0 : SCENE_MS / 1000, ease: 'linear' }}
                    />
                  )}
                </span>
                <span className={cn('mt-2 block truncate text-[11px] font-semibold transition-colors', i === index ? 'text-white' : 'text-white/45 group-hover:text-white/70')}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-5 text-center text-[10px] text-white/35">Écrans simplifiés — montants d'illustration, établissement fictif.</p>
        </figcaption>
      </figure>
    </MotionConfig>
  );
};
