#!/usr/bin/env node
/**
 * npm run photos          → traite les nouvelles photos uniquement
 * npm run photos:force    → régénère tout
 * Options : --force  --verbose
 */
import { runMediaPipeline } from './lib/media-pipeline.mjs';

const args = new Set(process.argv.slice(2));

try {
  const result = await runMediaPipeline({ force: args.has('--force'), verbose: args.has('--verbose') || args.has('-v') });
  const seconds = (result.ms / 1000).toFixed(1);
  console.log(
    `[photos] ${result.sets} dossiers · ${result.photos} photos · ${result.generated} fichiers générés · ${result.removed} supprimés · ${seconds} s`,
  );
} catch (error) {
  console.error('[photos] Échec du traitement :', error);
  process.exitCode = 1;
}
