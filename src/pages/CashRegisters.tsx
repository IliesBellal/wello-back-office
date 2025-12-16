import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CashRegisterCard from "@/components/cash-registers/CashRegisterCard";
import CashRegisterDetailsSheet from "@/components/cash-registers/CashRegisterDetailsSheet";
import {
  CashRegister,
  getCashRegisterHistory,
  closeCashRegister,
} from "@/services/cashRegisterService";

const CashRegisters = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [pendingRegister, setPendingRegister] = useState<CashRegister | null>(null);
  const [closing, setClosing] = useState(false);

  const loadRegisters = async () => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const data = await getCashRegisterHistory(dateStr);
      setRegisters(data);
    } catch (error) {
      toast.error("Erreur lors du chargement des registres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegisters();
  }, [date]);

  const handleCardClick = (register: CashRegister) => {
    if (!register.closed) {
      // Case A: Active register - show confirmation
      setPendingRegister(register);
      setCloseDialogOpen(true);
    } else {
      // Case B: Closed register - open details
      setSelectedRegister(register);
      setSheetOpen(true);
    }
  };

  const handleCloseRegister = async () => {
    if (!pendingRegister) return;
    
    setClosing(true);
    try {
      const result = await closeCashRegister(pendingRegister.id);
      if (result.status !== "ok") {
        toast.error(result.error || "Erreur lors de la fermeture");
        return;
      }
      
      // Refresh and open details
      await loadRegisters();
      const updatedRegister = { ...pendingRegister, closed: true };
      setSelectedRegister(updatedRegister);
      setSheetOpen(true);
      toast.success("Registre fermé");
    } catch (error) {
      toast.error("Erreur lors de la fermeture");
    } finally {
      setClosing(false);
      setCloseDialogOpen(false);
      setPendingRegister(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Registres de Caisse</h1>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "PPP", { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : registers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun registre pour cette date
          </div>
        ) : (
          <div className="space-y-4">
            {registers.map((register) => (
              <CashRegisterCard
                key={register.id}
                register={register}
                onClick={() => handleCardClick(register)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Close Active Register Dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fermer le registre actif ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce registre est actuellement ouvert. Voulez-vous le fermer pour accéder aux détails ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closing}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseRegister} disabled={closing}>
              {closing ? "Fermeture..." : "Fermer le registre"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Sheet */}
      <CashRegisterDetailsSheet
        register={selectedRegister}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onRefresh={loadRegisters}
      />
    </DashboardLayout>
  );
};

export default CashRegisters;
