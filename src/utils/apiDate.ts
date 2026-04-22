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

export const toUTCDateRange = (from: Date | string, to: Date | string) => ({
  from: toUTCDateString(from),
  to: toUTCDateString(to),
});
