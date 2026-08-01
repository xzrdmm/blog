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
    pinned: z.boolean().default(false),
  }),
});

const chatters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/chatters' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
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
    lyricsText: z.string().default(''),
    draft: z.boolean().default(false),
  }),
});

const friends = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/friends' }),
  schema: z.object({
    name: z.string(),
    url: z.string().optional(),
    avatar: z.string().optional(),
    description: z.string().default(''),
    draft: z.boolean().default(false),
  }),
});

const photos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/photos' }),
  schema: z.object({
    caption: z.string(),
    image: z.string().optional(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, chatters, songs, friends, photos };
