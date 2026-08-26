import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeTemperatureInput, toggleTemperatureSign } from '@/utils/temperatureInputUtils';

interface TemperatureInputProps {
  /** Saisie brute (texte) : peut etre vide */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Champ de saisie de temperature : le champ peut rester vide, et le bouton "±"
 * permet de passer en negatif meme sur un clavier numerique sans touche "-".
 */
export const TemperatureInput = forwardRef<HTMLInputElement, TemperatureInputProps>(
  ({ value, onChange, id, placeholder = '0', className, disabled }, ref) => {
    const isNegative = value.startsWith('-');

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(sanitizeTemperatureInput(e.target.value))}
          className="flex-1"
        />
        <Button
          type="button"
          variant={isNegative ? 'default' : 'outline'}
          size="icon"
          disabled={disabled}
          title="Inverser le signe (positif / négatif)"
          aria-label="Inverser le signe"
          aria-pressed={isNegative}
          onClick={() => onChange(toggleTemperatureSign(value))}
          className="flex-shrink-0"
        >
          <span className="text-sm font-semibold">±</span>
        </Button>
      </div>
    );
  }
);

TemperatureInput.displayName = 'TemperatureInput';
