import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runMediaPipeline, PATHS, IMAGE_EXTENSIONS } from './scripts/lib/media-pipeline.mjs';

const site = JSON.parse(readFileSync(new URL('./content/site.json', import.meta.url), 'utf8'));

/**
 * Intégration maison : optimise les photos avant chaque `dev` / `build`,
 * puis surveille content/ en développement (déposer une photo suffit).
 */
function shootByTheoMedia() {
  return {
    name: 'shootbytheo-media',
    hooks: {
      'astro:config:setup': async ({ command, logger }) => {
        if (command !== 'dev' && command !== 'build') return;
        const result = await runMediaPipeline({ logger });
        logger.info(`${result.photos} photos prêtes (${result.generated} fichiers générés en ${(result.ms / 1000).toFixed(1)} s).`);
      },
      'astro:server:setup': ({ server, logger }) => {
        let timer = null;
        let running = false;
        let queued = false;

        const run = async () => {
          if (running) {
            queued = true;
            return;
          }
          running = true;
          try {
            const result = await runMediaPipeline({ logger });
            if (result.generated || result.removed) logger.info(`Photos mises à jour (${result.generated} fichiers générés).`);
          } catch (error) {
            logger.warn(`Traitement des photos interrompu : ${error.message}`);
          }
          running = false;
          if (queued) {
            queued = false;
            run();
          }
        };

        const onChange = (file) => {
          if (!file.startsWith(PATHS.content)) return;
          const isImage = IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase());
          const isData = /[\\/](event|site)\.json$/.test(file);
          if (!isImage && !isData) return;
          clearTimeout(timer);
          timer = setTimeout(run, 1200); // laisse le temps aux copies de fichiers de se terminer
        };

        server.watcher.add(PATHS.content);
        server.watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);
      },
    },
  };
}

export default defineConfig({
  site: site.url,
  integrations: [
    shootByTheoMedia(),
    sitemap({ filter: (page) => !/\/404\/?$/.test(page) }),
  ],
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  devToolbar: { enabled: false },
  server: { port: 4321 },
});
