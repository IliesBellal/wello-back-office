import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthProviderButtonProps {
  icon: ReactNode;
  label: string;
  /** Secondary line under the label (e.g. "Indisponible pour le moment"). */
  hint?: string;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * Sign-up provider button ("Continuer avec Google", "Continuer avec mon
 * adresse e-mail"). Styled after Google's own GSI "outline / large" button
 * (40px, #dadce0 border, #3c4043 text, 400px max) so the email option and the
 * Google-rendered button read as the same control, side by side.
 */
export const AuthProviderButton = ({ icon, label, hint, disabled, onClick }: AuthProviderButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-disabled={disabled}
    title={hint}
    className={cn(
      'mx-auto flex w-full max-w-[400px] min-h-10 items-center gap-3 rounded border border-[#dadce0] bg-white px-3 py-1.5',
      'text-sm font-medium text-[#3c4043] transition-colors',
      disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : 'hover:bg-slate-50 hover:border-[#d2e3fc]',
    )}
  >
    <span className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center', disabled && 'opacity-50 grayscale')}>
      {icon}
    </span>
    <span className="flex flex-1 flex-col items-center pr-[30px] text-center leading-tight">
      <span>{label}</span>
      {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
    </span>
  </button>
);

export const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
