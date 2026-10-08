import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, FileSignature, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Attestation as AttestationRecord, attestationsService } from '@/services/attestationsService';

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
};

/**
 * Attestation de conformité du logiciel de caisse (conformité caisse, lot F ;
 * modèle BOI-LETTRE-000242). Le restaurateur l'obtient lui-même : volet 1
 * pré-signé par WelloResto, volet 2 complété ici et signé électroniquement
 * par le représentant légal. Liste, téléchargement et envoi au comptable.
 */
const Attestation = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['attestations'],
    queryFn: () => attestationsService.overview(),
  });

  const [signerName, setSignerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [usageStartDate, setUsageStartDate] = useState('');
  const [certify, setCertify] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [emailTarget, setEmailTarget] = useState<AttestationRecord | null>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!data) return;
    setCompanyName((value) => value || data.prefill.company_name);
    setCity((value) => value || data.prefill.city);
    setAcquisitionDate((value) => value || data.prefill.acquisition_date);
    setUsageStartDate((value) => value || data.prefill.usage_start_date);
  }, [data]);

  const canGenerate =
    !!data?.available &&
    !generating &&
    certify &&
    signerName.trim() !== '' &&
    companyName.trim() !== '' &&
    city.trim() !== '' &&
    acquisitionDate !== '' &&
    usageStartDate !== '';

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await attestationsService.generate({
        signer_name: signerName.trim(),
        company_name: companyName.trim(),
        city: city.trim(),
        acquisition_date: acquisitionDate,
        usage_start_date: usageStartDate,
        certify,
      });
      toast.success('Attestation générée et signée.');
      setCertify(false);
      window.open(result.download_url, '_blank');
      await queryClient.invalidateQueries({ queryKey: ['attestations'] });
    } catch {
      // Refus de l'API : message déjà affiché par apiClient.
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (record: AttestationRecord) => {
    try {
      window.open(await attestationsService.getLink(record.id), '_blank');
    } catch {
      // Message déjà affiché par apiClient.
    }
  };

  const handleSend = async () => {
    if (!emailTarget) return;
    setSending(true);
    try {
      await attestationsService.email(emailTarget.id, email.trim());
      toast.success(`Attestation envoyée à ${email.trim()}.`);
      setEmailTarget(null);
      setEmail('');
    } catch {
      // Message déjà affiché par apiClient.
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <PageContainer header={<h1 className="text-3xl font-bold text-foreground">Attestation de conformité</h1>}>
        <div className="space-y-6">
          <Card className="shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileSignature className="h-5 w-5" />
                Attestation individuelle de l'éditeur
              </CardTitle>
              <CardDescription>
                Elle justifie, en cas de contrôle fiscal, que votre logiciel de caisse
                {data ? ` ${data.software} ${data.version}` : ''} respecte les conditions d'inaltérabilité, de
                sécurisation, de conservation et d'archivage des données (article 286 du code général des impôts,
                modèle BOI-LETTRE-000242). Le volet 1 est pré-rempli et signé par WelloResto. Le volet 2 est
                complété ci-dessous et signé électroniquement par le représentant légal de votre société. Une
                nouvelle attestation est nécessaire à chaque nouvelle version majeure du logiciel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : isError || !data ? (
                <p className="text-sm text-destructive">Impossible de charger l'attestation.</p>
              ) : !data.available ? (
                <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {data.unavailable_reason}
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="att-company">Raison sociale</Label>
                      <Input id="att-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="att-siret">SIRET</Label>
                      <Input id="att-siret" value={data.prefill.siret} disabled />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="att-acquisition">Date d'acquisition du logiciel</Label>
                      <Input id="att-acquisition" type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="att-usage">Utilisé pour enregistrer les règlements depuis le</Label>
                      <Input id="att-usage" type="date" value={usageStartDate} onChange={(e) => setUsageStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="att-signer">Nom et prénom du représentant légal</Label>
                      <Input id="att-signer" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="NOM Prénom" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="att-city">Fait à (ville)</Label>
                      <Input id="att-city" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-md border border-border p-3">
                    <Checkbox id="att-certify" checked={certify} onCheckedChange={(checked) => setCertify(checked === true)} />
                    <Label htmlFor="att-certify" className="cursor-pointer text-sm font-normal leading-5">
                      Je certifie être le représentant légal de la société indiquée et l'exactitude des informations
                      ci-dessus. Je signe électroniquement le volet 2 de l'attestation. L'établissement d'une fausse
                      attestation est un délit (code pénal, art. 441-1).
                    </Label>
                  </div>
                  <Button onClick={handleGenerate} disabled={!canGenerate} className="gap-2">
                    <FileSignature className="h-4 w-4" />
                    {generating ? 'Génération...' : "Signer et générer l'attestation"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-foreground">Attestations</CardTitle>
            </CardHeader>
            <CardContent>
              {!data || data.attestations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune attestation pour le moment.</p>
              ) : (
                <div className="divide-y divide-border rounded-md border border-border">
                  {data.attestations.map((record) => (
                    <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          {record.software} {record.version} — {record.company_name}
                          {record.obsolete && <Badge variant="destructive">Périmée : nouvelle version majeure</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Signée par {record.signer_name} le {formatDateTime(record.signed_at)} · réf. {record.reference}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleDownload(record)}>
                          <Download className="h-4 w-4" />
                          Télécharger
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setEmailTarget(record)}>
                          <Mail className="h-4 w-4" />
                          Envoyer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={emailTarget !== null} onOpenChange={(open) => !open && setEmailTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Envoyer l'attestation</DialogTitle>
              <DialogDescription>L'attestation est envoyée en pièce jointe (à votre comptable, par exemple).</DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
              <Label htmlFor="att-email">Adresse e-mail</Label>
              <Input id="att-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="comptable@exemple.fr" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailTarget(null)}>
                Annuler
              </Button>
              <Button onClick={handleSend} disabled={sending || email.trim() === ''} className="gap-2">
                <Mail className="h-4 w-4" />
                {sending ? 'Envoi...' : 'Envoyer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Attestation;
