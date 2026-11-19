import { type Photo, closestWidth, fallbackFormat, photoUrl, srcset } from './media';

const LIGHTBOX_MIN = 960;

export interface LightboxOptions {
  group: string;
  index: number;
  caption?: string;
  link?: { href: string; label: string };
  /** Nom du fichier proposé au téléchargement ; absent = téléchargement désactivé. */
  download?: string;
}

/** Attributs d'un lien qui ouvre la visionneuse (composant Lightbox) sur cette photo. */
export function lightboxAttrs(photo: Photo, options: LightboxOptions): Record<string, string | number | undefined> {
  const fallback = fallbackFormat(photo);
  const largest = photoUrl(photo, closestWidth(photo, 2560), fallback);
  return {
    href: photoUrl(photo, closestWidth(photo, 2048), fallback),
    'data-lb': options.group,
    'data-lb-index': options.index,
    'data-lb-w': photo.w,
    'data-lb-h': photo.h,
    'data-lb-color': photo.color,
    'data-lb-srcset': srcset(photo, fallback, { min: LIGHTBOX_MIN }),
    'data-lb-srcset-avif': photo.formats.includes('avif') && fallback !== 'avif' ? srcset(photo, 'avif', { min: LIGHTBOX_MIN }) : undefined,
    'data-lb-caption': options.caption,
    'data-lb-link': options.link?.href,
    'data-lb-link-label': options.link?.label,
    'data-lb-download': options.download ? largest : undefined,
    'data-lb-download-name': options.download ? `${options.download}.${fallback}` : undefined,
  };
}
