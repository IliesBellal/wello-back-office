import { apiClient, type WelloApiResponse } from "@/services/apiClient";
import { getStoredAuthToken } from "@/types/auth";

// Compte client : avance et ardoise (ib-welloresto-api docs/customer-accounts.md).
// Un solde par client, signé : > 0 avance versée, < 0 ardoise. Les versements
// et remboursements se font en caisse (registre ouvert) ; le back-office
// consulte les comptes et règle le plafond d'ardoise.

export interface CustomerAccountSummary {
  customer_id: number;
  first_name: string;
  last_name: string;
  business_name: string;
  phone: string;
  /** Centimes : > 0 avance, < 0 ardoise. */
  balance: number;
  /** Secondes Unix. */
  last_movement: number;
}

export type CustomerAccountOperationType = "DEPOSIT" | "REFUND" | "WRITE_OFF";

export interface CustomerAccountOperation {
  operation_id: number;
  operation_type: CustomerAccountOperationType;
  amount: number;
  mop: string | null;
  comment: string | null;
  user_name?: string;
  operation_date: number;
}

export interface CustomerAccountPayment {
  payment_id: number;
  order_id: number;
  order_num: string;
  amount: number;
  payment_date: number;
  receipt_number?: string;
}

export interface CustomerAccountCustomerSettings {
  /** Plafond propre au client (centimes) ; null = celui de l'établissement. */
  credit_limit: number | null;
  /** Ardoise interdite (son avance reste utilisable). */
  credit_blocked: boolean;
  /** Aucune relance automatique pour ce client (la relance manuelle reste possible). */
  reminders_disabled: boolean;
}

export interface CustomerAccountReminder {
  sent_at: number;
  source: "AUTO" | "MANUAL";
  channels: string;
  balance: number;
}

export interface CustomerAccountEntry {
  kind: "operation" | "payment";
  date: number;
  /** Effet sur le solde, en centimes. */
  delta: number;
  balance_after: number;
  operation?: CustomerAccountOperation;
  payment?: CustomerAccountPayment;
}

export interface CustomerAccount {
  customer_id: number;
  balance: number;
  /** Plafond effectif du client. */
  credit_limit: number;
  available: number;
  entries: CustomerAccountEntry[];
  merchant_credit_limit: number;
  customer_settings: CustomerAccountCustomerSettings;
  cash_mode: CashMode;
  online_payment_available: boolean;
  reminders: CustomerAccountReminder[];
}

/** Espèces au-delà de 1 000 € : refusées (BLOCK) ou acceptées pour un non-résident confirmé (WARN). */
export type CashMode = "BLOCK" | "WARN";

export interface CustomerAccountSettings {
  /** Plafond d'ardoise en centimes ; 0 = ardoise désactivée. */
  credit_limit: number;
  cash_mode: CashMode;
  reminder_enabled: boolean;
  /** Première relance et intervalle, en jours. */
  reminder_days: number;
  reminder_max: number;
  reminder_sms: boolean;
  /** Lecture seule : compte Stripe actif (lien de paiement possible). */
  online_payment_available?: boolean;
}

export interface CustomerAccountAging {
  customer: CustomerAccountSummary;
  debt: number;
  days_0_30: number;
  days_31_60: number;
  days_61_plus: number;
  oldest_unpaid: number;
}

export interface CustomerAccountMonth {
  month: string;
  deposits: number;
  refunds: number;
  write_offs: number;
  consumed: number;
  net_change: number;
  end_credit: number;
  end_debt: number;
}

export const listCustomerAccounts = async (): Promise<CustomerAccountSummary[]> => {
  const response = await apiClient.get<WelloApiResponse<{ accounts: CustomerAccountSummary[] }>>(
    "/customer-accounts",
  );
  return response.data.accounts ?? [];
};

export const getCustomerAccount = async (customerId: number | string): Promise<CustomerAccount> => {
  const response = await apiClient.get<WelloApiResponse<{ account: CustomerAccount }>>(
    `/customer-accounts/${customerId}`,
  );
  return response.data.account;
};

export const getCustomerAccountSettings = async (): Promise<CustomerAccountSettings> => {
  const response = await apiClient.get<WelloApiResponse<{ settings: CustomerAccountSettings }>>(
    "/customer-accounts/settings",
  );
  return response.data.settings;
};

export const updateCustomerAccountSettings = async (
  settings: CustomerAccountSettings,
): Promise<CustomerAccountSettings> => {
  const response = await apiClient.put<WelloApiResponse<{ settings: CustomerAccountSettings }>>(
    "/customer-accounts/settings",
    settings,
  );
  return response.data.settings;
};

export const updateCustomerAccountCustomerSettings = async (
  customerId: number | string,
  settings: CustomerAccountCustomerSettings,
): Promise<CustomerAccount> => {
  const response = await apiClient.put<WelloApiResponse<{ account: CustomerAccount }>>(
    `/customer-accounts/${customerId}/settings`,
    settings,
  );
  return response.data.account;
};

export const getCustomerAccountsAging = async (): Promise<CustomerAccountAging[]> => {
  const response = await apiClient.get<WelloApiResponse<{ aging: CustomerAccountAging[] }>>("/customer-accounts/aging");
  return response.data.aging ?? [];
};

export const getCustomerAccountsMonthly = async (year: number): Promise<CustomerAccountMonth[]> => {
  const response = await apiClient.get<WelloApiResponse<{ months: CustomerAccountMonth[] }>>(
    `/customer-accounts/monthly?year=${year}`,
  );
  return response.data.months ?? [];
};

/** Télécharge le relevé PDF d'un client (dates AAAA-MM-JJ, vides = 3 derniers mois). */
export const downloadCustomerAccountStatement = async (
  customerId: number | string,
  from = "",
  to = "",
): Promise<void> => {
  const query = new URLSearchParams({ from, to }).toString();
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ""}/customer-accounts/${customerId}/statement?${query}`,
    { headers: { Authorization: `Bearer ${getStoredAuthToken() || ""}` } },
  );
  if (!response.ok) {
    let message = "Le relevé n'a pas pu être généré.";
    try {
      const body = await response.json();
      message = body?.message || message;
    } catch {
      // réponse non JSON
    }
    throw new Error(message);
  }
  const match = /filename="?([^";]+)"?/i.exec(response.headers.get("Content-Disposition") ?? "");
  const url = window.URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = match ? match[1] : `releve_compte_${customerId}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
};

/** Envoie le relevé PDF par email ; renvoie l'adresse utilisée. */
export const sendCustomerAccountStatement = async (
  customerId: number | string,
  from = "",
  to = "",
  email = "",
): Promise<string> => {
  const response = await apiClient.post<WelloApiResponse<{ email: string }>>(
    `/customer-accounts/${customerId}/statement/send`,
    { from, to, email },
  );
  return response.data.email;
};

export const remindCustomerAccount = async (customerId: number | string): Promise<CustomerAccountReminder> => {
  const response = await apiClient.post<WelloApiResponse<{ reminder: CustomerAccountReminder }>>(
    `/customer-accounts/${customerId}/remind`,
    {},
  );
  return response.data.reminder;
};

export const createCustomerAccountPaymentLink = async (customerId: number | string): Promise<string> => {
  const response = await apiClient.post<WelloApiResponse<{ url: string }>>(
    `/customer-accounts/${customerId}/payment-link`,
    {},
  );
  return response.data.url;
};

/** Balance âgée au format CSV (séparateur « ; », montants en euros). */
export const agingToCsv = (rows: CustomerAccountAging[]): string => {
  const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
  const header = ["Client", "Téléphone", "Plus ancienne commande due", "Total dû", "0-30 jours", "31-60 jours", "Plus de 60 jours"];
  const lines = rows.map((r) =>
    [
      accountCustomerName(r.customer),
      r.customer.phone ?? "",
      r.oldest_unpaid ? new Date(r.oldest_unpaid * 1000).toLocaleDateString("fr-FR") : "",
      euros(r.debt),
      euros(r.days_0_30),
      euros(r.days_31_60),
      euros(r.days_61_plus),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  return [header.join(";"), ...lines].join("\r\n");
};

const MOP_LABELS: Record<string, string> = {
  ES: "Espèces",
  CB: "Carte bancaire",
  CHEQUE: "Chèque",
  TRANSFER: "Virement",
  STRIPE: "En ligne",
};

const OPERATION_LABELS: Record<CustomerAccountOperationType, string> = {
  DEPOSIT: "Versement",
  REFUND: "Remboursement du solde",
  WRITE_OFF: "Abandon de créance",
};

/** Libellé d'une ligne d'historique. */
export const accountEntryLabel = (entry: CustomerAccountEntry): string => {
  if (entry.operation) {
    const base = OPERATION_LABELS[entry.operation.operation_type] ?? "Mouvement";
    const mop = entry.operation.mop ? MOP_LABELS[entry.operation.mop] ?? entry.operation.mop : "";
    return mop ? `${base} · ${mop}` : base;
  }
  const ticket = entry.payment?.receipt_number ? ` (ticket ${entry.payment.receipt_number})` : "";
  const num = entry.payment?.order_num ? ` ${entry.payment.order_num}` : "";
  return entry.delta > 0 ? `Commande${num}${ticket} remboursée sur le compte` : `Commande${num}${ticket}`;
};

/** « Avance », « Ardoise » ou « Soldé ». */
export const accountBalanceKind = (balance: number): "Avance" | "Ardoise" | "Soldé" =>
  balance > 0 ? "Avance" : balance < 0 ? "Ardoise" : "Soldé";

export const accountCustomerName = (s: Pick<CustomerAccountSummary, "first_name" | "last_name" | "business_name">): string => {
  const name = [s.first_name, s.last_name].map((p) => p?.trim()).filter(Boolean).join(" ");
  if (s.business_name?.trim()) return name ? `${name} (${s.business_name.trim()})` : s.business_name.trim();
  return name || "Client sans nom";
};
