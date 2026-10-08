import { useState } from 'react';
import { differenceInCalendarDays, startOfMonth, subDays } from 'date-fns';
import { Download, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { FiscalIntegrityResult, fiscalArchivesService } from '@/services/fiscalArchivesService';

/** Même borne que l'API (fiscalIntegrityMaxDays). */
const MAX_DAYS = 31;

/**
 * Contrôle d'intégrité des données fiscales (conformité caisse, lot E) : le
 * restaurateur le lance lui-même sur une période. L'API rejoue les chaînes
 * signées, la numérotation des tickets, les clôtures et les archives, et rend
 * un rapport, téléchargeable en texte. Lecture seule.
 */
export const FiscalIntegrityCard = () => {
  const yesterday = subDays(new Date(), 1);
  const [range, setRange] = useState({ from: startOfMonth(yesterday), to: yesterday });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FiscalIntegrityResult | null>(null);

  const days = differenceInCalendarDays(range.to, range.from) + 1;
  const tooLong = days > MAX_DAYS;

  const handleRun = async () => {
    setRunning(true);
    try {
      setResult(await fiscalArchivesService.verifyIntegrity(range.from, range.to));
    } catch {
      // Refus et erreurs : message déjà affiché par apiClient.
    } finally {
      setRunning(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `controle_integrite_${result.report.du}_${result.report.au}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const report = result?.report;
  const anomalies = report?.anomalies ?? [];

  return (
    <Card className="shadow-card rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-5 w-5" />
          Contrôle d'intégrité
        </CardTitle>
        <CardDescription>
          Vérifie que vos tickets, paiements, clôtures, registres, journal et archives n'ont pas été modifiés
          depuis leur enregistrement : chaque donnée est rejouée et son empreinte signée comparée. Rien n'est
          modifié. {MAX_DAYS} jours au plus par contrôle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker dateRange={range} onDateRangeChange={setRange} />
          <Button onClick={handleRun} disabled={running || tooLong} className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            {running ? 'Contrôle en cours...' : 'Lancer le contrôle'}
          </Button>
        </div>
        {tooLong && (
          <p className="text-xs text-destructive">
            Période de {days} jours : choisissez {MAX_DAYS} jours au plus.
          </p>
        )}

        {report && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge variant={report.erreurs === 0 ? 'secondary' : 'destructive'}>
                  {report.erreurs === 0 ? 'Conforme' : 'Non conforme'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {report.erreurs} erreur(s), {report.avertissements} avertissement(s) · {report.logiciel}{' '}
                  {report.version}
                </span>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Télécharger le rapport
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrôle</TableHead>
                  <TableHead className="text-right">Éléments</TableHead>
                  <TableHead className="text-right">Erreurs</TableHead>
                  <TableHead className="text-right">Avertissements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.controles.map((check) => (
                  <TableRow key={check.controle}>
                    <TableCell>{check.libelle}</TableCell>
                    <TableCell className="text-right">{check.elements_controles}</TableCell>
                    <TableCell className={`text-right ${check.erreurs > 0 ? 'text-destructive font-semibold' : ''}`}>
                      {check.erreurs}
                    </TableCell>
                    <TableCell className="text-right">{check.avertissements}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {anomalies.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-semibold">Anomalies</p>
                <ul className="space-y-1 text-xs">
                  {anomalies.map((finding, index) => (
                    <li key={index} className={finding.gravite === 'ERREUR' ? 'text-destructive' : 'text-muted-foreground'}>
                      [{finding.gravite === 'ERREUR' ? 'Erreur' : 'Avertissement'}] {finding.message}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Les avertissements portent sur des données antérieures à la version attestée du logiciel, ou sur
                  des écarts connus et tracés. Une erreur est à signaler à WelloResto.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FiscalIntegrityCard;
