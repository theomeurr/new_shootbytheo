/** Transforme un texte libre en identifiant d'URL : "Pré-Nationale • J1" → "pre-nationale-j1". */
export function slugify(input) {
  return String(input ?? '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
