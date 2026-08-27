import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Copy, MoreVertical, Pencil, Archive } from "lucide-react";
import type { RoleEntry } from "@/types/roles";

interface RolesTableProps {
  roles: RoleEntry[];
  onEdit: (role: RoleEntry) => void;
  onDuplicate: (role: RoleEntry) => void;
  onArchive: (role: RoleEntry) => void;
}

export function RolesTable({ roles, onEdit, onDuplicate, onArchive }: RolesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Droits</TableHead>
          <TableHead>Porteurs</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id} className="cursor-pointer" onClick={() => onEdit(role)}>
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
  );
}
