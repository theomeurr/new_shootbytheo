#!/usr/bin/env node
/**
 * npm run new-event
 * Crée le dossier d'un nouvel événement et son fichier event.json en posant quelques questions.
 *
 * Mode direct (sans questions) :
 *   npm run new-event -- --title "Pré-Nationale • Journée 2" --date 2026-10-03 --location Beauvais --competition "Pré-Nationale"
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { PATHS } from './lib/media-pipeline.mjs';
import { slugify } from './lib/slug.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : undefined;
};

const direct = Boolean(flag('title'));
const rl = direct ? null : readline.createInterface({ input: stdin, output: stdout });

async function ask(label, { fallback = '', name } = {}) {
  const given = name ? flag(name) : undefined;
  if (given !== undefined) return given.trim();
  if (!rl) return fallback;
  const answer = (await rl.question(`${label}${fallback ? ` [${fallback}]` : ''} : `)).trim();
  return answer || fallback;
}

const today = new Date().toISOString().slice(0, 10);
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

console.log('\nNouvel événement ShootByTheo\n');

const title = await ask('Titre (ex. Pré-Nationale • Journée 2)', { name: 'title' });
if (!title) {
  console.error('Un titre est nécessaire.');
  process.exit(1);
}

let date = await ask('Date (AAAA-MM-JJ)', { fallback: today, name: 'date' });
while (!validDate(date)) {
  if (!rl) {
    console.error(`Date invalide : "${date}". Format attendu : AAAA-MM-JJ.`);
    process.exit(1);
  }
  date = await ask('Format attendu AAAA-MM-JJ, par exemple 2026-10-03', { fallback: today });
}

const sport = await ask('Sport', { fallback: 'Badminton', name: 'sport' });
const competition = await ask('Compétition (vide pour un tournoi, une cérémonie…)', { name: 'competition' });
const type = competition ? '' : await ask('Type (Tournoi, Cérémonie, Événement spécial…)', { name: 'type' });
const location = await ask('Lieu', { name: 'location' });
const eventType = await ask('Événementiel plutôt que sportif ? (o/N)', { fallback: 'n', name: 'evenementiel' });
const description = await ask('Description courte (facultatif)', { name: 'description' });

// "Pré-Nationale • Journée 2" + "Beauvais" → pre-nationale-j2-beauvais
const suggestion = slugify(`${title} ${title.toLowerCase().includes(location.toLowerCase()) ? '' : location}`).replace(/journee-(\d+)/g, 'j$1');
let slug = slugify(await ask('Adresse de la page (slug)', { fallback: suggestion, name: 'slug' }));
while (!slug || existsSync(path.join(PATHS.events, slug))) {
  if (!rl) {
    console.error(`Le dossier "${slug}" existe déjà.`);
    process.exit(1);
  }
  slug = slugify(await ask(`"${slug}" existe déjà, autre adresse`, { fallback: `${suggestion}-${date.slice(0, 4)}` }));
}

rl?.close();

const event = {
  title,
  slug,
  date,
  sport,
  ...(competition ? { competition } : {}),
  ...(type ? { type } : {}),
  ...(/^o/i.test(eventType) ? { category: 'evenementiel' } : {}),
  location,
  description,
  coverPosition: '50% 40%',
};

const dir = path.join(PATHS.events, slug);
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(path.join(dir, 'event.json'), JSON.stringify(event, null, 2) + '\n');

console.log(`
Événement créé : content/evenements/${slug}/

  1. Déposez vos photos exportées (JPEG, 2560 px de large conseillé) dans ce dossier.
     • Nommez « cover.jpg » l'image de couverture, ou indiquez "cover": "012.jpg" dans event.json.
     • Les photos s'affichent dans l'ordre des noms de fichiers (001.jpg, 002.jpg…).
  2. Lancez « npm run dev » pour vérifier : http://localhost:4321/evenements/${slug}/
  3. Publiez avec « npm run build ».
`);
