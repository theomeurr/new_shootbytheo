import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { parseEventDate } from './lib/dates';

/** Accepte "2026-09-19" comme "19 septembre 2026". */
const eventDate = z
  .string()
  .refine((value) => parseEventDate(value) !== null, {
    message: 'Date invalide. Formats acceptés : "2026-09-19" ou "19 septembre 2026".',
  })
  .transform((value) => parseEventDate(value) as Date);

const events = defineCollection({
  // Un dossier par événement : content/evenements/<dossier>/event.json (+ les photos à côté).
  loader: glob({
    pattern: ['*/event.json', '!_*/**'],
    base: './content/evenements',
    generateId: ({ entry }) => entry.replace(/\\/g, '/').split('/')[0],
  }),
  schema: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Le slug ne doit contenir que des minuscules, chiffres et tirets.')
      .optional(),
    title: z.string().min(1),
    date: eventDate,
    dateEnd: z.preprocess((value) => (value === '' ? undefined : value), eventDate.nullish().transform((value) => value ?? undefined)),
    year: z.number().int().optional(),
    season: z.string().optional(),
    sport: z.string().default(''),
    competition: z.string().default(''),
    type: z.string().default(''),
    category: z.preprocess((value) => (value === '' ? undefined : value), z.enum(['badminton', 'autres-sports', 'evenementiel']).optional()),
    location: z.string().default(''),
    venue: z.string().default(''),
    teams: z.array(z.string()).default([]),
    description: z.string().default(''),
    cover: z.string().optional(),
    coverPosition: z.string().default('50% 40%'),
    gallery: z.array(z.string()).optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { events };
