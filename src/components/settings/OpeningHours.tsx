import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const initialHours = [
  { id: 1, day: "Lundi", hours: "09:00 - 18:00" },
  { id: 2, day: "Mardi", hours: "09:00 - 18:00" },
  { id: 3, day: "Mercredi", hours: "09:00 - 18:00" },
  { id: 4, day: "Jeudi", hours: "09:00 - 18:00" },
  { id: 5, day: "Vendredi", hours: "09:00 - 22:00" },
  { id: 6, day: "Samedi", hours: "10:00 - 22:00" },
  { id: 7, day: "Dimanche", hours: "Fermé" },
];

export const OpeningHours = () => {
  const [hours, setHours] = useState(initialHours);

  const handleDelete = (id: number) => {
    setHours(hours.filter(h => h.id !== id));
    toast({
      title: "Horaire supprimé",
      description: "L'horaire a été supprimé avec succès"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Horaires d'ouverture
        </CardTitle>
        <CardDescription>
          Définissez les horaires d'ouverture de votre établissement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {hours.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 group"
            >
              <span className="font-medium text-sm">{item.day}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{item.hours}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full mt-4">
            Modifier les horaires
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
