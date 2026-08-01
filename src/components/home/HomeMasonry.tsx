import { motion } from 'framer-motion';
import { formatDate } from '../../lib/format';

export interface MasonryPostItem {
  kind: 'post';
  id: string;
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
  tags: string[];
}

export interface MasonryProjectItem {
  kind: 'project';
  id: string;
  title: string;
  description: string;
  cover?: string;
  link?: string;
  tags: string[];
}

export type MasonryItem = MasonryPostItem | MasonryProjectItem;

interface Props {
  items: MasonryItem[];
  base: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease: 'easeOut' as const },
};

export default function HomeMasonry({ items, base }: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:1fr]">
      {items.map((item) =>
        item.kind === 'post' ? (
          <motion.article key={item.id} {...fadeUp} className="glass flex h-full flex-col overflow-hidden rounded-2xl">
            {item.cover && <img src={item.cover} alt={item.title} loading="lazy" className="aspect-video w-full object-cover" />}
            <div className="flex flex-1 flex-col p-5">
              <div className="text-xs text-[var(--text-3)]">{formatDate(item.date)}</div>
              <h3 className="mt-1 text-lg leading-snug font-semibold text-[var(--text)]">
                <a href={`${base}posts/${item.id}/`} className="transition-colors hover:text-[var(--accent)]">
                  {item.title}
                </a>
              </h3>
              {item.excerpt && <p className="mt-2 line-clamp-3 text-sm text-[var(--text-2)]">{item.excerpt}</p>}
              {item.tags.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {item.tags.map((tag) => (
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
          </motion.article>
        ) : (
          <motion.article key={item.id} {...fadeUp} className="glass flex h-full flex-col overflow-hidden rounded-2xl">
            {item.cover ? (
              <img src={item.cover} alt={item.title} loading="lazy" className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-violet-500/40 to-cyan-400/30 text-3xl text-white/70">
                ⌘
              </div>
            )}
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-lg leading-snug font-semibold text-[var(--text)]">{item.title}</h3>
              {item.description && <p className="mt-2 line-clamp-3 text-sm text-[var(--text-2)]">{item.description}</p>}
              <div className="mt-auto flex items-center gap-2 pt-3">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[var(--accent)]">
                    {tag}
                  </span>
                ))}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--accent)] transition hover:brightness-125"
                  >
                    查看项目
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 17 17 7M8 7h9v9"></path>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </motion.article>
        ),
      )}
    </div>
  );
}
