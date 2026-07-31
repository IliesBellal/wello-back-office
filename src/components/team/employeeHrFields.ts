/**
 * Shared HR/contract field set for the "employees" table — used both by the
 * Contract tab (editing an already-linked employee) and by the employee
 * creation dialog (creating a new one, linked or not). Keeping this in one
 * place ensures both surfaces validate and convert the same fields the same way.
 */

import { toCents, toEuros } from "@/lib/money";

export const SENTINEL_NONE = "__none__";

export interface EmployeeHrForm {
  position_id: string;
  job_title: string;
  role: string;
  contract_type_code: string;

  contract_start_date: string;
  contract_end_date: string;
  probation_end_date: string;
  last_medical_checkup_date: string;

  contract_hours: string;
  max_weekly_hours: string;
  required_rest_days: string;
  /** Éligibilité de l'employé à la majoration dimanche (taux réglé dans les paramètres planning). */
  sunday_premium: boolean;
  /** Éligibilité de l'employé à la majoration nuit (taux réglé dans les paramètres planning). */
  night_premium: boolean;
  employer_charges_pct: string;

  // Money fields (entered as € strings)
  hourly_rate_eur: string;
  gross_monthly_salary_eur: string;
  transport_cost_eur: string;

  hr_comment: string;
}

export const EMPTY_HR_FORM: EmployeeHrForm = {
  position_id: "",
  job_title: "",
  role: "",
  contract_type_code: "",
  contract_start_date: "",
  contract_end_date: "",
  probation_end_date: "",
  last_medical_checkup_date: "",
  contract_hours: "",
  max_weekly_hours: "",
  required_rest_days: "",
  sunday_premium: false,
  night_premium: false,
  employer_charges_pct: "",
  hourly_rate_eur: "",
  gross_monthly_salary_eur: "",
  transport_cost_eur: "",
  hr_comment: "",
};

/** Convert a possibly-null cents value to a euros string for an input field. */
export function centsToEuroInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return toEuros(cents).toString();
}

/** Convert a number-like value to a string for a number input. */
export function numToInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toString();
}

/** Convert a number-input string to number|null (empty → null). */
export function strToNumOrNull(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

export function strToEuroCentsOrNull(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : toCents(n);
}

export function emptyToNull(s: string): string | null {
  return s === "" ? null : s;
}

export function validateEmployeeHrForm(form: EmployeeHrForm): string[] {
  const errors: string[] = [];

  if (!form.contract_type_code.trim()) {
    errors.push("Type de contrat : obligatoire.");
  }

  if (!form.position_id.trim()) {
    errors.push("Poste planning : obligatoire.");
  }

  // Date relations
  if (form.contract_start_date && form.contract_end_date) {
    if (form.contract_end_date < form.contract_start_date) {
      errors.push("La date de fin de contrat doit être postérieure ou égale au début.");
    }
  }
  if (form.contract_start_date && form.probation_end_date) {
    if (form.probation_end_date < form.contract_start_date) {
      errors.push("La fin de période d'essai doit être postérieure ou égale au début du contrat.");
    }
  }

  // Negative numbers
  const numericFields: Array<{ key: keyof EmployeeHrForm; label: string }> = [
    { key: "contract_hours", label: "Heures contractuelles" },
    { key: "max_weekly_hours", label: "Heures hebdo max" },
    { key: "required_rest_days", label: "Jours de repos requis" },
    { key: "employer_charges_pct", label: "Charges patronales (%)" },
    { key: "hourly_rate_eur", label: "Taux horaire" },
    { key: "gross_monthly_salary_eur", label: "Salaire brut mensuel" },
    { key: "transport_cost_eur", label: "Indemnité transport" },
  ];
  for (const { key, label } of numericFields) {
    const raw = form[key];
    if (raw === "" || raw === undefined) continue;
    const n = Number(raw);
    if (Number.isNaN(n)) {
      errors.push(`${label} : valeur invalide.`);
    } else if (n < 0) {
      errors.push(`${label} : la valeur ne peut pas être négative.`);
    }
  }

  return errors;
}

/** The HR/contract fields shared verbatim by `MerchantUserPlanningUpsertRequest` and `EmployeeCreateRequest`/`EmployeeUpdateRequest`. */
export interface EmployeeHrPatch {
  position_id: string | null;
  job_title: string | null;
  role: string | null;
  contract_type_code: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  probation_end_date: string | null;
  last_medical_checkup_date: string | null;
  contract_hours: number | null;
  max_weekly_hours: number | null;
  required_rest_days: number | null;
  sunday_premium: boolean;
  night_premium: boolean;
  employer_charges_pct: number | null;
  hourly_rate: number | null;
  gross_monthly_salary: number | null;
  transport_cost: number | null;
  hr_comment: string | null;
}

export function hrFormToPatch(form: EmployeeHrForm): EmployeeHrPatch {
  return {
    position_id: emptyToNull(form.position_id),
    job_title: emptyToNull(form.job_title.trim()),
    role: emptyToNull(form.role),
    contract_type_code: emptyToNull(form.contract_type_code),
    contract_start_date: emptyToNull(form.contract_start_date),
    contract_end_date: emptyToNull(form.contract_end_date),
    probation_end_date: emptyToNull(form.probation_end_date),
    last_medical_checkup_date: emptyToNull(form.last_medical_checkup_date),
    contract_hours: strToNumOrNull(form.contract_hours),
    max_weekly_hours: strToNumOrNull(form.max_weekly_hours),
    required_rest_days: strToNumOrNull(form.required_rest_days),
    sunday_premium: form.sunday_premium,
    night_premium: form.night_premium,
    employer_charges_pct: strToNumOrNull(form.employer_charges_pct),
    hourly_rate: strToEuroCentsOrNull(form.hourly_rate_eur),
    gross_monthly_salary: strToEuroCentsOrNull(form.gross_monthly_salary_eur),
    transport_cost: strToEuroCentsOrNull(form.transport_cost_eur),
    hr_comment: emptyToNull(form.hr_comment.trim()),
  };
}
