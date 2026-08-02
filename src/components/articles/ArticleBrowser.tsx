import { useMemo, useState } from 'react';
import { formatDate } from '../../lib/format';

export interface ArticleItem {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
  tags: string[];
}

interface Props {
  posts: ArticleItem[];
  base: string;
}

const ALL = '全部';

export default function ArticleBrowser({ posts, base }: Props) {
  const [activeTag, setActiveTag] = useState(ALL);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'),
    );
  }, [posts]);

  const filtered = useMemo(
    () =>
      activeTag === ALL
        ? posts
        : posts.filter((post) => post.tags.includes(activeTag)),
    [posts, activeTag],
  );

  return (
    <div className="flex flex-col gap-5">
      {tagCounts.length > 0 && (
        <div className="tag-cloud" aria-label="按标签筛选文章">
          <button
            type="button"
            className={`tag-chip${activeTag === ALL ? ' tag-chip-active' : ''}`}
            onClick={() => setActiveTag(ALL)}
          >
            全部<span className="count">{posts.length}</span>
          </button>
          {tagCounts.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              className={`tag-chip${activeTag === tag ? ' tag-chip-active' : ''}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}<span className="count">{count}</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-[var(--text-2)]">共 {filtered.length} 篇文章</p>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:1fr]">
          {filtered.map((post) => (
            <article
              key={post.id}
              className="glass card-hover flex h-full flex-col overflow-hidden rounded-2xl"
            >
              {post.cover && (
                <img
                  src={post.cover}
                  alt={post.title}
                  loading="lazy"
                  decoding="async"
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="text-xs text-[var(--text-3)]">{formatDate(post.date)}</div>
                <h3 className="mt-1 text-lg leading-snug font-semibold text-[var(--text)]">
                  <a
                    href={`${base}posts/${post.id}/`}
                    className="transition-colors hover:text-[var(--accent)]"
                  >
                    {post.title}
                  </a>
                </h3>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-[var(--text-2)]">{post.excerpt}</p>
                )}
                {post.tags.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    {post.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setActiveTag(tag)}
                        className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[var(--accent)] transition hover:brightness-125"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty">这个标签下还没有文章。</p>
      )}
    </div>
  );
}
