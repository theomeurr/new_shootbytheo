/**
 * Pipeline d'images ShootByTheo
 * ------------------------------------------------------------------
 * Source   : content/evenements/<dossier>/*.jpg  (+ content/images/)
 * Sortie   : public/media/<dossier>/<photo>.<hash>-<largeur>.<format>
 * Manifest : src/generated/media.json (dimensions, tailles dispo, aperçu flou…)
 *
 * - Incrémental : une photo déjà traitée n'est jamais retraitée.
 * - Le hash dans le nom de fichier permet un cache navigateur « immutable ».
 * - Les originaux ne sont jamais publiés : seuls les dérivés optimisés le sont.
 * - Si un dossier d'événement ne contient plus ses photos sources (CI, archivage),
 *   les dérivés déjà générés sont conservés tels quels.
 */
import fs from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import config from '../../media.config.mjs';
import { slugify } from './slug.mjs';

sharp.cache(false); // évite les verrous de fichiers sous Windows

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PATHS = {
  content: path.join(ROOT, 'content'),
  events: path.join(ROOT, 'content', 'evenements'),
  siteImages: path.join(ROOT, 'content', 'images'),
  siteJson: path.join(ROOT, 'content', 'site.json'),
  out: path.join(ROOT, 'public', 'media'),
  manifest: path.join(ROOT, 'src', 'generated', 'media.json'),
};

/** Clé (et dossier de sortie) réservée aux images hors événements : content/images/. */
export const SITE_SET = 'site-images';
export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']);

const MANIFEST_VERSION = 1;
const GENERATED_FILE = /\.[0-9a-f]{8}(-\d+)?\.(avif|webp|jpg)$/;

const sha1 = (value) => crypto.createHash('sha1').update(value).digest('hex');
const naturalSort = (a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });

/** Empreinte des réglages d'encodage : les modifier régénère les fichiers. */
const CONFIG_KEY = sha1(
  JSON.stringify({
    q: config.quality,
    t: config.thumbMaxWidth,
    e: config.avifEffort,
    c: config.copyright,
    a: config.artist,
    v: MANIFEST_VERSION,
  }),
).slice(0, 8);

function hashFile(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1');
    createReadStream(file)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function loadManifest() {
  const data = await readJson(PATHS.manifest);
  if (!data || data.version !== MANIFEST_VERSION || typeof data.sets !== 'object') {
    return { version: MANIFEST_VERSION, sets: {} };
  }
  return data;
}

async function saveManifest(manifest) {
  const sorted = { version: MANIFEST_VERSION, sets: {} };
  for (const key of Object.keys(manifest.sets).sort(naturalSort)) sorted.sets[key] = manifest.sets[key];
  await fs.mkdir(path.dirname(PATHS.manifest), { recursive: true });
  const next = JSON.stringify(sorted, null, 1) + '\n';
  const current = await fs.readFile(PATHS.manifest, 'utf8').catch(() => null);
  if (current === next) return false;
  await fs.writeFile(PATHS.manifest, next);
  return true;
}

async function listImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile() && !e.name.startsWith('.') && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort(naturalSort);
}

const isCoverFile = (file) => /^cover\.[a-z]+$/i.test(file);

/** Couverture : champ "cover" de event.json → fichier cover.* → première photo. */
function resolveCover(files, eventData, warn, key) {
  if (!files.length) return null;
  const wanted = eventData?.cover ? path.basename(String(eventData.cover)) : null;
  if (wanted) {
    const match = files.find((f) => f.toLowerCase() === wanted.toLowerCase());
    if (match) return match;
    if (!isCoverFile(wanted)) warn(`${key} : couverture "${wanted}" introuvable dans le dossier, choix automatique.`);
  }
  return files.find(isCoverFile) ?? files[0];
}

function targetWidths(sourceWidth, hero) {
  const wanted = [...new Set([...config.widths, ...(hero ? config.heroWidths : [])])].sort((a, b) => a - b);
  const widths = wanted.filter((w) => w <= sourceWidth);
  const largestWanted = wanted[wanted.length - 1];
  const last = widths[widths.length - 1] ?? 0;
  // Source plus petite que la plus grande taille voulue : on garde sa résolution native.
  if (sourceWidth < largestWanted && sourceWidth > last * 1.08) widths.push(sourceWidth);
  return widths;
}

const derivativeName = (photo, width, format) => `${photo.id}.${photo.hash}-${width}.${format}`;

async function encode(source, target, width, format) {
  const thumb = width <= config.thumbMaxWidth;
  let image = sharp(source, { failOn: 'truncated' })
    .rotate() // applique l'orientation EXIF avant de retirer les métadonnées
    .resize({ width, withoutEnlargement: true });

  if (config.copyright || config.artist) {
    const IFD0 = {};
    if (config.copyright) IFD0.Copyright = config.copyright;
    if (config.artist) IFD0.Artist = config.artist;
    image = image.withExif({ IFD0 });
  }

  if (format === 'avif') {
    image = image.avif({ quality: thumb ? config.quality.thumbAvif : config.quality.avif, effort: config.avifEffort });
  } else if (format === 'webp') {
    image = image.webp({ quality: thumb ? config.quality.thumbWebp : config.quality.webp, effort: 5, smartSubsample: true });
  } else {
    throw new Error(`Format non géré : ${format}`);
  }

  const tmp = `${target}.tmp`;
  await image.toFile(tmp);
  await fs.rename(tmp, target);
}

async function analyse(source) {
  const meta = await sharp(source).metadata();
  const swap = (meta.orientation ?? 1) >= 5;
  const w = swap ? meta.height : meta.width;
  const h = swap ? meta.width : meta.height;

  const lqipBuffer = await sharp(source)
    .rotate()
    .resize(20, 20, { fit: 'inside' })
    .webp({ quality: 35, effort: 6 })
    .toBuffer();

  const { data } = await sharp(source)
    .rotate()
    .resize(1, 1, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const color = '#' + [data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, '0')).join('');

  return { w, h, color, lqip: `data:image/webp;base64,${lqipBuffer.toString('base64')}` };
}

/** Recadrage 1200×630 en respectant le point focal ("50% 35%"), comme object-position en CSS. */
async function buildOgImage(source, target, position) {
  const { width: ogW, height: ogH, quality } = config.og;
  const [px, py] = parsePosition(position);
  const meta = await sharp(source).metadata();
  const swap = (meta.orientation ?? 1) >= 5;
  const w = swap ? meta.height : meta.width;
  const h = swap ? meta.width : meta.height;
  const scale = Math.max(ogW / w, ogH / h);
  const rw = Math.max(ogW, Math.round(w * scale));
  const rh = Math.max(ogH, Math.round(h * scale));
  const left = Math.min(rw - ogW, Math.max(0, Math.round((rw - ogW) * px)));
  const top = Math.min(rh - ogH, Math.max(0, Math.round((rh - ogH) * py)));

  const tmp = `${target}.tmp`;
  await sharp(source)
    .rotate()
    .resize(rw, rh, { fit: 'fill' })
    .extract({ left, top, width: ogW, height: ogH })
    .jpeg({ quality, mozjpeg: true })
    .toFile(tmp);
  await fs.rename(tmp, target);
}

function parsePosition(position) {
  const match = String(position ?? '').match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (!match) return [0.5, 0.4];
  const clamp = (n) => Math.min(1, Math.max(0, Number(n) / 100));
  return [clamp(match[1]), clamp(match[2])];
}

async function pool(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      await worker(items[current], current);
    }
  });
  await Promise.all(runners);
}

/** Dossiers à traiter : un par événement + content/images/. */
async function collectSets(warn) {
  const sets = [];
  const dirs = await fs.readdir(PATHS.events, { withFileTypes: true }).catch(() => []);
  for (const entry of dirs) {
    if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const dir = path.join(PATHS.events, entry.name);
    const eventData = await readJson(path.join(dir, 'event.json'));
    if (!eventData) {
      warn(`${entry.name} : event.json absent ou illisible, dossier ignoré.`);
      continue;
    }
    const outName = slugify(entry.name) || entry.name;
    if (outName === SITE_SET) {
      warn(`${entry.name} : ce nom de dossier est réservé, renommez-le.`);
      continue;
    }
    sets.push({ key: entry.name, dir, outName, eventData });
  }
  if (existsSync(PATHS.siteImages)) {
    sets.push({ key: SITE_SET, dir: PATHS.siteImages, outName: SITE_SET, eventData: null, allHero: true });
  }
  return sets;
}

/** Photos utilisées en plein écran sur l'accueil (content/site.json → hero.slides). */
async function collectHeroMarks(sets) {
  const marks = new Map();
  const site = await readJson(PATHS.siteJson, {});
  const bySlug = new Map();
  for (const set of sets) {
    bySlug.set(set.key, set.key);
    if (set.eventData?.slug) bySlug.set(String(set.eventData.slug), set.key);
  }
  for (const slide of site?.hero?.slides ?? []) {
    const key = bySlug.get(String(slide?.event ?? ''));
    if (!key) continue;
    if (!marks.has(key)) marks.set(key, new Set());
    marks.get(key).add(String(slide.photo ?? 'cover').toLowerCase());
  }
  return marks;
}

/**
 * @param {{ force?: boolean, verbose?: boolean, logger?: { info: Function, warn: Function } }} options
 * @returns {Promise<{ sets: number, photos: number, generated: number, removed: number, changed: boolean, ms: number }>}
 */
export async function runMediaPipeline(options = {}) {
  const started = Date.now();
  const { force = false, verbose = false } = options;
  const info = (msg) => (options.logger?.info ? options.logger.info(msg) : console.log(`[photos] ${msg}`));
  const warn = (msg) => (options.logger?.warn ? options.logger.warn(msg) : console.warn(`[photos] ⚠ ${msg}`));

  const manifest = await loadManifest();
  const sets = await collectSets(warn);
  const heroMarks = await collectHeroMarks(sets);
  const concurrency = Math.max(1, Math.min(4, Math.floor(os.availableParallelism() / 2)));
  const stats = { sets: sets.length, photos: 0, generated: 0, removed: 0 };

  await fs.mkdir(PATHS.out, { recursive: true });

  for (const set of sets) {
    const files = await listImages(set.dir);

    // Photo choisie dans le dossier général du CMS (content/images/) plutôt que dans celui de
    // l'événement : on la traite quand même avec l'événement, pour que la couverture et la
    // galerie la retrouvent (le CMS propose les deux dossiers, il est facile de se tromper).
    const sourceDirOf = new Map(files.map((file) => [file, set.dir]));
    if (set.eventData) {
      const siteFiles = await listImages(PATHS.siteImages);
      const referenced = [set.eventData.cover, ...(Array.isArray(set.eventData.gallery) ? set.eventData.gallery : [])]
        .filter(Boolean)
        .map((value) => path.basename(String(value)).toLowerCase());
      for (const name of referenced) {
        if (files.some((file) => file.toLowerCase() === name)) continue;
        const match = siteFiles.find((file) => file.toLowerCase() === name);
        if (match) {
          files.push(match);
          sourceDirOf.set(match, PATHS.siteImages);
        }
      }
    }

    const previous = manifest.sets[set.key];
    const outDir = path.join(PATHS.out, set.outName);

    if (!files.length) {
      if (previous?.photos?.length) {
        stats.photos += previous.photos.length;
        if (verbose) info(`${set.key} : aucune photo source, ${previous.photos.length} dérivés conservés.`);
      } else {
        manifest.sets[set.key] = { dir: set.outName, cover: null, og: null, photos: [] };
      }
      continue;
    }

    await fs.mkdir(outDir, { recursive: true });
    const coverFile = resolveCover(files, set.eventData, warn, set.key);
    const marks = heroMarks.get(set.key) ?? new Set();
    const previousByFile = new Map((previous?.photos ?? []).map((p) => [p.file, p]));

    // Identifiants stables et uniques, attribués avant le traitement parallèle.
    const usedIds = new Set();
    const jobs = files.map((file) => {
      const base = slugify(path.parse(file).name) || 'photo';
      let id = base;
      for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
      usedIds.add(id);
      const hero = Boolean(set.allHero) || file === coverFile || marks.has(file.toLowerCase());
      return { file, id, hero };
    });

    const results = new Array(jobs.length).fill(null);
    let generatedHere = 0;
    let done = 0;

    await pool(jobs, concurrency, async (job, i) => {
      const source = path.join(sourceDirOf.get(job.file) ?? set.dir, job.file);
      try {
        const stat = await fs.stat(source);
        const src = { size: stat.size, mtime: Math.round(stat.mtimeMs) };
        const prev = previousByFile.get(job.file);
        const unchanged = prev?.src && prev.src.size === src.size && prev.src.mtime === src.mtime;
        src.hash = unchanged && prev.src.hash ? prev.src.hash : await hashFile(source);

        const sameContent = prev?.src?.hash === src.hash && prev.w && prev.h && prev.lqip;
        const details = sameContent && !force ? { w: prev.w, h: prev.h, color: prev.color, lqip: prev.lqip } : await analyse(source);

        const photo = {
          id: job.id,
          file: job.file,
          hash: sha1(src.hash + CONFIG_KEY).slice(0, 8),
          ...details,
          widths: targetWidths(details.w, job.hero),
          formats: [...config.formats],
          src,
        };

        for (const width of photo.widths) {
          for (const format of photo.formats) {
            const target = path.join(outDir, derivativeName(photo, width, format));
            if (!force && existsSync(target)) continue;
            await encode(source, target, width, format);
            generatedHere++;
          }
        }
        results[i] = photo;
      } catch (error) {
        warn(`${set.key}/${job.file} : image ignorée (${error.message}).`);
      }
      done++;
      if (generatedHere && done % 10 === 0 && done < jobs.length) info(`${set.key} : ${done}/${jobs.length}…`);
    });

    const photos = results.filter(Boolean);
    const cover = photos.find((p) => p.file === coverFile) ?? photos[0] ?? null;

    // Image de partage Open Graph (événements uniquement).
    let og = null;
    if (cover && set.eventData) {
      const position = set.eventData.coverPosition ?? '';
      og = `og.${sha1(cover.src.hash + position + CONFIG_KEY + JSON.stringify(config.og)).slice(0, 8)}.jpg`;
      const target = path.join(outDir, og);
      if (force || !existsSync(target)) {
        try {
          await buildOgImage(path.join(sourceDirOf.get(cover.file) ?? set.dir, cover.file), target, position);
          generatedHere++;
        } catch (error) {
          warn(`${set.key} : image de partage non générée (${error.message}).`);
          og = null;
        }
      }
    }

    manifest.sets[set.key] = { dir: set.outName, cover: cover?.file ?? null, og, photos };

    // Nettoyage des dérivés devenus inutiles (photo supprimée, remplacée, réglages modifiés).
    const expected = new Set(og ? [og] : []);
    for (const photo of photos) {
      for (const width of photo.widths) for (const format of photo.formats) expected.add(derivativeName(photo, width, format));
    }
    for (const name of await fs.readdir(outDir)) {
      if (expected.has(name)) continue;
      if (GENERATED_FILE.test(name) || name.endsWith('.tmp')) {
        await fs.rm(path.join(outDir, name), { force: true });
        stats.removed++;
      }
    }

    stats.photos += photos.length;
    stats.generated += generatedHere;
    if (generatedHere || verbose) info(`${set.key} : ${photos.length} photos, ${generatedHere} fichiers générés.`);
    if (generatedHere) await saveManifest(manifest); // progression sauvegardée dossier par dossier
  }

  // Événements supprimés : on retire leurs dérivés.
  const liveKeys = new Set(sets.map((s) => s.key));
  for (const key of Object.keys(manifest.sets)) {
    if (liveKeys.has(key)) continue;
    const dir = manifest.sets[key]?.dir;
    if (dir && dir !== '.' && !dir.includes('..') && !path.isAbsolute(dir)) {
      await fs.rm(path.join(PATHS.out, dir), { recursive: true, force: true });
    }
    delete manifest.sets[key];
    stats.removed++;
    info(`${key} : événement supprimé, dérivés retirés.`);
  }

  const changed = await saveManifest(manifest);
  return { ...stats, changed, ms: Date.now() - started };
}
