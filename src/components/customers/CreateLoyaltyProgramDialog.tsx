import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createLoyaltyProgram, getProducts, CreateLoyaltyProgramPayload } from "@/services/customersService";

const formSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  type: z.enum(["orders_count", "total_spent", "product_count"]),
  target_value: z.number().min(1, "La valeur cible doit être supérieure à 0"),
  target_order_types: z.array(z.string()).min(1, "Sélectionnez au moins un type de commande"),
  target_products: z.array(z.string()).optional(),
  reward_type: z.enum(["fixed_discount", "percent_discount", "free_product"]),
  reward_value: z.number().min(0),
  reward_products: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateLoyaltyProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const orderTypes = [
  { value: "IN", label: "Sur Place" },
  { value: "TAKE_AWAY", label: "Emporter" },
  { value: "DELIVERY", label: "Livraison" },
];

const CreateLoyaltyProgramDialog = ({ open, onOpenChange, onSuccess }: CreateLoyaltyProgramDialogProps) => {
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "orders_count",
      target_value: 10,
      target_order_types: ["IN", "TAKE_AWAY", "DELIVERY"],
      target_products: [],
      reward_type: "percent_discount",
      reward_value: 10,
      reward_products: [],
    },
  });

  const watchRewardType = form.watch("reward_type");
  const watchType = form.watch("type");

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload: CreateLoyaltyProgramPayload = {
        name: values.name,
        description: values.description || "",
        type: values.type,
        target_value: values.type === "total_spent" ? values.target_value * 100 : values.target_value,
        target_order_types: values.target_order_types,
        target_products: values.target_products,
        reward_type: values.reward_type,
        reward_value: values.reward_type === "fixed_discount" ? values.reward_value * 100 : values.reward_value,
        reward_products: values.reward_products,
      };

      await createLoyaltyProgram(payload);
      toast.success("Programme de fidélité créé");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayValue = (array: string[], value: string): string[] => {
    return array.includes(value)
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un Programme de Fidélité</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du programme</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 10 commandes = 1 offerte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description du programme..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de programme</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="orders_count">Nombre de commandes</SelectItem>
                      <SelectItem value="total_spent">Montant dépensé</SelectItem>
                      <SelectItem value="product_count">Nombre de produits</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Objectif {watchType === "total_spent" ? "(€)" : ""}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_order_types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Types de commande éligibles</FormLabel>
                  <div className="flex flex-wrap gap-4">
                    {orderTypes.map(type => (
                      <div key={type.value} className="flex items-center gap-2">
                        <Checkbox
                          id={type.value}
                          checked={field.value.includes(type.value)}
                          onCheckedChange={() => {
                            field.onChange(toggleArrayValue(field.value, type.value));
                          }}
                        />
                        <Label htmlFor={type.value} className="cursor-pointer">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchType === "product_count" && (
              <FormField
                control={form.control}
                name="target_products"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produits cibles</FormLabel>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {products.map(product => (
                        <div key={product.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`target-${product.id}`}
                            checked={field.value?.includes(product.id)}
                            onCheckedChange={() => {
                              field.onChange(toggleArrayValue(field.value || [], product.id));
                            }}
                          />
                          <Label htmlFor={`target-${product.id}`} className="cursor-pointer text-sm">
                            {product.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="reward_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de récompense</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fixed_discount">Réduction fixe (€)</SelectItem>
                      <SelectItem value="percent_discount">Réduction en %</SelectItem>
                      <SelectItem value="free_product">Produit offert</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchRewardType !== "free_product" && (
              <FormField
                control={form.control}
                name="reward_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valeur de la récompense {watchRewardType === "fixed_discount" ? "(€)" : "(%)"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchRewardType === "free_product" && (
              <FormField
                control={form.control}
                name="reward_products"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produits offerts</FormLabel>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {products.map(product => (
                        <div key={product.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`reward-${product.id}`}
                            checked={field.value?.includes(product.id)}
                            onCheckedChange={() => {
                              field.onChange(toggleArrayValue(field.value || [], product.id));
                            }}
                          />
                          <Label htmlFor={`reward-${product.id}`} className="cursor-pointer text-sm">
                            {product.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer le programme"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLoyaltyProgramDialog;
