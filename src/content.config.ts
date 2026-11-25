import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const work = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(), // one line, shown on the home page card
    client: z.string(),
    order: z.number(), // 1 = the large screenshot on the home page
    built: z.array(z.string()),
    stack: z.array(z.string()).default([]),
    live: z.string().url().optional(),
    quote: z.object({ text: z.string(), by: z.string() }).optional(),
  }),
});

export const collections = { work };
