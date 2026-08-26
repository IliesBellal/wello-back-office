import { Input } from '@/components/ui/input';
import { InputHTMLAttributes, forwardRef, useState, useEffect, useRef } from 'react';

interface PriceInputProps extends InputHTMLAttributes<HTMLInputElement> {
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * If true, value prop is treated as cents and converted to euros for display
   * onChange will still pass the input event as-is
   */
  valueInCents?: boolean;
}

/**
 * PriceInput component that handles decimal input properly
 * - Accepts both . and , as decimal separators
 * - Uses inputMode="decimal" for better mobile UX
 * - Works seamlessly with react-hook-form
 * - Optionally handles conversion from/to cents
 * - Le champ peut rester vide pendant la saisie : il n'est reformaté (0,00) qu'à la sortie du champ
 */
export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(
  ({ value, onChange, valueInCents = false, ...props }, ref) => {
    // Store the display value to prevent focus loss
    const [displayValue, setDisplayValue] = useState<string>('');
    // Tant que le champ est en cours d'édition, la valeur du parent ne doit pas
    // écraser la saisie (sinon vider la cellule la remet aussitôt à 0,00)
    const isEditingRef = useRef(false);

    const formatFromValue = (): string => {
      if (value === undefined || value === null || value === '') return '';
      if (valueInCents && typeof value === 'number') {
        return (value / 100).toFixed(2).replace('.', ',');
      }
      return String(value);
    };

    // Initialize displayValue when value / valueInCents prop changes
    useEffect(() => {
      if (isEditingRef.current) return;
      setDisplayValue(formatFromValue());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, valueInCents]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      let currentValue = input.value;

      // Allow digits and decimal separators (. or ,)
      currentValue = currentValue.replace(/[^\d,.-]/g, '');

      // Normalize comma to dot for consistency
      const normalized = currentValue.replace(',', '.');

      // Prevent multiple decimal points
      const parts = normalized.split('.');
      if (parts.length > 2) {
        currentValue = parts[0] + '.' + parts.slice(1).join('');
      }

      // Update the input value
      input.value = currentValue;
      setDisplayValue(currentValue);

      // Call the original onChange
      if (onChange) {
        onChange(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isEditingRef.current = true;
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isEditingRef.current = false;

      // Format on blur - convert . to , for display
      const input = e.target;
      if (input.value) {
        const normalized = input.value.replace(',', '.');
        const parsed = parseFloat(normalized);

        if (!Number.isNaN(parsed)) {
          const formatted = parsed.toFixed(2).replace('.', ',');
          input.value = formatted;
          setDisplayValue(formatted);
        } else {
          // Saisie incomplète ("-", ",") : on retombe sur la valeur du parent
          setDisplayValue(formatFromValue());
        }
      } else {
        // Champ laissé vide : on réaffiche la valeur du parent (0,00 en général)
        setDisplayValue(formatFromValue());
      }

      props.onBlur?.(e);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );
  }
);

PriceInput.displayName = 'PriceInput';
