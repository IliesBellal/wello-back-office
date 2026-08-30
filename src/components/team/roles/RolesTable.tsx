import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Copy, MoreVertical, Pencil, Archive, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { RoleEntry } from "@/types/roles";

interface RolesTableProps {
  roles: RoleEntry[];
  onEdit: (role: RoleEntry) => void;
  onDuplicate: (role: RoleEntry) => void;
  onArchive: (role: RoleEntry) => void;
}

// ─── Sort state ────────────────────────────────────────────────────────────────

type SortField = "name" | "permission_count" | "member_count" | "type";
type SortDirection = "asc" | "desc" | null;

interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

function getSortValue(r: RoleEntry, field: SortField): string | number {
  switch (field) {
    case "name":
      return r.name.toLowerCase();
    case "permission_count":
      return r.permission_count;
    case "member_count":
      return r.member_count;
    case "type":
      return r.system_key ? 0 : 1;
    default:
      return "";
  }
}

export function RolesTable({ roles, onEdit, onDuplicate, onArchive }: RolesTableProps) {
  const [sort, setSort] = useState<SortState>({ field: null, direction: null });

  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: null };
    });
  };

  const sortedRoles = useMemo(() => {
    if (!sort.field || !sort.direction) return roles;
    const field = sort.field;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...roles].sort((a, b) => {
      const va = getSortValue(a, field);
      const vb = getSortValue(b, field);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [roles, sort]);

  const getSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sort.direction === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-2 hover:text-primary transition-colors">
      {label}
      {getSortIcon(field)}
    </button>
  );

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                <SortButton field="name" label="Nom" />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                <SortButton field="permission_count" label="Droits" />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                <SortButton field="member_count" label="Porteurs" />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                <SortButton field="type" label="Type" />
              </TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRoles.map((role) => (
              <TableRow
                key={role.id}
                className="border-b border-border cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => onEdit(role)}
              >
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>{role.permission_count}</TableCell>
                <TableCell>{role.member_count}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={role.system_key ? "bg-purple-50 text-purple-800 border-purple-200" : ""}>
                    {role.system_key ? "Système" : "Personnalisé"}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {/* Visible, not buried in a menu — duplication is the primary
                        path admins actually use ("comme untel, mais sans les remboursements"). */}
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onDuplicate(role)}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Dupliquer
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(role)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        {role.system_key !== "admin" && (
                          <DropdownMenuItem onClick={() => onArchive(role)} className="text-destructive focus:text-destructive">
                            <Archive className="h-4 w-4 mr-2" />
                            Archiver
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
