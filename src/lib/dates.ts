const MONTHS: Record<string, number> = {
  janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11,
};

const normalise = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/** Midi UTC : la date reste la même quel que soit le fuseau horaire de la machine. */
const utcNoon = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month, day, 12));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day;
  return valid ? date : null;
};

/** "2026-09-19", "19/09/2026" ou "19 septembre 2026" → Date (null si illisible). */
export function parseEventDate(input: string): Date | null {
  const value = normalise(String(input ?? ''));

  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return utcNoon(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const slashed = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (slashed) return utcNoon(Number(slashed[3]), Number(slashed[2]) - 1, Number(slashed[1]));

  const french = value.match(/^(?:[a-z]+\s+)?(\d{1,2})(?:er)?\s+([a-z]+)\s+(\d{4})$/);
  if (french && french[2] in MONTHS) return utcNoon(Number(french[3]), MONTHS[french[2]], Number(french[1]));

  return null;
}

const dayMonthYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

const firstOfMonth = (label: string) => label.replace(/^1 /, '1er ');

/** "19 septembre 2026" — ou "23 – 24 mai 2026" pour un événement sur plusieurs jours. */
export function formatEventDate(start: Date, end?: Date): string {
  if (!end || end.getTime() <= start.getTime()) return firstOfMonth(dayMonthYear.format(start));
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) return `${start.getUTCDate() === 1 ? '1er' : start.getUTCDate()} – ${dayMonthYear.format(end)}`;
  if (sameYear) return `${firstOfMonth(dayMonth.format(start))} – ${firstOfMonth(dayMonthYear.format(end))}`;
  return `${firstOfMonth(dayMonthYear.format(start))} – ${firstOfMonth(dayMonthYear.format(end))}`;
}

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Saison sportive : à partir du 1er août, on bascule sur la saison suivante. */
export function seasonOf(date: Date): string {
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= 7 ? `${year} / ${year + 1}` : `${year - 1} / ${year}`;
}
