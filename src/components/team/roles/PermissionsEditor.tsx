import { Fragment } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyPermissionsNotice } from "@/components/shared";
import type { Permission, PermissionDomainGroup } from "@/types/roles";

interface PermissionsEditorProps {
  domains: PermissionDomainGroup[] | undefined;
  isLoading: boolean;
  selectedKeys: Set<string>;
  onToggle: (permission: Permission, checked: boolean) => void;
  readOnly?: boolean;
}

export function PermissionsEditor({ domains, isLoading, selectedKeys, onToggle, readOnly = false }: PermissionsEditorProps) {
  if (isLoading || !domains) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const totalSelected = domains.reduce(
    (count, group) => count + group.permissions.filter((p) => selectedKeys.has(p.key)).length,
    0,
  );

  if (totalSelected === 0 && readOnly) {
    return <EmptyPermissionsNotice />;
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Droit</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {domains.map((group) => (
            <Fragment key={group.domain}>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={2} className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="capitalize">{group.domain}</span>{" "}
                  <span className="font-normal normal-case">
                    ({group.permissions.filter((p) => selectedKeys.has(p.key)).length}/{group.permissions.length})
                  </span>
                </TableCell>
              </TableRow>
              {group.permissions.map((permission) => (
                <TableRow key={permission.key} className="hover:bg-transparent">
                  <TableCell>
                    <Label htmlFor={`perm-${permission.key}`} className="text-sm cursor-pointer">
                      {permission.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{permission.description}</p>
                  </TableCell>
                  <TableCell className="w-0">
                    <Switch
                      id={`perm-${permission.key}`}
                      checked={selectedKeys.has(permission.key)}
                      onCheckedChange={(checked) => onToggle(permission, checked)}
                      disabled={readOnly}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
