import { stripMarkdown } from './content';

export function estimateReadingTime(markdown: string, charsPerMinute = 400): number {
  const text = stripMarkdown(markdown).replace(/\s+/g, '');
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / charsPerMinute));
}
