/**
 * In-memory mock store for the Équipe page.
 *
 * Activated by `VITE_USE_MOCK=true` via the `withMock()` helper in apiClient.
 * Handlers return already-unwrapped domain objects (the envelope layer is
 * bypassed in mock mode).
 *
 * All amounts are in CENTS to match the real backend contract. Use
 * `toEuros` / `toCents` from `@/lib/money` in the UI layer.
 *
 * Mutations update the in-memory store so the UI reflects changes during
 * a single session (data is reset on page reload).
 */

import type { UnwrappedList } from "@/services/apiUnwrap";
import type {
  MerchantUserListItem,
  MerchantUserListFilters,
  MerchantUserDetail,
  MerchantUserRights,
  MerchantUserPermissions,
  MerchantUserUnlinkResult,
  LinkableUser,
  CreateUserRequest,
  CreateUserResponse,
  MerchantUserRightsUpsertRequest,
  MerchantUserPlanning,
  MerchantUserPlanningUpsertRequest,
  MerchantLinkRequest,
} from "@/types/adminUsers";
import type {
  EmployeePosition,
  EmployeePositionCreateRequest,
  EmployeePositionUpdateRequest,
  EmployeeCreateRequest,
  EmployeeDocument,
  EmployeeDocumentCreateRequest,
  EmployeeDocumentUploadResponse,
  SystemRef,
  Employee,
} from "@/types/planning";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MERCHANT_ID = "mock-merchant-001";

let _uid = 1000;
const nextId = (prefix: string) => `${prefix}-${++_uid}`;

const nowISO = () => new Date().toISOString();

const EMPTY_PERMS: MerchantUserPermissions = {
  access_reception: false,
  access_delivery: false,
  access_waiter: false,
  print_merchant_cash_report: false,
  open_cash_drawer: false,
  manage_menu: false,
  manage_plannings: false,
  manage_users: false,
  manage_settings: false,
  manage_haccp: false,
  view_reports: false,
  export_reports: false,
  view_financials: false,
  export_financials: false,
  manage_customers: false,
  export_customers: false,
};

const FULL_PERMS: MerchantUserPermissions = {
  access_reception: true,
  access_delivery: true,
  access_waiter: true,
  print_merchant_cash_report: true,
  open_cash_drawer: true,
  manage_menu: true,
  manage_plannings: true,
  manage_users: true,
  manage_settings: true,
  manage_haccp: true,
  view_reports: true,
  export_reports: true,
  view_financials: true,
  export_financials: true,
  manage_customers: true,
  export_customers: true,
};

function computeStatus(enabled: boolean, loginEnabled: boolean): MerchantUserListItem["status"] {
  if (!enabled) return "disabled";
  if (!loginEnabled) return "login_disabled";
  return "active";
}

// ─── Référentiels ──────────────────────────────────────────────────────────────

const positions: EmployeePosition[] = [
  { id: "pos-1", merchant_id: MERCHANT_ID, label: "Manager",   color: "#3b82f6", sort_order: 0, active: true, employee_count: 2, created_at: "2025-01-10T09:00:00Z", updated_at: "2025-01-10T09:00:00Z" },
  { id: "pos-2", merchant_id: MERCHANT_ID, label: "Serveur",   color: "#10b981", sort_order: 1, active: true, employee_count: 4, created_at: "2025-01-10T09:00:00Z", updated_at: "2025-01-10T09:00:00Z" },
  { id: "pos-3", merchant_id: MERCHANT_ID, label: "Cuisinier", color: "#f59e0b", sort_order: 2, active: true, employee_count: 3, created_at: "2025-01-10T09:00:00Z", updated_at: "2025-01-10T09:00:00Z" },
  { id: "pos-4", merchant_id: MERCHANT_ID, label: "Plongeur",  color: "#8b5cf6", sort_order: 3, active: true, employee_count: 1, created_at: "2025-01-10T09:00:00Z", updated_at: "2025-01-10T09:00:00Z" },
  { id: "pos-5", merchant_id: MERCHANT_ID, label: "Livreur",   color: "#06b6d4", sort_order: 4, active: true, employee_count: 2, created_at: "2025-01-10T09:00:00Z", updated_at: "2025-01-10T09:00:00Z" },
];

const contractTypes: SystemRef[] = [
  { code: "CDI", label: "CDI" },
  { code: "CDD", label: "CDD" },
  { code: "INTERIM", label: "Intérim" },
  { code: "APPRENTI", label: "Apprenti" },
  { code: "STAGE", label: "Stage" },
  { code: "EXTRA", label: "Extra" },
];

// ─── Members ───────────────────────────────────────────────────────────────────

interface MockMember {
  detail: MerchantUserDetail;
  rights: MerchantUserRights;
  password?: string; // never returned, used by forceResetPassword
}

function makeMember(seed: {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  tel: string;
  admin?: boolean;
  loginEnabled?: boolean;
  enabled?: boolean;
  permissions?: Partial<MerchantUserPermissions>;
  employee_id?: string | null;
  employee_name?: string | null;
  planning?: MerchantUserDetail["planning"];
  created_at?: string;
  last_login_at?: string | null;
}): MockMember {
  const admin = seed.admin ?? false;
  const loginEnabled = seed.loginEnabled ?? true;
  const enabled = seed.enabled ?? true;
  const permissions: MerchantUserPermissions = admin
    ? { ...FULL_PERMS }
    : { ...EMPTY_PERMS, ...seed.permissions };
  const status = computeStatus(enabled, loginEnabled);

  const detail: MerchantUserDetail = {
    user_id: seed.user_id,
    first_name: seed.first_name,
    last_name: seed.last_name,
    email: seed.email,
    tel: seed.tel,
    created_at: seed.created_at ?? "2025-09-01T10:00:00Z",
    last_login_at: seed.last_login_at ?? null,
    enabled,
    login_enabled: loginEnabled,
    status,
    admin,
    permissions,
    merchant_rights_id: `mr-${seed.user_id}`,
    employee_id: seed.employee_id ?? null,
    employee_name: seed.employee_name ?? null,
    planning: seed.planning,
  };

  const rights: MerchantUserRights = { admin, login_enabled: loginEnabled, permissions };

  return { detail, rights };
}

const members: MockMember[] = [
  makeMember({
    user_id: "u-1001",
    first_name: "Walid",
    last_name: "Benali",
    email: "walid@wello.fr",
    tel: "+33 6 12 34 56 78",
    admin: true,
    employee_id: "emp-2001",
    employee_name: "Walid Benali",
    created_at: "2024-12-15T09:00:00Z",
    last_login_at: "2026-05-29T17:42:00Z",
    planning: {
      position_id: "pos-1",
      position: "Manager",
      job_title: "Responsable de salle",
      role: "manager",
      contract_type_code: "CDI",
      contract_start_date: "2024-12-15",
      contract_hours: 39,
      max_weekly_hours: 48,
      required_rest_days: 2,
      sunday_premium: true,
      night_premium: true,
      hourly_rate: 1850, // 18.50 €
      gross_monthly_salary: 285000, // 2 850 €
      employer_charges_pct: 42,
      transport_cost: 7560, // 75.60 €
      hr_comment: "Référent ouverture le matin.",
    },
  }),
  makeMember({
    user_id: "u-1002",
    first_name: "Alex",
    last_name: "Martin",
    email: "alex.martin@wello.fr",
    tel: "+33 6 23 45 67 89",
    permissions: { access_reception: true, access_waiter: true, open_cash_drawer: true },
    employee_id: "emp-2002",
    employee_name: "Alex Martin",
    created_at: "2025-02-10T08:30:00Z",
    last_login_at: "2026-05-30T08:15:00Z",
    planning: {
      position_id: "pos-2",
      position: "Serveur",
      job_title: "Serveur·euse polyvalent",
      role: "employee",
      contract_type_code: "CDI",
      contract_start_date: "2025-02-10",
      probation_end_date: "2025-04-10",
      contract_hours: 35,
      hourly_rate: 1320,
      gross_monthly_salary: 200000,
      employer_charges_pct: 42,
      transport_cost: 4500,
    },
  }),
  makeMember({
    user_id: "u-1003",
    first_name: "Camille",
    last_name: "Dupont",
    email: "camille.dupont@wello.fr",
    tel: "+33 6 34 56 78 90",
    permissions: { access_reception: true, manage_customers: true, view_reports: true },
    employee_id: "emp-2003",
    employee_name: "Camille Dupont",
    created_at: "2025-04-22T11:00:00Z",
    last_login_at: "2026-05-28T19:05:00Z",
    planning: {
      position_id: "pos-1",
      position: "Manager",
      job_title: "Adjointe de direction",
      role: "manager",
      contract_type_code: "CDI",
      contract_start_date: "2025-04-22",
      contract_hours: 39,
      hourly_rate: 1700,
      gross_monthly_salary: 260000,
      employer_charges_pct: 42,
    },
  }),
  makeMember({
    user_id: "u-1004",
    first_name: "Yanis",
    last_name: "Bouvier",
    email: "yanis.bouvier@wello.fr",
    tel: "+33 6 45 67 89 01",
    permissions: { access_reception: true, manage_haccp: true },
    employee_id: "emp-2004",
    employee_name: "Yanis Bouvier",
    created_at: "2025-06-01T07:30:00Z",
    last_login_at: "2026-05-29T22:10:00Z",
    planning: {
      position_id: "pos-3",
      position: "Cuisinier",
      job_title: "Chef de partie",
      role: "employee",
      contract_type_code: "CDI",
      contract_start_date: "2025-06-01",
      contract_hours: 39,
      max_weekly_hours: 48,
      night_premium: true,
      hourly_rate: 1550,
      gross_monthly_salary: 240000,
      employer_charges_pct: 42,
      transport_cost: 3500,
    },
  }),
  makeMember({
    user_id: "u-1005",
    first_name: "Léa",
    last_name: "Rousseau",
    email: "lea.rousseau@wello.fr",
    tel: "+33 6 56 78 90 12",
    loginEnabled: false, // status = login_disabled
    permissions: { access_waiter: true },
    employee_id: "emp-2005",
    employee_name: "Léa Rousseau",
    created_at: "2025-09-15T10:00:00Z",
    last_login_at: "2026-03-12T14:00:00Z",
    planning: {
      position_id: "pos-2",
      position: "Serveur",
      role: "employee",
      contract_type_code: "CDD",
      contract_start_date: "2025-09-15",
      contract_end_date: "2026-09-14",
      contract_hours: 24,
      hourly_rate: 1280,
    },
  }),
  makeMember({
    user_id: "u-1006",
    first_name: "Thomas",
    last_name: "Lefèvre",
    email: "thomas.lefevre@wello.fr",
    tel: "+33 6 67 89 01 23",
    enabled: false, // status = disabled
    loginEnabled: false,
    employee_id: null,
    created_at: "2025-01-20T09:00:00Z",
    last_login_at: "2025-11-04T12:00:00Z",
  }),
  makeMember({
    user_id: "u-1007",
    first_name: "Sarah",
    last_name: "Cohen",
    email: "sarah.cohen@wello.fr",
    tel: "+33 6 78 90 12 34",
    permissions: { access_reception: true, access_delivery: true, open_cash_drawer: true },
    employee_id: null, // exprès : pas de fiche planning
    created_at: "2026-01-08T10:00:00Z",
    last_login_at: "2026-05-30T11:23:00Z",
  }),
  makeMember({
    user_id: "u-1008",
    first_name: "Mehdi",
    last_name: "Ali",
    email: "mehdi.ali@wello.fr",
    tel: "+33 6 89 01 23 45",
    permissions: { access_delivery: true },
    employee_id: "emp-2008",
    employee_name: "Mehdi Ali",
    created_at: "2026-03-02T08:00:00Z",
    last_login_at: null,
    planning: {
      position_id: "pos-5",
      position: "Livreur",
      role: "employee",
      contract_type_code: "EXTRA",
      contract_start_date: "2026-03-02",
      hourly_rate: 1200,
    },
  }),
];

// ─── Linkable users (pas encore liés à ce merchant) ───────────────────────────

const linkableUsers: LinkableUser[] = [
  { user_id: "u-9001", first_name: "Inès", last_name: "Boucher", email: "ines.boucher@example.com", tel: "+33 6 11 22 33 44" },
  { user_id: "u-9002", first_name: "Romain", last_name: "Garcia", email: "romain.garcia@example.com", tel: "+33 6 22 33 44 55" },
  { user_id: "u-9003", first_name: "Nadia", last_name: "Hassan", email: "nadia.hassan@example.com", tel: "+33 6 33 44 55 66" },
];

// ─── Documents ─────────────────────────────────────────────────────────────────

const documents: EmployeeDocument[] = [
  {
    id: "doc-3001",
    merchant_id: MERCHANT_ID,
    employee_id: "emp-2001",
    document_type: "contract",
    name: "Contrat CDI 2024",
    file_url: "https://example.com/mock-files/contrat-cdi-walid.pdf",
    content_type: "application/pdf",
    created_at: "2024-12-15T09:00:00Z",
    updated_at: "2024-12-15T09:00:00Z",
  },
  {
    id: "doc-3002",
    merchant_id: MERCHANT_ID,
    employee_id: "emp-2001",
    document_type: "id",
    name: "Carte d'identité",
    file_url: "https://example.com/mock-files/cni-walid.jpg",
    content_type: "image/jpeg",
    created_at: "2024-12-15T09:30:00Z",
    updated_at: "2024-12-15T09:30:00Z",
  },
  {
    id: "doc-3003",
    merchant_id: MERCHANT_ID,
    employee_id: "emp-2002",
    document_type: "contract",
    name: "Contrat CDI 2025",
    file_url: "https://example.com/mock-files/contrat-alex.pdf",
    content_type: "application/pdf",
    created_at: "2025-02-10T08:30:00Z",
    updated_at: "2025-02-10T08:30:00Z",
  },
  {
    id: "doc-3004",
    merchant_id: MERCHANT_ID,
    employee_id: "emp-2004",
    document_type: "medical",
    name: "Visite médicale 2025-09",
    file_url: "https://example.com/mock-files/visite-yanis.pdf",
    content_type: "application/pdf",
    created_at: "2025-09-20T14:00:00Z",
    updated_at: "2025-09-20T14:00:00Z",
  },
];

// ─── Errors ────────────────────────────────────────────────────────────────────

function notFound(message: string): never {
  throw new Error(message);
}

// ─── Handlers : users ──────────────────────────────────────────────────────────

function listUsers(filters: MerchantUserListFilters = {}): UnwrappedList<MerchantUserListItem> {
  const search = filters.search?.trim().toLowerCase();
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 25;

  let filtered = members.map((m) => m.detail);

  if (search) {
    filtered = filtered.filter(
      (m) =>
        m.first_name.toLowerCase().includes(search) ||
        m.last_name.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search) ||
        m.tel.toLowerCase().includes(search),
    );
  }
  if (filters.active === true) filtered = filtered.filter((m) => m.status === "active");
  if (filters.admin === true) filtered = filtered.filter((m) => m.admin);
  if (filters.linked_employee === true) filtered = filtered.filter((m) => !!m.employee_id);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  const items: MerchantUserListItem[] = slice.map((d) => ({
    user_id: d.user_id,
    first_name: d.first_name,
    last_name: d.last_name,
    email: d.email,
    tel: d.tel,
    created_at: d.created_at ?? "",
    last_login_at: d.last_login_at,
    login_enabled: d.login_enabled,
    enabled: d.enabled,
    status: d.status,
    merchant_rights_id: d.merchant_rights_id ?? "",
    admin: d.admin,
    permissions: d.permissions,
    employee_id: d.employee_id,
    employee_name: d.employee_name,
  }));

  return {
    items,
    pagination: { total_items: total, total_pages: totalPages, current_page: page, limit: pageSize },
  };
}

function getUser(id: string): MerchantUserDetail {
  const m = members.find((x) => x.detail.user_id === id);
  if (!m) notFound(`Mock: user ${id} introuvable`);
  return m!.detail;
}

function getMember(id: string): MerchantUserPlanning {
  const m = members.find((x) => x.detail.user_id === id);
  if (!m) notFound(`Mock: user ${id} introuvable`);
  return m!.detail.planning ?? {};
}

function getRights(id: string): MerchantUserRights {
  const m = members.find((x) => x.detail.user_id === id);
  if (!m) notFound(`Mock: user ${id} introuvable`);
  return m!.rights;
}

function updateRights(id: string, payload: MerchantUserRightsUpsertRequest): MerchantUserRights {
  const m = members.find((x) => x.detail.user_id === id);
  if (!m) notFound(`Mock: user ${id} introuvable`);
  m!.rights = { admin: payload.admin, login_enabled: payload.login_enabled, permissions: { ...payload.permissions } };
  m!.detail.admin = payload.admin;
  m!.detail.login_enabled = payload.login_enabled;
  m!.detail.permissions = { ...payload.permissions };
  m!.detail.status = computeStatus(m!.detail.enabled, payload.login_enabled);
  return m!.rights;
}

function updateMember(id: string, payload: Partial<MerchantUserPlanningUpsertRequest>): MerchantUserDetail {
  const m = members.find((x) => x.detail.user_id === id);
  if (!m) notFound(`Mock: user ${id} introuvable`);
  m!.detail.planning = { ...m!.detail.planning, ...payload };
  return m!.detail;
}

function createUser(payload: CreateUserRequest): CreateUserResponse {
  const userId = nextId("u");
  const newMember = makeMember({
    user_id: userId,
    first_name: payload.first_name,
    last_name: payload.last_name,
    email: payload.email,
    tel: payload.tel ?? "",
    admin: payload.rights?.admin ?? false,
    loginEnabled: payload.rights?.login_enabled ?? true,
    permissions: payload.rights?.permissions as Partial<MerchantUserPermissions> | undefined,
    planning: payload.planning
      ? {
          position_id: payload.planning.position_id ?? null,
          role: payload.planning.role ?? null,
          contract_type_code: payload.planning.contract_type_code ?? null,
        }
      : undefined,
    created_at: nowISO(),
    last_login_at: null,
  });
  if (payload.password) newMember.password = payload.password;
  members.push(newMember);
  return { user_id: userId };
}

function linkableSearch(search: string): LinkableUser[] {
  const q = search.trim().toLowerCase();
  if (q.length < 2) return [];
  return linkableUsers.filter(
    (u) =>
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.tel ?? "").toLowerCase().includes(q),
  );
}

function merchantLink(id: string, payload: MerchantLinkRequest = {}): MerchantUserDetail {
  const linkable = linkableUsers.find((u) => u.user_id === id);
  if (!linkable) notFound(`Mock: user ${id} introuvable parmi les utilisateurs liables`);
  // Remove from linkable pool
  const idx = linkableUsers.findIndex((u) => u.user_id === id);
  if (idx >= 0) linkableUsers.splice(idx, 1);
  const newMember = makeMember({
    user_id: linkable!.user_id,
    first_name: linkable!.first_name,
    last_name: linkable!.last_name,
    email: linkable!.email,
    tel: linkable!.tel ?? "",
    admin: payload.rights?.admin ?? false,
    loginEnabled: payload.rights?.login_enabled ?? true,
    permissions: payload.rights?.permissions as Partial<MerchantUserPermissions> | undefined,
    created_at: nowISO(),
  });
  members.push(newMember);
  return newMember.detail;
}

function deleteMerchantLink(id: string): MerchantUserUnlinkResult {
  const idx = members.findIndex((m) => m.detail.user_id === id);
  if (idx < 0) notFound(`Mock: user ${id} introuvable`);
  const removed = members.splice(idx, 1)[0];
  const employeeLinks = removed.detail.employee_id ? 1 : 0;
  return { unlinked: true, employee_links_cleared: employeeLinks };
}

function forceResetPassword(id: string, newPassword: string): void {
  const m = members.find((x) => x.detail.user_id === id);
  if (!m) notFound(`Mock: user ${id} introuvable`);
  m!.password = newPassword;
}

// ─── Handlers : planning ───────────────────────────────────────────────────────

function listPositions(): EmployeePosition[] {
  return [...positions].sort((a, b) => a.sort_order - b.sort_order);
}

function getPosition(id: string): EmployeePosition {
  const p = positions.find((x) => x.id === id);
  if (!p) notFound(`Mock: poste ${id} introuvable`);
  return { ...p! };
}

function createPosition(payload: EmployeePositionCreateRequest): EmployeePosition {
  const label = (payload.label ?? "").trim();
  if (!label) {
    throw new Error("Le libellé du poste est requis.");
  }
  const color = (payload.color ?? "").trim();
  // Backend contract: color is REQUIRED on creation (no silent default).
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("La couleur du poste est requise (hex #RRGGBB).");
  }
  if (positions.some((p) => p.label.toLowerCase() === label.toLowerCase())) {
    throw new Error(`Un poste "${label}" existe déjà.`);
  }
  const nextOrder = positions.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1;
  const p: EmployeePosition = {
    id: nextId("pos"),
    merchant_id: MERCHANT_ID,
    label,
    color,
    sort_order: payload.sort_order ?? nextOrder,
    active: payload.active ?? true,
    employee_count: 0,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
  positions.push(p);
  return { ...p };
}

function updatePosition(id: string, payload: EmployeePositionUpdateRequest): EmployeePosition {
  const p = positions.find((x) => x.id === id);
  if (!p) notFound(`Mock: poste ${id} introuvable`);
  if (payload.label !== undefined) {
    const lbl = payload.label.trim();
    if (!lbl) throw new Error("Le libellé du poste est requis.");
    if (positions.some((x) => x.id !== id && x.label.toLowerCase() === lbl.toLowerCase())) {
      throw new Error(`Un poste "${lbl}" existe déjà.`);
    }
    p!.label = lbl;
  }
  if (payload.sort_order !== undefined) p!.sort_order = payload.sort_order;
  if (payload.active !== undefined) p!.active = payload.active;
  if (payload.color !== undefined) {
    const color = payload.color.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error("Couleur invalide (attendu hex #RRGGBB).");
    }
    p!.color = color;
  }
  p!.updated_at = nowISO();
  return { ...p! };
}

function deletePosition(id: string): void {
  const idx = positions.findIndex((p) => p.id === id);
  if (idx < 0) notFound(`Mock: poste ${id} introuvable`);
  const p = positions[idx];
  if (p.employee_count > 0) {
    // Mirrors the real API which refuses the deletion when the position is still
    // referenced by at least one employee.
    throw new Error(
      `Impossible de supprimer le poste "${p.label}" : ${p.employee_count} membre${
        p.employee_count > 1 ? "s" : ""
      } y ${p.employee_count > 1 ? "sont" : "est"} encore rattaché${p.employee_count > 1 ? "s" : ""}.`,
    );
  }
  positions.splice(idx, 1);
}

function listContractTypes(): SystemRef[] {
  return [...contractTypes];
}

function createEmployee(payload: EmployeeCreateRequest): Employee {
  const id = nextId("emp");
  const employee: Employee = {
    id,
    merchant_id: MERCHANT_ID,
    user_id: payload.user_id ?? null,
    first_name: payload.first_name,
    last_name: payload.last_name,
    position_id: payload.position_id ?? null,
    position: positions.find((p) => p.id === payload.position_id)?.label ?? null,
    position_note: payload.position_note ?? null,
    job_title: payload.job_title ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    role: payload.role ?? null,
    contract_type_code: payload.contract_type_code ?? null,
    contract_start_date: payload.contract_start_date ?? null,
    contract_end_date: payload.contract_end_date ?? null,
    probation_end_date: payload.probation_end_date ?? null,
    last_medical_checkup_date: payload.last_medical_checkup_date ?? null,
    contract_hours: payload.contract_hours ?? null,
    max_weekly_hours: payload.max_weekly_hours ?? null,
    required_rest_days: payload.required_rest_days ?? null,
    sunday_premium: payload.sunday_premium ?? false,
    night_premium: payload.night_premium ?? false,
    hourly_rate: payload.hourly_rate ?? null,
    gross_monthly_salary: payload.gross_monthly_salary ?? null,
    employer_charges_pct: payload.employer_charges_pct ?? null,
    transport_cost: payload.transport_cost ?? null,
    hr_comment: payload.hr_comment ?? null,
    birth_date: payload.birth_date ?? null,
    gender: payload.gender ?? null,
    nationality: payload.nationality ?? null,
    address: payload.address ?? null,
    active: payload.active ?? true,
    created_at: nowISO(),
    updated_at: nowISO(),
    deleted_at: null,
  };

  // If linked to a user, attach the employee to the member
  if (payload.user_id) {
    const member = members.find((m) => m.detail.user_id === payload.user_id);
    if (member) {
      member.detail.employee_id = id;
      member.detail.employee_name = `${payload.first_name} ${payload.last_name}`;
    }
  }

  return employee;
}

// ─── Handlers : documents ─────────────────────────────────────────────────────

function listDocuments(employeeId: string): EmployeeDocument[] {
  return documents.filter((d) => d.employee_id === employeeId);
}

function uploadDocument(formData: FormData): EmployeeDocumentUploadResponse {
  const file = formData.get("file") as File | null;
  const fileName = file?.name ?? "mock-file";
  const contentType = file?.type ?? "application/octet-stream";
  const fileKey = nextId("key");
  return {
    file_key: fileKey,
    file_url: `https://example.com/mock-uploads/${fileKey}/${encodeURIComponent(fileName)}`,
    content_type: contentType,
    file_name: fileName,
  };
}

function createDocument(employeeId: string, payload: EmployeeDocumentCreateRequest): EmployeeDocument {
  const doc: EmployeeDocument = {
    id: nextId("doc"),
    merchant_id: MERCHANT_ID,
    employee_id: employeeId,
    document_type: payload.document_type,
    name: payload.name,
    file_url: `https://example.com/mock-uploads/${payload.file_key}/${encodeURIComponent(payload.name)}`,
    content_type: payload.content_type,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
  documents.push(doc);
  return doc;
}

function downloadDocument(employeeId: string, documentId: string): string {
  const doc = documents.find((d) => d.id === documentId && d.employee_id === employeeId);
  if (!doc) notFound(`Mock: document ${documentId} introuvable`);
  return doc!.file_url;
}

function deleteDocument(employeeId: string, documentId: string): void {
  const idx = documents.findIndex((d) => d.id === documentId && d.employee_id === employeeId);
  if (idx < 0) notFound(`Mock: document ${documentId} introuvable`);
  documents.splice(idx, 1);
}

// ─── Export ────────────────────────────────────────────────────────────────────

export const teamMocks = {
  // users
  listUsers,
  getUser,
  getMember,
  getRights,
  updateRights,
  updateMember,
  createUser,
  linkableSearch,
  merchantLink,
  deleteMerchantLink,
  forceResetPassword,
  // planning refs
  listPositions,
  getPosition,
  createPosition,
  updatePosition,
  deletePosition,
  listContractTypes,
  createEmployee,
  // documents
  listDocuments,
  uploadDocument,
  createDocument,
  downloadDocument,
  deleteDocument,
};
