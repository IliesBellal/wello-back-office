/**
 * Mini-mockups des modules à la carte (portage React/Tailwind de
 * wello-resto-vitrine src/components/mockups/mini/*.astro). Partagés par
 * l'écran Abonnement & facturation (ModuleOfferCard) et l'écran Modules du
 * tunnel d'inscription (ScreenModules).
 */
import type { ReactNode } from "react";
import { Check, MapPin, Thermometer } from "lucide-react";

import { cn } from "@/lib/utils";

const MOCKUPS: Record<string, () => ReactNode> = {
  reservation: ReservationMockup,
  haccp: HaccpMockup,
  planning: PlanningMockup,
  marketplaces: MarketplaceMockup,
  delivery: DeliveryMockup,
};

/** Rend le mini-mockup du module, ou rien si le code n'en a pas. */
export function ModuleMockup({ code }: { code: string }) {
  const Mockup = MOCKUPS[code];
  return Mockup ? <Mockup /> : null;
}

function MockupFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none flex h-full min-h-24 select-none flex-col gap-2 rounded-lg border border-border bg-muted/40 p-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ReservationMockup() {
  const tables = [
    { label: "T1", status: "Occupée", cls: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300" },
    { label: "T2", status: "Libre", cls: "border-green-300 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950/60 dark:text-green-300" },
    { label: "T3", status: "Réservée", cls: "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300" },
  ];
  return (
    <MockupFrame>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-foreground">Réservations</span>
        <span className="rounded bg-primary/10 px-1 py-0.5 text-[8px] font-medium text-primary">12:30</span>
      </div>
      <div className="flex flex-1 gap-1.5">
        {tables.map((t) => (
          <div key={t.label} className={cn("flex min-w-0 flex-1 flex-col items-center justify-center rounded-md border py-2", t.cls)}>
            <span className="text-[10px] font-bold leading-none">{t.label}</span>
            <span className="mt-1 text-[6px] uppercase tracking-wide">{t.status}</span>
          </div>
        ))}
      </div>
    </MockupFrame>
  );
}

function HaccpMockup() {
  const tasks = [
    { label: "Nettoyage plan de travail", done: true },
    { label: "Relevé des températures", done: true },
    { label: "Changement bacs gastro", done: false },
  ];
  return (
    <MockupFrame className="flex-row gap-3">
      <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-border bg-background p-1.5">
        <Thermometer className="h-4 w-4 text-blue-500" />
        <span className="mt-1 text-sm font-extrabold text-foreground">3°C</span>
        <span className="text-center text-[6px] font-semibold uppercase text-muted-foreground">Chambre froide</span>
      </div>
      <div className="flex min-w-0 flex-[1.5] flex-col justify-center gap-1">
        {tasks.map((t) => (
          <div key={t.label} className="flex items-center gap-1">
            <span
              className={cn(
                "flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-sm border",
                t.done ? "border-green-500 bg-green-500 text-white" : "border-border bg-background",
              )}
            >
              {t.done && <Check className="h-1.5 w-1.5" strokeWidth={4} />}
            </span>
            <span className="truncate text-[7px] text-muted-foreground">{t.label}</span>
          </div>
        ))}
      </div>
    </MockupFrame>
  );
}

function PlanningMockup() {
  const days = ["L", "M", "M", "J", "V", "S", "D"];
  // Créneaux par salarié, en index de jour [from, to) — 0 = lundi.
  const rows: Array<Array<{ from: number; to: number; kind: "morning" | "evening" | "off" }>> = [
    [{ from: 0, to: 2, kind: "morning" }, { from: 3, to: 5, kind: "evening" }],
    [{ from: 1, to: 4, kind: "morning" }, { from: 5, to: 7, kind: "evening" }],
    [{ from: 0, to: 1, kind: "off" }, { from: 2, to: 6, kind: "morning" }],
  ];
  const shiftCls = {
    morning: "border border-sky-300 bg-sky-200 dark:border-sky-700 dark:bg-sky-900",
    evening: "border border-indigo-300 bg-indigo-200 dark:border-indigo-700 dark:bg-indigo-900",
    off: "border border-dashed border-muted-foreground/40",
  };
  return (
    <MockupFrame className="gap-1.5">
      <div className="grid grid-cols-[16px_repeat(7,1fr)] gap-0.5 border-b border-border pb-1">
        <span />
        {days.map((d, i) => (
          <span key={i} className={cn("text-center text-[6px] font-bold", i >= 5 ? "text-primary" : "text-muted-foreground")}>
            {d}
          </span>
        ))}
      </div>
      <div className="flex flex-1 flex-col justify-around gap-1">
        {rows.map((shifts, i) => (
          <div key={i} className="grid grid-cols-[16px_repeat(7,1fr)] items-center gap-0.5">
            <span className="h-3 w-3 rounded-full bg-muted-foreground/30" style={{ gridColumn: 1, gridRow: 1 }} />
            {shifts.map((s, j) => (
              <span
                key={j}
                className={cn("h-1.5 rounded-full", shiftCls[s.kind])}
                // +2 : la colonne 1 est celle de l'avatar.
                style={{ gridColumn: `${s.from + 2} / ${s.to + 2}`, gridRow: 1 }}
              />
            ))}
          </div>
        ))}
      </div>
    </MockupFrame>
  );
}

function MarketplaceMockup() {
  return (
    <MockupFrame className="items-center justify-center">
      <div className="relative flex h-[60px] w-[88px] flex-col overflow-hidden rounded-md border-2 border-muted-foreground/30 bg-background shadow-sm">
        <div className="bg-primary px-1 py-0.5 text-[5px] font-bold text-primary-foreground">Caisse WelloResto</div>
        <div className="flex flex-1 flex-col gap-0.5 bg-muted/40 p-1">
          <span className="h-2 rounded-sm bg-muted-foreground/20" />
          <span className="h-2 rounded-sm bg-muted-foreground/20" />
        </div>
        <div className="absolute inset-x-1 bottom-1 flex items-center gap-1 rounded border border-primary bg-background p-0.5 shadow-md">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-orange-600" />
          <span className="flex flex-col">
            <span className="text-[5px] font-bold leading-tight text-foreground">Nouvelle commande</span>
            <span className="text-[4px] leading-tight text-muted-foreground">Uber Eats / Deliveroo</span>
          </span>
        </div>
      </div>
    </MockupFrame>
  );
}

function DeliveryMockup() {
  return (
    <MockupFrame className="relative overflow-hidden bg-slate-200 p-0 dark:bg-slate-800">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          backgroundPosition: "center",
        }}
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full text-slate-900 dark:text-slate-200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 20 80 L 40 70 L 40 40 L 70 30 L 80 20" vectorEffect="non-scaling-stroke" />
      </svg>
      <MapPin className="absolute right-3 top-2 h-4 w-4 fill-primary text-primary" />
      <span className="absolute bottom-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="17" r="3" />
          <circle cx="17" cy="17" r="3" />
          <line x1="14" y1="17" x2="10" y2="17" />
          <line x1="16" y1="14" x2="16" y2="17" />
          <line x1="14" y1="12" x2="16" y2="14" />
          <line x1="8" y1="12" x2="14" y2="12" />
          <line x1="8" y1="12" x2="6" y2="14" />
          <line x1="6" y1="14" x2="4" y2="14" />
        </svg>
      </span>
    </MockupFrame>
  );
}
