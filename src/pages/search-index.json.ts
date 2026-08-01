import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { filterPublished, sortByDateDesc } from '../lib/posts';
import { makeExcerpt, stripMarkdown } from '../lib/content';

export async function GET(_context: APIContext) {
  const base = import.meta.env.BASE_URL;
  const posts = sortByDateDesc(filterPublished(await getCollection('posts')));
  const chatters = sortByDateDesc(await getCollection('chatters'));

  const docs = [
    ...posts.map((post) => ({
      type: 'post',
      id: post.id,
      title: post.data.title,
      excerpt: post.data.excerpt || makeExcerpt(post.body ?? '', 120),
      text: stripMarkdown(post.body ?? ''),
      date: post.data.date.toISOString(),
      url: `${base}posts/${post.id}/`,
    })),
    ...chatters.map((chatter) => ({
      type: 'chatter',
      id: chatter.id,
      title: chatter.data.title,
      excerpt: '',
      text: stripMarkdown(chatter.body ?? ''),
      date: chatter.data.date.toISOString(),
      url: `${base}chatter/`,
    })),
  ];

  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
