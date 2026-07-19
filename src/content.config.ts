import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const philosophes = defineCollection({
  loader: file('src/data/frise-philosophes-france.json', {
    parser: (text) => {
      const entries = JSON.parse(text) as { name: string }[];
      return entries.map((entry) => ({ id: slugify(entry.name), ...entry }));
    },
  }),
  schema: z.object({
    year: z.number(),
    end_year: z.number().optional(),
    display_date: z.string(),
    name: z.string(),
    text: z.string(),
    yt_id: z.string().optional(),
    media_credit: z.string().optional(),
    thumbnail: z.string().optional(),
    image_media: z.string().optional(),
    nationalite: z.string().optional(),
    branches: z.array(z.string()).optional(),
    courants: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

export const collections = { philosophes };
