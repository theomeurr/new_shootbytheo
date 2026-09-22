import manifest from '../generated/media.json';
import { site } from './site';

export type ImageFormat = 'avif' | 'webp';

export interface Photo {
  id: string;
  file: string;
  hash: string;
  w: number;
  h: number;
  color: string;
  lqip: string;
  widths: number[];
  formats: ImageFormat[];
  /** Dossier de sortie dans public/media (ajouté à la lecture du manifest). */
  dir: string;
}

interface ManifestSet {
  dir: string;
  cover: string | null;
  og: string | null;
  photos: Omit<Photo, 'dir'>[];
}

export const SITE_SET = 'site-images';

const sets = (manifest as unknown as { sets: Record<string, ManifestSet> }).sets ?? {};
const mediaBase = (site.mediaBaseUrl || '/media').replace(/\/+$/, '');

const isCoverFile = (file: string) => /^cover\.[a-z]+$/i.test(file);
const sameFile = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function withDir(set: ManifestSet | undefined): Photo[] {
  if (!set) return [];
  return set.photos.map((photo) => ({ ...photo, dir: set.dir }) as Photo);
}

/** Toutes les images d'un dossier, couverture comprise. */
export const allPhotos = (key: string): Photo[] => withDir(sets[key]);

export function findPhoto(key: string, file: string | undefined | null): Photo | undefined {
  if (!file) return undefined;
  const name = file.split(/[\\/]/).pop() as string;
  return allPhotos(key).find((photo) => sameFile(photo.file, name));
}

export function coverPhoto(key: string): Photo | undefined {
  const set = sets[key];
  if (!set) return undefined;
  return findPhoto(key, set.cover) ?? allPhotos(key)[0];
}

/**
 * Photos de la galerie : tout le dossier dans l'ordre des noms de fichiers,
 * sauf un éventuel fichier cover.* (réservé à la couverture).
 * `order` (champ "gallery" de event.json) permet d'imposer une sélection et un ordre.
 */
export function galleryPhotos(key: string, order?: string[]): Photo[] {
  const photos = allPhotos(key);
  if (order?.length) {
    return order.map((file) => photos.find((photo) => sameFile(photo.file, file.split(/[\\/]/).pop() as string))).filter(Boolean) as Photo[];
  }
  const gallery = photos.filter((photo) => !isCoverFile(photo.file));
  return gallery.length ? gallery : photos;
}

export const sitePhoto = (file: string | undefined) => findPhoto(SITE_SET, file);

export function ogImage(key: string): string | undefined {
  const set = sets[key];
  return set?.og ? `${mediaBase}/${set.dir}/${set.og}` : undefined;
}

export const photoUrl = (photo: Photo, width: number, format: ImageFormat) => `${mediaBase}/${photo.dir}/${photo.id}.${photo.hash}-${width}.${format}`;

/** Largeur disponible la plus proche (par excès) de la largeur demandée. */
export function closestWidth(photo: Photo, wanted: number): number {
  return photo.widths.find((width) => width >= wanted) ?? photo.widths[photo.widths.length - 1];
}

export function srcset(photo: Photo, format: ImageFormat, options: { min?: number; max?: number } = {}): string {
  const { min = 0, max = Infinity } = options;
  let widths = photo.widths.filter((width) => width >= min && width <= max);
  if (!widths.length) widths = [closestWidth(photo, min)];
  return widths.map((width) => `${photoUrl(photo, width, format)} ${width}w`).join(', ');
}

/** Format le plus compatible disponible, pour l'attribut src / href. */
export const fallbackFormat = (photo: Photo): ImageFormat => (photo.formats.includes('webp') ? 'webp' : photo.formats[photo.formats.length - 1]);

export const ratio = (photo: Photo) => Number((photo.w / photo.h).toFixed(4));
