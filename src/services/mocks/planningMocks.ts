/**
 * In-memory mocks for the Planning page (Skello-style weekly grid).
 *
 * Mirrors the contracts described in:
 *   - docs/api/PLANNING_AND_USERS_INTEGRATION_GUIDE.md
 *
 * The store is mutable so UI interactions (create/edit/delete shift + DnD)
 * persist for the lifetime of the SPA session.
 */

import { ApiBusinessError } from "@/services/apiUnwrap";
import type { UnwrappedList } from "@/services/apiUnwrap";
import type {
  AttendanceSource,
  Employee,
  EmployeeListFilters,
  PlanningHoliday,
  PlanningHolidayOverridePatchRequest,
  PlanningLeaveRequest,
  PlanningLeaveRequestCreateRequest,
  PlanningLeaveRequestFilters,
  PlanningLeaveRequestUpdateRequest,
  PlanningSettings,
  PlanningSettingsUpdateRequest,
  PlanningShift,
  PlanningShiftCreateRequest,
  PlanningShiftSwapRequest,
  PlanningShiftSwapRequestCreateRequest,
  PlanningShiftSwapRequestFilters,
  PlanningShiftSwapRequestUpdateRequest,
  PlanningShiftUpdateRequest,
  PlanningTimeEntry,
  PlanningTimeEntryCreateRequest,
  PlanningTimeEntryStartRequest,
  PlanningTimeEntryStopRequest,
  PlanningTimeEntryUpdateRequest,
  PlanningWeek,
  PlanningWeekCreateRequest,
  PlanningWeekUpdateRequest,
} from "@/types/planning";

const MERCHANT_ID = "mock-merchant-001";

// ─── Date helpers (no extra dep — we keep date-fns at the page level) ──────

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
}

/** Monday-anchored ISO week start for a given date. */
function mondayOf(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0=Mon..6=Sun
  d.setDate(d.getDate() - dow);
  return toIsoDate(d);
}

function nowIso(): string {
  return new Date().toISOString();
}

function notFound(msg: string): never {
  throw new Error(msg);
}

function invalid(msg: string): never {
  // Use ApiBusinessError so the existing toast/error pipeline picks it up cleanly.
  throw new ApiBusinessError(msg, { status: "error_invalid_data" });
}

function overlap(msg: string): never {
  throw new ApiBusinessError(msg, { status: "shift_overlap" });
}

// ─── Seed employees ────────────────────────────────────────────────────────────

const employees: Employee[] = [
  {
    id: "emp-2001",
    merchant_id: MERCHANT_ID,
    user_id: "u-1001",
    first_name: "Walid",
    last_name: "Benali",
    position_id: "pos-1",
    position: "Manager",
    job_title: "Responsable de salle",
    role: "manager",
    contract_type_code: "CDI",
    contract_hours: 39,
    active: true,
    created_at: "2024-12-15T09:00:00Z",
    updated_at: "2024-12-15T09:00:00Z",
  },
  {
    id: "emp-2002",
    merchant_id: MERCHANT_ID,
    user_id: "u-1002",
    first_name: "Alex",
    last_name: "Martin",
    position_id: "pos-2",
    position: "Serveur",
    contract_type_code: "CDI",
    contract_hours: 35,
    active: true,
    created_at: "2025-01-10T09:00:00Z",
    updated_at: "2025-01-10T09:00:00Z",
  },
  {
    id: "emp-2003",
    merchant_id: MERCHANT_ID,
    user_id: "u-1003",
    first_name: "Camille",
    last_name: "Dupont",
    position_id: "pos-1",
    position: "Manager",
    contract_type_code: "CDI",
    contract_hours: 39,
    active: true,
    created_at: "2025-02-01T09:00:00Z",
    updated_at: "2025-02-01T09:00:00Z",
  },
  {
    id: "emp-2004",
    merchant_id: MERCHANT_ID,
    user_id: "u-1004",
    first_name: "Yanis",
    last_name: "Bouvier",
    position_id: "pos-3",
    position: "Cuisinier",
    contract_type_code: "CDI",
    contract_hours: 39,
    active: true,
    created_at: "2025-02-15T09:00:00Z",
    updated_at: "2025-02-15T09:00:00Z",
  },
  {
    id: "emp-2005",
    merchant_id: MERCHANT_ID,
    user_id: "u-1005",
    first_name: "Léa",
    last_name: "Rousseau",
    position_id: "pos-2",
    position: "Serveur",
    contract_type_code: "CDD",
    contract_hours: 24,
    active: true,
    created_at: "2025-03-01T09:00:00Z",
    updated_at: "2025-03-01T09:00:00Z",
  },
  {
    id: "emp-2006",
    merchant_id: MERCHANT_ID,
    user_id: "u-1008",
    first_name: "Mehdi",
    last_name: "Ali",
    position_id: "pos-5",
    position: "Livreur",
    contract_type_code: "EXTRA",
    contract_hours: 12,
    active: true,
    created_at: "2025-04-15T09:00:00Z",
    updated_at: "2025-04-15T09:00:00Z",
  },
];

// ─── Seed weeks (current ISO week + neighbors) ─────────────────────────────

const todayIso = toIsoDate(new Date());
const currentWeekStart = mondayOf(todayIso);
const previousWeekStart = addDays(currentWeekStart, -7);
const nextWeekStart = addDays(currentWeekStart, 7);

function makeWeek(seed: { id: string; start: string; status?: string }): PlanningWeek {
  const end = addDays(seed.start, 6);
  return {
    id: seed.id,
    merchant_id: MERCHANT_ID,
    label: `Semaine du ${seed.start}`,
    start_date: seed.start,
    end_date: end,
    status: seed.status ?? "open",
    notes: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

const weeks: PlanningWeek[] = [
  makeWeek({ id: "w-prev", start: previousWeekStart, status: "closed" }),
  makeWeek({ id: "w-current", start: currentWeekStart }),
  makeWeek({ id: "w-next", start: nextWeekStart }),
];

// ─── Seed shifts (varied across the current week) ──────────────────────────

function buildShift(seed: {
  id: string;
  weekId: string;
  employeeId: string;
  dayOffset: number; // 0 = Monday
  start: string;
  end: string;
  position: string;
  title?: string;
  location?: string;
  notes?: string;
  status?: string;
  break_minutes?: number;
}): PlanningShift {
  const week = weeks.find((w) => w.id === seed.weekId)!;
  return {
    id: seed.id,
    merchant_id: MERCHANT_ID,
    week_id: seed.weekId,
    employee_id: seed.employeeId,
    title: seed.title ?? null,
    shift_date: addDays(week.start_date, seed.dayOffset),
    start_time: seed.start,
    end_time: seed.end,
    break_minutes: seed.break_minutes ?? 30,
    position: seed.position,
    location: seed.location ?? null,
    notes: seed.notes ?? null,
    status: seed.status ?? "draft",
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

const shifts: PlanningShift[] = [
  // Walid – manager, ouverture lundi / mercredi / vendredi
  buildShift({ id: "sh-1", weekId: "w-current", employeeId: "emp-2001", dayOffset: 0, start: "08:00", end: "16:00", position: "Manager", title: "Ouverture" }),
  buildShift({ id: "sh-2", weekId: "w-current", employeeId: "emp-2001", dayOffset: 2, start: "10:00", end: "18:00", position: "Manager" }),
  buildShift({ id: "sh-3", weekId: "w-current", employeeId: "emp-2001", dayOffset: 4, start: "08:00", end: "16:00", position: "Manager", title: "Ouverture", notes: "Penser à compter la caisse" }),
  // Alex – serveur, soirs
  buildShift({ id: "sh-4", weekId: "w-current", employeeId: "emp-2002", dayOffset: 1, start: "17:00", end: "23:30", position: "Serveur", title: "Service du soir" }),
  buildShift({ id: "sh-5", weekId: "w-current", employeeId: "emp-2002", dayOffset: 3, start: "17:00", end: "23:30", position: "Serveur" }),
  buildShift({ id: "sh-6", weekId: "w-current", employeeId: "emp-2002", dayOffset: 5, start: "17:00", end: "00:30", position: "Serveur", title: "Service du soir", notes: "Réservation 12 pax" }),
  // Camille – manager soirs
  buildShift({ id: "sh-7", weekId: "w-current", employeeId: "emp-2003", dayOffset: 1, start: "15:00", end: "23:00", position: "Manager" }),
  buildShift({ id: "sh-8", weekId: "w-current", employeeId: "emp-2003", dayOffset: 5, start: "15:00", end: "00:00", position: "Manager" }),
  // Yanis – cuisinier
  buildShift({ id: "sh-9", weekId: "w-current", employeeId: "emp-2004", dayOffset: 0, start: "10:00", end: "15:00", position: "Cuisinier" }),
  buildShift({ id: "sh-10", weekId: "w-current", employeeId: "emp-2004", dayOffset: 1, start: "10:00", end: "15:00", position: "Cuisinier" }),
  buildShift({ id: "sh-11", weekId: "w-current", employeeId: "emp-2004", dayOffset: 2, start: "10:00", end: "15:00", position: "Cuisinier", title: "Brunch" }),
  buildShift({ id: "sh-12", weekId: "w-current", employeeId: "emp-2004", dayOffset: 5, start: "10:00", end: "16:00", position: "Cuisinier" }),
  // Léa – CDD weekend
  buildShift({ id: "sh-13", weekId: "w-current", employeeId: "emp-2005", dayOffset: 5, start: "11:30", end: "16:00", position: "Serveur" }),
  buildShift({ id: "sh-14", weekId: "w-current", employeeId: "emp-2005", dayOffset: 6, start: "11:30", end: "16:00", position: "Serveur", notes: "Brunch du dimanche" }),
  // Mehdi – livreur ponctuel
  buildShift({ id: "sh-15", weekId: "w-current", employeeId: "emp-2006", dayOffset: 4, start: "18:00", end: "22:00", position: "Livreur" }),
  buildShift({ id: "sh-16", weekId: "w-current", employeeId: "emp-2006", dayOffset: 5, start: "18:00", end: "23:00", position: "Livreur" }),
];

let nextShiftSerial = shifts.length + 1;

// ─── Seed holidays (FR 2025/2026) ──────────────────────────────────────────

const holidays: PlanningHoliday[] = [
  { date: "2025-01-01", label: "Jour de l'an", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2025-05-01", label: "Fête du travail", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2025-05-08", label: "Victoire 1945", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2025-07-14", label: "Fête nationale", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2025-08-15", label: "Assomption", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2025-11-01", label: "Toussaint", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2025-11-11", label: "Armistice 1918", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2025-12-25", label: "Noël", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2026-01-01", label: "Jour de l'an", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2026-05-01", label: "Fête du travail", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2026-05-08", label: "Victoire 1945", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
  { date: "2026-07-14", label: "Fête nationale", region: "FR", disabled: false, holiday_multiplier: null, is_overridden: false },
];

// ─── Handlers ──────────────────────────────────────────────────────────────

function listEmployees(filters: EmployeeListFilters = {}): UnwrappedList<Employee> {
  let items = employees.filter((e) => e.active);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter((e) =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.position ?? "").toLowerCase().includes(q),
    );
  }
  if (filters.position_id) items = items.filter((e) => e.position_id === filters.position_id);
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page,
      page_size: pageSize,
      total_items: items.length,
      total_pages: Math.max(1, Math.ceil(items.length / pageSize)),
    },
  };
}

function listWeeks(): PlanningWeek[] {
  return [...weeks].sort((a, b) => a.start_date.localeCompare(b.start_date));
}

function getWeek(id: string): PlanningWeek {
  const w = weeks.find((x) => x.id === id);
  if (!w) notFound(`Mock: semaine ${id} introuvable`);
  return w!;
}

function createWeek(payload: PlanningWeekCreateRequest): PlanningWeek {
  if (weeks.some((w) => w.start_date === payload.start_date)) {
    invalid(`Une semaine existe déjà au ${payload.start_date}`);
  }
  const w: PlanningWeek = {
    id: `w-${weeks.length + 1}-${Date.now()}`,
    merchant_id: MERCHANT_ID,
    label: payload.label,
    start_date: payload.start_date,
    end_date: payload.end_date,
    status: payload.status ?? "open",
    notes: payload.notes ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  weeks.push(w);
  return w;
}

function updateWeek(id: string, payload: PlanningWeekUpdateRequest): PlanningWeek {
  const w = getWeek(id);
  if (payload.label !== undefined) w.label = payload.label;
  if (payload.start_date !== undefined) w.start_date = payload.start_date;
  if (payload.end_date !== undefined) w.end_date = payload.end_date;
  if (payload.status !== undefined) w.status = payload.status;
  if (payload.notes !== undefined) w.notes = payload.notes;
  w.updated_at = nowIso();
  return w;
}

function deleteWeek(id: string): void {
  const idx = weeks.findIndex((w) => w.id === id);
  if (idx < 0) notFound(`Mock: semaine ${id} introuvable`);
  weeks.splice(idx, 1);
  // remove shifts of the week
  for (let i = shifts.length - 1; i >= 0; i--) {
    if (shifts[i].week_id === id) shifts.splice(i, 1);
  }
}

function getShiftsForWeek(weekId: string): PlanningShift[] {
  return shifts.filter((s) => s.week_id === weekId).map((s) => ({ ...s }));
}

function getShift(id: string): PlanningShift {
  const s = shifts.find((x) => x.id === id);
  if (!s) notFound(`Mock: shift ${id} introuvable`);
  return s!;
}

/** Date string comparator: 'YYYY-MM-DD' between week bounds (inclusive). */
function isInWeek(weekId: string, date: string): boolean {
  const w = weeks.find((x) => x.id === weekId);
  if (!w) return false;
  return date >= w.start_date && date <= w.end_date;
}

/**
 * Detect overlap with another shift of the same employee.
 * Unassigned shifts (`employeeId === null`) never overlap with anything
 * — they are not bound to a person, so the conflict rule doesn't apply.
 */
function detectOverlap(employeeId: string | null, date: string, start: string, end: string, ignoreId?: string): PlanningShift | null {
  if (employeeId === null) return null;
  return (
    shifts.find(
      (s) =>
        s.employee_id === employeeId &&
        s.shift_date === date &&
        s.id !== ignoreId &&
        !(end <= s.start_time || start >= s.end_time),
    ) ?? null
  );
}

function createShift(weekId: string, payload: PlanningShiftCreateRequest): PlanningShift {
  const week = getWeek(weekId);
  if (!isInWeek(weekId, payload.shift_date)) {
    invalid(`Le shift doit être compris entre ${week.start_date} et ${week.end_date}`);
  }
  if (payload.end_time <= payload.start_time) {
    invalid("L'heure de fin doit être après l'heure de début");
  }
  const conflict = detectOverlap(payload.employee_id, payload.shift_date, payload.start_time, payload.end_time);
  if (conflict) overlap(`Chevauchement avec un shift existant (${conflict.start_time}–${conflict.end_time})`);

  const positionId = payload.position_id ?? null;
  const positionLabel =
    payload.position ?? (positionId ? positions.find((p) => p.id === positionId)?.label ?? null : null);

  const s: PlanningShift = {
    id: `sh-${nextShiftSerial++}-${Date.now()}`,
    merchant_id: MERCHANT_ID,
    week_id: weekId,
    employee_id: payload.employee_id,
    title: payload.title ?? null,
    shift_date: payload.shift_date,
    start_time: payload.start_time,
    end_time: payload.end_time,
    break_minutes: payload.break_minutes ?? 0,
    position_id: positionId,
    position: positionLabel,
    location: payload.location ?? null,
    notes: payload.notes ?? null,
    status: payload.status ?? "draft",
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  shifts.push(s);
  return s;
}

function updateShift(id: string, payload: PlanningShiftUpdateRequest): PlanningShift {
  const s = getShift(id);
  const nextPositionId =
    payload.position_id !== undefined
      ? payload.position_id ?? null
      : payload.position !== undefined
        ? positions.find((p) => p.label === payload.position)?.id ?? s.position_id ?? null
        : s.position_id ?? null;
  const nextPositionLabel =
    payload.position !== undefined
      ? payload.position
      : nextPositionId
        ? positions.find((p) => p.id === nextPositionId)?.label ?? s.position ?? null
        : null;
  const next: PlanningShift = {
    ...s,
    title: payload.title !== undefined ? payload.title : s.title,
    shift_date: payload.shift_date ?? s.shift_date,
    start_time: payload.start_time ?? s.start_time,
    end_time: payload.end_time ?? s.end_time,
    break_minutes: payload.break_minutes ?? s.break_minutes,
    // "employee_id" in payload : on distingue "champ absent" (= garder l'ancien)
    // de "champ présent et null" (= désassigner explicitement).
    employee_id: "employee_id" in payload ? (payload.employee_id ?? null) : s.employee_id,
    position_id: nextPositionId,
    position: nextPositionLabel,
    location: payload.location !== undefined ? payload.location : s.location,
    notes: payload.notes !== undefined ? payload.notes : s.notes,
    status: payload.status ?? s.status,
  };
  if (!isInWeek(s.week_id, next.shift_date)) {
    const w = weeks.find((x) => x.id === s.week_id)!;
    invalid(`Le shift doit rester entre ${w.start_date} et ${w.end_date}`);
  }
  if (next.end_time <= next.start_time) {
    invalid("L'heure de fin doit être après l'heure de début");
  }
  const conflict = detectOverlap(next.employee_id, next.shift_date, next.start_time, next.end_time, s.id);
  if (conflict) overlap(`Chevauchement avec un shift existant (${conflict.start_time}–${conflict.end_time})`);

  Object.assign(s, next, { updated_at: nowIso() });
  return s;
}

function deleteShift(id: string): void {
  const idx = shifts.findIndex((s) => s.id === id);
  if (idx < 0) notFound(`Mock: shift ${id} introuvable`);
  shifts.splice(idx, 1);
}

function listHolidays(from?: string, to?: string): PlanningHoliday[] {
  // Note: on retourne aussi les éléments `disabled` car la modale "Jours fériés"
  // doit pouvoir les afficher et permettre de les réactiver. La grille filtre
  // côté client si besoin.
  let items = holidays;
  if (from) items = items.filter((h) => h.date >= from);
  if (to) items = items.filter((h) => h.date <= to);
  return items.map((h) => ({ ...h }));
}

function overrideHoliday(date: string, payload: PlanningHolidayOverridePatchRequest): PlanningHoliday {
  const h = holidays.find((x) => x.date === date);
  if (!h) notFound(`Mock: jour férié ${date} introuvable`);
  if (payload.disabled !== undefined) h!.disabled = payload.disabled;
  if (payload.holiday_multiplier !== undefined) h!.holiday_multiplier = payload.holiday_multiplier;
  h!.is_overridden = (h!.disabled === true) || (h!.holiday_multiplier !== null && h!.holiday_multiplier !== undefined);
  return { ...h! };
}

// ─── Planning settings (mock) ──────────────────────────────────────────────

const settings: PlanningSettings = {
  id: "ps-mock-001",
  merchant_id: MERCHANT_ID,
  labor_country_code: "FR",
  min_daily_rest_hours: 11,
  min_break_minutes: 30,
  night_shift_start: "22:00",
  night_shift_end: "06:00",
  night_shift_multiplier: 1.25,
  holiday_multiplier: 1.5,
  allow_override_warnings: true,
  attendance_source: "pointage",
  shift_swap_approval_mode: "manager_required",
  created_at: nowIso(),
  updated_at: nowIso(),
};

function getSettings(): PlanningSettings {
  return { ...settings };
}

function updateSettings(payload: PlanningSettingsUpdateRequest): PlanningSettings {
  // PATCH-like: only assign defined keys.
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    (settings as unknown as Record<string, unknown>)[key] = value;
  }
  settings.updated_at = nowIso();
  return { ...settings };
}

const attendanceSources: Array<{ code: AttendanceSource; label: string }> = [
  { code: "pointage", label: "Pointage manuel" },
  { code: "planning", label: "Planning (automatique)" },
];

function listAttendanceSources(): Array<{ code: AttendanceSource; label: string }> {
  return attendanceSources.map((s) => ({ ...s }));
}

// ─── Seed time entries ─────────────────────────────────────────────────────

function buildEntry(seed: {
  id: string;
  employee_id: string;
  shift_id?: string | null;
  date: string;
  start: string;
  end: string | null;
  source?: AttendanceSource;
  clock_in_note?: string | null;
  clock_out_note?: string | null;
}): PlanningTimeEntry {
  const clockIn = `${seed.date}T${seed.start}:00.000Z`;
  const clockOut = seed.end !== null ? `${seed.date}T${seed.end}:00.000Z` : null;
  return {
    id: seed.id,
    merchant_id: MERCHANT_ID,
    employee_id: seed.employee_id,
    shift_id: seed.shift_id ?? null,
    attendance_source: seed.source ?? "pointage",
    clock_in_at: clockIn,
    clock_out_at: clockOut,
    clock_in_note: seed.clock_in_note ?? null,
    clock_out_note: seed.clock_out_note ?? null,
    created_at: clockIn,
    updated_at: clockOut ?? clockIn,
  };
}

const todayLocal = toIsoDate(new Date());
const yesterdayLocal = addDays(todayLocal, -1);
const dayBeforeYesterdayLocal = addDays(todayLocal, -2);

const timeEntries: PlanningTimeEntry[] = [
  // Walid – ouverture lundi terminée
  buildEntry({
    id: "te-1",
    employee_id: "emp-2001",
    shift_id: "sh-1",
    date: dayBeforeYesterdayLocal,
    start: "07:55",
    end: "16:02",
    clock_in_note: "Arrivée légèrement en avance",
  }),
  // Walid – mercredi terminée
  buildEntry({
    id: "te-2",
    employee_id: "emp-2001",
    shift_id: "sh-2",
    date: yesterdayLocal,
    start: "10:02",
    end: "18:10",
  }),
  // Alex – soir hier (pointage manuel)
  buildEntry({
    id: "te-3",
    employee_id: "emp-2002",
    shift_id: "sh-5",
    date: yesterdayLocal,
    start: "16:58",
    end: "23:32",
    clock_out_note: "Fin de service nominale",
  }),
  // Yanis – brunch hier (issu du planning)
  buildEntry({
    id: "te-4",
    employee_id: "emp-2004",
    shift_id: "sh-11",
    date: yesterdayLocal,
    start: "10:00",
    end: "15:05",
    source: "planning",
  }),
  // Camille – soir hier, encore ouvert
  buildEntry({
    id: "te-5",
    employee_id: "emp-2003",
    shift_id: "sh-7",
    date: todayLocal,
    start: "15:00",
    end: null,
  }),
];

let nextEntrySerial = timeEntries.length + 1;

function listTimeEntries(employeeId: string): PlanningTimeEntry[] {
  // Order by clock_in_at desc — most recent first.
  return timeEntries
    .filter((e) => e.employee_id === employeeId)
    .slice()
    .sort((a, b) => (a.clock_in_at < b.clock_in_at ? 1 : -1))
    .map((e) => ({ ...e }));
}

function currentTimeEntry(employeeId: string): PlanningTimeEntry | null {
  const open = timeEntries.find((e) => e.employee_id === employeeId && !e.clock_out_at);
  return open ? { ...open } : null;
}

function startTimeEntry(employeeId: string, payload: PlanningTimeEntryStartRequest = {}): PlanningTimeEntry {
  if (settings.attendance_source !== "pointage") {
    invalid("Les pointages manuels sont désactivés (attendance_source = planning).");
  }
  const already = timeEntries.find((e) => e.employee_id === employeeId && !e.clock_out_at);
  if (already) {
    invalid("Un pointage est déjà ouvert pour cet employé.");
  }
  const clockIn = payload.clock_in_at ?? nowIso();
  if (payload.shift_id) {
    const shift = shifts.find((s) => s.id === payload.shift_id);
    if (!shift) notFound(`Mock: shift ${payload.shift_id} introuvable`);
    if (shift!.employee_id !== employeeId) {
      invalid("Ce shift n'est pas affecté à cet employé.");
    }
    if (clockIn.slice(0, 10) !== shift!.shift_date) {
      invalid("Le jour du pointage doit correspondre au jour du shift.");
    }
  }
  const e: PlanningTimeEntry = {
    id: `te-${nextEntrySerial++}-${Date.now()}`,
    merchant_id: MERCHANT_ID,
    employee_id: employeeId,
    shift_id: payload.shift_id ?? null,
    attendance_source: "pointage",
    clock_in_at: clockIn,
    clock_out_at: null,
    clock_in_note: payload.clock_in_note ?? null,
    clock_out_note: null,
    created_at: clockIn,
    updated_at: clockIn,
  };
  timeEntries.push(e);
  return { ...e };
}

function stopTimeEntry(employeeId: string, payload: PlanningTimeEntryStopRequest): PlanningTimeEntry {
  const idx = timeEntries.findIndex((e) => e.id === payload.entry_id && e.employee_id === employeeId);
  if (idx < 0) notFound(`Mock: pointage ${payload.entry_id} introuvable`);
  const entry = timeEntries[idx];
  if (entry.clock_out_at) {
    invalid("Ce pointage est déjà fermé.");
  }
  const clockOut = payload.clock_out_at ?? nowIso();
  if (clockOut <= entry.clock_in_at) {
    invalid("L'heure de sortie doit être postérieure à l'heure d'entrée.");
  }
  entry.clock_out_at = clockOut;
  entry.clock_out_note = payload.clock_out_note ?? entry.clock_out_note ?? null;
  entry.updated_at = clockOut;
  return { ...entry };
}

// Manager email used to stamp `modified_by` in mock. Côté backend réel,
// la valeur DOIT être extraite du token JWT — jamais du payload client.
const MOCK_MANAGER_EMAIL = "manager@wello.mock";

function updateTimeEntry(
  employeeId: string,
  entryId: string,
  payload: PlanningTimeEntryUpdateRequest,
): PlanningTimeEntry {
  const entry = timeEntries.find((e) => e.id === entryId && e.employee_id === employeeId);
  if (!entry) notFound(`Mock: pointage ${entryId} introuvable`);
  if (entry!.attendance_source === "planning") {
    invalid("Pointage en mode 'planning' : édition manuelle interdite.");
  }
  const reason = (payload.modification_reason ?? "").trim();
  if (!reason) invalid("Le motif de la correction est obligatoire.");

  const nextIn = payload.clock_in_at ?? entry!.clock_in_at;
  const nextOut = payload.clock_out_at === undefined ? entry!.clock_out_at : payload.clock_out_at;
  if (nextOut && nextOut <= nextIn) {
    invalid("L'heure de sortie doit être postérieure à l'heure d'entrée.");
  }

  // Single-open constraint : si on réouvre une entrée (clock_out → null),
  // vérifier qu'aucune autre n'est déjà ouverte pour cet employé.
  if (!nextOut) {
    const other = timeEntries.find(
      (e) => e.id !== entry!.id && e.employee_id === employeeId && !e.clock_out_at,
    );
    if (other) invalid("Un autre pointage est déjà ouvert pour cet employé.");
  }

  entry!.clock_in_at = nextIn;
  entry!.clock_out_at = nextOut ?? null;
  if (payload.clock_in_note !== undefined) entry!.clock_in_note = payload.clock_in_note;
  if (payload.clock_out_note !== undefined) entry!.clock_out_note = payload.clock_out_note;
  if (payload.shift_id !== undefined) entry!.shift_id = payload.shift_id;
  entry!.modification_reason = reason;
  entry!.modified_by = MOCK_MANAGER_EMAIL;
  entry!.modified_at = nowIso();
  entry!.updated_at = nowIso();
  return { ...entry! };
}

function createTimeEntry(
  employeeId: string,
  payload: PlanningTimeEntryCreateRequest,
): PlanningTimeEntry {
  if (settings.attendance_source !== "pointage") {
    invalid("Les pointages manuels sont désactivés (attendance_source = planning).");
  }
  const reason = (payload.modification_reason ?? "").trim();
  if (!reason) invalid("Le motif de la création est obligatoire.");
  if (!payload.clock_in_at || !payload.clock_out_at) {
    invalid("clock_in_at et clock_out_at sont obligatoires.");
  }
  if (payload.clock_out_at <= payload.clock_in_at) {
    invalid("L'heure de sortie doit être postérieure à l'heure d'entrée.");
  }
  // Pas de chevauchement avec un pointage ouvert.
  const open = timeEntries.find((e) => e.employee_id === employeeId && !e.clock_out_at);
  if (open) invalid("Un pointage est déjà ouvert pour cet employé.");

  const now = nowIso();
  const e: PlanningTimeEntry = {
    id: `te-${nextEntrySerial++}-${Date.now()}`,
    merchant_id: MERCHANT_ID,
    employee_id: employeeId,
    shift_id: payload.shift_id ?? null,
    attendance_source: "pointage",
    clock_in_at: payload.clock_in_at,
    clock_out_at: payload.clock_out_at,
    clock_in_note: payload.clock_in_note ?? null,
    clock_out_note: payload.clock_out_note ?? null,
    modified_by: MOCK_MANAGER_EMAIL,
    modified_at: now,
    modification_reason: reason,
    created_at: now,
    updated_at: now,
  };
  timeEntries.push(e);
  return { ...e };
}

function deleteTimeEntry(employeeId: string, entryId: string, reason: string): void {
  const idx = timeEntries.findIndex((e) => e.id === entryId && e.employee_id === employeeId);
  if (idx < 0) notFound(`Mock: pointage ${entryId} introuvable`);
  if (timeEntries[idx].attendance_source === "planning") {
    invalid("Pointage en mode 'planning' : suppression manuelle interdite.");
  }
  if (!reason || !reason.trim()) {
    invalid("Le motif de la suppression est obligatoire.");
  }
  timeEntries.splice(idx, 1);
}

// ─── Leave requests ────────────────────────────────────────────────────────────

let nextLeaveSerial = 1;
let nextSwapSerial = 1;

function buildLeave(args: {
  id?: string;
  employeeId: string;
  leaveType: PlanningLeaveRequest["leave_type"];
  startDate: string;
  endDate: string;
  status?: PlanningLeaveRequest["status"];
  reason?: string | null;
  managerNote?: string | null;
  processed?: boolean;
}): PlanningLeaveRequest {
  const created = nowIso();
  const status = args.status ?? "pending";
  const processed = args.processed ?? (status !== "pending");
  return {
    id: args.id ?? `lr-${nextLeaveSerial++}`,
    merchant_id: MERCHANT_ID,
    employee_id: args.employeeId,
    leave_type: args.leaveType,
    start_date: args.startDate,
    end_date: args.endDate,
    status,
    reason: args.reason ?? null,
    manager_note: args.managerNote ?? null,
    requested_by_user_id: "u-mock",
    processed_by_user_id: processed ? "u-mock-manager" : null,
    processed_at: processed ? created : null,
    created_at: created,
    updated_at: created,
  };
}

const leaveRequests: PlanningLeaveRequest[] = [
  buildLeave({
    employeeId: "emp-2002",
    leaveType: "paid",
    startDate: addDays(todayIso, 10),
    endDate: addDays(todayIso, 14),
    status: "pending",
    reason: "Vacances en famille",
  }),
  buildLeave({
    employeeId: "emp-2003",
    leaveType: "sick",
    startDate: addDays(todayIso, -3),
    endDate: addDays(todayIso, -1),
    status: "approved",
    reason: "Grippe",
    managerNote: "Arrêt fourni",
  }),
  buildLeave({
    employeeId: "emp-2004",
    leaveType: "unpaid",
    startDate: addDays(todayIso, 21),
    endDate: addDays(todayIso, 23),
    status: "rejected",
    reason: "Déménagement",
    managerNote: "Période trop chargée, à reprogrammer.",
  }),
  buildLeave({
    employeeId: "emp-2005",
    leaveType: "other",
    startDate: addDays(todayIso, 7),
    endDate: addDays(todayIso, 7),
    status: "pending",
    reason: "Convocation administrative",
  }),
];
nextLeaveSerial = leaveRequests.length + 1;

function listLeaveRequests(
  filters: PlanningLeaveRequestFilters = {},
): UnwrappedList<PlanningLeaveRequest> {
  let items = leaveRequests.slice();
  if (filters.employee_id && filters.employee_id !== "me") {
    items = items.filter((l) => l.employee_id === filters.employee_id);
  }
  if (filters.status) items = items.filter((l) => l.status === filters.status);
  if (filters.leave_type) items = items.filter((l) => l.leave_type === filters.leave_type);
  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { items, total: items.length, page: 1, page_size: items.length };
}

function getLeaveRequest(id: string): PlanningLeaveRequest {
  const lr = leaveRequests.find((l) => l.id === id);
  if (!lr) notFound(`Mock: leave-request ${id} introuvable`);
  return { ...lr! };
}

function createLeaveRequest(payload: PlanningLeaveRequestCreateRequest): PlanningLeaveRequest {
  if (payload.end_date < payload.start_date) {
    invalid("end_date doit être postérieure ou égale à start_date.");
  }
  const lr = buildLeave({
    employeeId: payload.employee_id,
    leaveType: payload.leave_type,
    startDate: payload.start_date,
    endDate: payload.end_date,
    reason: payload.reason ?? null,
    status: "pending",
  });
  leaveRequests.unshift(lr);
  return { ...lr };
}

function updateLeaveRequest(
  id: string,
  payload: PlanningLeaveRequestUpdateRequest,
): PlanningLeaveRequest {
  const idx = leaveRequests.findIndex((l) => l.id === id);
  if (idx < 0) notFound(`Mock: leave-request ${id} introuvable`);
  const current = leaveRequests[idx];
  const next: PlanningLeaveRequest = { ...current };

  if (payload.leave_type !== undefined) next.leave_type = payload.leave_type;
  if (payload.start_date !== undefined) next.start_date = payload.start_date;
  if (payload.end_date !== undefined) next.end_date = payload.end_date;
  if (payload.reason !== undefined) next.reason = payload.reason;
  if (payload.manager_note !== undefined) next.manager_note = payload.manager_note;

  if (next.end_date < next.start_date) {
    invalid("end_date doit être postérieure ou égale à start_date.");
  }

  if (payload.status !== undefined && payload.status !== current.status) {
    // Approval conflict: API rejette si des shifts sont encore affectés à l'employé sur la période.
    if (payload.status === "approved") {
      const conflicting = shifts.filter(
        (s) =>
          s.employee_id === current.employee_id &&
          s.shift_date >= next.start_date &&
          s.shift_date <= next.end_date,
      );
      if (conflicting.length > 0) {
        throw new ApiBusinessError(
          `Conflit : ${conflicting.length} shift${conflicting.length > 1 ? "s" : ""} encore affecté${conflicting.length > 1 ? "s" : ""} à cet employé sur la période. Réaffectez ou supprimez-les avant d'approuver.`,
          { status: "leave_request_conflict" },
        );
      }
    }
    next.status = payload.status;
    next.processed_at = nowIso();
    next.processed_by_user_id = "u-mock-manager";
  }

  next.updated_at = nowIso();
  leaveRequests[idx] = next;
  return { ...next };
}

function deleteLeaveRequest(id: string): void {
  const idx = leaveRequests.findIndex((l) => l.id === id);
  if (idx < 0) notFound(`Mock: leave-request ${id} introuvable`);
  // Suppression logique : on bascule sur "cancelled" plutôt que de retirer la ligne.
  leaveRequests[idx] = {
    ...leaveRequests[idx],
    status: "cancelled",
    processed_at: nowIso(),
    processed_by_user_id: "u-mock-manager",
    updated_at: nowIso(),
  };
}

// ─── Shift swap requests ───────────────────────────────────────────────────────

function buildSwap(args: {
  id?: string;
  requesterEmployeeId: string;
  requesterShiftId: string;
  targetEmployeeId: string;
  targetShiftId: string;
  status?: PlanningShiftSwapRequest["status"];
  reason?: string | null;
  managerNote?: string | null;
}): PlanningShiftSwapRequest {
  const created = nowIso();
  const status = args.status ?? "pending";
  const processed = status !== "pending";
  return {
    id: args.id ?? `swap-${nextSwapSerial++}`,
    merchant_id: MERCHANT_ID,
    requester_employee_id: args.requesterEmployeeId,
    requester_shift_id: args.requesterShiftId,
    target_employee_id: args.targetEmployeeId,
    target_shift_id: args.targetShiftId,
    status,
    reason: args.reason ?? null,
    manager_note: args.managerNote ?? null,
    requested_by_user_id: "u-mock",
    processed_by_user_id: processed ? "u-mock-manager" : null,
    processed_at: processed ? created : null,
    created_at: created,
    updated_at: created,
  };
}

const shiftSwapRequests: PlanningShiftSwapRequest[] = [
  buildSwap({
    requesterEmployeeId: "emp-2002",
    requesterShiftId: "sh-4",
    targetEmployeeId: "emp-2003",
    targetShiftId: "sh-7",
    status: "pending",
    reason: "Rendez-vous médical",
  }),
  buildSwap({
    requesterEmployeeId: "emp-2004",
    requesterShiftId: "sh-9",
    targetEmployeeId: "emp-2002",
    targetShiftId: "sh-4",
    status: "approved",
    reason: "Échange convenu",
    managerNote: "OK",
  }),
  buildSwap({
    requesterEmployeeId: "emp-2005",
    requesterShiftId: "sh-13",
    targetEmployeeId: "emp-2002",
    targetShiftId: "sh-6",
    status: "rejected",
    reason: "Indisponibilité",
    managerNote: "Refus : couverture insuffisante.",
  }),
];
nextSwapSerial = shiftSwapRequests.length + 1;

function listShiftSwapRequests(
  filters: PlanningShiftSwapRequestFilters = {},
): UnwrappedList<PlanningShiftSwapRequest> {
  let items = shiftSwapRequests.slice();
  if (filters.requester_employee_id && filters.requester_employee_id !== "me") {
    items = items.filter((s) => s.requester_employee_id === filters.requester_employee_id);
  }
  if (filters.target_employee_id && filters.target_employee_id !== "me") {
    items = items.filter((s) => s.target_employee_id === filters.target_employee_id);
  }
  if (filters.status) items = items.filter((s) => s.status === filters.status);
  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { items, total: items.length, page: 1, page_size: items.length };
}

function getShiftSwapRequest(id: string): PlanningShiftSwapRequest {
  const sw = shiftSwapRequests.find((s) => s.id === id);
  if (!sw) notFound(`Mock: shift-swap-request ${id} introuvable`);
  return { ...sw! };
}

function createShiftSwapRequest(
  payload: PlanningShiftSwapRequestCreateRequest,
): PlanningShiftSwapRequest {
  if (payload.requester_employee_id === payload.target_employee_id) {
    invalid("requester et target doivent être différents.");
  }
  if (payload.requester_shift_id === payload.target_shift_id) {
    invalid("Les deux shifts doivent être différents.");
  }
  const rShift = shifts.find((s) => s.id === payload.requester_shift_id);
  if (!rShift) invalid("Le shift du demandeur est introuvable.");
  if (rShift!.employee_id !== payload.requester_employee_id) {
    invalid("Le shift du demandeur n'est pas affecté à cet employé.");
  }
  const tShift = shifts.find((s) => s.id === payload.target_shift_id);
  if (!tShift) invalid("Le shift cible est introuvable.");
  if (tShift!.employee_id !== payload.target_employee_id) {
    invalid("Le shift cible n'est pas affecté à l'employé cible.");
  }
  const sw = buildSwap({
    requesterEmployeeId: payload.requester_employee_id,
    requesterShiftId: payload.requester_shift_id,
    targetEmployeeId: payload.target_employee_id,
    targetShiftId: payload.target_shift_id,
    reason: payload.reason ?? null,
    status: "pending",
  });
  shiftSwapRequests.unshift(sw);
  return { ...sw };
}

function updateShiftSwapRequest(
  id: string,
  payload: PlanningShiftSwapRequestUpdateRequest,
): PlanningShiftSwapRequest {
  const idx = shiftSwapRequests.findIndex((s) => s.id === id);
  if (idx < 0) notFound(`Mock: shift-swap-request ${id} introuvable`);
  const current = shiftSwapRequests[idx];
  const next: PlanningShiftSwapRequest = { ...current };

  if (payload.reason !== undefined) next.reason = payload.reason;
  if (payload.manager_note !== undefined) next.manager_note = payload.manager_note;

  if (payload.status !== undefined && payload.status !== current.status) {
    // Approbation : échange transactionnel des affectations des deux shifts.
    if (payload.status === "approved") {
      const rIdx = shifts.findIndex((s) => s.id === current.requester_shift_id);
      const tIdx = shifts.findIndex((s) => s.id === current.target_shift_id);
      if (rIdx < 0 || tIdx < 0) {
        throw new ApiBusinessError(
          "Un des shifts a été supprimé, échange impossible.",
          { status: "shift_swap_conflict" },
        );
      }
      const rEmp = shifts[rIdx].employee_id;
      const tEmp = shifts[tIdx].employee_id;
      shifts[rIdx] = { ...shifts[rIdx], employee_id: tEmp, updated_at: nowIso() };
      shifts[tIdx] = { ...shifts[tIdx], employee_id: rEmp, updated_at: nowIso() };
    }
    next.status = payload.status;
    next.processed_at = nowIso();
    next.processed_by_user_id = "u-mock-manager";
  }

  next.updated_at = nowIso();
  shiftSwapRequests[idx] = next;
  return { ...next };
}

function deleteShiftSwapRequest(id: string): void {
  const idx = shiftSwapRequests.findIndex((s) => s.id === id);
  if (idx < 0) notFound(`Mock: shift-swap-request ${id} introuvable`);
  shiftSwapRequests[idx] = {
    ...shiftSwapRequests[idx],
    status: "cancelled",
    processed_at: nowIso(),
    processed_by_user_id: "u-mock-manager",
    updated_at: nowIso(),
  };
}

// ─── Export ────────────────────────────────────────────────────────────────────

export const planningMocks = {
  listEmployees,
  listWeeks,
  getWeek,
  createWeek,
  updateWeek,
  deleteWeek,
  getShiftsForWeek,
  getShift,
  createShift,
  updateShift,
  deleteShift,
  listHolidays,
  overrideHoliday,
  // Settings
  getSettings,
  updateSettings,
  listAttendanceSources,
  // Time entries
  listTimeEntries,
  currentTimeEntry,
  startTimeEntry,
  stopTimeEntry,
  updateTimeEntry,
  createTimeEntry,
  deleteTimeEntry,
  // Leave requests
  listLeaveRequests,
  getLeaveRequest,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  // Shift swap requests
  listShiftSwapRequests,
  getShiftSwapRequest,
  createShiftSwapRequest,
  updateShiftSwapRequest,
  deleteShiftSwapRequest,
};
