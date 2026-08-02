export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n');
}

export function makeExcerpt(md: string, limit = 120): string {
  const text = stripMarkdown(md).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}…`;
}

export interface PostFrontmatterMeta {
  title: string;
  date: string;
  tags: string[];
}

const unwrap = (value: string): string =>
  value.trim().replace(/^['"]|['"]$/g, '');

export function parsePostFrontmatter(text: string): PostFrontmatterMeta {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { title: '', date: '', tags: [] };
  const body = match[1];
  const field = (key: string): string => {
    const found = body.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
    return found ? unwrap(found[1]) : '';
  };

  let tags: string[] = [];
  const inline = body.match(/^tags:\s*\[([^\]]*)\]/m);
  if (inline) {
    tags = inline[1]
      .split(',')
      .map(unwrap)
      .filter(Boolean);
  } else if (/^tags:\s*$/m.test(body)) {
    const list = body.match(/(?:^|\n)\s*-\s*([^\n]+)/g) ?? [];
    tags = list.map((line) => unwrap(line.replace(/^\s*-\s*/, ''))).filter(Boolean);
  }

  return { title: field('title'), date: field('date'), tags };
}
