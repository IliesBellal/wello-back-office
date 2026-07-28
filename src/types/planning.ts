/**
 * DTO types for the planning module.
 *
 * Fields mirror EXACTLY the contracts described in:
 * - docs/api/PLANNING_AND_USERS_INTEGRATION_GUIDE.md
 *
 * Money amounts (hourly_rate, gross_monthly_salary, transport_cost) are expressed
 * in cents. Use the helpers in @/lib/money to convert for display.
 */

// ============= Référentiels =============

/** Generic system reference item used by contract-types / attendance-sources / event-types. */
export interface SystemRef {
  code: string;
  label: string;
}

/** `attendance_source` controls whether manual time entries are allowed. */
export type AttendanceSource = "pointage" | "planning";

/** Shift swap approval mode (planning settings). */
export type ShiftSwapApprovalMode = "manager_required" | "target_employee_required";

/** Notification mode used when publishing a planning week. */
export type PlanningPublishNotificationMode = "all" | "changes_only" | "none";

// ============= Planning settings =============

/** `GET /planning/settings` -> `data.settings`. */
export interface PlanningSettings {
  id: string;
  merchant_id: string;
  labor_country_code: string;
  min_daily_rest_hours: number;
  min_break_minutes: number;
  night_shift_start: string;
  night_shift_end: string;
  night_shift_multiplier: number;
  holiday_multiplier: number;
  allow_override_warnings: boolean;
  attendance_source: AttendanceSource;
  shift_swap_approval_mode: ShiftSwapApprovalMode;
  planning_sms_notifications_enabled?: boolean;
  planning_sms_notifications_enabled_description?: string | null;
  created_at: string;
  updated_at: string;
}

/** Body of `PUT /planning/settings`. All fields optional / patch-like. */
export interface PlanningSettingsUpdateRequest {
  labor_country_code?: string;
  min_daily_rest_hours?: number;
  min_break_minutes?: number;
  night_shift_start?: string;
  night_shift_end?: string;
  night_shift_multiplier?: number;
  holiday_multiplier?: number;
  allow_override_warnings?: boolean;
  attendance_source?: AttendanceSource;
  shift_swap_approval_mode?: ShiftSwapApprovalMode;
  planning_sms_notifications_enabled?: boolean;
}

// ============= Positions =============

/** `GET /planning/positions` -> `data.positions[]`.
 *
 * Le champ `color` est un hex (ex `"#3b82f6"`) — utilisé pour colorer
 * les badges de poste ET les `ShiftCard` de la grille de planning.
 *
 * ⚠️ Côté backend : la table `positions` doit avoir une colonne `color`
 * NOT NULL (hex 7 chars). Ce champ est OBLIGATOIRE à la création.
 */
export interface EmployeePosition {
  id: string;
  merchant_id: string;
  label: string;
  /** Hex couleur du poste (ex "#3b82f6"). Toujours présent. */
  color: string;
  sort_order: number;
  active: boolean;
  employee_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeePositionCreateRequest {
  label: string;
  /** Hex couleur du poste (ex "#3b82f6"). **Obligatoire** : pas de défaut silencieux. */
  color: string;
  sort_order?: number;
  active?: boolean;
}

export interface EmployeePositionUpdateRequest {
  label?: string;
  /** Hex couleur du poste (ex "#3b82f6"). */
  color?: string;
  sort_order?: number;
  active?: boolean;
}

// ============= Employees =============

/** `GET /planning/employees` -> `data.employees[]` / `data.employee`. */
export interface Employee {
  id: string;
  merchant_id: string;
  user_id?: string | null;
  first_name: string;
  last_name: string;
  position_id?: string | null;
  position?: string | null;
  position_note?: string | null;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  contract_type_code?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  probation_end_date?: string | null;
  last_medical_checkup_date?: string | null;
  contract_hours?: number | null;
  max_weekly_hours?: number | null;
  required_rest_days?: number | null;
  sunday_premium?: number | null;
  night_premium?: number | null;
  hourly_rate?: number | null;
  gross_monthly_salary?: number | null;
  employer_charges_pct?: number | null;
  transport_cost?: number | null;
  hr_comment?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  nationality?: string | null;
  address?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface EmployeeCreateRequest {
  user_id?: string | null;
  first_name: string;
  last_name: string;
  position_id?: string | null;
  position_note?: string | null;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  contract_type_code?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  probation_end_date?: string | null;
  last_medical_checkup_date?: string | null;
  contract_hours?: number | null;
  max_weekly_hours?: number | null;
  required_rest_days?: number | null;
  sunday_premium?: number | null;
  night_premium?: number | null;
  hourly_rate?: number | null;
  gross_monthly_salary?: number | null;
  employer_charges_pct?: number | null;
  transport_cost?: number | null;
  hr_comment?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  nationality?: string | null;
  address?: string | null;
  active?: boolean;
}

export type EmployeeUpdateRequest = Partial<EmployeeCreateRequest>;

/** Query params accepted by `GET /planning/employees`. */
export interface EmployeeListFilters {
  search?: string;
  active?: boolean;
  position_id?: string;
  contract?: string;
  user_id?: string;
  unlinked?: boolean;
  page?: number;
  page_size?: number;
}

/** Body of `POST /planning/employees/{id}/user-link`. */
export interface EmployeeUserLinkRequest {
  user_id: string;
}

// ============= Documents =============

export type EmployeeDocumentType = "contract" | "id" | "medical" | "other";

/** `data.document` / `data.documents[]`. */
export interface EmployeeDocument {
  id: string;
  merchant_id: string;
  employee_id: string;
  document_type: EmployeeDocumentType;
  name: string;
  file_url: string;
  content_type: string;
  created_at: string;
  updated_at: string;
}

/** Response of `POST /planning/uploads/employee-documents`. */
export interface EmployeeDocumentUploadResponse {
  file_key: string;
  file_url: string;
  content_type: string;
  file_name: string;
}

/** Body of `POST /planning/employees/{id}/documents`. */
export interface EmployeeDocumentCreateRequest {
  document_type: EmployeeDocumentType;
  name: string;
  file_key: string;
  content_type: string;
}

/** Response of the download endpoint (signed URL). */
export interface EmployeeDocumentDownload {
  file_url: string;
}

// ============= Weeks & shifts =============

/** `GET /planning/weeks` -> `data.weeks[]` / `data.week`. */
export interface PlanningWeek {
  id: string;
  merchant_id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
  published_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanningWeekCreateRequest {
  label: string;
  start_date: string;
  end_date: string;
  status?: string;
  notes?: string | null;
}

export type PlanningWeekUpdateRequest = Partial<PlanningWeekCreateRequest>;

/** `data.shifts[]` / `data.shift`. */
export interface PlanningShift {
  id: string;
  merchant_id: string;
  week_id: string;
  /**
   * Employee assignment.
   * - `string` : shift assigned to a member.
   * - `null`   : "unassigned" — represents a need to be filled, not a person.
   *   Unassigned shifts skip the per-employee overlap check (no person to clash with)
   *   and are excluded from payroll & headcount aggregations.
   */
  employee_id: string | null;
  title?: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  position_id?: string | null;
  position?: string | null;
  location?: string | null;
  notes?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PlanningShiftCreateRequest {
  /** `null` = create an unassigned shift. */
  employee_id: string | null;
  title?: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  position_id?: string | null;
  position?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: string;
}

export type PlanningShiftUpdateRequest = Partial<PlanningShiftCreateRequest>;

// ============= Week templates =============
//
// Modèles de SEMAINE (à ne pas confondre avec `ShiftTemplate` qui désigne un
// créneau unitaire — voir `src/types/shiftTemplate.ts`).
//
// ⚠️ Ces types sont la **source de vérité** du futur endpoint backend.
// Le service correspondant (`src/services/weekTemplateService.ts`) est
// aujourd'hui un mock en mémoire dont la forme JSON reproduit fidèlement ce
// que l'API devra retourner. Toute évolution se fait ICI d'abord.
//
// Futurs endpoints (à implémenter côté backend) :
//
//   GET    /planning/week-templates                 → data.week_templates: WeekTemplate[]      (SANS shifts, juste `shift_count`)
//   POST   /planning/week-templates                 → data.week_template: WeekTemplate
//                                                     + data.week_template_shifts: WeekTemplateShift[]
//   GET    /planning/week-templates/{id}            → data.week_template: WeekTemplate
//                                                     + data.week_template_shifts: WeekTemplateShift[]
//   PATCH  /planning/week-templates/{id}            → data.week_template: WeekTemplate
//   DELETE /planning/week-templates/{id}            → suppression LOGIQUE (active=false)
//   POST   /planning/week-templates/from-week       → crée un template À PARTIR d'une PlanningWeek existante.
//                                                     Payload : { week_id, label, notes? }.
//                                                     Copie tous les shifts de la semaine en `WeekTemplateShift` en
//                                                     CONSERVANT `employee_id` ET `position_id` (assignation nominative
//                                                     préservée — c'est l'intérêt de cette opération).
//                                                     Mappage `shift_date → day_of_week` (0 = dimanche, cf.
//                                                     `docs/api/PLANNING_AND_USERS_INTEGRATION_GUIDE.md`).
//                                                     Retourne `{ week_template, week_template_shifts[] }`.
//
// Enveloppe Wello habituelle : `{ id, data: { status: "success", ... } }`.
//
// Nommage : la collection imbriquée s'appelle **`week_template_shifts`** —
// NE PAS réutiliser `shift_templates` qui désigne les modèles de SHIFT unitaires.

/** Modèle de SEMAINE. Méta seule — les shifts vivent dans `WeekTemplateShift[]`. */
export interface WeekTemplate {
  id: string;
  merchant_id: string;
  label: string;
  notes: string | null;
  active: boolean;
  /** Nombre de shifts du modèle. Dérivé côté backend, **lecture seule**. */
  shift_count: number;
  created_at: string;
  updated_at: string;
}

/** Shift d'un modèle de semaine.
 *
 * Conventions :
 * - `day_of_week`   : entier `0..6` ; `0 = dimanche` (cf. `DAY_OF_WEEK_CONVENTION`).
 *                     **Ne pas dévier** — c'est le standard du module Planning.
 * - `employee_id`   : `null` ⇒ besoin à pourvoir (non assigné) ;
 *                     `string` ⇒ assignation nominative préservée (cf. `createFromWeek`).
 * - `position_id`   : nullable, cohérent avec `PlanningShift` ; pas de label en doublon.
 * - `start_time` / `end_time` : "HH:MM" 24h, locale établissement (pas d'ISO/TZ).
 * - `break_minutes` : entier ≥ 0.
 */
export interface WeekTemplateShift {
  id: string;
  day_of_week: number;
  employee_id: string | null;
  position_id: string | null;
  title: string | null;
  start_time: string;
  end_time: string;
  break_minutes: number;
  location: string | null;
  notes: string | null;
}

/** `WeekTemplateShift` sans `id` (généré backend à la création/PATCH). */
export type WeekTemplateShiftInput = Omit<WeekTemplateShift, "id">;

/** POST `/planning/week-templates`. */
export interface WeekTemplateCreateRequest {
  label: string;
  notes?: string | null;
  active?: boolean;
  shifts: WeekTemplateShiftInput[];
}

/** PATCH `/planning/week-templates/{id}` — tous les champs sont optionnels.
 *
 * Si `shifts` est fourni, il REMPLACE intégralement la collection existante
 * (réécriture complète — il n'y a pas de PATCH ligne à ligne pour les shifts
 * d'un template ; c'est intentionnel, ça simplifie côté front + backend).
 */
export interface WeekTemplateUpdateRequest {
  label?: string;
  notes?: string | null;
  active?: boolean;
  shifts?: WeekTemplateShiftInput[];
}

/** POST `/planning/week-templates/from-week`. */
export interface WeekTemplateFromWeekRequest {
  week_id: string;
  label: string;
  notes?: string | null;
}

// ============= Week template — instantiation =================================
//
// Application d'un `WeekTemplate` à une ou plusieurs **semaines réelles**.
// Inspiration directe : Skello (3 modes de conflit, fenêtre de résolution
// affichée seulement s'il y a des conflits, application multi-semaines).
//
// ⚠️ Comme le reste du module, le service mock fait office de SPÉCIFICATION
// pour le backend (cf. `src/services/weekTemplateService.ts`,
// `src/lib/weekTemplateProjection.ts` pour la logique pure et
// `docs/api/WEEK_TEMPLATE_INSTANTIATION_API_CONTRACT.md` pour le contrat figé).
//
// Endpoints visés (à reproduire à l'identique côté backend) :
//
//   POST /planning/week-templates/{id}/preview
//        payload : { target_week_starts: string[] }                            // ISO "YYYY-MM-DD" (lundi de chaque semaine cible)
//        retour  : data.preview : InstantiationPreview                          // DRY-RUN — ne crée rien
//
//   POST /planning/week-templates/{id}/instantiate
//        payload : { target_week_starts: string[]; conflict_mode: ConflictMode }
//        retour  : data.result : InstantiationResult
//
// Sémantique des 3 modes (APPLIQUÉS UNIQUEMENT AUX OVERLAPS, pas à on_leave/contract_ended) :
//
//   - "keep_existing"          : le shift du template en conflit est IGNORÉ
//                                (compté en `skipped`). Le shift existant reste intact.
//   - "replace"                : le shift existant en conflit est SUPPRIMÉ et
//                                remplacé par celui du template (compté en `replaced`).
//                                Les shifts existants HORS conflit restent intacts.
//   - "template_to_unassigned" : le shift du template est créé en NON ASSIGNÉ
//                                (employee_id=null). Le shift existant reste intact.
//
// Filets de sécurité (TOUJOURS appliqués, quel que soit `conflict_mode`) :
//
//   - on_leave        : l'employé a un congé APPROUVÉ couvrant la date du shift.
//                       → shift créé en NON ASSIGNÉ (un congé n'est PAS un simple
//                         conflit de shift — on ne propose pas de "remplacer le congé").
//   - contract_ended  : `contract_end_date` de l'employé < date du shift.
//                       → shift créé en NON ASSIGNÉ.
//
// Idempotence raisonnable : si un shift strictement identique existe déjà
// (même employé, même date, mêmes horaires, même `position_id`), il est
// compté en `skipped` (pas de doublon).

/** Mode d'arbitrage des CONFLITS OVERLAP lors de l'instanciation. */
export type ConflictMode = "keep_existing" | "replace" | "template_to_unassigned";

/** Raisons pour lesquelles un shift de template entre en conflit. */
export type ConflictReason = "overlap" | "on_leave" | "contract_ended";

/** Résumé d'un shift de template — utilisé dans les conflits (pas de payload complet). */
export interface InstantiationShiftRef {
  day_of_week: number;
  start_time: string;
  end_time: string;
  position_id: string | null;
}

/** Un conflit détecté lors de la PREVIEW. Identifie le shift template + la cause. */
export interface InstantiationConflict {
  /** ISO du lundi de la semaine cible où le conflit a lieu. */
  target_week_start: string;
  /** Date ISO réelle calculée du shift cible. */
  day: string;
  /** Référence vers le shift du template. */
  template_shift: InstantiationShiftRef;
  /** Id du shift existant en conflit (null pour `on_leave` / `contract_ended`). */
  existing_shift_id: string | null;
  /** Employé concerné (null impossible : les shifts non-nominatifs n'entrent jamais en conflit). */
  employee_id: string;
  /** Pré-calculé pour l'affichage (réduit les jointures côté UI). */
  employee_name: string;
  reason: ConflictReason;
}

/** DRY-RUN. Résultat de `POST /planning/week-templates/{id}/preview`. */
export interface InstantiationPreview {
  /** Echo de la requête, normalisé (lundis triés, dédoublonnés). */
  target_week_starts: string[];
  /** Nombre de shifts qui seront créés sans heurt (assignés + non-assignés "besoin"). */
  to_create_count: number;
  /** Conflits détaillés (overlap + filets de sécurité). */
  conflicts: InstantiationConflict[];
  /** Nb d'employés DISTINCTS impactés (utile : 30 conflits / 1 employé ⇒ absence probable). */
  impacted_employee_count: number;
  /** Nb de shifts nominatifs qui seront FORCÉS en non-assigné (`on_leave` ∪ `contract_ended`).
   *  Indépendant de `conflict_mode` — ces deux raisons l'emportent toujours. */
  auto_unassigned_count: number;
  /** Nb de shifts ignorés pour idempotence (déjà existants à l'identique). */
  idempotent_skipped_count: number;
}

/** Résultat per-week renvoyé par l'instanciation. */
export interface InstantiationPerWeekResult {
  target_week_start: string;
  /** Id de la semaine réelle utilisée (créée si absente côté backend). */
  week_id: string;
  created_count: number;
  assigned_count: number;
  unassigned_count: number;
  replaced_count: number;
  skipped_count: number;
}

/** Résultat de `POST /planning/week-templates/{id}/instantiate`. */
export interface InstantiationResult {
  created_count: number;
  assigned_count: number;
  unassigned_count: number;
  replaced_count: number;
  skipped_count: number;
  per_week: InstantiationPerWeekResult[];
}

/** Payload de `POST /planning/week-templates/{id}/preview`. */
export interface InstantiationPreviewRequest {
  target_week_starts: string[];
}

/** Payload de `POST /planning/week-templates/{id}/instantiate`. */
export interface InstantiationRequest {
  target_week_starts: string[];
  conflict_mode: ConflictMode;
}

// ============= Time entries =============

/** `data.time_entries[]` / `data.time_entry`. */
export interface PlanningTimeEntry {
  id: string;
  merchant_id: string;
  employee_id: string;
  shift_id?: string | null;
  attendance_source: AttendanceSource;
  clock_in_at: string;
  clock_out_at?: string | null;
  clock_in_note?: string | null;
  clock_out_note?: string | null;
  /**
   * Traçabilité des corrections manager (obligation légale FR).
   * Renseignés par le serveur lors d'un PATCH/POST manuel — `modified_by`
   * doit contenir l'email/identifiant du manager (extrait du token), et
   * `modification_reason` le motif obligatoire fourni à l'UI.
   * Front-only TODO §gaps : exposer un historique complet côté backend.
   */
  modified_by?: string | null;
  modified_at?: string | null;
  modification_reason?: string | null;
  created_at: string;
  updated_at: string;
}

/** Body of `POST /planning/employees/{id}/time-entries/start`. */
export interface PlanningTimeEntryStartRequest {
  shift_id?: string | null;
  clock_in_at?: string | null;
  clock_in_note?: string | null;
}

/** Body of `POST /planning/employees/{id}/time-entries/stop`. */
export interface PlanningTimeEntryStopRequest {
  entry_id: string;
  clock_out_at?: string | null;
  clock_out_note?: string | null;
}

/**
 * Body de `PATCH /planning/employees/{id}/time-entries/{entry_id}` —
 * correction manuelle par un manager. `modification_reason` est obligatoire.
 * Endpoint à confirmer côté backend (cf. docs/personnel-backend-gaps.md).
 */
export interface PlanningTimeEntryUpdateRequest {
  clock_in_at?: string | null;
  clock_out_at?: string | null;
  clock_in_note?: string | null;
  clock_out_note?: string | null;
  shift_id?: string | null;
  modification_reason: string;
}

/**
 * Body de `POST /planning/employees/{id}/time-entries` — création
 * manuelle complète (cas "l'employé a oublié de pointer").
 * Endpoint à confirmer côté backend.
 */
export interface PlanningTimeEntryCreateRequest {
  clock_in_at: string;
  clock_out_at: string;
  clock_in_note?: string | null;
  clock_out_note?: string | null;
  shift_id?: string | null;
  modification_reason: string;
}

// ============= Leave requests =============

export type LeaveType = "paid" | "unpaid" | "sick" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

/** `data.leave_requests[]` / `data.leave_request`. */
export interface PlanningLeaveRequest {
  id: string;
  merchant_id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  status: LeaveStatus;
  reason?: string | null;
  manager_note?: string | null;
  requested_by_user_id?: string | null;
  processed_by_user_id?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Body of `POST /planning/leave-requests`. `employee_id` may be the value `me`. */
export interface PlanningLeaveRequestCreateRequest {
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

/** Body of `PATCH /planning/leave-requests/{id}` (modify / approve / reject). */
export interface PlanningLeaveRequestUpdateRequest {
  leave_type?: LeaveType;
  start_date?: string;
  end_date?: string;
  status?: LeaveStatus;
  reason?: string | null;
  manager_note?: string | null;
}

/** Query params for `GET /planning/leave-requests`. `employee_id` may be `me`. */
export interface PlanningLeaveRequestFilters {
  employee_id?: string;
  status?: LeaveStatus;
  leave_type?: LeaveType;
  page?: number;
  page_size?: number;
}

// ============= Shift swap requests =============

export type ShiftSwapStatus = "pending" | "approved" | "rejected" | "cancelled";

/** `data.shift_swap_requests[]` / `data.shift_swap_request`. */
export interface PlanningShiftSwapRequest {
  id: string;
  merchant_id: string;
  requester_employee_id: string;
  requester_shift_id: string;
  target_employee_id: string;
  target_shift_id: string;
  status: ShiftSwapStatus;
  reason?: string | null;
  manager_note?: string | null;
  requested_by_user_id?: string | null;
  processed_by_user_id?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Body of `POST /planning/shift-swap-requests`. Employee ids may be `me`. */
export interface PlanningShiftSwapRequestCreateRequest {
  requester_employee_id: string;
  requester_shift_id: string;
  target_employee_id: string;
  target_shift_id: string;
  reason?: string | null;
}

/** Body of `PATCH /planning/shift-swap-requests/{id}` (modify / approve / reject). */
export interface PlanningShiftSwapRequestUpdateRequest {
  status?: ShiftSwapStatus;
  reason?: string | null;
  manager_note?: string | null;
}

/** Query params for `GET /planning/shift-swap-requests`. Employee ids may be `me`. */
export interface PlanningShiftSwapRequestFilters {
  requester_employee_id?: string;
  target_employee_id?: string;
  status?: ShiftSwapStatus;
  page?: number;
  page_size?: number;
}

// ============= POS Holidays (rendu en fond de colonne planning) =============

/**
 * `GET /pos/settings/holidays` -> `data.holidays[]`.
 *
 * Note : ces routes vivent côté POS (`/pos/settings/holidays`) mais sont
 * consommées par le planning pour griser les colonnes des jours fériés
 * et appliquer la majoration appropriée.
 */
export interface PlanningHoliday {
  /** ISO `YYYY-MM-DD` (sert d'identifiant naturel). */
  date: string;
  /** Local label (e.g. "1er mai"). */
  label: string;
  /** Optional region scope (FR, FR-A, etc.). */
  region?: string | null;
  /** Whether the merchant has disabled this holiday via override. */
  disabled?: boolean;
  /**
   * Per-holiday multiplier override. When `null`/missing, the merchant uses the
   * global `planning_settings.holiday_multiplier`.
   */
  holiday_multiplier?: number | null;
  /** True when the merchant has saved an override on this holiday. */
  is_overridden?: boolean;
}

/**
 * `PATCH /pos/settings/holidays/{date}` body.
 * Both fields are optional so the UI can toggle only one aspect.
 */
export interface PlanningHolidayOverridePatchRequest {
  disabled?: boolean;
  holiday_multiplier?: number | null;
}
