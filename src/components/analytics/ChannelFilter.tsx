import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ChannelFilterOption {
  id: string;
  label: string;
}

interface ChannelFilterProps {
  options: ChannelFilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  columns?: 2 | 3 | 4;
}

/**
 * Multi-sélection pour sélectionner plusieurs canaux/modes
 */
export function ChannelFilter({
  options,
  selected,
  onChange,
  label = 'Sélectionner les canaux',
  columns = 2,
}: ChannelFilterProps) {
  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className="space-y-3">
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <div className={`grid ${gridCols[columns]} gap-3`}>
        {options.map((option) => (
          <div key={option.id} className="flex items-center space-x-2">
            <Checkbox
              id={option.id}
              checked={selected.includes(option.id)}
              onCheckedChange={() => handleToggle(option.id)}
            />
            <Label htmlFor={option.id} className="font-normal cursor-pointer text-sm">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
