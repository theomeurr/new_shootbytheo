/**
 * Largeurs des glyphes (en em) d'Archivo, graisse 900, largeur normale, en capitales :
 * la police des grands titres (la même que sur le site historique). Mesurées une fois dans le navigateur.
 *
 * Elles permettent de calculer, à la compilation, le corps exact pour qu'une ligne
 * de titre tienne dans sa colonne — sans JavaScript ni saut de mise en page.
 */
const GLYPHS: Record<string, number> = {
  A: 0.778, B: 0.778, C: 0.778, D: 0.778, E: 0.722, F: 0.667, G: 0.833, H: 0.833, I: 0.369, J: 0.667,
  K: 0.833, L: 0.667, M: 0.972, N: 0.833, O: 0.833, P: 0.722, Q: 0.833, R: 0.778, S: 0.722, T: 0.722,
  U: 0.833, V: 0.778, W: 1, X: 0.778, Y: 0.778, Z: 0.722,
  '0': 0.667, '1': 0.667, '2': 0.667, '3': 0.667, '4': 0.667, '5': 0.667, '6': 0.667, '7': 0.658, '8': 0.667, '9': 0.667,
  ' ': 0.18, '.': 0.333, ',': 0.333, "'": 0.278, '’': 0.278, '?': 0.611, '!': 0.333, '-': 0.333,
  '–': 0.5, '—': 1, '•': 0.5, ':': 0.333, ';': 0.333, '&': 0.889, '/': 0.306, '(': 0.389, ')': 0.389,
  Œ: 1.207, Æ: 1.15, '«': 0.595, '»': 0.595,
};

const FALLBACK = 0.8;
const NO_BREAK_SPACE = String.fromCharCode(0xa0);
const LETTER_SPACING = -0.03; // celui de la classe .display

/** Largeur d'un texte composé en .display, exprimée en em. */
export function displayWidthEm(text: string): number {
  let width = 0;
  for (const char of text.toLocaleUpperCase('fr')) {
    // Les capitales accentuées ont la largeur de leur lettre de base.
    const base = char === NO_BREAK_SPACE ? ' ' : char.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    width += (GLYPHS[char] ?? GLYPHS[base] ?? FALLBACK) + LETTER_SPACING;
  }
  return width;
}

/**
 * Diviseur à utiliser en CSS : font-size = 100cqi / fitDivisor(lignes).
 * La marge de 3 % absorbe les arrondis et les variations de rendu entre navigateurs.
 */
export function fitDivisor(lines: string[], minimum = 5): number {
  const widest = Math.max(minimum, ...lines.map((line) => displayWidthEm(line.trim())));
  return Number((widest * 1.03).toFixed(3));
}
