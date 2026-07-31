import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";

import { planningEmployeesApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import type { Employee } from "@/types/planning";

// ─── Link an existing (unlinked) employee record to this user ────────────────

interface LinkExistingEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function LinkExistingEmployeeDialog({ open, onOpenChange, userId }: LinkExistingEmployeeDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebounced("");
    }
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: qk.planningEmployees.list({ unlinked: true, search: debounced, page_size: 20 }),
    queryFn: () => planningEmployeesApi.list({ unlinked: true, search: debounced, page_size: 20 }),
    enabled: open,
  });

  const employees = data?.items ?? [];

  const handleLink = async (employee: Employee) => {
    setLinking(employee.id);
    try {
      await planningEmployeesApi.userLink(employee.id, { user_id: userId });
      toast.success(`Fiche employé de ${employee.first_name} ${employee.last_name} liée`);
      queryClient.invalidateQueries({ queryKey: qk.users.member(userId) });
      queryClient.invalidateQueries({ queryKey: qk.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      queryClient.invalidateQueries({ queryKey: qk.planningEmployees.all });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la liaison");
    } finally {
      setLinking(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lier une fiche employé existante</DialogTitle>
          <DialogDescription>
            Recherchez une fiche employé non liée à rattacher à ce compte utilisateur.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, prénom ou poste…"
            className="pl-9"
          />
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {isFetching ? (
            <p className="text-sm text-muted-foreground text-center py-4">Recherche…</p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune fiche employé non liée trouvée.
            </p>
          ) : (
            employees.map((emp) => (
              <Card key={emp.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.position || "Aucun poste"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLink(emp)}
                    disabled={linking === emp.id}
                  >
                    {linking === emp.id ? "Liaison…" : "Lier"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
