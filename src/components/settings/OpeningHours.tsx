import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Trash2, Plus } from "lucide-react";
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

const daysOfWeek = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const OpeningHours = () => {
  const [hours, setHours] = useState(initialHours);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newHour, setNewHour] = useState({ day: "", startTime: "", endTime: "" });

  const handleDelete = (id: number) => {
    setHours(hours.filter(h => h.id !== id));
    toast({
      title: "Horaire supprimé",
      description: "L'horaire a été supprimé avec succès"
    });
  };

  const handleAddHour = () => {
    if (!newHour.day || !newHour.startTime || !newHour.endTime) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    const newId = Math.max(...hours.map(h => h.id), 0) + 1;
    setHours([...hours, {
      id: newId,
      day: newHour.day,
      hours: `${newHour.startTime} - ${newHour.endTime}`
    }]);

    toast({
      title: "Horaire ajouté",
      description: "L'horaire a été ajouté avec succès"
    });

    setNewHour({ day: "", startTime: "", endTime: "" });
    setShowAddDialog(false);
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
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un horaire
          </Button>
        </div>
      </CardContent>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un horaire</DialogTitle>
            <DialogDescription>
              Définissez un nouvel horaire d'ouverture
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Jour</Label>
              <Select value={newHour.day} onValueChange={(value) => setNewHour({ ...newHour, day: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un jour" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Heure de début</Label>
                <Input
                  type="time"
                  value={newHour.startTime}
                  onChange={(e) => setNewHour({ ...newHour, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>Heure de fin</Label>
                <Input
                  type="time"
                  value={newHour.endTime}
                  onChange={(e) => setNewHour({ ...newHour, endTime: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddHour}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
