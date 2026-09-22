import { Badge } from "@/components/ui/badge";
import { cdsDisplayStatusLabels, type CdsDisplayStatus } from "@/types/cds";

// Trois variants seulement : sans état « désactivé » (décision D15), il n'y a
// pas d'équivalent au 'secondary' du KioskStatusBadge.
const statusVariant: Record<
  CdsDisplayStatus,
  "outline" | "default" | "destructive"
> = {
  pending: "outline",
  active: "default",
  revoked: "destructive",
};

interface CdsStatusBadgeProps {
  status: CdsDisplayStatus;
}

export function CdsStatusBadge({ status }: CdsStatusBadgeProps) {
  return (
    <Badge variant={statusVariant[status]}>
      {cdsDisplayStatusLabels[status]}
    </Badge>
  );
}
