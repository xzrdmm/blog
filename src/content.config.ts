import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().default(''),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const chatters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/chatters' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

const songs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/songs' }),
  schema: z.object({
    title: z.string(),
    artist: z.string().default(''),
    playlist: z.string().default(''),
    cover: z.string().optional(),
    audio: z.string().optional(),
    lyrics: z.string().optional(),
    rating: z.string().default(''),
    review: z.string().default(''),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    cover: z.string().optional(),
    link: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, chatters, songs, projects };
