import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, ExternalLink, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface FranchiseHubLinkProps {
  hubUrl: string;
  slug: string;
}

/** Adresse publique du hub : copier, ouvrir, QR code à télécharger. */
export function FranchiseHubLink({ hubUrl, slug }: FranchiseHubLinkProps) {
  const { toast } = useToast();
  const [qrOpen, setQrOpen] = useState(false);
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hubUrl);
      toast({ title: "Adresse copiée" });
    } catch {
      toast({ title: "Impossible de copier l'adresse", variant: "destructive" });
    }
  };

  const downloadQr = () => {
    const canvas = qrWrapperRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `qr-franchise-${slug}.png`;
    link.click();
  };

  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm text-muted-foreground mb-2">Page hub :</p>
      <div className="flex items-center gap-2 flex-wrap">
        <code className="px-3 py-2 bg-muted rounded text-sm font-mono truncate max-w-full">{hubUrl}</code>
        <Button variant="ghost" size="icon" onClick={copy} title="Copier l'adresse" className="flex-shrink-0">
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.open(hubUrl, "_blank", "noopener,noreferrer")}
          title="Ouvrir dans un nouvel onglet"
          className="flex-shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setQrOpen(true)} title="QR code" className="flex-shrink-0">
          <QrCode className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR code du hub</DialogTitle>
            <DialogDescription>À imprimer sur vos supports : il ouvre la page qui liste vos établissements.</DialogDescription>
          </DialogHeader>
          <div ref={qrWrapperRef} className="flex justify-center rounded-lg bg-white p-4">
            <QRCodeCanvas value={hubUrl} size={240} marginSize={2} level="M" />
          </div>
          <DialogFooter>
            <Button onClick={downloadQr} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Télécharger (PNG)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
