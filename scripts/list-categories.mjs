#!/usr/bin/env node
/**
 * npm run categories
 * Montre comment le site regroupe actuellement vos événements sur /evenements/, déduit des event.json.
 * Ne modifie rien : sert juste à voir l'état du site avant de créer ou renommer une catégorie.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './lib/media-pipeline.mjs';

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

const UNIVERSES = { badminton: 'Badminton', 'autres-sports': 'Autres sports', evenementiel: 'Événementiel' };
const universeOf = (data) => data.category ?? (String(data.sport ?? '').trim().toLowerCase() === 'badminton' ? 'badminton' : 'autres-sports');
const seasonOf = (dateStr) => {
  const d = new Date(/^\d{4}-\d{2}-\d{2}/.test(dateStr) ? dateStr : Date.now());
  if (Number.isNaN(d.getTime())) return '?';
  const year = d.getUTCFullYear();
  return d.getUTCMonth() >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

const dirs = await fs.readdir(PATHS.events, { withFileTypes: true }).catch(() => []);
// competitions : "univers/sport/nom" -> a sa propre section titrée sur la page.
const competitions = new Map();
// others : univers -> événements sans compétition (rangés ensemble dans "Autres événements").
const others = new Map();

for (const entry of dirs) {
  if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
  const data = await readJson(path.join(PATHS.events, entry.name, 'event.json'));
  if (!data) continue;

  const universe = universeOf(data);
  const season = seasonOf(data.date);

  if (data.competition) {
    const key = `${universe}/${data.sport || 'Sport'}/${data.competition}`;
    if (!competitions.has(key)) competitions.set(key, { universe, sport: data.sport || 'Sport', name: data.competition, events: [] });
    competitions.get(key).events.push({ folder: entry.name, season });
  } else {
    if (!others.has(universe)) others.set(universe, []);
    others.get(universe).push({ folder: entry.name, season, type: data.type || '(type non précisé)' });
  }
}

if (!competitions.size && !others.size) {
  console.log('Aucun événement dans content/evenements/.');
  process.exit(0);
}

console.log("\nCe que /evenements/ affiche aujourd'hui :\n");
for (const universeId of Object.keys(UNIVERSES)) {
  const own = [...competitions.values()].filter((c) => c.universe === universeId).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const rest = others.get(universeId) ?? [];
  if (!own.length && !rest.length) continue;

  console.log(UNIVERSES[universeId]);
  for (const c of own) {
    const seasons = [...new Set(c.events.map((e) => e.season))].sort().reverse().join(', ');
    const count = c.events.length;
    const label = `${c.name} (${c.sport})`;
    console.log(`  • ${label}${' '.repeat(Math.max(1, 30 - label.length))}${count} journée${count > 1 ? 's' : ''}  ·  saison${seasons.includes(',') ? 's' : ''} ${seasons}`);
  }
  if (rest.length) {
    const types = [...new Set(rest.map((e) => e.type))].join(', ');
    console.log(`  • Autres événements (sans compétition)   ${rest.length} — types : ${types}`);
  }
  console.log('');
}

console.log('Rappel :');
console.log('  - Un événement avec "competition" obtient sa propre section titrée, groupée par saison.');
console.log('  - Sans "competition", il rejoint "Autres événements" (tournois, cérémonies…), distingué par son "type" sur la carte.\n');
console.log('Pour créer une compétition/catégorie : npm run new-event -- --competition "Nom" …');
console.log('Pour la renommer partout d\'un coup : npm run rename-category -- "Ancien nom" "Nouveau nom"\n');
