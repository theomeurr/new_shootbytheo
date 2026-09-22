#!/usr/bin/env node
/**
 * npm run demo-photos
 * Génère des photos de DÉMONSTRATION (ambiances abstraites) dans les dossiers
 * d'événements qui ne contiennent encore aucune image, ainsi que dans content/images/.
 * Ne remplace jamais une photo existante : dès qu'un dossier contient vos images, il est ignoré.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PATHS, IMAGE_EXTENSIONS } from './lib/media-pipeline.mjs';

const PALETTES = {
  hall: { dark: ['#050b18', '#0d2347'], glow: '#1d4f96', subject: '#2a5fc0', floor: '#0e3a2c', lights: ['#ffe2b0', '#ffffff', '#7fb4ff', '#e8553a'] },
  night: { dark: ['#040406', '#101522'], glow: '#23345c', subject: '#1b3f8f', floor: '#13233d', lights: ['#ffffff', '#9cc3ff', '#ffd9a0', '#e8553a'] },
  court: { dark: ['#04120d', '#0c3526'], glow: '#1d7a56', subject: '#e8e2d2', floor: '#125c40', lights: ['#fff1c9', '#ffffff', '#b8ffd9', '#ffd166'] },
  gala: { dark: ['#120804', '#3a1c0a'], glow: '#a8662a', subject: '#f0c27a', floor: '#2b1408', lights: ['#ffcf87', '#fff3dc', '#ff9d5c', '#e8553a'] },
  outdoor: { dark: ['#0a1210', '#23352b'], glow: '#6f8f6a', subject: '#e8553a', floor: '#2f2a1d', lights: ['#f4f1e4', '#cfe3c4', '#ffd9a0', '#ffffff'] },
};

function paletteFor(event) {
  const text = `${event.category ?? ''} ${event.type ?? ''} ${event.sport ?? ''} ${event.competition ?? ''}`.toLowerCase();
  if (/evenementiel|cérémonie|ceremonie|soirée|gala/.test(text)) return PALETTES.gala;
  if (/tournoi/.test(text)) return PALETTES.court;
  if (/top 12/.test(text)) return PALETTES.night;
  if (/badminton/.test(text)) return PALETTES.hall;
  return PALETTES.outdoor;
}

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashString = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** Scène abstraite : fond sombre, halo, sol en perspective, silhouettes floues, bokeh. */
function sceneSvg(w, h, palette, rand) {
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const between = (min, max) => min + rand() * (max - min);
  const unit = Math.max(w, h);

  const horizon = h * between(0.52, 0.68);
  const glowX = w * between(0.2, 0.8);
  const subjectX = w * between(0.28, 0.72);
  const subjectW = unit * between(0.1, 0.17);
  const subjectH = h * between(0.42, 0.7);

  const bokeh = Array.from({ length: Math.round(between(16, 28)) }, () => {
    const r = unit * between(0.008, 0.045);
    return `<circle cx="${(rand() * w).toFixed(1)}" cy="${(rand() * horizon * 0.95).toFixed(1)}" r="${r.toFixed(1)}" fill="${pick(palette.lights)}" opacity="${between(0.1, 0.5).toFixed(2)}"/>`;
  }).join('');

  const lines = Array.from({ length: 5 }, (_, i) => {
    const x = w * (0.1 + i * 0.2);
    const spread = (x - w / 2) * 2.4 + w / 2;
    return `<line x1="${x.toFixed(1)}" y1="${horizon.toFixed(1)}" x2="${spread.toFixed(1)}" y2="${h}" stroke="#ffffff" stroke-width="${(unit * 0.004).toFixed(2)}" opacity="0.22"/>`;
  }).join('');

  const foreground = rand() > 0.35
    ? `<ellipse cx="${(rand() > 0.5 ? w * between(0.02, 0.18) : w * between(0.82, 0.98)).toFixed(1)}" cy="${(h * between(0.78, 1)).toFixed(1)}" rx="${(unit * between(0.16, 0.28)).toFixed(1)}" ry="${(h * between(0.3, 0.5)).toFixed(1)}" fill="#020204" opacity="0.92"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="${rand().toFixed(2)}" y1="0" x2="${rand().toFixed(2)}" y2="1">
      <stop offset="0" stop-color="${palette.dark[0]}"/><stop offset="1" stop-color="${palette.dark[1]}"/>
    </linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="${palette.glow}" stop-opacity="0.95"/><stop offset="1" stop-color="${palette.glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.floor}" stop-opacity="0.35"/><stop offset="1" stop-color="${palette.floor}" stop-opacity="0.95"/></linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.72"/></radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(unit * 0.012).toFixed(1)}"/></filter>
    <filter id="softer" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(unit * 0.03).toFixed(1)}"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <ellipse cx="${glowX.toFixed(1)}" cy="${(horizon * 0.55).toFixed(1)}" rx="${(w * 0.6).toFixed(1)}" ry="${(h * 0.5).toFixed(1)}" fill="url(#glow)"/>
  <g filter="url(#softer)"><rect x="${(-w * 0.2).toFixed(1)}" y="${horizon.toFixed(1)}" width="${(w * 1.4).toFixed(1)}" height="${(h - horizon + h * 0.3).toFixed(1)}" fill="url(#floor)"/></g>
  <g filter="url(#soft)">${lines}${bokeh}</g>
  <g filter="url(#softer)">
    <ellipse cx="${subjectX.toFixed(1)}" cy="${(horizon + subjectH * 0.05).toFixed(1)}" rx="${subjectW.toFixed(1)}" ry="${(subjectH * 0.5).toFixed(1)}" fill="${palette.subject}" opacity="0.85"/>
    <circle cx="${subjectX.toFixed(1)}" cy="${(horizon - subjectH * 0.52).toFixed(1)}" r="${(subjectW * 0.42).toFixed(1)}" fill="#d9b99a" opacity="0.75"/>
    ${foreground}
  </g>
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>
</svg>`;
}

function labelSvg(w, h, label) {
  const size = Math.round(Math.max(w, h) * 0.011);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="${w - size * 2}" y="${h - size * 2}" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="${size}" letter-spacing="${(size * 0.3).toFixed(1)}" fill="#ffffff" opacity="0.5">${label}</text></svg>`;
}

async function renderPhoto(target, { w, h, palette, seed, label }) {
  const rand = seeded(seed);
  // La scène est floue par nature : on la calcule en basse définition puis on l'agrandit.
  const scale = 0.25;
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);
  const scene = await sharp(Buffer.from(sceneSvg(sw, sh, palette, rand))).resize(w, h, { kernel: 'cubic' }).png().toBuffer();
  const grain = await sharp({ create: { width: w, height: h, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 9 } } }).png().toBuffer();

  await sharp(scene)
    .composite([
      { input: grain, blend: 'soft-light' },
      { input: Buffer.from(labelSvg(w, h, label)) },
    ])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(target);
}

async function hasImages(dir) {
  const names = await fs.readdir(dir).catch(() => []);
  return names.some((n) => IMAGE_EXTENSIONS.has(path.extname(n).toLowerCase()));
}

const FORMATS = [
  [2200, 1467], [2200, 1467], [2200, 1467], [1467, 2200], [2200, 1467], [1467, 2200], [2200, 1238], [2200, 1467], [1760, 2200], [2200, 1467],
];

let created = 0;
const jobs = [];

// 1) Événements sans photos
const dirs = await fs.readdir(PATHS.events, { withFileTypes: true }).catch(() => []);
for (const entry of dirs) {
  if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
  const dir = path.join(PATHS.events, entry.name);
  if (await hasImages(dir)) continue;
  const event = JSON.parse(await fs.readFile(path.join(dir, 'event.json'), 'utf8').catch(() => '{}'));
  const palette = paletteFor(event);
  const base = hashString(entry.name);
  const count = 9 + (Math.abs(base) % 6);

  jobs.push([path.join(dir, 'cover.jpg'), { w: 2880, h: 1920, palette, seed: base, label: 'PHOTO DE DÉMONSTRATION' }]);
  for (let i = 1; i <= count; i++) {
    const [w, h] = FORMATS[(i + Math.abs(base)) % FORMATS.length];
    const name = `${String(i).padStart(3, '0')}.jpg`;
    jobs.push([path.join(dir, name), { w, h, palette, seed: base + i * 7919, label: `DÉMO · ${String(i).padStart(2, '0')}` }]);
  }
  console.log(`[démo] ${entry.name} : ${count + 1} images`);
}

// 2) Images du site (à propos, prestations)
const siteImages = [
  ['a-propos.jpg', 1760, 2200, PALETTES.night],
  ['prestation-photo.jpg', 2200, 1467, PALETTES.hall],
  ['prestation-video.jpg', 2200, 1467, PALETTES.night],
  ['prestation-reseaux.jpg', 2200, 1467, PALETTES.gala],
  ['prestation-complete.jpg', 2200, 1467, PALETTES.court],
];
await fs.mkdir(PATHS.siteImages, { recursive: true });
for (const [name, w, h, palette] of siteImages) {
  const target = path.join(PATHS.siteImages, name);
  try {
    await fs.access(target);
  } catch {
    jobs.push([target, { w, h, palette, seed: hashString(name), label: 'PHOTO DE DÉMONSTRATION' }]);
    console.log(`[démo] images/${name}`);
  }
}

// Rendu en parallèle (4 images à la fois)
let cursor = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < jobs.length) {
      const [target, options] = jobs[cursor++];
      await renderPhoto(target, options);
      created++;
    }
  }),
);

console.log(created ? `[démo] ${created} images créées. Lancez "npm run photos" (ou "npm run dev") pour les optimiser.` : '[démo] Rien à générer : tous les dossiers contiennent déjà des images.');
