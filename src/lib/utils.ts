import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date value into a human-readable French string.
 * Accepts:
 *  - Unix timestamp in seconds (number)
 *  - ISO 8601 string (e.g. "2026-03-29T10:51:07Z")
 *  - Numeric string (treated as Unix seconds)
 *  - null / undefined → returns "Date inconnue"
 */
export function formatDate(value: number | string | null | undefined): string {
  if (value == null) return "Date inconnue";

  let date: Date;

  if (typeof value === "number") {
    date = new Date(value * 1000);
  } else {
    const asNumber = Number(value);
    date = isNaN(asNumber) ? new Date(value) : new Date(asNumber * 1000);
  }

  if (isNaN(date.getTime())) return "Date inconnue";

  return format(date, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
}
