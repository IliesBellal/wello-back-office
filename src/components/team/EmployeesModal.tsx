import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DndContext, type DragEndEvent, closestCenter } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ArrowLeft, GripVertical, Link2, Search, Unlink, Save, AlertCircle } from "lucide-react";

import { planningEmployeesApi, planningPositionsApi, planningRefsApi, usersApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/planning";
import type { LinkableUser } from "@/types/adminUsers";
import { EmployeeHrFieldsCards } from "@/components/team/EmployeeHrFieldsCards";
import {
  EMPTY_HR_FORM,
  centsToEuroInput,
  emptyToNull,
  hrFormToPatch,
  numToInput,
  validateEmployeeHrForm,
  type EmployeeHrForm,
} from "@/components/team/employeeHrFields";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmployeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the modal opens directly on this employee's detail (skipping the roster list). */
  initialEmployee?: Employee | null;
}

function employeeToForm(e: Employee): EmployeeHrForm {
  return {
    position_id: e.position_id ?? "",
    job_title: e.job_title ?? "",
    role: e.role ?? "",
    contract_type_code: e.contract_type_code ?? "",
    contract_start_date: e.contract_start_date ? e.contract_start_date.slice(0, 10) : "",
    contract_end_date: e.contract_end_date ? e.contract_end_date.slice(0, 10) : "",
    probation_end_date: e.probation_end_date ? e.probation_end_date.slice(0, 10) : "",
    last_medical_checkup_date: e.last_medical_checkup_date ? e.last_medical_checkup_date.slice(0, 10) : "",
    contract_hours: numToInput(e.contract_hours),
    max_weekly_hours: numToInput(e.max_weekly_hours),
    required_rest_days: numToInput(e.required_rest_days),
    sunday_premium: !!e.sunday_premium,
    night_premium: !!e.night_premium,
    employer_charges_pct: numToInput(e.employer_charges_pct),
    hourly_rate_eur: centsToEuroInput(e.hourly_rate),
    gross_monthly_salary_eur: centsToEuroInput(e.gross_monthly_salary),
    transport_cost_eur: centsToEuroInput(e.transport_cost),
    hr_comment: e.hr_comment ?? "",
  };
}

// ─── Debounce helper ──────────────────────────────────────────────────────────

function useDebounced(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function SortableEmployeeRow({
  employee,
  onSelect,
  dragDisabled,
}: {
  employee: Employee;
  onSelect: (employee: Employee) => void;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: employee.id,
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-card px-3 py-2.5 transition-colors",
        isDragging && "bg-muted shadow-sm",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={dragDisabled}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
          title="Glissez pour réorganiser"
          aria-label="Glisser pour réorganiser l'ordre"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onSelect(employee)}
          className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {employee.first_name} {employee.last_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {employee.position || "Aucun poste"}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-xs",
              employee.user_id
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-orange-100 text-orange-800 border-orange-200",
            )}
          >
            {employee.user_id ? "Lié" : "Non lié"}
          </Badge>
        </button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeesModal({ open, onOpenChange, initialEmployee = null }: EmployeesModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);

  // Reset local state each time the modal opens (or jump straight to `initialEmployee` if provided).
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelected(initialEmployee);
    }
  }, [open, initialEmployee]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {selected ? (
          <EmployeeDetail employee={selected} onBack={() => setSelected(null)} onUpdated={setSelected} />
        ) : (
          <EmployeesList search={search} onSearchChange={setSearch} onSelect={setSelected} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function EmployeesList({
  search,
  onSearchChange,
  onSelect,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (e: Employee) => void;
}) {
  const debounced = useDebounced(search, 250);
  const queryClient = useQueryClient();
  const [employees, setEmployees] = useState<Employee[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: qk.planningEmployees.list({ search: debounced, page_size: 100 }),
    queryFn: () => planningEmployeesApi.list({ search: debounced, page_size: 100 }),
  });

  useEffect(() => {
    setEmployees(data?.items ?? []);
  }, [data?.items]);

  const reorderMutation = useMutation({
    mutationFn: (employeeIds: string[]) => planningEmployeesApi.updateDisplayOrder(employeeIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.planningEmployees.all });
    },
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || reorderMutation.isPending) return;

    const oldIndex = employees.findIndex((employee) => employee.id === active.id);
    const newIndex = employees.findIndex((employee) => employee.id === over.id);

    if (oldIndex < 0 || newIndex < 0) return;

    const previousEmployees = employees;
    const reorderedEmployees = arrayMove(employees, oldIndex, newIndex);

    setEmployees(reorderedEmployees);

    try {
      await reorderMutation.mutateAsync(reorderedEmployees.map((employee) => employee.id));
    } catch (err) {
      setEmployees(previousEmployees);
      toast.error(err instanceof Error ? err.message : "Erreur lors du réordonnancement");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Fiches employés</DialogTitle>
        <DialogDescription>
          Toutes les fiches employés de l'établissement, liées ou non à un compte utilisateur.
        </DialogDescription>
      </DialogHeader>

      <div className="relative mt-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un employé…"
          className="pl-9"
        />
      </div>

      <div className="mt-2 space-y-1.5 max-h-[55vh] overflow-y-auto">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : employees.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune fiche employé trouvée.</p>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={employees.map((emp) => emp.id)} strategy={verticalListSortingStrategy}>
              {employees.map((emp) => (
                <SortableEmployeeRow
                  key={emp.id}
                  employee={emp}
                  onSelect={onSelect}
                  dragDisabled={reorderMutation.isPending}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </>
  );
}

// ─── Detail view (fiche employé complète, éditable) ───────────────────────────

function EmployeeDetail({
  employee,
  onBack,
  onUpdated,
}: {
  employee: Employee;
  onBack: () => void;
  onUpdated: (employee: Employee) => void;
}) {
  const queryClient = useQueryClient();
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);

  const [firstName, setFirstName] = useState(employee.first_name);
  const [lastName, setLastName] = useState(employee.last_name);
  const [email, setEmail] = useState(employee.email ?? "");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [hrForm, setHrForm] = useState<EmployeeHrForm>(() => employeeToForm(employee));

  // Re-seed local state whenever we switch to a different (or freshly-saved) employee.
  useEffect(() => {
    setFirstName(employee.first_name);
    setLastName(employee.last_name);
    setEmail(employee.email ?? "");
    setPhone(employee.phone ?? "");
    setHrForm(employeeToForm(employee));
  }, [employee]);

  const { data: positions = [] } = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
  });

  const { data: contractTypes = [] } = useQuery({
    queryKey: qk.planningRefs.contractTypes,
    queryFn: () => planningRefsApi.contractTypes(),
  });

  const { data: linkedUser } = useQuery({
    queryKey: employee.user_id ? qk.users.detail(employee.user_id) : (["users", "detail", "none"] as const),
    queryFn: () => usersApi.get(employee.user_id!),
    enabled: !!employee.user_id,
  });

  const set = <K extends keyof EmployeeHrForm>(key: K, value: EmployeeHrForm[K]) => {
    setHrForm((f) => ({ ...f, [key]: value }));
  };

  const errors: string[] = [];
  if (!firstName.trim()) errors.push("Le prénom est obligatoire.");
  if (!lastName.trim()) errors.push("Le nom est obligatoire.");
  errors.push(...validateEmployeeHrForm(hrForm));
  const hasErrors = errors.length > 0;

  const invalidateLinkedUserQueries = () => {
    if (!employee.user_id) return;
    queryClient.invalidateQueries({ queryKey: qk.users.member(employee.user_id) });
    queryClient.invalidateQueries({ queryKey: qk.users.detail(employee.user_id) });
    queryClient.invalidateQueries({ queryKey: qk.users.all });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      planningEmployeesApi.update(employee.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: emptyToNull(email.trim()),
        phone: emptyToNull(phone.trim()),
        ...hrFormToPatch(hrForm),
      }),
    onSuccess: (updated) => {
      toast.success("Fiche employé enregistrée");
      queryClient.invalidateQueries({ queryKey: qk.planningEmployees.all });
      invalidateLinkedUserQueries();
      onUpdated(updated);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: () => planningEmployeesApi.deleteUserLink(employee.id),
    onSuccess: () => {
      toast.success("Compte délié de la fiche employé");
      queryClient.invalidateQueries({ queryKey: qk.planningEmployees.all });
      invalidateLinkedUserQueries();
      onBack();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors du déliage");
    },
  });

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={onBack} aria-label="Retour">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DialogTitle>
            {employee.first_name} {employee.last_name}
          </DialogTitle>
        </div>
        <DialogDescription>{employee.position || "Aucun poste"}</DialogDescription>
      </DialogHeader>

      <div className="mt-2 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-emp-fn" className="text-xs">Prénom *</Label>
            <Input id="edit-emp-fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-emp-ln" className="text-xs">Nom *</Label>
            <Input id="edit-emp-ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-emp-email" className="text-xs">Email</Label>
            <Input id="edit-emp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-emp-phone" className="text-xs">Téléphone</Label>
            <Input id="edit-emp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        {employee.user_id ? (
          <Card>
            <CardContent className="p-3 space-y-3">
              <div>
                <p className="text-sm font-medium">Compte lié</p>
                <p className="text-sm text-muted-foreground">
                  {linkedUser ? `${linkedUser.first_name} ${linkedUser.last_name} — ${linkedUser.email}` : "Chargement…"}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setUnlinkOpen(true)}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Délier
              </Button>
            </CardContent>
          </Card>
        ) : linkOpen ? (
          <LinkAccountPanel employeeId={employee.id} onDone={onBack} onCancel={() => setLinkOpen(false)} />
        ) : (
          <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            Lier un compte utilisateur
          </Button>
        )}

        <EmployeeHrFieldsCards form={hrForm} set={set} positions={positions} contractTypes={contractTypes} />

        {hasErrors && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1">
            {errors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={() => saveMutation.mutate()} disabled={hasErrors || saveMutation.isPending}>
            {saveMutation.isPending ? (
              "Enregistrement…"
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={unlinkOpen}
        onOpenChange={setUnlinkOpen}
        title="Délier ce compte ?"
        description="La fiche employé restera, mais ne sera plus rattachée à ce compte utilisateur."
        confirmText="Délier"
        cancelText="Annuler"
        isDangerous
        isLoading={unlinkMutation.isPending}
        onConfirm={() => unlinkMutation.mutateAsync()}
      />
    </>
  );
}

// ─── Link account search panel (mirrors CreateMemberSheet's "Lier un existant") ─

function LinkAccountPanel({
  employeeId,
  onDone,
  onCancel,
}: {
  employeeId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search, 250);
  const [linking, setLinking] = useState<string | null>(null);

  const { data: results = [], isFetching } = useQuery({
    queryKey: qk.users.linkableSearch(debounced),
    queryFn: () => usersApi.linkableSearch(debounced),
    enabled: debounced.length >= 2,
  });

  const handleLink = async (user: LinkableUser) => {
    setLinking(user.user_id);
    try {
      await planningEmployeesApi.userLink(employeeId, { user_id: user.user_id });
      toast.success(`${user.first_name} ${user.last_name} lié à cette fiche employé`);
      queryClient.invalidateQueries({ queryKey: qk.planningEmployees.all });
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la liaison");
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Email, nom ou téléphone…"
          className="pl-9"
        />
      </div>

      {debounced.length < 2 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Tapez au moins 2 caractères.</p>
      ) : isFetching ? (
        <p className="text-sm text-muted-foreground text-center py-4">Recherche…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur trouvé.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((u) => (
            <Card key={u.user_id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleLink(u)}
                  disabled={linking === u.user_id}
                >
                  {linking === u.user_id ? "Liaison…" : "Lier"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={onCancel}>
        Annuler
      </Button>
    </div>
  );
}
