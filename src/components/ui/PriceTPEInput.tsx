import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';

/**
 * PriceTPEInput - Input de prix de type TPE (Terminal de Paiement)
 * 
 * Les chiffres entrés commencent par les centimes, puis décalent vers la gauche.
 * 
 * Exemple:
 * - Taper "5" → 0,05 €
 * - Taper "9" (après 5) → 0,59 €  
 * - Taper "2" (après 59) → 5,92 €
 * - Taper "1" (après 592) → 59,21 €
 */

interface PriceTPEInputProps {
  /** Prix initial en centimes */
  value: number | undefined;
  /** Callback quand le prix change */
  onChange: (cents: number) => void;
  /** Callback quand l'édition est annulée */
  onCancel?: () => void;
  /** Callback quand l'édition est validée (optionnel - peut utiliser onBlur) */
  onConfirm?: (cents: number) => void;
  /** Si true, valide automatiquement à la perte de focus */
  autoConfirmOnBlur?: boolean;
  /** Classes CSS personnalisées */
  className?: string;
  /** ID pour l'accessibilité */
  id?: string;
}

export const PriceTPEInput = React.forwardRef<HTMLInputElement, PriceTPEInputProps>(
  (
    {
      value,
      onChange,
      onCancel,
      onConfirm,
      autoConfirmOnBlur = true,
      className = '',
      id,
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState('');
    const [priceCents, setPriceCents] = useState(value ?? 0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync avec la valeur initiale
    useEffect(() => {
      setPriceCents(value ?? 0);
      updateDisplay(value ?? 0);
    }, [value]);

    // Update l'affichage du prix
    const updateDisplay = (cents: number) => {
      const formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(cents / 100);
      setDisplayValue(formatted);
    };

    // Logique TPE: décale vers la gauche et ajoute le nouveau chiffre
    const handleDigitInput = (digit: string) => {
      const digitNum = parseInt(digit, 10);
      const newCents = priceCents * 10 + digitNum;
      setPriceCents(newCents);
      updateDisplay(newCents);
      onChange(newCents);
    };

    // Backspace: revient au prix précédent en enlevant le dernier chiffre
    const handleBackspace = () => {
      const newCents = Math.floor(priceCents / 10);
      setPriceCents(newCents);
      updateDisplay(newCents);
      onChange(newCents);
    };

    // Gestion du clavier
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Digits 0-9
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        handleDigitInput(e.key);
      }
      // Backspace / Delete pour revenir
      else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
      // Enter pour valider
      else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm?.(priceCents);
      }
      // Escape pour annuler
      else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    };

    // Permet aussi de taper directement dans l'input (alternative)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      // On récupère seulement les chiffres
      const digitsOnly = input.replace(/\D/g, '');
      if (digitsOnly) {
        const newCents = parseInt(digitsOnly, 10);
        setPriceCents(newCents);
        updateDisplay(newCents);
        onChange(newCents);
      }
    };

    const handleBlur = () => {
      if (autoConfirmOnBlur) {
        onConfirm?.(priceCents);
      }
    };

    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef || ref}
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="0,00 €"
          className={`font-mono text-right ${className}`}
          autoFocus
        />
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            title="Annuler"
          >
            <X className="w-4 h-4 text-destructive" />
          </Button>
        )}
        {onConfirm && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onConfirm(priceCents)}
            title="Valider"
          >
            <Check className="w-4 h-4 text-green-600" />
          </Button>
        )}
      </div>
    );
  }
);

PriceTPEInput.displayName = 'PriceTPEInput';
