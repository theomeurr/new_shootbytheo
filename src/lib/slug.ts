/** Transforme un texte libre en identifiant simple : "Reportage photo sportif" → "reportage-photo-sportif". */
export function slugify(input: string): string {
  return String(input ?? '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
