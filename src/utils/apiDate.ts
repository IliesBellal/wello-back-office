const pad2 = (value: number): string => String(value).padStart(2, '0');

const parseDateInput = (value: Date | string): Date => {
  if (value instanceof Date) {
    return value;
  }

  // Date-only strings are normalized as UTC midnight to avoid locale drift.
  if (!value.includes('T')) {
    return new Date(`${value}T00:00:00Z`);
  }

  return new Date(value);
};

export const toUTCDateString = (value: Date | string): string => {
  const date = parseDateInput(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }

  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
};

// Date de calendrier "nue", sans aucune conversion de fuseau. Réservée aux
// endpoints dont la borne est interprétée côté API dans le fuseau de
// l'établissement (export comptable) : y appliquer toUTCDateString reculerait
// la période d'un jour pour tout fuseau à décalage positif.
export const toLocalDateString = (value: Date | string): string => {
  if (typeof value === 'string') {
    const dateOnly = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      throw new Error(`Invalid date value: ${value}`);
    }
    return dateOnly;
  }

  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }

  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
};

export const toUTCDateTimeString = (value: Date | string): string => {
  const date = parseDateInput(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }

  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
};

export const toUTCDateRange = (from: Date | string, to: Date | string) => ({
  from: toUTCDateString(from),
  to: toUTCDateString(to),
});
