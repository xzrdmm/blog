import type { APIContext } from 'astro';
import { siteConfig } from '../lib/site';

export async function GET(_context: APIContext) {
  const base = import.meta.env.BASE_URL;
  const manifest = {
    name: siteConfig.title,
    short_name: siteConfig.title,
    description: siteConfig.bio,
    start_url: base,
    scope: base,
    display: 'standalone',
    background_color: '#0a0e24',
    theme_color: '#0a0e24',
    icons: [
      {
        src: `${base}favicon.svg`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
