import type { LeaveType, LeaveStatus } from "@/types/planning";

export const STATUS_OPTIONS: Array<{ value: LeaveStatus; label: string }> = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvée" },
  { value: "rejected", label: "Rejetée" },
  { value: "cancelled", label: "Annulée" },
];

export const LEAVE_TYPE_OPTIONS: Array<{ value: LeaveType; label: string }> = [
  { value: "paid", label: "Congés payés" },
  { value: "unpaid", label: "Sans solde" },
  { value: "sick", label: "Maladie" },
  { value: "other", label: "Autre" },
];
