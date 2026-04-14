import { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

// ═══ Hook pour détecter la taille de l'écran ═══
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface AdvancedDatePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  disabled?: boolean;
}

interface Preset {
  label: string;
  value: () => DateRange;
}

export function AdvancedDatePicker({ value, onChange, disabled = false }: AdvancedDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [firstClick, setFirstClick] = useState<Date | null>(null);
  const [tempRange, setTempRange] = useState<{ from: Date; to: Date } | null>(null);
  const [displayMonth, setDisplayMonth] = useState(new Date());

  // Detect if mobile (< 768px)
  const isMobile = useMediaQuery('(max-width: 767px)');

  const presets: Preset[] = [
    {
      label: "Aujourd'hui",
      value: () => {
        const today = new Date();
        return { from: today, to: today };
      },
    },
    {
      label: '7 derniers jours',
      value: () => ({
        from: subDays(new Date(), 6),
        to: new Date(),
      }),
    },
    {
      label: 'Cette semaine',
      value: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      label: 'Ce mois',
      value: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: '30 derniers jours',
      value: () => ({
        from: subDays(new Date(), 29),
        to: new Date(),
      }),
    },
  ];

  const handlePreset = (preset: Preset) => {
    const range = preset.value();
    setFirstClick(null);
    setTempRange(null);
    onChange(range);
    setOpen(false);
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;

    // Premier clic : on stocke la date
    if (firstClick === null) {
      setFirstClick(date);
      setTempRange({ from: date, to: date });
      return;
    }

    // Deuxième clic : on crée la range
    const start = firstClick < date ? firstClick : date;
    const end = firstClick < date ? date : firstClick;

    setTempRange({ from: start, to: end });
    setFirstClick(null); // Reset pour prochain cycle
  };

  const handleApply = () => {
    if (tempRange) {
      onChange(tempRange);
      setOpen(false);
      setFirstClick(null);
      setTempRange(null);
    }
  };

  const handleCancel = () => {
    setFirstClick(null);
    setTempRange(null);
    setOpen(false);
  };

  const handleClear = () => {
    const today = new Date();
    const newRange = { from: today, to: today };
    setFirstClick(null);
    setTempRange(null);
    onChange(newRange);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset au moment de l'ouverture
      setFirstClick(null);
      setTempRange(null);
      setDisplayMonth(new Date());
    }
  };

  // Détecte si un preset est actif
  const isPresetActive = (preset: Preset) => {
    if (!tempRange) return false;
    const presetRange = preset.value();
    return (
      tempRange.from.toDateString() === presetRange.from.toDateString() &&
      tempRange.to.toDateString() === presetRange.to.toDateString()
    );
  };

  // ═══ DESKTOP: Popover ═══
  if (!isMobile) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(value.from, 'dd MMM yyyy', { locale: fr })} -{' '}
            {format(value.to, 'dd MMM yyyy', { locale: fr })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 mr-8" align="start">
          <div className="flex">
            {/* Sidebar with Presets */}
            <div className="border-r border-border bg-muted/30 w-40 p-4 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                RACCOURCIS
              </div>
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                    isPresetActive(preset)
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendar Section */}
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Sélectionnez une période
                  </label>
                  {firstClick && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Cliquez la fin
                    </span>
                  )}
                </div>
                
                {/* Affichage de la plage sélectionnée */}
                {tempRange && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {format(tempRange.from, 'dd MMM yyyy', { locale: fr })}
                    {tempRange.to.getTime() !== tempRange.from.getTime() && 
                      ` → ${format(tempRange.to, 'dd MMM yyyy', { locale: fr })}`
                    }
                  </div>
                )}

                <Calendar
                  mode="range"
                  selected={tempRange ? { from: tempRange.from, to: tempRange.to } : undefined}
                  onDayClick={handleDateClick}
                  locale={fr}
                  numberOfMonths={1}
                  className="rounded-md border border-border"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="flex-1"
                >
                  Réinitialiser
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="flex-1"
                  disabled={!tempRange || firstClick !== null}
                >
                  Appliquer
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // ═══ MOBILE: Drawer ═══
  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(value.from, 'dd MMM yyyy', { locale: fr })} -{' '}
          {format(value.to, 'dd MMM yyyy', { locale: fr })}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        {/* Header */}
        <DrawerHeader className="flex items-center justify-between pb-2">
          <DrawerTitle>Sélectionner une période</DrawerTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-4">
          {/* Presets Grid (2 columns) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">RACCOURCIS</div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset)}
                  className={cn(
                    'px-3 py-2.5 text-sm rounded-md transition-colors font-medium min-h-[44px] flex items-center justify-center',
                    isPresetActive(preset)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Temporary Range Display */}
          {tempRange && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
              <div className="font-semibold text-foreground mb-1">Période sélectionnée</div>
              <div>
                {format(tempRange.from, 'dd MMM yyyy', { locale: fr })}
                {tempRange.to.getTime() !== tempRange.from.getTime() && 
                  ` → ${format(tempRange.to, 'dd MMM yyyy', { locale: fr })}`
                }
              </div>
            </div>
          )}

          {/* Calendar with Month Navigation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {format(displayMonth, 'MMMM yyyy', { locale: fr })}
              </h3>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDisplayMonth(subMonths(displayMonth, 1))}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              {firstClick ? (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                  Cliquez la fin de la période
                </span>
              ) : !tempRange ? (
                <span>Cliquez sur le premier jour</span>
              ) : (
                <span>Appuyez sur Appliquer</span>
              )}
            </div>

            {/* Calendar - Mobile optimized with larger touch targets */}
            <div className="bg-card rounded-lg border border-border p-2">
              <Calendar
                mode="range"
                selected={tempRange ? { from: tempRange.from, to: tempRange.to } : undefined}
                onDayClick={handleDateClick}
                locale={fr}
                numberOfMonths={1}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                className="[&_.rdp-cell]:h-10 [&_.rdp-cell]:w-10 [&_.rdp-head_cell]:h-8"
              />
            </div>
          </div>
        </div>

        {/* Fixed Footer with Action Buttons */}
        <DrawerFooter className="pt-2 space-y-2 border-t border-border">
          <Button
            onClick={handleApply}
            className="w-full"
            disabled={!tempRange || firstClick !== null}
            size="lg"
          >
            Appliquer la sélection
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClear}
              className="flex-1"
            >
              Réinitialiser
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}