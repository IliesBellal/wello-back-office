import { AlertTriangle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Accordion type="multiple" defaultValue={domains.map((d) => d.domain)} className="w-full">
      {domains.map((group) => (
        <AccordionItem key={group.domain} value={group.domain}>
          <AccordionTrigger className="text-sm capitalize">
            {group.domain}
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              ({group.permissions.filter((p) => selectedKeys.has(p.key)).length}/{group.permissions.length})
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {group.permissions.map((permission) => (
                <div key={permission.key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Label htmlFor={`perm-${permission.key}`} className="text-sm cursor-pointer flex items-center gap-1.5">
                      {permission.label}
                      {permission.is_sensitive && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] px-1.5 py-0 gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Sensible
                        </Badge>
                      )}
                    </Label>
                    {permission.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{permission.description}</p>
                    )}
                  </div>
                  <Switch
                    id={`perm-${permission.key}`}
                    checked={selectedKeys.has(permission.key)}
                    onCheckedChange={(checked) => onToggle(permission, checked)}
                    disabled={readOnly}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
