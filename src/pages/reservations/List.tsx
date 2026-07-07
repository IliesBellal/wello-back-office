import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ExpandableDataTable, PageContainer, type ColumnConfig } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import {
  acceptBooking,
  assignBookingLocations,
  denyBooking,
  getBookingAvailability,
  getBookingById,
  getDeletionReasonsForBookings,
  listBookings,
  type BookingDetail,
  type BookingListItemApi,
  type DeletionReason,
  type ReservationListFilters,
  type ReservationStatus,
} from "@/services/reservationsService";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmée" },
  { value: "seated", label: "Installée" },
  { value: "denied", label: "Refusée" },
  { value: "cancelled", label: "Annulée" },
];

const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "staff", label: "Staff" },
  { value: "web", label: "Web" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const statusLabel = (status: ReservationStatus): string => {
  const key = String(status).toLowerCase();
  if (key === "pending") return "En attente";
  if (key === "confirmed") return "Confirmée";
  if (key === "seated") return "Installée";
  if (key === "denied") return "Refusée";
  if (key === "cancelled") return "Annulée";
  return key;
};

const statusClassName = (status: ReservationStatus): string => {
  const key = String(status).toLowerCase();
  if (key === "pending") return "bg-amber-100 text-amber-800 border-transparent";
  if (key === "confirmed") return "bg-emerald-100 text-emerald-800 border-transparent";
  if (key === "seated") return "bg-sky-100 text-sky-800 border-transparent";
  return "bg-rose-100 text-rose-800 border-transparent";
};

const sourceLabel = (source: string): string => {
  const key = source.toLowerCase();
  if (key === "staff") return "Staff";
  if (key === "web") return "Web";
  return source;
};

const sourceClassName = (source: string): string => {
  const key = source.toLowerCase();
  if (key === "staff") return "bg-slate-100 text-slate-700 border-transparent";
  if (key === "web") return "bg-indigo-100 text-indigo-800 border-transparent";
  return "bg-zinc-100 text-zinc-700 border-transparent";
};

const formatReservationDate = (value: string): string => {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return format(parsed, "dd MMM yyyy - HH:mm", { locale: fr });
};

const getVisiblePages = (current: number, total: number): number[] => {
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
};

interface BookingDetailsSheetProps {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function BookingDetailsSheet({ bookingId, open, onOpenChange }: BookingDetailsSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletionReasonId, setDeletionReasonId] = useState<string>("");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const detailQuery = useQuery({
    queryKey: bookingId ? qk.reservations.detail(bookingId) : ["reservations", "detail", "none"],
    queryFn: () => getBookingById(bookingId as string),
    enabled: open && Boolean(bookingId),
  });

  const deletionReasonsQuery = useQuery({
    queryKey: qk.reservations.deletionReasons,
    queryFn: getDeletionReasonsForBookings,
    enabled: open,
  });

  const availabilityDate = useMemo(() => {
    const raw = detailQuery.data?.start_date;
    if (!raw) return null;
    const parsed = parseISO(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return format(parsed, "yyyy-MM-dd");
  }, [detailQuery.data?.start_date]);

  const availabilityQuery = useQuery({
    queryKey: availabilityDate ? qk.reservations.availability(availabilityDate) : ["reservations", "availability", "none"],
    queryFn: () => getBookingAvailability(availabilityDate as string),
    enabled: open && Boolean(availabilityDate),
  });

  useEffect(() => {
    if (!detailQuery.data) {
      setSelectedLocationIds([]);
      return;
    }

    setSelectedLocationIds(detailQuery.data.locations.map((location) => location.location_id));
    setDeletionReasonId("");
  }, [detailQuery.data]);

  const acceptMutation = useMutation({
    mutationFn: (id: string) => acceptBooking(id),
    onSuccess: async (updatedBooking) => {
      toast({ title: "Réservation acceptée" });
      await queryClient.invalidateQueries({ queryKey: qk.reservations.all });
      queryClient.setQueryData(qk.reservations.detail(updatedBooking.booking_id), updatedBooking);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'accepter cette réservation.",
        variant: "destructive",
      });
    },
  });

  const denyMutation = useMutation({
    mutationFn: (id: string) => denyBooking(id, deletionReasonId ? { deletion_reason_id: deletionReasonId } : {}),
    onSuccess: async (updatedBooking) => {
      toast({ title: "Réservation refusée" });
      await queryClient.invalidateQueries({ queryKey: qk.reservations.all });
      queryClient.setQueryData(qk.reservations.detail(updatedBooking.booking_id), updatedBooking);
      setDeletionReasonId("");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de refuser cette réservation.",
        variant: "destructive",
      });
    },
  });

  const updateLocationsMutation = useMutation({
    mutationFn: async (booking: BookingDetail) => {
      const locationMap = new Map<string, { location_name: string; location_desc?: string }>();

      booking.locations.forEach((location) => {
        locationMap.set(location.location_id, {
          location_name: location.location_name,
          location_desc: location.location_desc,
        });
      });

      availabilityQuery.data?.locations.forEach((location) => {
        const locationId = String(location.location_id ?? "");
        if (!locationId) {
          return;
        }

        const locationName = String(location.location_name ?? "");
        const locationDescRaw = location.location_desc;
        const locationDesc = typeof locationDescRaw === "string" ? locationDescRaw : "";

        locationMap.set(locationId, {
          location_name: locationName,
          location_desc: locationDesc,
        });
      });

      const payloadLocations = selectedLocationIds.map((locationId) => {
        const ref = locationMap.get(locationId);
        return {
          booking_id: booking.booking_id,
          location_id: locationId,
          location_name: ref?.location_name ?? "",
          location_desc: ref?.location_desc ?? "",
        };
      });

      return assignBookingLocations(booking.booking_id, { locations: payloadLocations });
    },
    onSuccess: async (updatedBooking) => {
      toast({ title: "Tables attribuées mises à jour" });
      await queryClient.invalidateQueries({ queryKey: qk.reservations.all });
      queryClient.setQueryData(qk.reservations.detail(updatedBooking.booking_id), updatedBooking);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier les tables attribuées.",
        variant: "destructive",
      });
    },
  });

  const detail = detailQuery.data;
  const canAccept = detail?.status === "pending";
  const canDeny = detail?.status === "pending" || detail?.status === "confirmed";

  const locationOptions = useMemo(() => {
    const fromAvailability = (availabilityQuery.data?.locations ?? []).map((location) => {
      const locationId = String(location.location_id ?? "");
      const locationName = String(location.location_name ?? locationId);
      return {
        location_id: locationId,
        location_name: locationName,
      };
    }).filter((location) => location.location_id !== "");

    if (fromAvailability.length > 0) {
      return fromAvailability;
    }

    return (detail?.locations ?? []).map((location) => ({
      location_id: location.location_id,
      location_name: location.location_name,
    }));
  }, [availabilityQuery.data?.locations, detail?.locations]);

  const toggleLocation = (locationId: string, checked: boolean) => {
    if (checked) {
      setSelectedLocationIds((prev) => (prev.includes(locationId) ? prev : [...prev, locationId]));
      return;
    }

    setSelectedLocationIds((prev) => prev.filter((id) => id !== locationId));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Détail réservation</SheetTitle>
        </SheetHeader>

        {detailQuery.isLoading ? (
          <div className="space-y-3 pt-6">
            {[1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : !detail ? (
          <div className="pt-6 text-sm text-muted-foreground">Impossible de charger le détail.</div>
        ) : (
          <div className="space-y-6 pt-6">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground">Numéro</p>
                <p className="text-sm font-medium">{detail.booking_number}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground">Statut</p>
                <Badge className={statusClassName(detail.status)}>{statusLabel(detail.status)}</Badge>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground">Client</p>
                <p className="text-sm font-medium">{detail.customer?.customer_name || "-"}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground">Téléphone</p>
                <p className="text-sm font-medium">{detail.customer?.customer_tel || "-"}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground">Début</p>
                <p className="text-sm font-medium">{formatReservationDate(detail.start_date)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground">Fin</p>
                <p className="text-sm font-medium">{formatReservationDate(detail.end_date)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Tables attribuées</h3>
              <div className="grid gap-2 rounded-md border p-3">
                {locationOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune table disponible.</p>
                ) : (
                  locationOptions.map((location) => (
                    <label key={location.location_id} className="flex items-center gap-3 text-sm">
                      <Checkbox
                        checked={selectedLocationIds.includes(location.location_id)}
                        onCheckedChange={(checked) => toggleLocation(location.location_id, checked === true)}
                      />
                      <span>{location.location_name}</span>
                    </label>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                disabled={!detail || updateLocationsMutation.isPending}
                onClick={() => detail && updateLocationsMutation.mutate(detail)}
              >
                {updateLocationsMutation.isPending ? "Mise à jour..." : "Enregistrer les tables"}
              </Button>
            </div>

            <div className="space-y-3 rounded-md border p-4">
              <h3 className="text-sm font-semibold">Actions staff</h3>

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={!canAccept || acceptMutation.isPending}
                  onClick={() => detail && acceptMutation.mutate(detail.booking_id)}
                >
                  {acceptMutation.isPending ? "Acceptation..." : "Accepter"}
                </Button>

                <div className="flex min-w-[260px] flex-1 items-center gap-2">
                  <Select value={deletionReasonId} onValueChange={setDeletionReasonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Raison de refus" />
                    </SelectTrigger>
                    <SelectContent>
                      {(deletionReasonsQuery.data ?? []).map((reason: DeletionReason) => (
                        <SelectItem key={reason.deletion_reason_id} value={reason.deletion_reason_id}>
                          {reason.label || reason.deletion_reason_desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="destructive"
                    disabled={!canDeny || denyMutation.isPending || (deletionReasonsQuery.data?.length ?? 0) > 0 && !deletionReasonId}
                    onClick={() => detail && denyMutation.mutate(detail.booking_id)}
                  >
                    {denyMutation.isPending ? "Refus..." : "Refuser"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

const ReservationsListPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [source, setSource] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [partySize, setPartySize] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters = useMemo<ReservationListFilters>(() => ({
    page,
    pageSize: limit,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    partySize: partySize ? Number(partySize) : undefined,
    search: debouncedSearch || undefined,
    source: source === "all" ? undefined : source,
    sortBy: "booking_date_from",
    sortDir: "desc",
  }), [dateFrom, dateTo, debouncedSearch, limit, page, partySize, selectedStatuses, source]);

  const listQuery = useQuery({
    queryKey: qk.reservations.list(filters),
    queryFn: () => listBookings(filters),
  });

  const rows = listQuery.data?.data ?? [];
  const metadata = listQuery.data?.metadata ?? {
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit,
  };

  const columns: ColumnConfig<BookingListItemApi>[] = [
    {
      key: "booking_number",
      label: "N°",
      sortable: true,
      width: "w-[120px]",
    },
    {
      key: "customer_name",
      label: "Client",
      sortable: true,
      render: (value: string, row) => (
        <div>
          <p className="font-medium">{value || "-"}</p>
          <p className="text-xs text-muted-foreground">{row.customer_tel || "-"}</p>
        </div>
      ),
    },
    {
      key: "booking_date_from",
      label: "Date / heure",
      sortable: true,
      render: (value: string) => formatReservationDate(value),
      width: "w-[200px]",
    },
    {
      key: "party_size",
      label: "Couverts",
      sortable: true,
      align: "right",
      width: "w-[120px]",
    },
    {
      key: "status",
      label: "Statut",
      sortable: true,
      width: "w-[140px]",
      render: (value: string) => (
        <Badge className={statusClassName(value)}>{statusLabel(value)}</Badge>
      ),
    },
    {
      key: "source",
      label: "Source",
      sortable: true,
      width: "w-[120px]",
      render: (value: string) => (
        <Badge className={sourceClassName(value)}>{sourceLabel(value)}</Badge>
      ),
    },
    {
      key: "assigned_tables",
      label: "Tables",
      render: (value: string[]) => (value.length > 0 ? value.join(", ") : "-"),
    },
  ];

  const totalPages = Math.max(1, metadata.totalPages);
  const currentPage = metadata.currentPage;
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const displayStart = rows.length === 0 ? 0 : (currentPage - 1) * metadata.limit + 1;
  const displayEnd = rows.length === 0 ? 0 : displayStart + rows.length - 1;

  const toggleStatus = (statusValue: string, checked: boolean) => {
    setPage(1);
    setSelectedStatuses((previous) => {
      if (checked) {
        return previous.includes(statusValue) ? previous : [...previous, statusValue];
      }
      return previous.filter((value) => value !== statusValue);
    });
  };

  const resetFilters = () => {
    setSelectedStatuses([]);
    setSource("all");
    setDateFrom("");
    setDateTo("");
    setPartySize("");
    setSearchInput("");
    setDebouncedSearch("");
    setPage(1);
  };

  const openDetails = (row: BookingListItemApi) => {
    setSelectedBookingId(row.booking_id);
    setDetailOpen(true);
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Liste des réservations</h1>
            <p className="text-sm text-muted-foreground">
              {metadata.totalItems} réservation{metadata.totalItems > 1 ? "s" : ""}
            </p>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Recherche (nom ou téléphone)"
                className="pl-9"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between">
                  <span className="truncate">
                    {selectedStatuses.length > 0 ? `${selectedStatuses.length} statut(s)` : "Statuts"}
                  </span>
                  <SlidersHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((status) => (
                    <label key={status.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedStatuses.includes(status.value)}
                        onCheckedChange={(checked) => toggleStatus(status.value, checked === true)}
                      />
                      <span>{status.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Select value={source} onValueChange={(value) => { setSource(value); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => { setDateFrom(event.target.value); setPage(1); }}
              aria-label="Date de début"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(event) => { setDateTo(event.target.value); setPage(1); }}
              aria-label="Date de fin"
            />

            <div className="flex items-center gap-2 xl:col-span-6">
              <div className="w-40">
                <Input
                  type="number"
                  min={1}
                  value={partySize}
                  placeholder="Taille groupe"
                  onChange={(event) => { setPartySize(event.target.value); setPage(1); }}
                />
              </div>
              <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {listQuery.isLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4, 5].map((index) => (
                  <Skeleton key={index} className="h-12" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarClock className="mb-4 h-12 w-12" />
                <p>Aucune réservation trouvée</p>
              </div>
            ) : (
              <div className="p-0">
                <ExpandableDataTable<BookingListItemApi>
                  columns={columns}
                  data={rows}
                  initialSortBy="booking_date_from"
                  initialSortDir="desc"
                  onRowClick={openDetails}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Affichage {displayStart} à {displayEnd} sur {metadata.totalItems}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Par page</Label>
                <Select
                  value={String(limit)}
                  onValueChange={(value) => {
                    setLimit(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1 || listQuery.isFetching}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {visiblePages.map((value) => (
                  <Button
                    key={value}
                    variant={value === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages || listQuery.isFetching}
                onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>

      <BookingDetailsSheet
        bookingId={selectedBookingId}
        open={detailOpen}
        onOpenChange={(nextOpen) => {
          setDetailOpen(nextOpen);
          if (!nextOpen) {
            setSelectedBookingId(null);
          }
        }}
      />
    </DashboardLayout>
  );
};

export default ReservationsListPage;