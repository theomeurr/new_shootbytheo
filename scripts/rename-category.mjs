#!/usr/bin/env node
/**
 * npm run rename-category -- "Ancien nom" "Nouveau nom"
 *
 * Renomme une catégorie (compétition ou type) sur tous ses événements d'un coup :
 * cherche tous les event.json dont "competition" (ou "type" si vide) correspond exactement
 * à l'ancien nom, et le remplace. La comparaison ignore la casse mais le nouveau nom est
 * écrit tel quel.
 *
 * Exemple : npm run rename-category -- "Nationale 2" "Nationale 2 Excellence"
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './lib/media-pipeline.mjs';

const [oldName, newName] = process.argv.slice(2).filter((a) => !a.startsWith('--'));

if (!oldName || !newName) {
  console.error('Usage : npm run rename-category -- "Ancien nom" "Nouveau nom"');
  console.error('        (voir les noms actuels avec : npm run categories)');
  process.exit(1);
}

const norm = (value) => String(value ?? '').trim().toLowerCase();
const dirs = await fs.readdir(PATHS.events, { withFileTypes: true }).catch(() => []);

let changed = 0;
for (const entry of dirs) {
  if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
  const file = path.join(PATHS.events, entry.name, 'event.json');

  let data;
  try {
    data = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    continue;
  }

  // La compétition prime ; si elle est vide, on renomme le type (tournois, cérémonies…).
  const field = data.competition ? 'competition' : 'type';
  if (norm(data[field]) !== norm(oldName)) continue;

  data[field] = newName;
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ ${entry.name}`);
  changed++;
}

if (!changed) {
  console.log(`\nAucun événement avec la catégorie « ${oldName} ». Vérifiez l'orthographe avec : npm run categories`);
  process.exit(1);
}

console.log(`\n${changed} événement${changed > 1 ? 's' : ''} renommé${changed > 1 ? 's' : ''} : « ${oldName} » → « ${newName} ».`);
console.log('Le changement est visible immédiatement en développement (npm run dev).');
