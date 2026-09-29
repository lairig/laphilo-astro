import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const philosophes = defineCollection({
  loader: file('src/data/philosophes.json', {
    parser: (text) => {
      const entries = JSON.parse(text) as { _id: string }[];
      return entries.map(({ _id, ...entry }) => ({ id: _id, ...entry }));
    },
  }),
  schema: z.object({
    year: z.number(),
    end_year: z.union([z.number(), z.literal('')]).optional().transform((v) => (v === '' ? undefined : v)),
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
    traditions: z.array(z.string()).optional(),
    /* Frise du monde : grand groupe (codes dans GROUPES de build-data.py), importance 2-3 */
    groupe: z.string().optional(),
    importance: z.number().optional(),
    description: z.string().optional(),
    frise_source: z.string(),
    frise_label: z.string(),
  }),
});

const courants = defineCollection({
  loader: file('src/data/courants.json', {
    parser: (text) => {
      const entries = JSON.parse(text) as { _id: string }[];
      return entries.map(({ _id, ...entry }) => ({ id: _id, ...entry }));
    },
  }),
  schema: z.object({
    year: z.number(),
    end_year: z.union([z.number(), z.literal('')]).optional().transform((v) => (v === '' ? undefined : v)),
    display_date: z.string(),
    name: z.string(),
    text: z.string(),
    yt_id: z.string().optional(),
    media_credit: z.string().optional(),
    image_media: z.string().optional(),
    branches: z.array(z.string()).optional(),
    description: z.string().optional(),
    frise_source: z.string(),
    frise_label: z.string(),
  }),
});

export const collections = { philosophes, courants };
