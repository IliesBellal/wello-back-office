import { Input } from '@/components/ui/input';
import { InputHTMLAttributes, forwardRef, useState, useEffect } from 'react';

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
 */
export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(
  ({ value, onChange, valueInCents = false, ...props }, ref) => {
    // Store the display value to prevent focus loss
    const [displayValue, setDisplayValue] = useState<string>('');

    // Initialize displayValue when valueInCents prop changes
    useEffect(() => {
      if (valueInCents && typeof value === 'number') {
        const euros = value / 100;
        setDisplayValue(euros.toFixed(2).replace('.', ','));
      } else if (!valueInCents && value !== undefined) {
        setDisplayValue(String(value));
      }
    }, [value, valueInCents]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      let currentValue = input.value;

      // Allow digits and decimal separators (. or ,)
      currentValue = currentValue.replace(/[^\d,.\-]/g, '');

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

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Format on blur - convert . to , for display
      const input = e.target;
      if (input.value) {
        const normalized = input.value.replace(',', '.');
        const parts = normalized.split('.');
        
        if (parts.length === 2 && parts[1].length > 0) {
          // Valid decimal number - format to 2 decimal places
          const formatted = parseFloat(normalized).toFixed(2).replace('.', ',');
          input.value = formatted;
          setDisplayValue(formatted);
        } else if (parts.length === 1 && parts[0].length > 0) {
          // Just integers - add .00 then replace with ,
          const formatted = parseInt(parts[0]).toFixed(2).replace('.', ',');
          input.value = formatted;
          setDisplayValue(formatted);
        }
      }

      props.onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

PriceInput.displayName = 'PriceInput';
