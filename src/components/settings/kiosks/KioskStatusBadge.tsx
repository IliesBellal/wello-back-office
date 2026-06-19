import { Badge } from '@/components/ui/badge';
import { kioskStatusLabels, type KioskStatus } from '@/types/kiosks';

const statusVariant: Record<KioskStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  pending: 'outline',
  active: 'default',
  inactive: 'secondary',
  revoked: 'destructive',
};

interface KioskStatusBadgeProps {
  status: KioskStatus;
}

export function KioskStatusBadge({ status }: KioskStatusBadgeProps) {
  return <Badge variant={statusVariant[status]}>{kioskStatusLabels[status]}</Badge>;
}
