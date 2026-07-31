import { motion } from 'framer-motion';
import ClockCard from './ClockCard';
import { formatDate } from '../../lib/format';

export interface PostItem {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
  tags: string[];
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  cover?: string;
  link?: string;
  tags: string[];
}

interface Props {
  posts: PostItem[];
  projects: ProjectItem[];
  base: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease: 'easeOut' as const },
};

export default function HomeMasonry({ posts, projects, base }: Props) {
  return (
    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
      <div className="mb-5 break-inside-avoid">
        <ClockCard />
      </div>

      {posts.map((post) => (
        <motion.article key={post.id} {...fadeUp} className="glass mb-5 overflow-hidden rounded-2xl break-inside-avoid">
          {post.cover && <img src={post.cover} alt={post.title} loading="lazy" className="aspect-video w-full object-cover" />}
          <div className="p-5">
            <div className="text-xs text-[var(--text-3)]">{formatDate(post.date)}</div>
            <h3 className="mt-1 text-lg leading-snug font-semibold text-[var(--text)]">
              <a href={`${base}posts/${post.id}/`} className="transition-colors hover:text-[var(--accent)]">
                {post.title}
              </a>
            </h3>
            {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-[var(--text-2)]">{post.excerpt}</p>}
            {post.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <a key={tag} href={`${base}tags/${encodeURIComponent(tag)}/`} className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[var(--accent)] transition hover:brightness-125">
                    {tag}
                  </a>
                ))}
              </div>
            )}
          </div>
        </motion.article>
      ))}

      {projects.map((project) => (
        <motion.article key={project.id} {...fadeUp} className="glass mb-5 overflow-hidden rounded-2xl break-inside-avoid">
          {project.cover ? (
            <img src={project.cover} alt={project.title} loading="lazy" className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-violet-500/40 to-cyan-400/30 text-3xl text-white/70">
              ⌘
            </div>
          )}
          <div className="p-5">
            <h3 className="text-lg leading-snug font-semibold text-[var(--text)]">{project.title}</h3>
            {project.description && <p className="mt-2 text-sm text-[var(--text-2)]">{project.description}</p>}
            <div className="mt-3 flex items-center gap-2">
              {project.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[var(--accent)]">
                  {tag}
                </span>
              ))}
              {project.link && (
                <a
                  href={project.link}
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
      ))}
    </div>
  );
}
