/**
 * Réglages du pipeline d'images (npm run photos).
 * Toute modification ici régénère automatiquement les fichiers concernés.
 */
export default {
  // Largeurs générées pour chaque photo (px). Les miniatures de galerie utilisent
  // les petites tailles, la visionneuse plein écran les grandes.
  widths: [480, 960, 1440, 2048],

  // Largeurs supplémentaires pour les couvertures, l'image à la une et content/images/.
  heroWidths: [2560],

  // Formats de sortie, du plus moderne au plus compatible.
  // ['webp'] seul = traitement ~5x plus rapide et deux fois moins de fichiers.
  formats: ['avif', 'webp'],

  quality: {
    avif: 60,
    webp: 80,
    // Tailles <= thumbMaxWidth : compression un peu plus forte (grilles, cartes).
    thumbAvif: 54,
    thumbWebp: 76,
  },
  thumbMaxWidth: 960,
  avifEffort: 4,

  // Image de partage (Open Graph) générée depuis la couverture de chaque événement.
  og: { width: 1200, height: 630, quality: 82 },

  // Inscrit dans les métadonnées EXIF de chaque image publiée.
  copyright: '© ShootByTheo — shootbytheo.com',
  artist: 'ShootByTheo',
};
