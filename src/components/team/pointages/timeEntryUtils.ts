import type { PlanningTimeEntry } from "@/types/planning";

/** Compute the duration of a time entry; returns null when still open. */
export function timeEntryDurationMinutes(entry: PlanningTimeEntry): number | null {
  if (!entry.clock_out_at) return null;
  const start = new Date(entry.clock_in_at).getTime();
  const end = new Date(entry.clock_out_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.round((end - start) / 60000);
}

/** Human-readable duration, e.g. "7h 23". Returns "—" when still open. */
export function formatTimeEntryDuration(entry: PlanningTimeEntry): string {
  const m = timeEntryDurationMinutes(entry);
  if (m == null) return "—";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm} min`;
  return `${h}h ${String(mm).padStart(2, "0")}`;
}
