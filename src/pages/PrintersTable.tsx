import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer, ConfirmDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Printer as PrinterIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { printerService } from '@/services/printerService';
import { PrinterFormSheet } from '@/components/settings/printers/PrinterFormSheet';
import { printerRoleLabels, type PrinterEntry } from '@/types/printers';

export default function PrintersTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterEntry | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [printerToDelete, setPrinterToDelete] = useState<PrinterEntry | undefined>(undefined);

  const { data: printers = [], isLoading } = useQuery({
    queryKey: qk.printers.all,
    queryFn: () => printerService.getPrinters(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => printerService.deletePrinter(id),
    onSuccess: () => {
      toast({ title: 'Imprimante supprimée' });
      queryClient.invalidateQueries({ queryKey: qk.printers.all });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: "Impossible de supprimer l'imprimante.",
        variant: 'destructive',
      });
    },
  });

  const handleAdd = () => {
    setEditingPrinter(undefined);
    setFormOpen(true);
  };

  const handleEdit = (printer: PrinterEntry) => {
    setEditingPrinter(printer);
    setFormOpen(true);
  };

  const handleDelete = (printer: PrinterEntry) => {
    setPrinterToDelete(printer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!printerToDelete) return;
    await deleteMutation.mutateAsync(printerToDelete.id);
    setDeleteDialogOpen(false);
    setPrinterToDelete(undefined);
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Imprimantes</h1>
            <Button className="bg-gradient-primary" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une imprimante
            </Button>
          </div>
        }
        description="Gérez les imprimantes de votre établissement"
      >
        {isLoading ? (
          <p className="text-muted-foreground">Chargement des imprimantes...</p>
        ) : printers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <PrinterIcon className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">Aucune imprimante configurée pour le moment</p>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une imprimante
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Connexion</TableHead>
                  <TableHead>Langue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers.map((printer) => (
                  <TableRow key={printer.id}>
                    <TableCell className="font-medium">{printer.name}</TableCell>
                    <TableCell>{printerRoleLabels[printer.role]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {printer.connection_type === 'wifi'
                        ? `Wi-Fi · ${printer.ip_address}:${printer.port}`
                        : `Bluetooth · ${printer.bluetooth_address}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {printer.language === 'zpl' ? 'ZPL' : 'ESC/POS'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(printer)}
                          title="Éditer l'imprimante"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(printer)}
                          title="Supprimer l'imprimante"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContainer>

      <PrinterFormSheet open={formOpen} onOpenChange={setFormOpen} printer={editingPrinter} />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer une imprimante"
        description={`Supprimer l'imprimante "${printerToDelete?.name}" ?`}
        isDangerous
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </DashboardLayout>
  );
}
