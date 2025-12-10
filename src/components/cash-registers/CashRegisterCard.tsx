import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, LockOpen } from "lucide-react";
import { CashRegister } from "@/services/cashRegisterService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CashRegisterCardProps {
  register: CashRegister;
  onClick: () => void;
}

const CashRegisterCard = ({ register, onClick }: CashRegisterCardProps) => {
  const getStatusDisplay = () => {
    if (!register.closed) {
      return {
        label: "Actif",
        variant: "default" as const,
        icon: (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        ),
      };
    }
    if (!register.enclosed) {
      return {
        label: "Pré-clôturé",
        variant: "secondary" as const,
        icon: <LockOpen className="h-4 w-4 text-yellow-500" />,
      };
    }
    return {
      label: "Archivé",
      variant: "outline" as const,
      icon: <Lock className="h-4 w-4 text-muted-foreground" />,
    };
  };

  const status = getStatusDisplay();
  const formattedDate = format(new Date(register.start_date), "EEEE d MMMM - HH:mm", { locale: fr });

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium capitalize">{formattedDate}</p>
            <p className="text-sm text-muted-foreground">{register.cash_desk_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {status.icon}
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashRegisterCard;
