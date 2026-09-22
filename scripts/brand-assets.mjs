#!/usr/bin/env node
/**
 * node scripts/brand-assets.mjs
 * Génère les icônes PNG et l'image de partage par défaut à partir de public/favicon.svg.
 * À relancer uniquement si vous changez de favicon.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/media-pipeline.mjs';

const pub = (name) => path.join(ROOT, 'public', name);
const favicon = await fs.readFile(pub('favicon.svg'), 'utf8');

// Icône plein cadre (iOS arrondit lui-même les angles)
const square = favicon.replace('rx="14"', 'rx="0"');
await sharp(Buffer.from(square), { density: 600 }).resize(180, 180).png().toFile(pub('apple-touch-icon.png'));
await sharp(Buffer.from(favicon), { density: 300 }).resize(48, 48).png().toFile(pub('favicon-48.png'));

// Image de partage de secours (utilisée tant qu'aucun événement n'a de couverture)
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><radialGradient id="g" cx="0.85" cy="1.1" r="0.9"><stop offset="0" stop-color="#e8553a" stop-opacity="0.35"/><stop offset="1" stop-color="#0a0a0b" stop-opacity="0"/></radialGradient></defs>
  <rect width="1200" height="630" fill="#0a0a0b"/><rect width="1200" height="630" fill="url(#g)"/>
  <g transform="translate(80 80) scale(1.5)"><path d="M14 25V14h11M39 14h11v11M50 39v11H39M25 50H14V39" fill="none" stroke="#f3efe9" stroke-width="4"/><circle cx="32" cy="32" r="8" fill="#e8553a"/></g>
  <text x="80" y="430" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="104" letter-spacing="2" fill="#f3efe9">SHOOT<tspan fill="#e8553a">BY</tspan>THEO</text>
  <text x="84" y="500" font-family="Consolas, 'Courier New', monospace" font-size="30" letter-spacing="9" fill="#e8553a">PHOTOGRAPHIE · VIDÉO · SPORT</text>
</svg>`;
await sharp(Buffer.from(og)).jpeg({ quality: 88, mozjpeg: true }).toFile(pub('og-default.jpg'));

console.log('Icônes et image de partage générées dans public/.');
