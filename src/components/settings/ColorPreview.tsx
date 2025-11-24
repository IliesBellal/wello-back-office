import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ColorPreviewProps {
  primaryColor: string;
  textColor: string;
  onPrimaryChange: (color: string) => void;
  onTextChange: (color: string) => void;
}

export const ColorPreview = ({ primaryColor, textColor, onPrimaryChange, onTextChange }: ColorPreviewProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primary_color">Couleur principale</Label>
          <div className="flex gap-2">
            <Input
              id="primary_color"
              type="color"
              value={primaryColor}
              onChange={(e) => onPrimaryChange(e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={primaryColor}
              onChange={(e) => onPrimaryChange(e.target.value)}
              placeholder="#00b894"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="text_color">Couleur du texte</Label>
          <div className="flex gap-2">
            <Input
              id="text_color"
              type="color"
              value={textColor}
              onChange={(e) => onTextChange(e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={textColor}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground mb-3">Aperçu :</p>
        <Button
          style={{
            backgroundColor: primaryColor,
            color: textColor
          }}
          className="w-full"
        >
          Exemple de bouton
        </Button>
      </div>
    </div>
  );
};
