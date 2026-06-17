// ─── Enums ──────────────────────────────────────────────────────────────────

export type PrinterConnectionType = "wifi" | "bluetooth";

export type PrinterRole =
  | "caisse"
  | "production"
  | "caisse_et_production"
  | "label_haccp"
  | "label_production"
  | "label_haccp_et_production";

export type PrinterLanguage = "escpos" | "zpl";

// ─── Labels ─────────────────────────────────────────────────────────────────

export const printerRoleLabels: Record<PrinterRole, string> = {
  caisse: "Caisse",
  production: "Production",
  caisse_et_production: "Caisse + Production",
  label_haccp: "Étiquettes HACCP",
  label_production: "Étiquettes Production",
  label_haccp_et_production: "Étiquettes HACCP + Production",
};

export const printerConnectionTypeLabels: Record<PrinterConnectionType, string> = {
  wifi: "Wi-Fi",
  bluetooth: "Bluetooth",
};

// ─── Entry & payloads ───────────────────────────────────────────────────────

export interface PrinterEntry {
  id: string;
  name: string;
  connection_type: PrinterConnectionType;
  ip_address: string | null;
  port: number | null;
  bluetooth_address: string | null;
  language: PrinterLanguage;
  role: PrinterRole;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePrinterRequest {
  name: string;
  connection_type: PrinterConnectionType;
  ip_address?: string;
  port?: number;
  bluetooth_address?: string;
  role: PrinterRole;
}

export type UpdatePrinterRequest = CreatePrinterRequest;
