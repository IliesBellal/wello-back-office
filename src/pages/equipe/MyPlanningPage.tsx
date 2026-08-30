import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { planningSelfApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import { getHttpErrorStatus } from "@/lib/planningApiErrors";
import { DEFAULT_SHIFT_COLOR } from "@/lib/planningShiftColor";
import type { PlanningShiftTeamWeekView } from "@/types/planning";

/**
 * RBAC lot 10 — "Mon planning" : vue lecture seule du planning publié de
 * toute l'équipe (GET /planning/me/team-week, préexistant côté API, gardé
 * par authMiddleware seul — pas staff.schedule.manage). Complète
 * PlanningPage.tsx (l'éditeur complet, réservé aux managers) pour les
 * équipiers qui n'ont pas ce droit, sans drag-and-drop ni action
 * d'édition. Les shifts de l'appelant sont mis en évidence via
 * `current_employee_id`.
 */

const DAY_COUNT = 7;

function isoDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function fmtTime(t: string): string {
  return t.slice(0, 5);
}

/** Ajoute un suffixe d'opacité à un hex `#rrggbb` (même logique que ShiftCard.tsx). */
function withAlpha(hex: string, alphaHex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alphaHex}` : hex;
}

export default function MyPlanningPage() {
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekStart = isoDay(anchor);

  const { data, isLoading, error } = useQuery({
    queryKey: qk.planningMyTeamWeek(weekStart),
    queryFn: () => planningSelfApi.getTeamWeek({ weekStart }),
  });

  const days = useMemo(() => Array.from({ length: DAY_COUNT }, (_, i) => addDays(anchor, i)), [anchor]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, PlanningShiftTeamWeekView[]>();
    for (const shift of data?.shifts ?? []) {
      const key = shift.shift_date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(shift);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [data]);

  const commentsByDay = useMemo(() => {
    const map = new Map<string, string>();
    for (const comment of data?.day_comments ?? []) {
      map.set(comment.comment_date.slice(0, 10), comment.comment);
    }
    return map;
  }, [data]);

  const employeeNotFound = getHttpErrorStatus(error) === 404;
  const currentEmployeeId = data?.current_employee_id;
  const weekIsEmpty = !isLoading && !employeeNotFound && (data?.shifts.length ?? 0) === 0;

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <CalendarDays className="h-6 w-6" />
                Mon planning
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Planning publié de l'équipe — vos shifts sont mis en évidence
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setAnchor((d) => addDays(d, -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {format(anchor, "d MMM", { locale: fr })} – {format(addDays(anchor, 6), "d MMM yyyy", { locale: fr })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setAnchor((d) => addDays(d, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
      >
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : employeeNotFound ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mb-3" />
            <p className="font-medium text-foreground">Aucune fiche employé liée à votre compte</p>
            <p className="text-sm mt-1">
              Contactez un administrateur pour lier votre compte à une fiche employé.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {days.map((day) => {
                const key = isoDay(day);
                const dayShifts = shiftsByDay.get(key) ?? [];
                const comment = commentsByDay.get(key);
                return (
                  <div key={key} className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
                    <div className="px-3 py-2 border-b border-border bg-muted/40">
                      <p className="text-sm font-medium capitalize">{format(day, "EEEE d MMM", { locale: fr })}</p>
                    </div>
                    <div className="p-2.5 space-y-2 flex-1">
                      {comment && (
                        <p className="text-xs text-muted-foreground italic flex items-start gap-1.5">
                          <MessageSquareText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          {comment}
                        </p>
                      )}
                      {dayShifts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucun shift.</p>
                      ) : (
                        dayShifts.map((shift) => {
                          const isMine = !!currentEmployeeId && shift.employee_id === currentEmployeeId;
                          const color = shift.position_color ?? DEFAULT_SHIFT_COLOR;
                          return (
                            <div
                              key={shift.id}
                              className={`rounded-md border px-2.5 py-2 text-sm ${isMine ? "ring-2 ring-primary" : ""}`}
                              style={{ backgroundColor: withAlpha(color, "1f"), borderColor: withAlpha(color, "66") }}
                            >
                              <p className="font-medium">
                                {fmtTime(shift.start_time)}–{fmtTime(shift.end_time)}
                              </p>
                              {shift.position && (
                                <Badge
                                  variant="outline"
                                  className="mt-1 text-[10px]"
                                  style={{ borderColor: withAlpha(color, "66") }}
                                >
                                  {shift.position}
                                </Badge>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {weekIsEmpty && (
              <p className="text-sm text-muted-foreground text-center mt-6">
                Aucun planning publié pour cette semaine.
              </p>
            )}
          </>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
