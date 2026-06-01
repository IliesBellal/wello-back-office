import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, Link2, Users, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { MerchantUserListItem, MerchantUserStatus } from "@/types/adminUsers";

// ─── Status badge ──────────────────────────────────────────────────────────────

const statusConfig: Record<MerchantUserStatus, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-green-100 text-green-800 border-green-200" },
  login_disabled: { label: "Connexion désactivée", className: "bg-orange-100 text-orange-800 border-orange-200" },
  disabled: { label: "Désactivé", className: "bg-red-100 text-red-800 border-red-200" },
};

function StatusBadge({ status }: { status: MerchantUserStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.disabled;
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function memberInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function formatLastLogin(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    return format(parseISO(raw), "d MMM yyyy HH:mm", { locale: fr });
  } catch {
    return "—";
  }
}

// ─── Sort state ────────────────────────────────────────────────────────────────

type SortField = "name" | "email" | "tel" | "status" | "role" | "last_login" | "employee";
type SortDirection = "asc" | "desc" | null;

interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

const STATUS_ORDER: Record<MerchantUserStatus, number> = {
  active: 0,
  login_disabled: 1,
  disabled: 2,
};

function getSortValue(m: MerchantUserListItem, field: SortField): string | number {
  switch (field) {
    case "name":
      return `${m.last_name ?? ""} ${m.first_name ?? ""}`.trim().toLowerCase();
    case "email":
      return (m.email ?? "").toLowerCase();
    case "tel":
      return (m.tel ?? "").toLowerCase();
    case "status":
      return STATUS_ORDER[m.status] ?? 99;
    case "role":
      return m.admin ? 0 : 1;
    case "last_login":
      return m.last_login_at ? new Date(m.last_login_at).getTime() : 0;
    case "employee":
      return (m.employee_name ?? "").toLowerCase();
    default:
      return "";
  }
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface MembersTableProps {
  members: MerchantUserListItem[];
  onRowClick: (member: MerchantUserListItem) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function MembersTable({ members, onRowClick }: MembersTableProps) {
  const [sort, setSort] = useState<SortState>({ field: null, direction: null });

  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: null };
    });
  };

  const sortedMembers = useMemo(() => {
    if (!sort.field || !sort.direction) return members;
    const field = sort.field;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...members].sort((a, b) => {
      const va = getSortValue(a, field);
      const vb = getSortValue(b, field);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [members, sort]);

  const getSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="w-4 h-4" />
    ) : (
      <ArrowDown className="w-4 h-4" />
    );
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-2 hover:text-primary transition-colors"
    >
      {label}
      {getSortIcon(field)}
    </button>
  );

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mb-4" />
          <p>Aucun membre trouvé</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="w-10 px-2" />
                <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                  <SortButton field="name" label="Membre" />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                  <SortButton field="email" label="Email" />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                  <SortButton field="tel" label="Téléphone" />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                  <SortButton field="status" label="Statut" />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                  <SortButton field="role" label="Rôle" />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted font-semibold whitespace-nowrap">
                  <SortButton field="last_login" label="Dernière connexion" />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted font-semibold whitespace-nowrap">
                  <SortButton field="employee" label="Fiche employé" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.map((member) => (
                <TableRow
                  key={member.user_id}
                  className="border-b border-border cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => onRowClick(member)}
                >
                  {/* Avatar */}
                  <TableCell className="px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {memberInitials(member.first_name, member.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="pl-2">
                    <div className="font-medium text-foreground">
                      {member.first_name} {member.last_name}
                    </div>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="text-sm text-muted-foreground">
                    {member.email || "—"}
                  </TableCell>

                  {/* Phone */}
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {member.tel || "—"}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge status={member.status} />
                  </TableCell>

                  {/* Admin badge */}
                  <TableCell>
                    {member.admin ? (
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Membre</span>
                    )}
                  </TableCell>

                  {/* Last login */}
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatLastLogin(member.last_login_at)}
                  </TableCell>

                  {/* Linked employee */}
                  <TableCell className="text-sm whitespace-nowrap">
                    {member.employee_name ? (
                      <span className="flex items-center gap-1 text-blue-700">
                        <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
                        {member.employee_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
