import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { filterPublished, sortPosts } from '../lib/posts';
import { siteConfig } from '../lib/site';

export async function GET(context: APIContext) {
  const posts = sortPosts(filterPublished(await getCollection('posts')));
  const site = context.site ?? 'https://example.com';

  return rss({
    title: siteConfig.title,
    description: siteConfig.bio,
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt,
      link: new URL(`posts/${post.id}/`, site).toString(),
    })),
    customData: '<language>zh-cn</language>',
  });
}
