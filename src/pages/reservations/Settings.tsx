import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer, TabSystem } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  ReservationArea,
  ReservationServiceWindow,
  ReservationSettings,
  getReservationAreas,
  getReservationServiceWindows,
  getReservationSettings,
  updateReservationSettings,
} from '@/services/reservationsService';
import { BellRing, Clock3, LayoutGrid, UsersRound } from 'lucide-react';

type BooleanSettingKey =
  | 'autoConfirmOnline'
  | 'sendSmsReminders'
  | 'sendEmailReminders'
  | 'enableWaitlist'
  | 'allowWalkInsOnFullService'
  | 'collectDeposit';

type NumberSettingKey =
  | 'bookingWindowDays'
  | 'maxPartySize'
  | 'defaultDurationMinutes'
  | 'slotIntervalMinutes'
  | 'reminderLeadHours'
  | 'depositAmount';

const toggleFields: Array<{ key: BooleanSettingKey; label: string; description: string }> = [
  {
    key: 'autoConfirmOnline',
    label: 'Confirmer automatiquement les demandes web',
    description: 'Bascule mockee pour valider le parcours de confirmation automatique.',
  },
  {
    key: 'sendSmsReminders',
    label: 'Envoyer des rappels SMS',
    description: 'Active les rappels SMS avant le service pour les reservations confirmees.',
  },
  {
    key: 'sendEmailReminders',
    label: 'Envoyer des rappels email',
    description: 'Active les rappels email pour les reservations prises en ligne.',
  },
  {
    key: 'enableWaitlist',
    label: 'Activer la liste d attente',
    description: 'Permet de conserver des demandes lorsque le service est complet.',
  },
  {
    key: 'allowWalkInsOnFullService',
    label: 'Autoriser les placements manuels sur service complet',
    description: 'Maintient la possibilite de saisir une reservation sur place meme a capacite atteinte.',
  },
  {
    key: 'collectDeposit',
    label: 'Activer l acompte',
    description: 'Simule la collecte d un acompte pour les groupes et evenements.',
  },
];

const numberFields: Array<{ key: NumberSettingKey; label: string; description: string; min: number }> = [
  {
    key: 'bookingWindowDays',
    label: 'Fenetre de reservation (jours)',
    import { useEffect, useMemo, useState } from "react";
    import { zodResolver } from "@hookform/resolvers/zod";
    import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
    import { useForm } from "react-hook-form";
    import { z } from "zod";
    import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
    import { PageContainer } from "@/components/shared";
    import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
    import { Badge } from "@/components/ui/badge";
    import { Button } from "@/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
    import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";
    import { Separator } from "@/components/ui/separator";
    import { Skeleton } from "@/components/ui/skeleton";
    import { Switch } from "@/components/ui/switch";
    import { useToast } from "@/hooks/use-toast";
    import { qk } from "@/lib/queryKeys";
    import {
      createBookingDurationRule,
      deleteBookingDurationRule,
      getBookingHours,
      getBookingSettings,
      listBookingDurationRules,
      patchBookingDurationRule,
      putBookingHours,
      putBookingSettings,
      type BookingDurationRule,
      type BookingHour,
      type BookingHourPatch,
      type PutBookingSettingsRequest,
    } from "@/services/reservationsService";
    import { AlertTriangle, Plus, Trash2 } from "lucide-react";

    const dayLabels: Record<number, string> = {
      1: "Lundi",
      2: "Mardi",
      3: "Mercredi",
      4: "Jeudi",
      5: "Vendredi",
      6: "Samedi",
      7: "Dimanche",
    };

    interface EditableDurationRule {
      rule_id: string;
      min_party_size: number;
      max_party_size: number;
      duration_minutes: number;
      enabled: boolean;
      isNew?: boolean;
    }

    interface DayShift {
      uid: string;
      id?: string;
      first_booking_time: string;
      last_booking_time: string;
      booking_capacity: number;
      enabled: boolean;
    }

    interface DaySchedule {
      day: number;
      enabled: boolean;
      shifts: DayShift[];
    }

    const generalSchema = z.object({
      default_booking_duration: z.number().min(30),
      min_booking_notice_minutes: z.number().min(0),
      max_booking_horizon_days: z.number().min(1),
      reserve_minimum_party_size: z.number().min(1),
      reserve_maximum_party_size: z.number().min(1),
      overbooking_percent: z.number().min(0).max(100),
      auto_accept_reserve_bookings: z.boolean(),
      cancelable_by_customer: z.boolean(),
    });

    type GeneralFormValues = z.infer<typeof generalSchema>;

    const toTimeInput = (value?: string): string => {
      if (!value) {
        return "12:00";
      }

      if (value.length >= 5) {
        return value.slice(0, 5);
      }

      return value;
    };

    const toApiTime = (value: string): string => {
      return value.length === 5 ? `${value}:00` : value;
    };

    const hasOverlap = (rules: Array<Pick<EditableDurationRule, "rule_id" | "min_party_size" | "max_party_size">>): boolean => {
      const sorted = [...rules].sort((left, right) => left.min_party_size - right.min_party_size);

      for (let index = 0; index < sorted.length - 1; index += 1) {
        const current = sorted[index];
        const next = sorted[index + 1];
        if (current.max_party_size >= next.min_party_size) {
          return true;
        }
      }

      return false;
    };

    const toDaySchedules = (hours: BookingHour[]): DaySchedule[] => {
      const byDay = new Map<number, DayShift[]>();

      for (let day = 1; day <= 7; day += 1) {
        byDay.set(day, []);
      }

      hours.forEach((hour, hourIndex) => {
        const from = Math.max(1, hour.day_of_week_from);
        const to = Math.min(7, hour.day_of_week_to);

        for (let day = from; day <= to; day += 1) {
          const shifts = byDay.get(day) ?? [];
          shifts.push({
            uid: `${hour.id}-${day}-${hourIndex}`,
            id: hour.id,
            first_booking_time: toTimeInput(hour.first_booking_time ?? hour.hour_from),
            last_booking_time: toTimeInput(hour.last_booking_time ?? hour.hour_to),
            booking_capacity: hour.booking_capacity ?? 0,
            enabled: hour.enabled,
          });
          byDay.set(day, shifts);
        }
      });

      return Array.from({ length: 7 }, (_, index) => {
        const day = index + 1;
        const shifts = byDay.get(day) ?? [];
        return {
          day,
          enabled: shifts.length > 0,
          shifts,
        };
      });
    };

    const toHoursPayload = (days: DaySchedule[]): BookingHourPatch[] => {
      const payload: BookingHourPatch[] = [];

      days.forEach((day) => {
        if (!day.enabled) {
          return;
        }

        day.shifts.forEach((shift) => {
          payload.push({
            id: shift.id,
            day_of_week_from: day.day,
            day_of_week_to: day.day,
            hour_from: toApiTime(shift.first_booking_time),
            hour_to: toApiTime(shift.last_booking_time),
            first_booking_time: toApiTime(shift.first_booking_time),
            last_booking_time: toApiTime(shift.last_booking_time),
            booking_capacity: shift.booking_capacity,
            enabled: shift.enabled,
          });
        });
      });

      return payload;
    };

    const defaultShift = (day: number): DayShift => ({
      uid: `new-${day}-${Date.now()}`,
      first_booking_time: "12:00",
      last_booking_time: "14:00",
      booking_capacity: 0,
      enabled: true,
    });

    const ReservationsSettingsPage = () => {
      const { toast } = useToast();
      const queryClient = useQueryClient();

      const [durationRules, setDurationRules] = useState<EditableDurationRule[]>([]);
      const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);
      const [smsEnabled, setSmsEnabled] = useState(false);

      const settingsQuery = useQuery({
        queryKey: qk.reservations.settings,
        queryFn: getBookingSettings,
      });

      const rulesQuery = useQuery({
        queryKey: qk.reservations.durationRules,
        queryFn: listBookingDurationRules,
      });

      const hoursQuery = useQuery({
        queryKey: qk.reservations.hours,
        queryFn: getBookingHours,
      });

      const form = useForm<GeneralFormValues>({
        resolver: zodResolver(generalSchema),
        defaultValues: {
          default_booking_duration: 90,
          min_booking_notice_minutes: 0,
          max_booking_horizon_days: 30,
          reserve_minimum_party_size: 1,
          reserve_maximum_party_size: 10,
          overbooking_percent: 0,
          auto_accept_reserve_bookings: false,
          cancelable_by_customer: true,
        },
      });

      useEffect(() => {
        if (!settingsQuery.data) {
          return;
        }

        form.reset({
          default_booking_duration: settingsQuery.data.default_booking_duration,
          min_booking_notice_minutes: settingsQuery.data.min_booking_notice_minutes,
          max_booking_horizon_days: settingsQuery.data.max_booking_horizon_days,
          reserve_minimum_party_size: settingsQuery.data.reserve_minimum_party_size,
          reserve_maximum_party_size: settingsQuery.data.reserve_maximum_party_size,
          overbooking_percent: settingsQuery.data.overbooking_percent,
          auto_accept_reserve_bookings: settingsQuery.data.auto_accept_reserve_bookings,
          cancelable_by_customer: settingsQuery.data.cancelable_by_customer,
        });
      }, [form, settingsQuery.data]);

      useEffect(() => {
        if (!rulesQuery.data) {
          return;
        }

        const mappedRules: EditableDurationRule[] = [...rulesQuery.data]
          .sort((left, right) => left.min_party_size - right.min_party_size)
          .map((rule) => ({ ...rule }));
        setDurationRules(mappedRules);
      }, [rulesQuery.data]);

      useEffect(() => {
        if (!hoursQuery.data) {
          return;
        }

        setDaySchedules(toDaySchedules(hoursQuery.data));
      }, [hoursQuery.data]);

      const settingsMutation = useMutation({
        mutationFn: (payload: PutBookingSettingsRequest) => putBookingSettings(payload),
        onSuccess: (updated) => {
          toast({ title: "Paramètres enregistrés" });
          queryClient.setQueryData(qk.reservations.settings, updated);
        },
        onError: () => {
          toast({
            title: "Erreur",
            description: "Impossible d'enregistrer les paramètres généraux.",
            variant: "destructive",
          });
        },
      });

      const saveHoursMutation = useMutation({
        mutationFn: (payload: BookingHourPatch[]) => putBookingHours(payload),
        onSuccess: (hours) => {
          toast({ title: "Horaires enregistrés" });
          queryClient.setQueryData(qk.reservations.hours, hours);
        },
        onError: () => {
          toast({
            title: "Erreur",
            description: "Impossible d'enregistrer les horaires.",
            variant: "destructive",
          });
        },
      });

      const isLoading = settingsQuery.isLoading || rulesQuery.isLoading || hoursQuery.isLoading;

      const capacityWarning = settingsQuery.data?.capacity_warning ?? false;
      const physicalCapacity = settingsQuery.data?.physical_capacity ?? 0;

      const canSaveGeneral = !settingsMutation.isPending && Boolean(settingsQuery.data);

      const saveGeneral = (values: GeneralFormValues) => {
        if (!settingsQuery.data) {
          return;
        }

        if (values.reserve_minimum_party_size > values.reserve_maximum_party_size) {
          form.setError("reserve_minimum_party_size", {
            type: "manual",
            message: "La taille minimale doit être inférieure ou égale à la taille maximale.",
          });
          return;
        }

        const payload: PutBookingSettingsRequest = {
          enabled: settingsQuery.data.enabled,
          code: settingsQuery.data.code,
          slot_interval_minutes: settingsQuery.data.slot_interval_minutes,
          last_booking_offset_minutes: settingsQuery.data.last_booking_offset_minutes,
          cancel_booking_limit_offset_hours: settingsQuery.data.cancel_booking_limit_offset_hours,
          pending_expiration_hours: settingsQuery.data.pending_expiration_hours,
          default_booking_duration: values.default_booking_duration,
          min_booking_notice_minutes: values.min_booking_notice_minutes,
          max_booking_horizon_days: values.max_booking_horizon_days,
          reserve_minimum_party_size: values.reserve_minimum_party_size,
          reserve_maximum_party_size: values.reserve_maximum_party_size,
          overbooking_percent: values.overbooking_percent,
          auto_accept_reserve_bookings: values.auto_accept_reserve_bookings,
          cancelable_by_customer: values.cancelable_by_customer,
        };

        settingsMutation.mutate(payload);
      };

      const addRule = () => {
        const newRule: EditableDurationRule = {
          rule_id: `new-${Date.now()}`,
          min_party_size: 1,
          max_party_size: 1,
          duration_minutes: 90,
          enabled: true,
          isNew: true,
        };

        setDurationRules((previous) => [...previous, newRule].sort((a, b) => a.min_party_size - b.min_party_size));
      };

      const updateRuleDraft = (
        ruleId: string,
        field: keyof Omit<EditableDurationRule, "rule_id" | "isNew">,
        value: number | boolean,
      ) => {
        setDurationRules((previous) => previous.map((rule) => {
          if (rule.rule_id !== ruleId) {
            return rule;
          }
          return {
            ...rule,
            [field]: value,
          };
        }));
      };

      const saveRule = async (rule: EditableDurationRule) => {
        if (rule.min_party_size <= 0 || rule.max_party_size <= 0 || rule.duration_minutes <= 0 || rule.min_party_size > rule.max_party_size) {
          toast({
            title: "Validation",
            description: "Vérifiez min/max couverts et durée.",
            variant: "destructive",
          });
          return;
        }

        const rulesWithoutCurrent = durationRules
          .filter((item) => item.rule_id !== rule.rule_id)
          .map((item) => ({
            rule_id: item.rule_id,
            min_party_size: item.min_party_size,
            max_party_size: item.max_party_size,
          }));

        const overlap = hasOverlap([...rulesWithoutCurrent, {
          rule_id: rule.rule_id,
          min_party_size: rule.min_party_size,
          max_party_size: rule.max_party_size,
        }]);

        if (overlap) {
          toast({
            title: "Validation",
            description: "Les tranches de durée ne doivent pas se chevaucher.",
            variant: "destructive",
          });
          return;
        }

        try {
          if (rule.isNew) {
            const created = await createBookingDurationRule({
              min_party_size: rule.min_party_size,
              max_party_size: rule.max_party_size,
              duration_minutes: rule.duration_minutes,
            });

            setDurationRules((previous) => previous
              .map((item) => item.rule_id === rule.rule_id ? { ...created } : item)
              .sort((a, b) => a.min_party_size - b.min_party_size));
          } else {
            const updated = await patchBookingDurationRule(rule.rule_id, {
              min_party_size: rule.min_party_size,
              max_party_size: rule.max_party_size,
              duration_minutes: rule.duration_minutes,
            });

            setDurationRules((previous) => previous
              .map((item) => item.rule_id === rule.rule_id ? { ...updated } : item)
              .sort((a, b) => a.min_party_size - b.min_party_size));
          }

          await queryClient.invalidateQueries({ queryKey: qk.reservations.durationRules });
          await queryClient.invalidateQueries({ queryKey: qk.reservations.settings });
          toast({ title: "Règle enregistrée" });
        } catch {
          toast({
            title: "Erreur",
            description: "Impossible d'enregistrer cette règle.",
            variant: "destructive",
          });
        }
      };

      const deleteRule = async (rule: EditableDurationRule) => {
        if (rule.isNew) {
          setDurationRules((previous) => previous.filter((item) => item.rule_id !== rule.rule_id));
          return;
        }

        try {
          await deleteBookingDurationRule(rule.rule_id);
          setDurationRules((previous) => previous.filter((item) => item.rule_id !== rule.rule_id));
          await queryClient.invalidateQueries({ queryKey: qk.reservations.durationRules });
          await queryClient.invalidateQueries({ queryKey: qk.reservations.settings });
          toast({ title: "Règle supprimée" });
        } catch {
          toast({
            title: "Erreur",
            description: "Impossible de supprimer cette règle.",
            variant: "destructive",
          });
        }
      };

      const toggleDay = (day: number, enabled: boolean) => {
        setDaySchedules((previous) => previous.map((schedule) => {
          if (schedule.day !== day) {
            return schedule;
          }

          if (enabled && schedule.shifts.length === 0) {
            return {
              ...schedule,
              enabled,
              shifts: [defaultShift(day)],
            };
          }

          return {
            ...schedule,
            enabled,
          };
        }));
      };

      const addShift = (day: number) => {
        setDaySchedules((previous) => previous.map((schedule) => {
          if (schedule.day !== day) {
            return schedule;
          }

          return {
            ...schedule,
            enabled: true,
            shifts: [...schedule.shifts, defaultShift(day)],
          };
        }));
      };

      const removeShift = (day: number, shiftUid: string) => {
        setDaySchedules((previous) => previous.map((schedule) => {
          if (schedule.day !== day) {
            return schedule;
          }

          return {
            ...schedule,
            shifts: schedule.shifts.filter((shift) => shift.uid !== shiftUid),
          };
        }));
      };

      const updateShift = (
        day: number,
        shiftUid: string,
        field: keyof Omit<DayShift, "uid" | "id">,
        value: string | number | boolean,
      ) => {
        setDaySchedules((previous) => previous.map((schedule) => {
          if (schedule.day !== day) {
            return schedule;
          }

          return {
            ...schedule,
            shifts: schedule.shifts.map((shift) => {
              if (shift.uid !== shiftUid) {
                return shift;
              }

              return {
                ...shift,
                [field]: value,
              };
            }),
          };
        }));
      };

      const saveHours = () => {
        for (const day of daySchedules) {
          if (!day.enabled) {
            continue;
          }

          for (const shift of day.shifts) {
            if (!shift.first_booking_time || !shift.last_booking_time) {
              toast({
                title: "Validation",
                description: `Renseignez les horaires pour ${dayLabels[day.day]}.`,
                variant: "destructive",
              });
              return;
            }

            if (shift.first_booking_time >= shift.last_booking_time) {
              toast({
                title: "Validation",
                description: `Le premier horaire doit être avant le dernier (${dayLabels[day.day]}).`,
                variant: "destructive",
              });
              return;
            }
          }
        }

        const payload = toHoursPayload(daySchedules);
        saveHoursMutation.mutate(payload);
      };

      if (isLoading) {
        return (
          <DashboardLayout>
            <PageContainer
              header={<h1 className="text-3xl font-bold text-foreground">Paramètres réservations</h1>}
              description="Configurez les règles de réservation"
            >
              <div className="space-y-4">
                {[1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-40" />
                ))}
              </div>
            </PageContainer>
          </DashboardLayout>
        );
      }

      return (
        <DashboardLayout>
          <PageContainer
            header={<h1 className="text-3xl font-bold text-foreground">Paramètres réservations</h1>}
            description="Configurez les règles de réservation pour l'équipe et le canal web"
          >
            <div className="space-y-6">
              {capacityWarning && (
                <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Capacité supérieure à la capacité physique</AlertTitle>
                  <AlertDescription>
                    La capacité configurée dépasse la capacité physique des tables ({physicalCapacity} couverts).
                    Vous pouvez enregistrer, mais il est recommandé d'ajuster les paramètres.
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Général</CardTitle>
                  <CardDescription>Règles globales de prise de réservation.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form className="space-y-4" onSubmit={form.handleSubmit(saveGeneral)}>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="default_booking_duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Durée de table par défaut (minutes)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={30}
                                  value={field.value}
                                  onChange={(event) => field.onChange(Number(event.target.value || 0))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="min_booking_notice_minutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Préavis minimum (minutes)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  value={field.value}
                                  onChange={(event) => field.onChange(Number(event.target.value || 0))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="max_booking_horizon_days"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fenêtre maximum (jours)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  value={field.value}
                                  onChange={(event) => field.onChange(Number(event.target.value || 0))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="reserve_minimum_party_size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taille groupe min</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  value={field.value}
                                  onChange={(event) => field.onChange(Number(event.target.value || 0))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="reserve_maximum_party_size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taille groupe max</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  value={field.value}
                                  onChange={(event) => field.onChange(Number(event.target.value || 0))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="overbooking_percent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Overbooking (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={field.value}
                                  onChange={(event) => field.onChange(Number(event.target.value || 0))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="auto_accept_reserve_bookings"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-md border px-4 py-3">
                              <div>
                                <FormLabel>Acceptation automatique</FormLabel>
                                <p className="text-sm text-muted-foreground">Accepter automatiquement les demandes web.</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cancelable_by_customer"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-md border px-4 py-3">
                              <div>
                                <FormLabel>Annulation par le client</FormLabel>
                                <p className="text-sm text-muted-foreground">Autoriser l'annulation depuis le canal client.</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={!canSaveGeneral}>
                          {settingsMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Durées par tranche</CardTitle>
                  <CardDescription>
                    Définissez les règles de durée par taille de groupe. Les plages ne doivent pas se chevaucher.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {durationRules.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucune règle configurée.</p>
                  )}

                  {durationRules.map((rule) => (
                    <div key={rule.rule_id} className="grid gap-3 rounded-md border p-3 md:grid-cols-12 md:items-end">
                      <div className="md:col-span-2">
                        <Label>Min</Label>
                        <Input
                          type="number"
                          min={1}
                          value={rule.min_party_size}
                          onChange={(event) => updateRuleDraft(rule.rule_id, "min_party_size", Number(event.target.value || 0))}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Max</Label>
                        <Input
                          type="number"
                          min={1}
                          value={rule.max_party_size}
                          onChange={(event) => updateRuleDraft(rule.rule_id, "max_party_size", Number(event.target.value || 0))}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Durée (minutes)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={rule.duration_minutes}
                          onChange={(event) => updateRuleDraft(rule.rule_id, "duration_minutes", Number(event.target.value || 0))}
                        />
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2 pb-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => updateRuleDraft(rule.rule_id, "enabled", checked)}
                        />
                        <Badge variant={rule.enabled ? "default" : "secondary"}>{rule.enabled ? "Active" : "Inactive"}</Badge>
                      </div>
                      <div className="md:col-span-3 flex items-center justify-end gap-2">
                        <Button variant="outline" onClick={() => void saveRule(rule)}>Enregistrer</Button>
                        <Button variant="ghost" size="icon" onClick={() => void deleteRule(rule)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" onClick={addRule}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une tranche
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Horaires</CardTitle>
                  <CardDescription>Activez les jours et configurez les shifts de réservation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {daySchedules.map((schedule) => (
                    <div key={schedule.day} className="space-y-3 rounded-md border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{dayLabels[schedule.day]}</p>
                          <p className="text-sm text-muted-foreground">
                            {schedule.enabled ? `${schedule.shifts.length} shift(s)` : "Désactivé"}
                          </p>
                        </div>
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={(checked) => toggleDay(schedule.day, checked)}
                        />
                      </div>

                      {schedule.enabled && (
                        <div className="space-y-3">
                          {schedule.shifts.map((shift) => (
                            <div key={shift.uid} className="grid gap-2 rounded-md border p-3 md:grid-cols-12 md:items-end">
                              <div className="md:col-span-3">
                                <Label>Premier booking</Label>
                                <Input
                                  type="time"
                                  value={shift.first_booking_time}
                                  onChange={(event) => updateShift(schedule.day, shift.uid, "first_booking_time", event.target.value)}
                                />
                              </div>
                              <div className="md:col-span-3">
                                <Label>Dernier booking</Label>
                                <Input
                                  type="time"
                                  value={shift.last_booking_time}
                                  onChange={(event) => updateShift(schedule.day, shift.uid, "last_booking_time", event.target.value)}
                                />
                              </div>
                              <div className="md:col-span-3">
                                <Label>Capacité</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={shift.booking_capacity}
                                  onChange={(event) => updateShift(schedule.day, shift.uid, "booking_capacity", Number(event.target.value || 0))}
                                />
                              </div>
                              <div className="md:col-span-3 flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeShift(schedule.day, shift.uid)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <Button variant="outline" size="sm" onClick={() => addShift(schedule.day)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter un shift
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button onClick={saveHours} disabled={saveHoursMutation.isPending}>
                      {saveHoursMutation.isPending ? "Enregistrement..." : "Enregistrer les horaires"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Canaux de communication</CardTitle>
                  <CardDescription>Gestion des notifications client.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border px-4 py-3 opacity-70">
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">Toujours activé pour les confirmations et rappels.</p>
                    </div>
                    <Switch checked disabled />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between rounded-md border px-4 py-3">
                    <div>
                      <p className="font-medium">SMS</p>
                      <p className="text-sm text-muted-foreground">L'activation du SMS peut entraîner une surfacturation.</p>
                    </div>
                    <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </PageContainer>
        </DashboardLayout>
      );
    };

    export default ReservationsSettingsPage;