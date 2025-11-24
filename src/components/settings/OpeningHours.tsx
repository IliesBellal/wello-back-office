import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const mockHours = [
  { day: "Lundi", hours: "09:00 - 18:00" },
  { day: "Mardi", hours: "09:00 - 18:00" },
  { day: "Mercredi", hours: "09:00 - 18:00" },
  { day: "Jeudi", hours: "09:00 - 18:00" },
  { day: "Vendredi", hours: "09:00 - 22:00" },
  { day: "Samedi", hours: "10:00 - 22:00" },
  { day: "Dimanche", hours: "Fermé" },
];

export const OpeningHours = () => {
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
          {mockHours.map((item) => (
            <div
              key={item.day}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <span className="font-medium text-sm">{item.day}</span>
              <span className="text-sm text-muted-foreground">{item.hours}</span>
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
