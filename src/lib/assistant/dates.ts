/**
 * Dates en langage naturel, sur des tokens déjà normalisés.
 *
 * Deux temps : `findDates` repère les mentions (« demain soir », « la semaine
 * dernière », « le 12 novembre ») sans les dater, puis `resolveDate` les
 * transforme en plage concrète selon le sens préféré par l'intention
 * (« samedi » = samedi passé pour un CA, samedi à venir pour un planning).
 */
import type { DateRange } from './types';

export type Daypart = NonNullable<DateRange['daypart']>;

export type DateSpec =
  | { kind: 'offset'; days: number }
  | { kind: 'weekday'; weekday: number; direction: 'last' | 'next' | 'nearest' }
  | { kind: 'period'; unit: 'week' | 'month' | 'year'; offset: number }
  | { kind: 'lastDays'; days: number }
  | { kind: 'absolute'; day: number; month?: number; year?: number }
  | { kind: 'month'; month: number; year?: number };

export interface DateMention {
  start: number;
  end: number;
  spec: DateSpec;
  daypart?: Daypart;
}

/** Lundi = 0 … dimanche = 6. */
export const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const MONTH_LABELS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTH_ALIASES: Record<string, number> = {
  janv: 0, fev: 1, fevr: 1, avr: 3, juil: 6, sept: 8, oct: 9, nov: 10, dec: 11,
};

const DAYPART_LABEL: Record<Daypart, string> = {
  morning: 'matin',
  lunch: 'midi',
  afternoon: 'après-midi',
  evening: 'soir',
  night: 'nuit',
};

/** Heures [début, fin[ de chaque créneau, en minutes depuis minuit. */
export const DAYPART_MINUTES: Record<Daypart, [number, number]> = {
  morning: [6 * 60, 11 * 60],
  lunch: [11 * 60, 15 * 60],
  afternoon: [14 * 60, 18 * 60],
  evening: [18 * 60, 24 * 60],
  night: [21 * 60, 24 * 60 + 6 * 60],
};

const NUMBER_WORDS: Record<string, number> = {
  deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30,
};

function asNumber(token: string | undefined): number | null {
  if (!token) return null;
  if (/^\d{1,4}$/.test(token)) return Number(token);
  return NUMBER_WORDS[token] ?? null;
}

function monthOf(token: string | undefined): number | null {
  if (!token) return null;
  const i = MONTHS.indexOf(token);
  if (i >= 0) return i;
  return MONTH_ALIASES[token] ?? null;
}

type Matcher = (t: string[], i: number) => { len: number; spec?: DateSpec; daypart?: Daypart } | null;

const seq = (words: string[], spec?: DateSpec, daypart?: Daypart): Matcher => (t, i) =>
  words.every((w, k) => t[i + k] === w) ? { len: words.length, spec, daypart } : null;

const anyOf = (...matchers: Matcher[]): Matcher => (t, i) => {
  for (const m of matchers) {
    const r = m(t, i);
    if (r) return r;
  }
  return null;
};

const PAST = ['derniere', 'dernier', 'passee', 'passe'];
const NEXT = ['prochaine', 'prochain'];

const periodMatcher = (unit: 'week' | 'month' | 'year', noun: string, thisWords: string[][]): Matcher => (t, i) => {
  for (const w of thisWords) {
    if (w.every((x, k) => t[i + k] === x)) return { len: w.length, spec: { kind: 'period', unit, offset: 0 } };
  }
  // « (la) semaine dernière », « le mois prochain »
  const startsWithArticle = ['la', 'le', 'l'].includes(t[i]) && t[i + 1] === noun;
  const j = startsWithArticle ? i + 1 : i;
  if (t[j] !== noun) return null;
  if (PAST.includes(t[j + 1])) return { len: j - i + 2, spec: { kind: 'period', unit, offset: -1 } };
  if (NEXT.includes(t[j + 1])) return { len: j - i + 2, spec: { kind: 'period', unit, offset: 1 } };
  if (t[j + 1] === 'en' && t[j + 2] === 'cours') return { len: j - i + 3, spec: { kind: 'period', unit, offset: 0 } };
  return null;
};

/** Créneaux seuls, éventuellement précédés de ce / cet / cette. */
const DAYPART_MATCHERS: Matcher = anyOf(
  seq(['apres', 'midi'], undefined, 'afternoon'),
  seq(['aprem'], undefined, 'afternoon'),
  seq(['matin'], undefined, 'morning'),
  seq(['matinee'], undefined, 'morning'),
  seq(['midi'], undefined, 'lunch'),
  seq(['dejeuner'], undefined, 'lunch'),
  seq(['soir'], undefined, 'evening'),
  seq(['soiree'], undefined, 'evening'),
  seq(['diner'], undefined, 'evening'),
  seq(['nuit'], undefined, 'night'),
);

const DAY_MATCHERS: Matcher = anyOf(
  seq(['aujourd', 'hui'], { kind: 'offset', days: 0 }),
  seq(['aujourdhui'], { kind: 'offset', days: 0 }),
  seq(['ce', 'jour'], { kind: 'offset', days: 0 }),
  seq(['avant', 'hier'], { kind: 'offset', days: -2 }),
  seq(['apres', 'demain'], { kind: 'offset', days: 2 }),
  seq(['hier'], { kind: 'offset', days: -1 }),
  seq(['demain'], { kind: 'offset', days: 1 }),
  periodMatcher('week', 'semaine', [['cette', 'semaine']]),
  periodMatcher('month', 'mois', [['ce', 'mois', 'ci'], ['ce', 'mois']]),
  periodMatcher('year', 'annee', [['cette', 'annee']]),
  // « les 7 derniers jours », « 30 derniers jours »
  (t, i) => {
    const off = t[i] === 'les' ? 1 : 0;
    const n = asNumber(t[i + off]);
    if (n && n <= 366 && PAST.concat(['derniers', 'dernieres']).includes(t[i + off + 1]) && t[i + off + 2] === 'jours') {
      return { len: off + 3, spec: { kind: 'lastDays', days: n } };
    }
    return null;
  },
  // Jours de la semaine, avec « dernier » / « prochain » facultatif.
  (t, i) => {
    const off = t[i] === 'le' || t[i] === 'ce' ? 1 : 0;
    const wd = WEEKDAYS.indexOf(t[i + off]);
    if (wd < 0) return null;
    const next = t[i + off + 1];
    if (PAST.includes(next)) return { len: off + 2, spec: { kind: 'weekday', weekday: wd, direction: 'last' } };
    if (NEXT.includes(next)) return { len: off + 2, spec: { kind: 'weekday', weekday: wd, direction: 'next' } };
    return { len: off + 1, spec: { kind: 'weekday', weekday: wd, direction: 'nearest' } };
  },
  // « le 12 », « le 12 novembre », « 12 novembre 2026 », « 12/11 » (→ « 12 11 »)
  (t, i) => {
    const hasLe = t[i] === 'le';
    const off = hasLe ? 1 : 0;
    const day = asNumber(t[i + off]);
    if (!day || day < 1 || day > 31 || !/^\d+$/.test(t[i + off])) return null;
    const monthName = monthOf(t[i + off + 1]);
    const monthNum = asNumber(t[i + off + 1]);
    let month: number | undefined;
    let len = off + 1;
    if (monthName !== null) {
      month = monthName;
      len += 1;
    } else if (monthNum && monthNum >= 1 && monthNum <= 12 && /^\d{1,2}$/.test(t[i + off + 1])) {
      month = monthNum - 1;
      len += 1;
    } else if (!hasLe) {
      return null; // un nombre seul n'est pas une date (c'est peut-être une quantité)
    }
    let year: number | undefined;
    const y = t[i + len];
    if (month !== undefined && y && /^\d{4}$/.test(y)) {
      year = Number(y);
      len += 1;
    }
    return { len, spec: { kind: 'absolute', day, month, year } };
  },
  // Un mois seul : « janvier », « mois de mars », « septembre 2025 ».
  (t, i) => {
    const off = t[i] === 'mois' && (t[i + 1] === 'de' || t[i + 1] === 'd') ? 2 : 0;
    const month = monthOf(t[i + off]);
    // Les abréviations seules (« sept », « oct ») restent des nombres ou des mots courants.
    if (month === null || (off === 0 && MONTH_ALIASES[t[i]] !== undefined)) return null;
    const y = t[i + off + 1];
    if (y && /^\d{4}$/.test(y)) return { len: off + 2, spec: { kind: 'month', month, year: Number(y) } };
    return { len: off + 1, spec: { kind: 'month', month } };
  },
);

/**
 * Repère les mentions de dates. Un créneau collé à un jour s'y rattache
 * (« demain soir ») ; un créneau seul vise aujourd'hui (« ce midi »).
 */
export function findDates(tokens: string[]): DateMention[] {
  const out: DateMention[] = [];
  let i = 0;
  while (i < tokens.length) {
    const day = DAY_MATCHERS(tokens, i);
    if (day?.spec) {
      const mention: DateMention = { start: i, end: i + day.len, spec: day.spec };
      const dp = DAYPART_MATCHERS(tokens, mention.end);
      if (dp?.daypart) {
        mention.daypart = dp.daypart;
        mention.end += dp.len;
      }
      out.push(mention);
      i = mention.end;
      continue;
    }
    const demonstrative = ['ce', 'cet', 'cette'].includes(tokens[i]) ? 1 : 0;
    const dp = DAYPART_MATCHERS(tokens, i + demonstrative);
    if (dp?.daypart) {
      out.push({ start: i, end: i + demonstrative + dp.len, spec: { kind: 'offset', days: 0 }, daypart: dp.daypart });
      i += demonstrative + dp.len;
      continue;
    }
    i += 1;
  }
  return out;
}

// ─── Résolution ─────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Lundi = 0. */
function weekdayOf(d: Date): number {
  return (d.getDay() + 6) % 7;
}

const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

function dayLabel(target: Date, today: Date): string {
  const diff = Math.round((startOfDay(target).getTime() - today.getTime()) / 86_400_000);
  switch (diff) {
    case 0: return "aujourd'hui";
    case -1: return 'hier';
    case -2: return 'avant-hier';
    case 1: return 'demain';
    case 2: return 'après-demain';
    default: return DAY_FMT.format(target);
  }
}

function withDaypart(label: string, daypart?: Daypart): string {
  if (!daypart) return label;
  if (label === "aujourd'hui") return daypart === 'afternoon' ? 'cet après-midi' : daypart === 'night' ? 'cette nuit' : `ce ${DAYPART_LABEL[daypart]}`;
  return `${label} ${DAYPART_LABEL[daypart]}`;
}

export function resolveDate(mention: Pick<DateMention, 'spec' | 'daypart'>, now: Date, prefer: 'past' | 'future' = 'past'): DateRange {
  const today = startOfDay(now);
  const { spec, daypart } = mention;
  const single = (d: Date): DateRange => ({
    from: toISODate(d),
    to: toISODate(d),
    label: withDaypart(dayLabel(d, today), daypart),
    daypart,
    grain: 'day',
  });

  switch (spec.kind) {
    case 'offset':
      return single(addDays(today, spec.days));
    case 'weekday': {
      const cur = weekdayOf(today);
      let delta: number;
      if (spec.direction === 'last') delta = -(((cur - spec.weekday + 7) % 7) || 7);
      else if (spec.direction === 'next') delta = ((spec.weekday - cur + 7) % 7) || 7;
      else if (prefer === 'future') delta = (spec.weekday - cur + 7) % 7;
      else delta = -((cur - spec.weekday + 7) % 7);
      const d = addDays(today, delta);
      const range = single(d);
      if (Math.abs(delta) > 2) {
        const suffix = delta < 0 ? ' dernier' : ' prochain';
        range.label = withDaypart(WEEKDAYS[spec.weekday] + suffix, daypart);
      }
      return range;
    }
    case 'period': {
      if (spec.unit === 'week') {
        const monday = addDays(today, -weekdayOf(today) + spec.offset * 7);
        const sunday = addDays(monday, 6);
        const to = spec.offset === 0 && prefer === 'past' ? today : sunday;
        const label = spec.offset === 0 ? 'cette semaine' : spec.offset < 0 ? 'la semaine dernière' : 'la semaine prochaine';
        return { from: toISODate(monday), to: toISODate(to), label, grain: 'week' };
      }
      if (spec.unit === 'month') {
        const first = new Date(today.getFullYear(), today.getMonth() + spec.offset, 1);
        const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
        const to = spec.offset === 0 && prefer === 'past' ? today : last;
        const label = spec.offset === 0 ? 'ce mois-ci' : spec.offset < 0 ? 'le mois dernier' : 'le mois prochain';
        return { from: toISODate(first), to: toISODate(to), label, grain: 'month' };
      }
      const first = new Date(today.getFullYear() + spec.offset, 0, 1);
      const last = new Date(first.getFullYear(), 11, 31);
      const to = spec.offset === 0 && prefer === 'past' ? today : last;
      const label = spec.offset === 0 ? 'cette année' : spec.offset < 0 ? "l'année dernière" : "l'année prochaine";
      return { from: toISODate(first), to: toISODate(to), label, grain: 'year' };
    }
    case 'lastDays': {
      const from = addDays(today, -(spec.days - 1));
      return { from: toISODate(from), to: toISODate(today), label: `les ${spec.days} derniers jours`, grain: spec.days <= 7 ? 'week' : 'month' };
    }
    case 'month': {
      let year = spec.year ?? today.getFullYear();
      if (spec.year === undefined) {
        if (prefer === 'past' && spec.month > today.getMonth()) year -= 1;
        if (prefer === 'future' && spec.month < today.getMonth()) year += 1;
      }
      const first = new Date(year, spec.month, 1);
      const last = new Date(year, spec.month + 1, 0);
      const isCurrent = year === today.getFullYear() && spec.month === today.getMonth();
      const to = isCurrent && prefer === 'past' ? today : last;
      const name = MONTH_LABELS[spec.month];
      return { from: toISODate(first), to: toISODate(to), label: year === today.getFullYear() ? name : `${name} ${year}`, grain: 'month' };
    }
    case 'absolute': {
      let year = spec.year ?? today.getFullYear();
      let month = spec.month ?? today.getMonth();
      let d = new Date(year, month, spec.day);
      // Sans année ni mois explicites, on prend l'occurrence la plus proche dans le sens préféré.
      if (spec.year === undefined) {
        if (prefer === 'past' && d > today) {
          if (spec.month === undefined) month -= 1;
          else year -= 1;
          d = new Date(year, month, spec.day);
        } else if (prefer === 'future' && d < today) {
          if (spec.month === undefined) month += 1;
          else year += 1;
          d = new Date(year, month, spec.day);
        }
      }
      return single(d);
    }
  }
}

/** Plage par défaut d'un slot `date` (valeur `default` de la SlotDef). */
export function defaultDate(def: string | undefined, now: Date, prefer: 'past' | 'future' = 'past'): DateRange {
  switch (def) {
    case 'yesterday':
      return resolveDate({ spec: { kind: 'offset', days: -1 } }, now, prefer);
    case 'week':
      return resolveDate({ spec: { kind: 'period', unit: 'week', offset: 0 } }, now, prefer);
    case 'month':
      return resolveDate({ spec: { kind: 'period', unit: 'month', offset: 0 } }, now, prefer);
    case 'last_month':
      return resolveDate({ spec: { kind: 'period', unit: 'month', offset: -1 } }, now, prefer);
    default:
      return resolveDate({ spec: { kind: 'offset', days: 0 } }, now, prefer);
  }
}

/** Créneau courant, pour « qui travaille » sans précision. */
export function currentDaypart(now: Date): Daypart | undefined {
  const m = now.getHours() * 60 + now.getMinutes();
  if (m >= 11 * 60 && m < 15 * 60) return 'lunch';
  if (m >= 18 * 60) return 'evening';
  return undefined;
}
