import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { User, usersService, UserActivity } from '@/services/usersService';
import { permissionsConfig, activityTypeLabels } from '@/config/usersConfig';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const formSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(1, 'Le téléphone est requis'),
  color: z.string(),
  pin_code: z.string().optional(),
  permissions: z.record(z.boolean()),
  address: z.object({
    street_number: z.string().optional(),
    street: z.string().optional(),
    zip_code: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface UserEditSheetProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UserEditSheet({ user, open, onOpenChange, onSuccess }: UserEditSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      color: '#3b82f6',
      pin_code: '',
      permissions: {},
      address: {},
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        color: user.color,
        pin_code: '',
        permissions: user.permissions,
        address: user.address || {},
      });
      setActiveTab('profile');
      setActivities([]);
    }
  }, [user, open, form]);

  useEffect(() => {
    if (activeTab === 'activity' && user && activities.length === 0) {
      setLoadingActivity(true);
      usersService.getUserActivity(user.id)
        .then(setActivities)
        .finally(() => setLoadingActivity(false));
    }
  }, [activeTab, user, activities.length]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const payload: any = {
        user_id: user.id,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone,
        color: values.color,
        permissions: values.permissions,
        address: values.address,
      };

      if (values.pin_code && values.pin_code.length > 0) {
        payload.pin_code = values.pin_code;
      }

      await usersService.updateUser(payload);
      toast({
        title: 'Utilisateur mis à jour',
        description: 'Les modifications ont été enregistrées.',
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour l\'utilisateur.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatActivityDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return `Aujourd'hui ${format(date, 'HH:mm')}`;
    }
    if (isYesterday(date)) {
      return `Hier ${format(date, 'HH:mm')}`;
    }
    return format(date, "d MMM HH:mm", { locale: fr });
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: user.color }}
            >
              {user.first_name[0]}{user.last_name[0]}
            </div>
            {user.first_name} {user.last_name}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="activity">Activité</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TabsContent value="profile" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Identité</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Couleur (POS)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={field.value}
                              onChange={field.onChange}
                              className="w-10 h-10 rounded-md border cursor-pointer"
                            />
                            <Input {...field} className="flex-1" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Coordonnées</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="address.street_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N°</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address.street"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Rue</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address.zip_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code Postal</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onOpenChange(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pin_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code PIN</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Définir nouveau PIN" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Laissez vide pour ne pas modifier
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="space-y-4">
                    {permissionsConfig.map((perm) => (
                      <FormField
                        key={perm.key}
                        control={form.control}
                        name={`permissions.${perm.key}`}
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">{perm.label}</FormLabel>
                              <FormDescription>{perm.description}</FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onOpenChange(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                {loadingActivity ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune activité récente
                  </p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {activities.map((activity, index) => {
                        const config = activityTypeLabels[activity.type] || {
                          label: activity.type,
                          color: 'text-foreground'
                        };
                        
                        return (
                          <div key={index} className="flex gap-4 relative">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center z-10">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                            <div className="flex-1 pt-2">
                              <p className={`font-medium ${config.color}`}>
                                {config.label}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatActivityDate(activity.date)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>
            </form>
          </Form>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
