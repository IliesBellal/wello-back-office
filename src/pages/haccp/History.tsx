import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpandableDataTable } from '@/components/shared/ExpandableDataTable';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConformityCheckRecord {
  id: string;
  date: string;
  zone: string;
  checkType: string;
  operator: string;
  status: 'conforme' | 'non_conforme' | 'partiel';
  temperature?: number;
  temperatureTarget?: string;
  photo?: string;
  comment: string;
}

// Mock data - Replace with API call later
const mockRecords: ConformityCheckRecord[] = [
  {
    id: '1',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    zone: 'Cuisine',
    checkType: 'Température Frigo',
    operator: 'Jean Dupont',
    status: 'conforme',
    temperature: 4,
    temperatureTarget: '+4°C',
    comment: 'Vérification régulière le matin. Température exacte : 3,8°C',
  },
  {
    id: '2',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    zone: 'Stockage',
    checkType: 'Inventaire & Hygiène',
    operator: 'Marie Martin',
    status: 'conforme',
    comment: 'Stock correctement organisé. Dates DLC vérifiées. Aucun produit expiré.',
  },
  {
    id: '3',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    zone: 'Salle',
    checkType: 'Nettoyage Surfaces',
    operator: 'Pierre Bernard',
    status: 'partiel',
    comment: 'Nettoyage principal effectué. Attention: une zone (sous table 5) nécessite nettoyage approfondi.',
  },
  {
    id: '4',
    date: new Date().toISOString(),
    zone: 'Préparation',
    checkType: 'Contrôle Qualité Prep',
    operator: 'Sophie Leclerc',
    status: 'non_conforme',
    temperature: 12,
    temperatureTarget: '+6°C',
    comment: 'Température élevée détectée. Plan de travail à +12°C au lieu de +6°C. Intervention maintenance requise.',
  },
  {
    id: '5',
    date: new Date().toISOString(),
    zone: 'Entreposage froid',
    checkType: 'Température Congélateur',
    operator: 'Jean Dupont',
    status: 'conforme',
    temperature: -18,
    temperatureTarget: '-18°C',
    comment: 'Congélateur conforme. Température stable à -18,2°C.',
  },
];

const getStatusConfig = (status: ConformityCheckRecord['status']) => {
  switch (status) {
    case 'conforme':
      return {
        badge: 'bg-green-100 text-green-700 hover:bg-green-100',
        label: 'Conforme',
        color: 'text-green-700',
      };
    case 'partiel':
      return {
        badge: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
        label: 'Partiel',
        color: 'text-yellow-700',
      };
    case 'non_conforme':
      return {
        badge: 'bg-red-100 text-red-700 hover:bg-red-100',
        label: 'Non conforme',
        color: 'text-red-700',
      };
  }
};

export const History = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });

  const [loading] = useState(false);

  // Filter records by date range
  const filteredRecords = useMemo(() => {
    return mockRecords.filter((record) => {
      const recordDate = new Date(record.date);
      return recordDate >= dateRange.from && recordDate <= dateRange.to;
    });
  }, [dateRange]);

  const handleExportCSV = () => {
    // Export as CSV
    const headers = ['Date', 'Heure', 'Zone', 'Type de contrôle', 'Opérateur', 'Statut', 'Commentaire'];
    const rows = filteredRecords.map((record) => {
      const date = new Date(record.date);
      return [
        format(date, 'dd/MM/yyyy', { locale: fr }),
        format(date, 'HH:mm', { locale: fr }),
        record.zone,
        record.checkType,
        record.operator,
        getStatusConfig(record.status).label,
        record.comment,
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
    link.setAttribute('download', `historique-haccp-${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* ═══ HEADER ═══ */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">HACCP - Historique</h1>
            <p className="text-sm text-muted-foreground">
              Journal complet des relevés de conformité et contrôles sanitaires
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Date Picker */}
            <div className="w-full max-w-md">
              <AdvancedDatePicker value={dateRange} onChange={setDateRange} />
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="shrink-0"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter en CSV
            </Button>
          </div>
        </div>

        {/* ═══ TABLE SECTION ═══ */}
        <Card>
          {loading ? (
            <CardContent className="pt-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </CardContent>
          ) : filteredRecords.length === 0 ? (
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p>Aucun relevé pour cette période</p>
                <p className="text-sm">Essayez d'élargir la période de recherche</p>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <ExpandableDataTable<ConformityCheckRecord>
                columns={[
                  {
                    key: 'date',
                    label: 'Date & Heure',
                    sortable: true,
                    render: (val) => {
                      const date = new Date(val);
                      return `${format(date, 'dd/MM/yyyy', { locale: fr })} à ${format(date, 'HH:mm')}`;
                    },
                  },
                  {
                    key: 'zone',
                    label: 'Zone',
                    sortable: true,
                  },
                  {
                    key: 'checkType',
                    label: 'Type de contrôle',
                    sortable: true,
                  },
                  {
                    key: 'operator',
                    label: 'Opérateur',
                    sortable: true,
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
                data={filteredRecords}
                expandableRowKey="id"
                initialSortBy="date"
                initialSortDir="desc"
                renderExpandedRow={(record: ConformityCheckRecord) => (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Commentaire */}
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">Commentaire</p>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded border border-border">
                          {record.comment}
                        </p>
                      </div>

                      {/* Données techniques */}
                      {record.temperature !== undefined && (
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-2">Mesure de température</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border">
                              <span className="text-sm text-muted-foreground">Mesurée</span>
                              <span className="text-sm font-bold">{record.temperature}°C</span>
                            </div>
                            {record.temperatureTarget && (
                              <div className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border">
                                <span className="text-sm text-muted-foreground">Cible</span>
                                <span className="text-sm font-bold">{record.temperatureTarget}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Photo */}
                    {record.photo && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">Photographie</p>
                        <div className="w-48 h-32 bg-muted rounded border border-border border-dashed flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">Photo jointée</p>
                        </div>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="pt-3 border-t border-border text-xs text-muted-foreground">
                      <p>Relevé effectué le {format(new Date(record.date), 'dd MMMM yyyy à HH:mm', { locale: fr })} par {record.operator}</p>
                    </div>
                  </div>
                )}
              />
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default History;
