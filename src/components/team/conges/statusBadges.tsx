import { cn } from "@/lib/utils";
import type { LeaveStatus, LeaveType, ShiftSwapStatus } from "@/types/planning";

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Rejetée",
  cancelled: "Annulée",
};

const STATUS_CLASS: Record<LeaveStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-rose-100 text-rose-900",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ value }: { value: LeaveStatus | ShiftSwapStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
        STATUS_CLASS[value as LeaveStatus],
      )}
    >
      {STATUS_LABEL[value as LeaveStatus]}
    </span>
  );
}

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  paid: "Congés payés",
  unpaid: "Sans solde",
  sick: "Maladie",
  other: "Autre",
};

const LEAVE_TYPE_CLASS: Record<LeaveType, string> = {
  paid: "bg-sky-100 text-sky-900",
  unpaid: "bg-zinc-100 text-zinc-900",
  sick: "bg-rose-100 text-rose-900",
  other: "bg-violet-100 text-violet-900",
};

export function LeaveTypeBadge({ value }: { value: LeaveType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
        LEAVE_TYPE_CLASS[value],
      )}
    >
      {LEAVE_TYPE_LABEL[value]}
    </span>
  );
}
