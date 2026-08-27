/**
 * Typed API client for the Users / Admin and Planning surfaces.
 *
 * Each function wraps apiClient.{method} + unwrap/unwrapList from apiUnwrap.
 * Endpoint paths mirror EXACTLY the contracts in:
 *   - docs/api/ADMIN_USERS_EMPLOYEES_API.md
 *   - docs/api/PLANNING_AND_USERS_INTEGRATION_GUIDE.md
 */

import { apiClient, logAPI, withMock } from "@/services/apiClient";
import type { WelloApiResponse } from "@/services/apiClient";
import { unwrap, unwrapList } from "@/services/apiUnwrap";
import type { ApiEnvelopeData, UnwrappedList } from "@/services/apiUnwrap";
import { teamMocks } from "@/services/mocks/teamMocks";

import type {
  MerchantUserListItem,
  MerchantUserDetail,
  MerchantUserPlanning,
  MerchantUserRights,
  MerchantUserUnlinkResult,
  LinkableUser,
  CreateUserRequest,
  CreateUserResponse,
  MerchantUserRightsUpsertRequest,
  MerchantUserPlanningUpsertRequest,
  MerchantLinkRequest,
  ForceResetPasswordRequest,
  MerchantUserListFilters,
} from "@/types/adminUsers";

import type {
  Role,
  RoleEntry,
  RoleDetail,
  RoleMember,
  PermissionDomainGroup,
  CreateRoleRequest,
  UpdateRoleRequest,
  UpdateRolePermissionsRequest,
  MyPermissions,
} from "@/types/roles";

import type {
  PlanningSettings,
  PlanningSettingsUpdateRequest,
  EmployeePosition,
  EmployeePositionCreateRequest,
  EmployeePositionUpdateRequest,
  Employee,
  EmployeeCreateRequest,
  EmployeeUpdateRequest,
  EmployeeDisplayOrderRequest,
  EmployeeListFilters,
  EmployeeUserLinkRequest,
  EmployeeDocument,
  EmployeeDocumentUploadResponse,
  EmployeeDocumentCreateRequest,
  EmployeeDocumentDownload,
  PlanningWeek,
  PlanningWeekCreateRequest,
  PlanningWeekUpdateRequest,
  PlanningShift,
  PlanningPublishNotificationMode,
  PlanningShiftCreateRequest,
  PlanningShiftUpdateRequest,
  PlanningTimeEntry,
  PlanningTimeEntryCreateRequest,
  PlanningTimeEntryStartRequest,
  PlanningTimeEntryStopRequest,
  PlanningTimeEntryUpdateRequest,
  PlanningLeaveRequest,
  PlanningLeaveRequestCreateRequest,
  PlanningLeaveRequestUpdateRequest,
  PlanningLeaveRequestFilters,
  PlanningShiftSwapRequest,
  PlanningShiftSwapRequestCreateRequest,
  PlanningShiftSwapRequestUpdateRequest,
  PlanningShiftSwapRequestFilters,
  PlanningHoliday,
  PlanningHolidayOverridePatchRequest,
  PlanningDayComment,
  PlanningDayCommentUpsertRequest,
  SystemRef,
} from "@/types/planning";

// ============= Query-string builder =============

/** Builds a query string from a plain-object filter record, omitting undefined/null values. */
function qs(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

// ============================================================
// Force-mock toggle for in-development Team pages.
// While set to true, every Équipe endpoint below will use the
// in-memory `teamMocks` store regardless of `VITE_USE_MOCK`.
// Flip to `false` when the real backend is ready.
// ============================================================
const TEAM_FORCE_MOCK = true;

// ============================================================
// Force-mock toggle for the in-development Planning page.
// While set to true, all planning weeks / shifts / employees /
// holidays endpoints below are served by `planningMocks`.
// Flip to `false` when the real backend is ready.
// ============================================================
const PLANNING_FORCE_MOCK = true;

// ============================================================
// Users API  –  /users
// ============================================================

export const usersApi = {
  /** GET /users – list merchant members */
  list(filters: MerchantUserListFilters = {}): Promise<UnwrappedList<MerchantUserListItem>> {
    const path = `/users${qs(filters as Record<string, unknown>)}`;
    return withMock(
      () => teamMocks.listUsers(filters),
      () => {
        logAPI("GET", path);
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => unwrapList<MerchantUserListItem>(resp, "users"));
      },
      { method: "GET", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** POST /users – create a new merchant member */
  create(payload: CreateUserRequest): Promise<CreateUserResponse> {
    return withMock(
      () => teamMocks.createUser(payload),
      () => {
        logAPI("POST", "/users", payload);
        return apiClient
          .post<WelloApiResponse<ApiEnvelopeData>>("/users", payload)
          .then((resp) => unwrap<{ user_id: string } & Record<string, unknown>>(resp) as CreateUserResponse);
      },
      { method: "POST", endpoint: "/users", payload, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** GET /users/{id} – member detail */
  get(id: string): Promise<MerchantUserDetail> {
    const path = `/users/${id}`;
    return withMock(
      () => teamMocks.getUser(id),
      () => {
        logAPI("GET", path);
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => unwrap<{ user: MerchantUserDetail } & Record<string, unknown>>(resp).user);
      },
      { method: "GET", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** GET /users/{id}/member – read the member HR / planning block */
  getMember(id: string): Promise<MerchantUserPlanning | null> {
    const path = `/users/${id}/member`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrap<{ member: MerchantUserPlanning | null } & Record<string, unknown>>(resp).member ?? null);
  },

  /** GET /users/linkable-search?search= – global user search for linking */
  linkableSearch(search: string): Promise<LinkableUser[]> {
    const path = `/users/linkable-search${qs({ search })}`;
    return withMock(
      () => teamMocks.linkableSearch(search),
      () => {
        logAPI("GET", path);
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => unwrapList<LinkableUser>(resp, "users").items);
      },
      { method: "GET", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** PATCH /users/{id}/member – update HR / planning block on the member */
  updateMember(id: string, payload: Partial<MerchantUserPlanningUpsertRequest>): Promise<MerchantUserDetail> {
    const path = `/users/${id}/member`;
    return withMock(
      () => teamMocks.updateMember(id, payload),
      () => {
        logAPI("PATCH", path, payload);
        return apiClient
          .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
          .then((resp) => unwrap<{ user: MerchantUserDetail } & Record<string, unknown>>(resp).user);
      },
      { method: "PATCH", endpoint: path, payload, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** PATCH /users/{id}/member – update the member HR / planning block */
  updateMemberContract(id: string, payload: Partial<MerchantUserPlanningUpsertRequest>): Promise<MerchantUserPlanning> {
    const path = `/users/${id}/member`;
    logAPI("PATCH", path, payload);
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ member: MerchantUserPlanning } & Record<string, unknown>>(resp).member);
  },

  /** POST /users/{id}/merchant-link – link an existing user to the merchant */
  merchantLink(id: string, payload: MerchantLinkRequest = {}): Promise<MerchantUserDetail> {
    const path = `/users/${id}/merchant-link`;
    return withMock(
      () => teamMocks.merchantLink(id, payload),
      () => {
        logAPI("POST", path, payload);
        return apiClient
          .post<WelloApiResponse<ApiEnvelopeData>>(path, payload)
          .then((resp) => unwrap<{ user: MerchantUserDetail } & Record<string, unknown>>(resp).user);
      },
      { method: "POST", endpoint: path, payload, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** DELETE /users/{id}/merchant-link – unlink a user from the merchant */
  deleteMerchantLink(id: string): Promise<MerchantUserUnlinkResult> {
    const path = `/users/${id}/merchant-link`;
    return withMock(
      () => teamMocks.deleteMerchantLink(id),
      () => {
        logAPI("DELETE", path);
        return apiClient
          .delete<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => unwrap<{ result: MerchantUserUnlinkResult } & Record<string, unknown>>(resp).result);
      },
      { method: "DELETE", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** GET /users/{id}/rights – read the member's merchant rights */
  getRights(id: string): Promise<MerchantUserRights> {
    const path = `/users/${id}/rights`;
    return withMock(
      () => teamMocks.getRights(id),
      () => {
        logAPI("GET", path);
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => unwrap<{ rights: MerchantUserRights } & Record<string, unknown>>(resp).rights);
      },
      { method: "GET", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** PUT /users/{id}/rights – replace the member's merchant rights */
  updateRights(id: string, payload: MerchantUserRightsUpsertRequest): Promise<MerchantUserRights> {
    const path = `/users/${id}/rights`;
    return withMock(
      () => teamMocks.updateRights(id, payload),
      () => {
        logAPI("PUT", path, payload);
        return apiClient
          .put<WelloApiResponse<ApiEnvelopeData>>(path, payload)
          .then((resp) => unwrap<{ rights: MerchantUserRights } & Record<string, unknown>>(resp).rights);
      },
      { method: "PUT", endpoint: path, payload, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** POST /users/{id}/force-reset-password – admin-side password reset */
  forceResetPassword(id: string, payload: ForceResetPasswordRequest): Promise<void> {
    const path = `/users/${id}/force-reset-password`;
    return withMock(
      () => { teamMocks.forceResetPassword(id, payload.new_password); },
      () => {
        logAPI("POST", path);
        return apiClient
          .post<WelloApiResponse<ApiEnvelopeData>>(path, payload)
          .then((resp) => { unwrap(resp); });
      },
      { method: "POST", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** PUT /users/{id}/role – assign an RBAC role to the member (RBAC lot 9) */
  updateRole(id: string, roleId: string): Promise<Role> {
    const path = `/users/${id}/role`;
    logAPI("PUT", path, { role_id: roleId });
    return apiClient
      .put<WelloApiResponse<ApiEnvelopeData>>(path, { role_id: roleId })
      .then((resp) => unwrap<{ user_id: string; role: Role } & Record<string, unknown>>(resp).role);
  },
};

// ============================================================
// RBAC – Roles  /roles, /permissions, /me/permissions  (RBAC lot 9)
// ============================================================

export const rolesApi = {
  /** GET /roles */
  list(): Promise<RoleEntry[]> {
    const path = "/roles";
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrapList<RoleEntry>(resp, "roles").items);
  },

  /** POST /roles */
  create(payload: CreateRoleRequest): Promise<RoleDetail> {
    logAPI("POST", "/roles", payload);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>("/roles", payload)
      .then((resp) => unwrap<{ role: RoleDetail } & Record<string, unknown>>(resp).role);
  },

  /** GET /roles/{id} */
  get(id: string): Promise<RoleDetail> {
    const path = `/roles/${id}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrap<{ role: RoleDetail } & Record<string, unknown>>(resp).role);
  },

  /** PATCH /roles/{id} – name/description, not permissions */
  update(id: string, payload: UpdateRoleRequest): Promise<RoleDetail> {
    const path = `/roles/${id}`;
    logAPI("PATCH", path, payload);
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ role: RoleDetail } & Record<string, unknown>>(resp).role);
  },

  /** PUT /roles/{id}/permissions – replaces the whole permission set */
  updatePermissions(id: string, payload: UpdateRolePermissionsRequest): Promise<RoleDetail> {
    const path = `/roles/${id}/permissions`;
    logAPI("PUT", path, payload);
    return apiClient
      .put<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ role: RoleDetail } & Record<string, unknown>>(resp).role);
  },

  /** POST /roles/{id}/archive */
  archive(id: string): Promise<Role> {
    const path = `/roles/${id}/archive`;
    logAPI("POST", path);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrap<{ role: Role } & Record<string, unknown>>(resp).role);
  },

  /** GET /roles/{id}/members */
  getMembers(id: string): Promise<RoleMember[]> {
    const path = `/roles/${id}/members`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrapList<RoleMember>(resp, "members").items);
  },

  /** GET /permissions – the runtime permission catalogue, grouped by domain */
  getCatalog(): Promise<PermissionDomainGroup[]> {
    const path = "/permissions";
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrapList<PermissionDomainGroup>(resp, "domains").items);
  },

  /** GET /me/permissions – the caller's own effective permissions */
  getMyPermissions(): Promise<MyPermissions> {
    const path = "/me/permissions";
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrap<{ my_permissions: MyPermissions } & Record<string, unknown>>(resp).my_permissions);
  },
};

// ============================================================
// Planning – Settings  /planning/settings
// ============================================================

export const planningSettingsApi = {
  /** GET /planning/settings */
  get(): Promise<PlanningSettings> {
    logAPI("GET", "/planning/settings");
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>("/planning/settings")
      .then((resp) => unwrap<{ settings: PlanningSettings } & Record<string, unknown>>(resp).settings);
  },

  /** PUT /planning/settings */
  update(payload: PlanningSettingsUpdateRequest): Promise<PlanningSettings> {
    logAPI("PUT", "/planning/settings", payload);
    return apiClient
      .put<WelloApiResponse<ApiEnvelopeData>>("/planning/settings", payload)
      .then((resp) => unwrap<{ settings: PlanningSettings } & Record<string, unknown>>(resp).settings);
  },
};

// ============================================================
// Planning – Positions  /planning/positions
// ============================================================

export const planningPositionsApi = {
  /** GET /planning/positions */
  list(): Promise<EmployeePosition[]> {
    return withMock(
      () => teamMocks.listPositions(),
      () => {
        logAPI("GET", "/planning/positions");
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>("/planning/positions")
          .then((resp) => unwrapList<EmployeePosition>(resp, "positions").items);
      },
      { method: "GET", endpoint: "/planning/positions", forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** POST /planning/positions */
  create(payload: EmployeePositionCreateRequest): Promise<EmployeePosition> {
    return withMock(
      () => teamMocks.createPosition(payload),
      () => {
        logAPI("POST", "/planning/positions", payload);
        return apiClient
          .post<WelloApiResponse<ApiEnvelopeData>>("/planning/positions", payload)
          .then((resp) => unwrap<{ position: EmployeePosition } & Record<string, unknown>>(resp).position);
      },
      { method: "POST", endpoint: "/planning/positions", payload, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** GET /planning/positions/{id} */
  get(id: string): Promise<EmployeePosition> {
    const path = `/planning/positions/${id}`;
    return withMock(
      () => teamMocks.getPosition(id),
      () => {
        logAPI("GET", path);
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => unwrap<{ position: EmployeePosition } & Record<string, unknown>>(resp).position);
      },
      { method: "GET", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** PATCH /planning/positions/{id} */
  update(id: string, payload: EmployeePositionUpdateRequest): Promise<EmployeePosition> {
    const path = `/planning/positions/${id}`;
    return withMock(
      () => teamMocks.updatePosition(id, payload),
      () => {
        logAPI("PATCH", path, payload);
        return apiClient
          .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
          .then((resp) => unwrap<{ position: EmployeePosition } & Record<string, unknown>>(resp).position);
      },
      { method: "PATCH", endpoint: path, payload, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** DELETE /planning/positions/{id} */
  delete(id: string): Promise<void> {
    const path = `/planning/positions/${id}`;
    return withMock(
      () => { teamMocks.deletePosition(id); },
      () => {
        logAPI("DELETE", path);
        return apiClient
          .delete<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => { unwrap(resp); });
      },
      { method: "DELETE", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },
};

// ============================================================
// POS Holidays  /pos/settings/holidays
// Used to render holiday cells in the planning grid background.
// ============================================================

export const holidaysApi = {
  /** GET /pos/settings/holidays?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD */
  list(params: { start_date?: string; end_date?: string } = {}): Promise<PlanningHoliday[]> {
    const path = `/pos/settings/holidays${qs(params as Record<string, unknown>)}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrapList<PlanningHoliday>(resp, "holidays").items);
  },

  /** PATCH /pos/settings/holidays/{date} — toggle disabled or override the multiplier. */
  override(date: string, payload: PlanningHolidayOverridePatchRequest): Promise<PlanningHoliday> {
    const path = `/pos/settings/holidays/${date}`;
    logAPI("PATCH", path, payload);
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ holiday: PlanningHoliday } & Record<string, unknown>>(resp).holiday);
  },
};

// ============================================================
// Planning – Day Comments  /planning/day-comments
// ============================================================

export const planningDayCommentsApi = {
  /** GET /planning/day-comments?start_date=...&end_date=... */
  list(startDate: string, endDate: string): Promise<PlanningDayComment[]> {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    const path = `/planning/day-comments?${params.toString()}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrapList<PlanningDayComment>(resp, "day_comments").items);
  },

  /** PUT /planning/day-comments/{date} — crée ou remplace le commentaire de ce jour. */
  upsert(date: string, payload: PlanningDayCommentUpsertRequest): Promise<PlanningDayComment> {
    const path = `/planning/day-comments/${date}`;
    logAPI("PUT", path, payload);
    return apiClient
      .put<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ day_comment: PlanningDayComment } & Record<string, unknown>>(resp).day_comment);
  },

  /** DELETE /planning/day-comments/{date} */
  delete(date: string): Promise<void> {
    const path = `/planning/day-comments/${date}`;
    logAPI("DELETE", path);
    return apiClient
      .delete<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => { unwrap(resp); });
  },
};

// ============================================================
// Planning – Weeks  /planning/weeks
// ============================================================

export const planningWeeksApi = {
  /** GET /planning/weeks */
  list(): Promise<PlanningWeek[]> {
    logAPI("GET", "/planning/weeks");
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>("/planning/weeks")
      .then((resp) => unwrapList<PlanningWeek>(resp, "weeks").items);
  },

  /** POST /planning/weeks */
  create(payload: PlanningWeekCreateRequest): Promise<PlanningWeek> {
    logAPI("POST", "/planning/weeks", payload);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>("/planning/weeks", payload)
      .then((resp) => unwrap<{ week: PlanningWeek } & Record<string, unknown>>(resp).week);
  },

  /** GET /planning/weeks/{id} */
  get(id: string): Promise<PlanningWeek> {
    const path = `/planning/weeks/${id}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrap<{ week: PlanningWeek } & Record<string, unknown>>(resp).week);
  },

  /** PATCH /planning/weeks/{id} */
  update(id: string, payload: PlanningWeekUpdateRequest): Promise<PlanningWeek> {
    const path = `/planning/weeks/${id}`;
    logAPI("PATCH", path, payload);
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ week: PlanningWeek } & Record<string, unknown>>(resp).week);
  },

  /** DELETE /planning/weeks/{id} */
  delete(id: string): Promise<void> {
    const path = `/planning/weeks/${id}`;
    logAPI("DELETE", path);
    return apiClient
      .delete<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => { unwrap(resp); });
  },

  /** POST /planning/weeks/{id}/publish */
  publishWeek(id: string, notificationMode?: PlanningPublishNotificationMode): Promise<PlanningWeek> {
    const path = `/planning/weeks/${id}/publish`;
    const payload = notificationMode ? { notification_mode: notificationMode } : undefined;
    logAPI("POST", path, payload);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ week: PlanningWeek } & Record<string, unknown>>(resp).week);
  },

  /** POST /planning/weeks/{id}/unpublish */
  unpublishWeek(id: string): Promise<PlanningWeek> {
    const path = `/planning/weeks/${id}/unpublish`;
    logAPI("POST", path);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrap<{ week: PlanningWeek } & Record<string, unknown>>(resp).week);
  },

  /** GET /planning/weeks/{id}/shifts – list shifts for a week */
  getShifts(weekId: string): Promise<PlanningShift[]> {
    const path = `/planning/weeks/${weekId}/shifts`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrapList<PlanningShift>(resp, "shifts").items);
  },

    /** GET /planning/shifts?start_date=...&end_date=... – list shifts for a date range */
    getShiftsByRange(startDate: string, endDate: string): Promise<PlanningShift[]> {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
        const path = `/planning/shifts?${params.toString()}`;
        logAPI("GET", path);
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => unwrapList<PlanningShift>(resp, "shifts").items);
    },

  /** POST /planning/weeks/{id}/shifts – create a shift in a week */
  createShift(weekId: string, payload: PlanningShiftCreateRequest): Promise<PlanningShift> {
    const path = `/planning/weeks/${weekId}/shifts`;
    logAPI("POST", path, payload);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ shift: PlanningShift } & Record<string, unknown>>(resp).shift);
  },
};

// ============================================================
// Planning – Shifts  /planning/shifts
// ============================================================

export const planningShiftsApi = {
  /** GET /planning/shifts/{id} */
  get(id: string): Promise<PlanningShift> {
    const path = `/planning/shifts/${id}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrap<{ shift: PlanningShift } & Record<string, unknown>>(resp).shift);
  },

  /** PATCH /planning/shifts/{id} */
  update(id: string, payload: PlanningShiftUpdateRequest): Promise<PlanningShift> {
    const path = `/planning/shifts/${id}`;
    logAPI("PATCH", path, payload);
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ shift: PlanningShift } & Record<string, unknown>>(resp).shift);
  },

  /** DELETE /planning/shifts/{id} */
  delete(id: string): Promise<void> {
    const path = `/planning/shifts/${id}`;
    logAPI("DELETE", path);
    return apiClient
      .delete<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => { unwrap(resp); });
  },
};

// ============================================================
// Planning – Employees  /planning/employees
// ============================================================

export const planningEmployeesApi = {
  /** GET /planning/employees */
  list(filters: EmployeeListFilters = {}): Promise<UnwrappedList<Employee>> {
    const path = `/planning/employees${qs(filters as Record<string, unknown>)}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrapList<Employee>(resp, "employees"));
  },

  /** POST /planning/employees */
  create(payload: EmployeeCreateRequest): Promise<Employee> {
    return withMock(
      () => teamMocks.createEmployee(payload),
      () => {
        logAPI("POST", "/planning/employees", payload);
        return apiClient
          .post<WelloApiResponse<ApiEnvelopeData>>("/planning/employees", payload)
          .then((resp) => unwrap<{ employee: Employee } & Record<string, unknown>>(resp).employee);
      },
      { method: "POST", endpoint: "/planning/employees", payload, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** GET /planning/employees/{id} */
  get(id: string): Promise<Employee> {
    const path = `/planning/employees/${id}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrap<{ employee: Employee } & Record<string, unknown>>(resp).employee);
  },

  /** PATCH /planning/employees/{id} */
  update(id: string, payload: EmployeeUpdateRequest): Promise<Employee> {
    const path = `/planning/employees/${id}`;
    logAPI("PATCH", path, payload);
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ employee: Employee } & Record<string, unknown>>(resp).employee);
  },

  /** DELETE /planning/employees/{id} */
  delete(id: string): Promise<void> {
    const path = `/planning/employees/${id}`;
    logAPI("DELETE", path);
    return apiClient
      .delete<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => { unwrap(resp); });
  },

  /** POST /planning/employees/{id}/user-link */
  userLink(id: string, payload: EmployeeUserLinkRequest): Promise<Employee> {
    const path = `/planning/employees/${id}/user-link`;
    logAPI("POST", path, payload);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ employee: Employee } & Record<string, unknown>>(resp).employee);
  },

  /** DELETE /planning/employees/{id}/user-link */
  deleteUserLink(id: string): Promise<void> {
    const path = `/planning/employees/${id}/user-link`;
    logAPI("DELETE", path);
    return apiClient
      .delete<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => { unwrap(resp); });
  },

  /** PATCH /planning/employees/display-order */
  updateDisplayOrder(employeeIds: string[]): Promise<void> {
    const payload: EmployeeDisplayOrderRequest = { employee_ids: employeeIds };
    const path = `/planning/employees/display-order`;
    logAPI("PATCH", path, payload);
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => { unwrap(resp); });
  },
};

// ============================================================
// Planning – Documents  /planning/employees/{id}/documents
// ============================================================

export const planningDocumentsApi = {
  /** GET /planning/employees/{employeeId}/documents */
  list(employeeId: string): Promise<EmployeeDocument[]> {
    const path = `/planning/employees/${employeeId}/documents`;
    return withMock(
      () => teamMocks.listDocuments(employeeId),
      () => {
        logAPI("GET", path);
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => unwrapList<EmployeeDocument>(resp, "documents").items);
      },
      { method: "GET", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** POST /planning/uploads/employee-documents – upload binary file */
  upload(formData: FormData): Promise<EmployeeDocumentUploadResponse> {
    return withMock(
      () => teamMocks.uploadDocument(formData),
      () => {
        logAPI("POST", "/planning/uploads/employee-documents");
        return apiClient
          .post<WelloApiResponse<ApiEnvelopeData>>("/planning/uploads/employee-documents", formData)
          .then((resp) => unwrap<EmployeeDocumentUploadResponse & Record<string, unknown>>(resp) as EmployeeDocumentUploadResponse);
      },
      { method: "POST", endpoint: "/planning/uploads/employee-documents", forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** POST /planning/employees/{employeeId}/documents */
  create(employeeId: string, payload: EmployeeDocumentCreateRequest): Promise<EmployeeDocument> {
    const path = `/planning/employees/${employeeId}/documents`;
    return withMock(
      () => teamMocks.createDocument(employeeId, payload),
      () => {
        logAPI("POST", path, payload);
        return apiClient
          .post<WelloApiResponse<ApiEnvelopeData>>(path, payload)
          .then((resp) => unwrap<{ document: EmployeeDocument } & Record<string, unknown>>(resp).document);
      },
      { method: "POST", endpoint: path, payload, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** GET /planning/employees/{employeeId}/documents/{documentId}/download */
  download(employeeId: string, documentId: string): Promise<string> {
    const path = `/planning/employees/${employeeId}/documents/${documentId}/download`;
    return withMock(
      () => teamMocks.downloadDocument(employeeId, documentId),
      () => {
        logAPI("GET", path);
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => unwrap<EmployeeDocumentDownload & Record<string, unknown>>(resp).file_url);
      },
      { method: "GET", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** DELETE /planning/employees/{employeeId}/documents/{documentId} */
  delete(employeeId: string, documentId: string): Promise<void> {
    const path = `/planning/employees/${employeeId}/documents/${documentId}`;
    return withMock(
      () => { teamMocks.deleteDocument(employeeId, documentId); },
      () => {
        logAPI("DELETE", path);
        return apiClient
          .delete<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => { unwrap(resp); });
      },
      { method: "DELETE", endpoint: path, forceMock: TEAM_FORCE_MOCK },
    );
  },
};

// ============================================================
// Planning – Time Entries  /planning/employees/{id}/time-entries
// ============================================================

export const planningTimeEntriesApi = {
  /** GET /planning/employees/{employeeId}/time-entries   (employeeId may be "me") */
  // TODO §8 (PLANNING_AND_USERS_INTEGRATION_GUIDE.md): replace per-employee
  // aggregation by a global `/planning/time-entries` endpoint once available.
  list(employeeId: string): Promise<PlanningTimeEntry[]> {
    const path = `/planning/employees/${employeeId}/time-entries`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrapList<PlanningTimeEntry>(resp, "time_entries").items);
  },

  /** GET /planning/employees/{employeeId}/time-entries/current */
  current(employeeId: string): Promise<PlanningTimeEntry | null> {
    const path = `/planning/employees/${employeeId}/time-entries/current`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => {
        const data = unwrap<{ time_entry?: PlanningTimeEntry } & Record<string, unknown>>(resp);
        return data.time_entry ?? null;
      });
  },

  /** POST /planning/employees/{employeeId}/time-entries/start */
  start(employeeId: string, payload?: PlanningTimeEntryStartRequest): Promise<PlanningTimeEntry> {
    const path = `/planning/employees/${employeeId}/time-entries/start`;
    logAPI("POST", path, payload);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ time_entry: PlanningTimeEntry } & Record<string, unknown>>(resp).time_entry);
  },

  /** POST /planning/employees/{employeeId}/time-entries/stop */
  stop(employeeId: string, payload: PlanningTimeEntryStopRequest): Promise<PlanningTimeEntry> {
    const path = `/planning/employees/${employeeId}/time-entries/stop`;
    logAPI("POST", path, payload);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ time_entry: PlanningTimeEntry } & Record<string, unknown>>(resp).time_entry);
  },

  /**
   * PATCH /planning/employees/{employeeId}/time-entries/{entryId} — correction manager.
   * `modification_reason` est obligatoire (audit légal FR). Le serveur DOIT
   * renseigner `modified_by` depuis le token. Endpoint à confirmer.
   */
  update(
    employeeId: string,
    entryId: string,
    payload: PlanningTimeEntryUpdateRequest,
  ): Promise<PlanningTimeEntry> {
    const path = `/planning/employees/${employeeId}/time-entries/${entryId}`;
    logAPI("PATCH", path, payload);
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ time_entry: PlanningTimeEntry } & Record<string, unknown>>(resp).time_entry);
  },

  /**
   * POST /planning/employees/{employeeId}/time-entries — création manuelle
   * complète (oubli de pointage). `modification_reason` obligatoire.
   * Endpoint à confirmer.
   */
  create(
    employeeId: string,
    payload: PlanningTimeEntryCreateRequest,
  ): Promise<PlanningTimeEntry> {
    const path = `/planning/employees/${employeeId}/time-entries`;
    logAPI("POST", path, payload);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ time_entry: PlanningTimeEntry } & Record<string, unknown>>(resp).time_entry);
  },

  /**
   * DELETE /planning/employees/{employeeId}/time-entries/{entryId} —
   * suppression manuelle par un manager. Le motif est passé en query string
   * (`?reason=...`) si l'API l'accepte ; sinon côté serveur via header.
   * Endpoint à confirmer.
   */
  delete(employeeId: string, entryId: string, reason: string): Promise<void> {
    const path = `/planning/employees/${employeeId}/time-entries/${entryId}`;
    const url = `${path}?reason=${encodeURIComponent(reason)}`;
    logAPI("DELETE", url);
    return apiClient.delete<unknown>(url).then(() => undefined);
  },
};

// ============================================================
// Planning – Leave Requests  /planning/leave-requests
// ============================================================

export const planningLeaveApi = {
  /** GET /planning/leave-requests */
  list(filters: PlanningLeaveRequestFilters = {}): Promise<UnwrappedList<PlanningLeaveRequest>> {
    const path = `/planning/leave-requests${qs(filters as Record<string, unknown>)}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrapList<PlanningLeaveRequest>(resp, "leave_requests"));
  },

  /** POST /planning/leave-requests */
  create(payload: PlanningLeaveRequestCreateRequest): Promise<PlanningLeaveRequest> {
    logAPI("POST", "/planning/leave-requests", payload);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>("/planning/leave-requests", payload)
      .then((resp) => unwrap<{ leave_request: PlanningLeaveRequest } & Record<string, unknown>>(resp).leave_request);
  },

  /** GET /planning/leave-requests/{id} */
  get(id: string): Promise<PlanningLeaveRequest> {
    const path = `/planning/leave-requests/${id}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrap<{ leave_request: PlanningLeaveRequest } & Record<string, unknown>>(resp).leave_request);
  },

  /** GET /planning/leave-requests/{id}/conflicting-shifts */
  getConflictingShifts(id: string): Promise<PlanningShift[]> {
    const path = `/planning/leave-requests/${id}/conflicting-shifts`;
    return withMock(
      () => Promise.resolve([]),
      () => {
        logAPI("GET", path);
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>(path)
          .then((resp) => unwrapList<PlanningShift>(resp, "conflicting_shifts").items);
      },
      { method: "GET", endpoint: path, forceMock: PLANNING_FORCE_MOCK },
    );
  },

  /** PATCH /planning/leave-requests/{id} */
  update(id: string, payload: PlanningLeaveRequestUpdateRequest): Promise<PlanningLeaveRequest> {
    const path = `/planning/leave-requests/${id}`;
    logAPI("PATCH", path, payload);
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ leave_request: PlanningLeaveRequest } & Record<string, unknown>>(resp).leave_request);
  },

  /** DELETE /planning/leave-requests/{id} */
  delete(id: string): Promise<void> {
    const path = `/planning/leave-requests/${id}`;
    logAPI("DELETE", path);
    return apiClient
      .delete<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => { unwrap(resp); });
  },
};

// ============================================================
// Planning – Shift Swap Requests  /planning/shift-swap-requests
// ============================================================

export const planningSwapApi = {
  /** GET /planning/shift-swap-requests */
  list(filters: PlanningShiftSwapRequestFilters = {}): Promise<UnwrappedList<PlanningShiftSwapRequest>> {
    const path = `/planning/shift-swap-requests${qs(filters as Record<string, unknown>)}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrapList<PlanningShiftSwapRequest>(resp, "shift_swap_requests"));
  },

  /** POST /planning/shift-swap-requests */
  create(payload: PlanningShiftSwapRequestCreateRequest): Promise<PlanningShiftSwapRequest> {
    logAPI("POST", "/planning/shift-swap-requests", payload);
    return apiClient
      .post<WelloApiResponse<ApiEnvelopeData>>("/planning/shift-swap-requests", payload)
      .then((resp) => unwrap<{ shift_swap_request: PlanningShiftSwapRequest } & Record<string, unknown>>(resp).shift_swap_request);
  },

  /** GET /planning/shift-swap-requests/{id} */
  get(id: string): Promise<PlanningShiftSwapRequest> {
    const path = `/planning/shift-swap-requests/${id}`;
    logAPI("GET", path);
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => unwrap<{ shift_swap_request: PlanningShiftSwapRequest } & Record<string, unknown>>(resp).shift_swap_request);
  },

  /** PATCH /planning/shift-swap-requests/{id} */
  update(id: string, payload: PlanningShiftSwapRequestUpdateRequest): Promise<PlanningShiftSwapRequest> {
    const path = `/planning/shift-swap-requests/${id}`;
    logAPI("PATCH", path, payload);
    return apiClient
      .patch<WelloApiResponse<ApiEnvelopeData>>(path, payload)
      .then((resp) => unwrap<{ shift_swap_request: PlanningShiftSwapRequest } & Record<string, unknown>>(resp).shift_swap_request);
  },

  /** DELETE /planning/shift-swap-requests/{id} */
  delete(id: string): Promise<void> {
    const path = `/planning/shift-swap-requests/${id}`;
    logAPI("DELETE", path);
    return apiClient
      .delete<WelloApiResponse<ApiEnvelopeData>>(path)
      .then((resp) => { unwrap(resp); });
  },
};

// ============================================================
// Planning – System references
// ============================================================

export const planningRefsApi = {
  /** GET /planning/contract-types */
  contractTypes(): Promise<SystemRef[]> {
    return withMock(
      () => teamMocks.listContractTypes(),
      () => {
        logAPI("GET", "/planning/contract-types");
        return apiClient
          .get<WelloApiResponse<ApiEnvelopeData>>("/planning/contract-types")
          .then((resp) => unwrapList<SystemRef>(resp, "contract_types").items);
      },
      { method: "GET", endpoint: "/planning/contract-types", forceMock: TEAM_FORCE_MOCK },
    );
  },

  /** GET /planning/attendance-sources */
  attendanceSources(): Promise<SystemRef[]> {
    logAPI("GET", "/planning/attendance-sources");
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>("/planning/attendance-sources")
      .then((resp) => unwrapList<SystemRef>(resp, "attendance_sources").items);
  },

  /** GET /planning/event-types */
  eventTypes(): Promise<SystemRef[]> {
    logAPI("GET", "/planning/event-types");
    return apiClient
      .get<WelloApiResponse<ApiEnvelopeData>>("/planning/event-types")
      .then((resp) => unwrapList<SystemRef>(resp, "event_types").items);
  },
};

