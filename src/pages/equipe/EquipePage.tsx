import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Search, MoreVertical, BriefcaseBusiness, IdCard } from "lucide-react";
import { MembersTable } from "@/components/team/MembersTable";
import { MemberSheet } from "@/components/team/MemberSheet";
import { CreateMemberSheet } from "@/components/team/CreateMemberSheet";
import { EmployeesModal } from "@/components/team/EmployeesModal";
import { usersApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import { usePermissions } from "@/hooks/usePermissions";
import type { MerchantUserListItem, MerchantUserListFilters } from "@/types/adminUsers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PositionsModal } from "@/components/team/planning/PositionsModal";

// ─── Pagination helpers ────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 25, 50];

function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-muted-foreground">
        {totalItems} membre{totalItems !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-3">
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
        >
          <SelectTrigger className="h-8 w-20 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ‹ Préc.
          </Button>
          <span className="px-2 text-sm text-muted-foreground">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Suiv. ›
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter pill toggle ────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function EquipePage() {
  const { canManageUsers } = usePermissions();

  // Gate: redirect if no permission
  if (!canManageUsers) {
    return <Navigate to="/" replace />;
  }

  return <EquipePageContent />;
}

function EquipePageContent() {
  // ── Filters & pagination state ───────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [filterAdmin, setFilterAdmin] = useState<boolean | undefined>(undefined);
  const [filterLinkedEmployee, setFilterLinkedEmployee] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Sheet state ──────────────────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState<MerchantUserListItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [positionsOpen, setPositionsOpen] = useState(false);
  const [employeesOpen, setEmployeesOpen] = useState(false);

  const handleRowClick = useCallback((member: MerchantUserListItem) => {
    setSelectedMember(member);
    setSheetOpen(true);
  }, []);

  // ── Build query filters ──────────────────────────────────────────────────
  const filters: MerchantUserListFilters = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(filterActive !== undefined ? { active: filterActive } : {}),
    ...(filterAdmin !== undefined ? { admin: filterAdmin } : {}),
    ...(filterLinkedEmployee !== undefined ? { linked_employee: filterLinkedEmployee } : {}),
    page,
    page_size: pageSize,
  };

  // ── React Query ──────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: qk.users.list(filters),
    queryFn: () => usersApi.list(filters),
    placeholderData: (prev) => prev,
  });

  const members = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;
  const totalItems = pagination?.total_items ?? members.length;

  // Reset to page 1 when filters change
  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const toggleActive = () => {
    setFilterActive((prev) => (prev === true ? undefined : true));
    setPage(1);
  };

  const toggleAdmin = () => {
    setFilterAdmin((prev) => (prev === true ? undefined : true));
    setPage(1);
  };

  const toggleLinkedEmployee = () => {
    setFilterLinkedEmployee((prev) => (prev === true ? undefined : true));
    setPage(1);
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Équipe</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestion des membres et de leurs accès
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter un membre
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPositionsOpen(true)}>
                    <BriefcaseBusiness className="h-4 w-4 mr-2" />
                    Gérer les postes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEmployeesOpen(true)}>
                    <IdCard className="h-4 w-4 mr-2" />
                    Fiches employés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        }
      >
        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un membre…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Filtres :</span>
            <FilterPill
              label="Actifs"
              active={filterActive === true}
              onClick={toggleActive}
            />
            <FilterPill
              label="Admins"
              active={filterAdmin === true}
              onClick={toggleAdmin}
            />
            <FilterPill
              label="Avec fiche employé"
              active={filterLinkedEmployee === true}
              onClick={toggleLinkedEmployee}
            />
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-destructive text-sm mb-3">
              Erreur lors du chargement des membres.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <MembersTable members={members} onRowClick={handleRowClick} />
        )}

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {!isLoading && !isError && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </PageContainer>

      {/* ── Sidesheet ─────────────────────────────────────────────────────── */}
      <MemberSheet
        member={selectedMember}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdated={() => refetch()}
      />

      {/* ── Create / link sidesheet ─────────────────────────────────────── */}
      <CreateMemberSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
      />

      {/* ── Gestion des postes (réutilise le même composant que le Planning) */}
      <PositionsModal open={positionsOpen} onOpenChange={setPositionsOpen} />

      {/* ── Fiches employés (liste + liaison/déliaison compte utilisateur) ── */}
      <EmployeesModal open={employeesOpen} onOpenChange={setEmployeesOpen} />
    </DashboardLayout>
  );
}