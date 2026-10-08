// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Date de dernière modification de chaque fiche (tenue à jour par scripts/build-data.py)
const datesModif = JSON.parse(readFileSync(new URL('./src/data/dates-modif.json', import.meta.url), 'utf-8'));

// https://astro.build/config
export default defineConfig({
  site: 'https://laphilo.fr',
  integrations: [
    sitemap({
      serialize(item) {
        const m = item.url.match(/\/((?:philosophes|courants)\/[^/]+)\/$/);
        const d = m && datesModif[m[1]];
        if (d) item.lastmod = d.d;
        return item;
      },
    }),
  ],
});
