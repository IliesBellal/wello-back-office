import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays, format, startOfMonth, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Archive, Copy, Download, FileArchive } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { FiscalIntegrityCard } from '@/components/fiscal/FiscalIntegrityCard';
import { FiscalArchive, fiscalArchivesService } from '@/services/fiscalArchivesService';

/** Même borne que l'API (fiscalArchiveMaxDays) : vérifiée ici pour guider, refusée là-bas sinon. */
const MAX_DAYS = 31;

const formatDay = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd/MM/yyyy', { locale: fr });
};

const formatMonth = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const label = format(date, 'MMMM yyyy', { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
};

/**
 * Archives fiscales (conformité caisse, lot D) : liste des archives de
 * l'établissement, téléchargement (lien d'une heure, tracé au journal
 * d'audit), empreinte SHA-256 affichée et copiable, génération à la demande
 * d'une période close. Les archives mensuelles sont produites automatiquement.
 */
const FiscalArchives = () => {
  const queryClient = useQueryClient();
  const yesterday = subDays(new Date(), 1);
  const [range, setRange] = useState({ from: startOfMonth(yesterday), to: yesterday });
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data: archives = [], isLoading, isError } = useQuery({
    queryKey: ['fiscal-archives'],
    queryFn: () => fiscalArchivesService.list(),
  });

  const days = differenceInCalendarDays(range.to, range.from) + 1;
  const tooLong = days > MAX_DAYS;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fiscalArchivesService.generate(range.from, range.to);
      toast.success('Archive générée.');
      await queryClient.invalidateQueries({ queryKey: ['fiscal-archives'] });
    } catch {
      // Refus métier et erreurs serveur : message déjà affiché par apiClient.
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (archive: FiscalArchive) => {
    setDownloadingId(archive.id);
    try {
      const link = await fiscalArchivesService.getLink(archive.id);
      window.open(link.download_url, '_blank');
    } catch {
      // Message déjà affiché par apiClient.
    } finally {
      setDownloadingId(null);
    }
  };

  const copyHash = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Empreinte copiée.');
    } catch {
      toast.error("Impossible de copier l'empreinte.");
    }
  };

  return (
    <DashboardLayout>
      <PageContainer header={<h1 className="text-3xl font-bold text-foreground">Archives fiscales</h1>}>
        <div className="space-y-6">
          <Card className="shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Archive className="h-5 w-5" />
                Conservation des données de caisse
              </CardTitle>
              <CardDescription>
                Chaque mois clôturé est archivé automatiquement, dans l'heure qui suit sa clôture. Une archive
                contient vos tickets, commandes, paiements, journal des opérations, clôtures et registres de
                caisse, en fichiers CSV lisibles par un tableur, avec une notice. Conservez-la six ans : c'est le
                document à présenter en cas de contrôle. L'empreinte SHA-256 permet de vérifier que le fichier
                n'a pas été modifié.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-semibold">Archive d'une période</p>
              <p className="text-xs text-muted-foreground">
                Pour un contrôle ou une demande de votre comptable : jours clôturés uniquement (chaque journée
                est clôturée automatiquement la nuit suivante), {MAX_DAYS} jours au plus.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <DateRangePicker dateRange={range} onDateRangeChange={setRange} />
                <Button onClick={handleGenerate} disabled={generating || tooLong} className="gap-2">
                  <FileArchive className="h-4 w-4" />
                  {generating ? 'Génération...' : "Générer l'archive"}
                </Button>
              </div>
              {tooLong && (
                <p className="text-xs text-destructive">
                  Période de {days} jours : choisissez {MAX_DAYS} jours au plus. Les mois complets sont déjà
                  archivés automatiquement.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-foreground">Archives</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : isError ? (
                <p className="text-sm text-destructive">Impossible de charger les archives.</p>
              ) : archives.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune archive pour le moment. La première sera produite après la clôture du premier mois.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Période</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Générée le</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead>Empreinte SHA-256</TableHead>
                      <TableHead className="text-right">Fichier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archives.map((archive) => (
                      <TableRow key={archive.id}>
                        <TableCell className="font-medium">
                          {archive.kind === 'MONTH'
                            ? formatMonth(archive.period_start)
                            : `${formatDay(archive.period_start)} → ${formatDay(archive.period_end)}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={archive.kind === 'MONTH' ? 'secondary' : 'outline'}>
                            {archive.kind === 'MONTH' ? 'Mensuelle' : 'À la demande'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(archive.generated_at)}</TableCell>
                        <TableCell>{formatSize(archive.size_bytes)}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => copyHash(archive.sha256)}
                            className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                            title={archive.sha256}
                          >
                            {archive.sha256.slice(0, 12)}…{archive.sha256.slice(-6)}
                            <Copy className="h-3 w-3" />
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleDownload(archive)}
                            disabled={downloadingId === archive.id}
                          >
                            <Download className="h-4 w-4" />
                            {downloadingId === archive.id ? '...' : 'Télécharger'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <FiscalIntegrityCard />
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default FiscalArchives;
