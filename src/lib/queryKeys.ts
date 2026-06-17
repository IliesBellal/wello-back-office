/**
 * Centralized React Query key factory.
 *
 * Keys are structured as arrays for granular invalidation.
 * Usage:  queryClient.invalidateQueries({ queryKey: qk.users.list() })
 *         queryClient.invalidateQueries({ queryKey: qk.planning.employees.all })
 */

import type { MerchantUserListFilters } from "@/types/adminUsers";
import type { EmployeeListFilters, PlanningLeaveRequestFilters, PlanningShiftSwapRequestFilters } from "@/types/planning";

export const qk = {
  // ─── Users ────────────────────────────────────────────────
  users: {
    all: ["users"] as const,
    list: (filters?: MerchantUserListFilters) => ["users", "list", filters ?? {}] as const,
    detail: (id: string) => ["users", "detail", id] as const,
    rights: (id: string) => ["users", "rights", id] as const,
    linkableSearch: (search: string) => ["users", "linkable-search", search] as const,
  },

  // ─── Planning – Settings ──────────────────────────────────
  planningSettings: {
    all: ["planning", "settings"] as const,
  },

  // ─── Planning – Positions ─────────────────────────────────
  planningPositions: {
    all: ["planning", "positions"] as const,
    detail: (id: string) => ["planning", "positions", id] as const,
  },

  // ─── Planning – Shift Templates ───────────────────────────
  planningShiftTemplates: {
    all: ["planning", "shift-templates"] as const,
    detail: (id: string) => ["planning", "shift-templates", id] as const,
  },

  // ─── Planning – Week Templates ────────────────────────────
  // Modèles de SEMAINE (à ne pas confondre avec `planningShiftTemplates`
  // — modèles de SHIFT unitaire). Voir `src/services/weekTemplateService.ts`.
  planningWeekTemplates: {
    all: ["planning", "week-templates"] as const,
    detail: (id: string) => ["planning", "week-templates", id] as const,
  },

  // ─── Planning – Weeks ─────────────────────────────────────
  planningWeeks: {
    all: ["planning", "weeks"] as const,
    detail: (id: string) => ["planning", "weeks", id] as const,
    shifts: (weekId: string) => ["planning", "weeks", weekId, "shifts"] as const,
  },

  // ─── Planning – Shifts ────────────────────────────────────
  planningShifts: {
    detail: (id: string) => ["planning", "shifts", id] as const,
    range: (from: string, to: string) => ["planning", "shifts", "range", from, to] as const,
  },

    // ─── POS Holidays ─────────────────────────────────────────
  planningHolidays: {
    all: ["planning", "holidays"] as const,
    range: (from: string, to: string) => ["planning", "holidays", from, to] as const,
  },

  // ─── Planning – Employees ─────────────────────────────────
  planningEmployees: {
    all: ["planning", "employees"] as const,
    list: (filters?: EmployeeListFilters) => ["planning", "employees", "list", filters ?? {}] as const,
    detail: (id: string) => ["planning", "employees", id] as const,
    documents: (employeeId: string) => ["planning", "employees", employeeId, "documents"] as const,
    timeEntries: (employeeId: string) => ["planning", "employees", employeeId, "time-entries"] as const,
    currentTimeEntry: (employeeId: string) => ["planning", "employees", employeeId, "time-entries", "current"] as const,
  },

  // ─── Planning – Leave Requests ────────────────────────────
  planningLeave: {
    all: ["planning", "leave-requests"] as const,
    list: (filters?: PlanningLeaveRequestFilters) => ["planning", "leave-requests", "list", filters ?? {}] as const,
    detail: (id: string) => ["planning", "leave-requests", id] as const,
  },

  // ─── Planning – Shift Swap Requests ──────────────────────
  planningSwaps: {
    all: ["planning", "shift-swap-requests"] as const,
    list: (filters?: PlanningShiftSwapRequestFilters) => ["planning", "shift-swap-requests", "list", filters ?? {}] as const,
    detail: (id: string) => ["planning", "shift-swap-requests", id] as const,
  },

  // ─── Planning – References ────────────────────────────────
  planningRefs: {
    contractTypes: ["planning", "refs", "contract-types"] as const,
    attendanceSources: ["planning", "refs", "attendance-sources"] as const,
    eventTypes: ["planning", "refs", "event-types"] as const,
  },

  // ─── Printers ─────────────────────────────────────────────
  printers: {
    all: ["printers"] as const,
    detail: (id: string) => ["printers", "detail", id] as const,
  },
} as const;
