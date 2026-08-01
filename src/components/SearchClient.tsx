import MiniSearch from 'minisearch';
import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../lib/format';

interface SearchDoc {
  type: 'post' | 'chatter';
  id: string;
  title: string;
  excerpt: string;
  text: string;
  date: string;
  url: string;
}

interface Props {
  indexUrl: string;
}

export default function SearchClient({ indexUrl }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const engineRef = useRef<MiniSearch<SearchDoc> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(indexUrl)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('index'))))
      .then((docs: SearchDoc[]) => {
        if (cancelled) return;
        const engine = new MiniSearch<SearchDoc>({
          fields: ['title', 'excerpt', 'text'],
          storeFields: ['type', 'id', 'title', 'excerpt', 'date', 'url'],
          searchOptions: {
            boost: { title: 2.5, excerpt: 1.5 },
            prefix: true,
            fuzzy: 0.2,
          },
        });
        engine.addAll(docs);
        engineRef.current = engine;
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [indexUrl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === '/' &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q || !engineRef.current) {
      setResults([]);
      return;
    }
    const hits = engineRef.current.search(q) as unknown as SearchDoc[];
    setResults(hits);
  }, [query]);

  const postCount = results.filter((r) => r.type === 'post').length;
  const chatterCount = results.length - postCount;

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="search"
        defaultValue=""
        onChange={(e) => setQuery(e.target.value)}
        placeholder="输入关键词搜索文章与说说…"
        aria-label="站内搜索"
        className="glass w-full rounded-2xl px-5 py-4 text-base text-[var(--text)] outline-none placeholder:text-[var(--text-3)]"
      />
      {!loaded && <p className="empty">索引加载中…</p>}
      {loaded && query.trim() === '' && (
        <p className="empty">输入关键词开始搜索；支持前缀与模糊匹配。</p>
      )}
      {loaded && query.trim() !== '' && results.length === 0 && (
        <p className="empty">没有找到与「{query}」相关的内容。</p>
      )}
      {results.length > 0 && (
        <>
          <p className="meta">
            找到 {results.length} 条结果（文章 {postCount} · 说说 {chatterCount}）
          </p>
          <ul className="flex flex-col gap-3">
            {results.map((result) => (
              <li key={`${result.type}-${result.id}`}>
                <a className="glass block rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5" href={result.url}>
                  <span className="mb-1 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)]">
                      {result.type === 'post' ? '文章' : '说说'}
                    </span>
                    <span className="text-[var(--text-3)]">{formatDate(result.date)}</span>
                  </span>
                  <span className="block font-semibold text-[var(--text)]">{result.title}</span>
                  {result.excerpt && (
                    <span className="mt-1 line-clamp-2 block text-sm text-[var(--text-2)]">
                      {result.excerpt}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
