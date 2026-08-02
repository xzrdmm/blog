import { formatDate } from '../../lib/format';

export interface MasonryPostItem {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
  tags: string[];
}

interface Props {
  posts: MasonryPostItem[];
  base: string;
}

export default function HomeMasonry({ posts, base }: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:1fr]">
      {posts.map((post) => (
        <article
          key={post.id}
          className="glass card-hover reveal flex h-full flex-col overflow-hidden rounded-2xl"
        >
          {post.cover && (
            <img src={post.cover} alt={post.title} loading="lazy" className="aspect-video w-full object-cover" />
          )}
          <div className="flex flex-1 flex-col p-5">
            <div className="text-xs text-[var(--text-3)]">{formatDate(post.date)}</div>
            <h3 className="mt-1 text-lg leading-snug font-semibold text-[var(--text)]">
              <a href={`${base}posts/${post.id}/`} className="transition-colors hover:text-[var(--accent)]">
                {post.title}
              </a>
            </h3>
            {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-[var(--text-2)]">{post.excerpt}</p>}
            {post.tags.length > 0 && (
              <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                {post.tags.map((tag) => (
                  <a
                    key={tag}
                    href={`${base}tags/${encodeURIComponent(tag)}/`}
                    className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[var(--accent)] transition hover:brightness-125"
                  >
                    {tag}
                  </a>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
