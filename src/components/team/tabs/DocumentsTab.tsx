import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  AlertCircle,
} from "lucide-react";

import { planningDocumentsApi } from "@/services/welloApi";
import { qk } from "@/lib/queryKeys";
import type {
  EmployeeDocument,
  EmployeeDocumentType,
} from "@/types/planning";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const DOC_TYPE_LABELS: Record<EmployeeDocumentType, string> = {
  contract: "Contrat",
  id: "Pièce d'identité",
  medical: "Visite médicale",
  other: "Autre",
};

function formatDocDate(raw: string): string {
  try {
    return format(parseISO(raw), "d MMM yyyy", { locale: fr });
  } catch {
    return raw;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  /** The linked `employees` row id, or `null` when no fiche is linked to this account. */
  employeeId: string | null;
  /** Switch the sidesheet to the Contrat tab (to create/link a fiche). */
  onGoToContract: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentsTab({ employeeId, onGoToContract }: DocumentsTabProps) {
  if (!employeeId) {
    return <NoEmployeeLinked onGoToContract={onGoToContract} />;
  }

  return <DocumentsList employeeId={employeeId} />;
}

// ─── No employee linked state ─────────────────────────────────────────────────

function NoEmployeeLinked({ onGoToContract }: { onGoToContract: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">Aucun contrat lié</p>
          <p className="text-xs text-muted-foreground mt-1">
            Une fiche employé doit être créée ou liée (onglet Contrat) avant de pouvoir gérer les documents.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onGoToContract}>
          Aller à l'onglet Contrat
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Documents list + upload ──────────────────────────────────────────────────

function DocumentsList({ employeeId }: { employeeId: string }) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDocument | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: qk.planningEmployees.documents(employeeId),
    queryFn: () => planningDocumentsApi.list(employeeId),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => planningDocumentsApi.delete(employeeId, docId),
    onSuccess: () => {
      toast.success("Document supprimé");
      queryClient.invalidateQueries({ queryKey: qk.planningEmployees.documents(employeeId) });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    },
  });

  const handleDownload = async (doc: EmployeeDocument) => {
    try {
      const url = await planningDocumentsApi.download(employeeId, doc.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du téléchargement");
    }
  };

  return (
    <div className="space-y-4 py-2">
      {/* Header / upload trigger */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Ajouter un document
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Aucun document pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">
                      {DOC_TYPE_LABELS[doc.document_type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDocDate(doc.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(doc)}
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(doc)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        employeeId={employeeId}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Supprimer ce document ?"
        description={`Le document "${deleteTarget?.name ?? ""}" sera supprimé. Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        isDangerous
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMutation.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

// ─── Upload dialog ────────────────────────────────────────────────────────────

function UploadDocumentDialog({
  open,
  onOpenChange,
  employeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<EmployeeDocumentType>("other");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setDocType("other");
    setName("");
    setError(null);
    setSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(picked.type)) {
      setError("Format non supporté. Types acceptés : PDF, JPEG, PNG, WebP.");
      setFile(null);
      return;
    }
    if (picked.size > MAX_FILE_SIZE) {
      setError("Fichier trop volumineux (10 MiB maximum).");
      setFile(null);
      return;
    }
    setFile(picked);
    if (!name) setName(picked.name);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Sélectionnez un fichier.");
      return;
    }
    if (!name.trim()) {
      setError("Donnez un nom au document.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploaded = await planningDocumentsApi.upload(formData);

      await planningDocumentsApi.create(employeeId, {
        document_type: docType,
        name: name.trim(),
        file_key: uploaded.file_key,
        content_type: uploaded.content_type,
      });

      toast.success("Document ajouté");
      queryClient.invalidateQueries({ queryKey: qk.planningEmployees.documents(employeeId) });
      reset();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'upload";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
          <DialogDescription>
            Formats acceptés : PDF, JPEG, PNG, WebP — 10 MiB maximum.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as EmployeeDocumentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DOC_TYPE_LABELS) as Array<[EmployeeDocumentType, string]>).map(
                  ([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-name" className="text-xs">Nom</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Contrat CDI 2026"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-file" className="text-xs">Fichier</Label>
            <Input
              id="doc-file"
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MiB)
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !file}>
            {submitting ? "Envoi…" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
