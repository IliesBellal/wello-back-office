import { X } from 'lucide-react';

interface MultiFilterOption {
  id: string;
  label: string;
}

interface MultiFilterProps {
  options: MultiFilterOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  pillClassName?: string;
}

/**
 * Composant de filtre multi-sélection réutilisable
 * Affiche les options sous forme de boutons pills
 */
export const MultiFilter = ({
  options,
  selectedIds,
  onChange,
  label,
  placeholder,
  className = '',
  pillClassName = '',
}: MultiFilterProps) => {
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(sid => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      )}
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {placeholder || 'Aucune option disponible'}
        </p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => handleToggle(option.id)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${selectedIds.includes(option.id)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }
                ${pillClassName}
              `}
            >
              {option.label}
              {selectedIds.includes(option.id) && (
                <X className="w-3 h-3 ml-1 inline" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
