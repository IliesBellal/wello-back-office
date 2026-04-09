import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportButtonProps {
  onExport: () => Promise<Blob>;
  filename: string;
  isLoading?: boolean;
}

/**
 * Bouton pour exporter les données en CSV
 */
export function ExportButton({
  onExport,
  filename,
  isLoading = false,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleDownload = async () => {
    try {
      setExporting(true);
      const blob = await onExport();
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Nettoyer
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Export téléchargé avec succès');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isLoading || exporting}
      variant="outline"
      size="sm"
    >
      <Download className="w-4 h-4 mr-2" />
      {exporting ? 'Export en cours...' : 'Exporter CSV'}
    </Button>
  );
}
