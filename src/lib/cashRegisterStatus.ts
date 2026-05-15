export type CashRegisterStatus = 'open' | 'closed' | 'enclosed';

export interface CashRegisterStatusFlags {
  closed: boolean;
  enclosed: boolean;
}

export const getCashRegisterStatus = ({ closed, enclosed }: CashRegisterStatusFlags): CashRegisterStatus => {
  if (enclosed) return 'enclosed';
  if (closed) return 'closed';
  return 'open';
};

export const isCashRegisterClosed = (flags: CashRegisterStatusFlags): boolean =>
  getCashRegisterStatus(flags) !== 'open';

export const isCashRegisterEnclosed = (flags: CashRegisterStatusFlags): boolean =>
  getCashRegisterStatus(flags) === 'enclosed';