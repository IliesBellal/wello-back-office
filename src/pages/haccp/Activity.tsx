import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Tile } from '@/components/shared/Tile';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpandableDataTable } from '@/components/shared/ExpandableDataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download,
  FileText,
  ClipboardList,
  CheckCircle2,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Thermometer,
  Droplets,
  ScanSearch,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toUTCDateString } from '@/utils/apiDate';
import { useToast } from '@/hooks/use-toast';
import {
  HaccpActivity,
  HaccpActivityStatusFilter,
  HaccpActivityTypeFilter,
  HaccpActivitiesPagination,
  getHaccpActivities,
} from '@/services/haccpService';
import { HaccpActivityDetailSheet } from '@/components/haccp/HaccpActivityDetailSheet';

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'done':
    case 'ok':
      return {
        badge: 'bg-green-100 text-green-700 hover:bg-green-100',
        label: status === 'done' ? 'Termine' : 'OK',
        color: 'text-green-700',
      };
    case 'pending':
    case 'in_progress':
      return {
        badge: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
        label: status === 'in_progress' ? 'En cours' : 'En attente',
        color: 'text-yellow-700',
      };
    case 'alert':
      return {
        badge: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
        label: 'Alerte',
        color: 'text-orange-700',
      };
    case 'critical':
      return {
        badge: 'bg-red-100 text-red-700 hover:bg-red-100',
        label: 'Critique',
        color: 'text-red-700',
      };
    case 'failed':
    case 'error':
      return {
        badge: 'bg-red-100 text-red-700 hover:bg-red-100',
        label: status === 'failed' ? 'Echec' : 'Erreur',
        color: 'text-red-700',
      };
    default:
      return {
        badge: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
        label: status,
        color: 'text-gray-700',
      };
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'cleanings':
      return 'Nettoyages';
    case 'temperatures':
      return 'Températures';
    case 'traceability':
      return 'Traçabilité';
    case 'checklists':
      return 'Checklists';
    case 'incidents':
      return 'Incidents';
    default:
      return type;
  }
};

const getTypeConfig = (type: string) => {
  switch (type) {
    case 'cleanings':
      return {
        label: 'Nettoyages',
        icon: Droplets,
        iconClassName: 'text-cyan-500',
      };
    case 'temperatures':
      return {
        label: 'Températures',
        icon: Thermometer,
        iconClassName: 'text-blue-500',
      };
    case 'traceability':
      return {
        label: 'Traçabilité',
        icon: ScanSearch,
        iconClassName: 'text-amber-500',
      };
    case 'checklists':
      return {
        label: 'Checklists',
        icon: ClipboardList,
        iconClassName: 'text-slate-500',
      };
    case 'incidents':
      return {
        label: 'Incidents',
        icon: ShieldAlert,
        iconClassName: 'text-red-500',
      };
    default:
      return {
        label: type,
        icon: ClipboardList,
        iconClassName: 'text-slate-500',
      };
  }
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getActivitySummary = (activity: HaccpActivity): string => {
  if (activity.type === 'temperatures') {
    const readingsCount = Number(activity.metadata?.readings_count);
    if (Number.isFinite(readingsCount) && readingsCount > 0) {
      return `${readingsCount} zones controlees`;
    }
    return activity.subtitle;
  }

  if (activity.type === 'cleanings') {
    const executionsCount = Number(activity.metadata?.executions_count);
    if (Number.isFinite(executionsCount) && executionsCount > 0) {
      return `${executionsCount} surfaces nettoyees`;
    }
    return activity.subtitle;
  }

  if (activity.type === 'traceability') {
    const photosCount = Number(activity.metadata?.photos_count);
    if (Number.isFinite(photosCount) && photosCount > 0) {
      return `${photosCount} photo${photosCount > 1 ? 's' : ''}`;
    }
    return activity.subtitle;
  }

  return activity.subtitle;
};

const getCorrectiveActionsSummary = (activity: HaccpActivity): string | null => {
  if (activity.type !== 'temperatures') {
    return null;
  }

  const readingsWithCorrectiveActions = toFiniteNumber(activity.metadata?.readings_with_corrective_actions_count);
  if (readingsWithCorrectiveActions && readingsWithCorrectiveActions > 0) {
    return `${readingsWithCorrectiveActions} relevé${readingsWithCorrectiveActions > 1 ? 's' : ''} avec action corrective`;
  }

  const correctiveActionsCount = toFiniteNumber(activity.metadata?.corrective_actions_count);
  if (correctiveActionsCount && correctiveActionsCount > 0) {
    return `${correctiveActionsCount} action${correctiveActionsCount > 1 ? 's' : ''} corrective${correctiveActionsCount > 1 ? 's' : ''}`;
  }

  if (activity.metadata?.has_corrective_actions === true) {
    return 'Actions correctives renseignées';
  }

  return null;
};

const getTraceabilityMetadataSummary = (activity: HaccpActivity): React.ReactNode | null => {
  if (activity.type !== 'traceability') {
    return null;
  }

  const photosCount = toFiniteNumber(activity.metadata?.photos_count);
  const hasComment = activity.metadata?.has_comment === true;

  if (!photosCount && !hasComment) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {photosCount && photosCount > 0 && (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
          {photosCount} photo{photosCount > 1 ? 's' : ''}
        </Badge>
      )}
      {hasComment && (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50">
          Commentaire
        </Badge>
      )}
    </div>
  );
};

const getActivityDetails = (activity: HaccpActivity): React.ReactNode => {
  const summary = getActivitySummary(activity);
  const traceabilityMetadataSummary = getTraceabilityMetadataSummary(activity);

  if (traceabilityMetadataSummary) {
    return (
      <div className="space-y-1">
        <div>{summary}</div>
        {traceabilityMetadataSummary}
      </div>
    );
  }

  const correctiveActionsSummary = getCorrectiveActionsSummary(activity);

  if (!correctiveActionsSummary) {
    return summary;
  }

  return (
    <div className="space-y-1">
      <div>{summary}</div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge
          variant="outline"
          className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50"
        >
          Actions correctives
        </Badge>
        <span>{correctiveActionsSummary}</span>
      </div>
    </div>
  );
};

export const Activity = () => {
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to: Date }>(() => {
    const today = new Date();
    return { from: today, to: today };
  });
  const [typeFilter, setTypeFilter] = useState<HaccpActivityTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<HaccpActivityStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<HaccpActivitiesPagination>({
    page: 1,
    page_size: 20,
    total_items: 0,
    total_pages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<HaccpActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<HaccpActivity | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const { toast } = useToast();

  const handleRowClick = (activity: HaccpActivity) => {
    if (activity.type === 'temperatures' || activity.type === 'cleanings' || activity.type === 'traceability') {
      setSelectedActivity(activity);
      setDetailSheetOpen(true);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [selectedRange, typeFilter, statusFilter]);

  useEffect(() => {
    const loadActivity = async () => {
      setLoading(true);
      try {
        const response = await getHaccpActivities({
          from: toUTCDateString(selectedRange.from),
          to: toUTCDateString(selectedRange.to),
          page,
          pageSize: 20,
          type: typeFilter,
          status: statusFilter,
        });
        setRecords(response.activities);
        setPagination(response.pagination);
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger l\'activité HACCP.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [selectedRange, page, typeFilter, statusFilter, toast]);

  const stats = useMemo(() => {
    const done = records.filter((record) => record.status === 'done').length;
    const ok = records.filter((record) => record.status === 'ok').length;
    const alert = records.filter((record) => record.status === 'alert').length;
    const critical = records.filter((record) => record.status === 'critical').length;

    return {
      total: records.length,
      done,
      ok,
      alert,
      critical,
    };
  }, [records]);

  const currentPage = pagination.page || page;
  const totalPages = Math.max(1, pagination.total_pages || 1);
  const totalItems = pagination.total_items || 0;
  const currentLimit = pagination.page_size || 20;
  const displayStart = records.length === 0 ? 0 : ((currentPage - 1) * currentLimit) + 1;
  const displayEnd = records.length === 0 ? 0 : displayStart + records.length - 1;

  const handleExportCSV = () => {
    // Export as CSV
    const headers = ['Date', 'Heure', 'Type', 'Titre', 'Sous-titre', 'Operateur', 'Statut'];
    const rows = records.map((record) => {
      const date = new Date(record.performed_at);
      return [
        format(date, 'dd/MM/yyyy', { locale: fr }),
        format(date, 'HH:mm', { locale: fr }),
        getTypeLabel(record.type),
        record.title,
        record.subtitle,
        record.performed_by?.name || '-',
        getStatusConfig(record.status).label,
      ];
    });

    // Create CSV content
    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activite-haccp-${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">HACCP - Activité</h1>
              <p className="text-sm text-muted-foreground">
                Suivi consolidé des controles et evenements sanitaires sur la date selectionnee.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="w-full">
                <AdvancedDatePicker
                  value={selectedRange}
                  onChange={setSelectedRange}
                />
              </div>
              <div className="w-full">
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as HaccpActivityTypeFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="temperatures">temperatures</SelectItem>
                    <SelectItem value="cleanings">cleanings</SelectItem>
                    <SelectItem value="traceability">Traçabilité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as HaccpActivityStatusFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="ok">ok</SelectItem>
                    <SelectItem value="alert">alert</SelectItem>
                    <SelectItem value="critical">critical</SelectItem>
                    <SelectItem value="done">done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleExportCSV} variant="outline" className="shrink-0">
                <Download className="mr-2 h-4 w-4" />
                Exporter en CSV
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile title="Activites" value={stats.total} icon={ClipboardList} isHighlighted />
            <Tile title="done" value={stats.done} icon={CheckCircle2} />
            <Tile title="ok" value={stats.ok} icon={CheckCircle2} />
            <Tile title="alert / critical" value={stats.alert + stats.critical} icon={ShieldAlert} />
          </div>

          <Card>
          {loading ? (
            <CardContent className="pt-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </CardContent>
          ) : records.length === 0 ? (
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p>Aucune activite pour les filtres selectionnes</p>
                <p className="text-sm">Ajustez la date, le type ou le statut</p>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <ExpandableDataTable<HaccpActivity>
                columns={[
                  {
                    key: 'performed_at',
                    label: 'Date & Heure',
                    sortable: true,
                    render: (val: string) => {
                      const date = new Date(val);
                      return `${format(date, 'dd/MM/yyyy', { locale: fr })} à ${format(date, 'HH:mm')}`;
                    },
                  },
                  {
                    key: 'type',
                    label: 'Type',
                    sortable: true,
                    render: (val: string) => {
                      const typeConfig = getTypeConfig(val);
                      const TypeIcon = typeConfig.icon;

                      return (
                        <span className="inline-flex items-center gap-2">
                          <TypeIcon className={cn('h-4 w-4', typeConfig.iconClassName)} />
                          <span>{typeConfig.label}</span>
                        </span>
                      );
                    },
                  },
                  {
                    key: 'details',
                    label: 'Details',
                    render: (_val: unknown, row: HaccpActivity) => getActivityDetails(row),
                  },
                  {
                    key: 'performed_by',
                    label: 'Operateur',
                    render: (val: HaccpActivity['performed_by']) => val?.name || '-',
                  },
                  {
                    key: 'status',
                    label: 'Statut',
                    render: (val: string) => (
                      <Badge className={cn('font-semibold capitalize', getStatusConfig(val as any).badge)}>
                        {getStatusConfig(val as any).label}
                      </Badge>
                    ),
                  },
                ]}
                data={records}
                initialSortBy="performed_at"
                initialSortDir="desc"
                onRowClick={handleRowClick}
              />
            </CardContent>
          )}
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Affichage {displayStart} a {displayEnd} sur {totalItems}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
                aria-label="Page precedente"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || loading}
                className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
                aria-label="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </PageContainer>
      <HaccpActivityDetailSheet
        activity={selectedActivity}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </DashboardLayout>
  );
};

export default Activity;
