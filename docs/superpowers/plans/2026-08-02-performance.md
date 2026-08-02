# 整体性能优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把博客首屏 JS/图片体积降到原来的一半左右，同时保持视觉与功能不变。

**Architecture:** ① 移除 framer-motion，入场/滚动动画全部改为纯 CSS + IntersectionObserver（约省 gzip 40KB/页）；② 非关键小组件改为空闲时水合、首屏外卡片改为可见时水合；③ 用 sharp 脚本压缩壁纸/封面/文章图并接入 CI；④ Service Worker 改为缓存优先+后台更新，避免旧资源长期驻留；⑤ 加壁纸 preload 与图片解码属性优化 LCP。

**Tech Stack:** Astro 5、React 19 islands、Tailwind CSS 4、sharp（新 devDependency）、GitHub Actions。

**基线（已实测，2026-08-02）：**
- `dist/_astro` 合计 433,603 B；framer-motion proxy 块 122,997 B（gzip 40,269 B）；React client 块 186,619 B（gzip 58,536 B）。
- `public/images/wallpapers/wallpaper.jpg` 914,126 B；`public/music/covers/ユリイカ/cover.jpg` 878,246 B；`JUMP IN/cover.jpg` 588,265 B。

---

## 任务结构（文件地图）

- `src/lib/scroll.ts`（新建）：滚动进度纯函数。
- `src/lib/__tests__/scroll.test.ts`（新建）：对应 TDD 测试。
- `src/styles/global.css`：入场动画类、`.reveal` 滚动显现类。
- `src/components/home/HeroPanel.tsx`、`HomeMasonry.tsx`、`HomeMusicSection.tsx`：去 framer-motion。
- `src/components/music/MiniPlayer.tsx`：去 framer-motion。
- `src/components/widgets/ScrollProgress.tsx`、`BackToTop.tsx`、`FloatingClock.tsx`、`SearchButton.tsx`：去 framer-motion。
- `src/layouts/Base.astro`：reveal 观察脚本、island 改 `client:idle`、壁纸 preload、头像 fetchpriority。
- `src/pages/index.astro`：HomeMasonry/HomeMusicSection 改 `client:visible`。
- `scripts/optimize-images.mjs`（新建）：sharp 图片压缩。
- `package.json`：去掉 framer-motion，加 sharp、`images` 脚本。
- `.github/workflows/deploy.yml`：构建前执行 `npm run images`。
- `src/pages/sw.js.ts`：缓存 v2 + stale-while-revalidate。
- `src/components/ProfileCard.astro`、`src/pages/photowall.astro`、`src/components/music/MusicPlayer.tsx`、`src/components/music/MusicPageClient.tsx`、`src/components/home/HomeMusicSection.tsx`、`HomeMasonry.tsx`：图片加 `decoding="async"`（头像另加 `fetchpriority="high"`）。

---

### Task 1: 滚动进度纯函数（TDD）

**Files:**
- Create: `src/lib/scroll.ts`
- Test: `src/lib/__tests__/scroll.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { clampProgress } from '../scroll';

describe('clampProgress', () => {
  it('returns 0 at the top and 1 at the bottom', () => {
    expect(clampProgress(0, 2000, 800)).toBe(0);
    expect(clampProgress(1200, 2000, 800)).toBe(1);
  });

  it('clamps out-of-range values', () => {
    expect(clampProgress(-50, 2000, 800)).toBe(0);
    expect(clampProgress(99999, 2000, 800)).toBe(1);
  });

  it('returns 0 when the page cannot scroll', () => {
    expect(clampProgress(0, 800, 800)).toBe(0);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- src/lib/__tests__/scroll.test.ts`
Expected: FAIL，`clampProgress is not a function`。

- [ ] **Step 3: 最小实现**

```ts
export function clampProgress(scrollY: number, scrollHeight: number, innerHeight: number): number {
  const max = Math.max(0, scrollHeight - innerHeight);
  return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- src/lib/__tests__/scroll.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/lib/scroll.ts src/lib/__tests__/scroll.test.ts
git commit -m "feat: 滚动进度 clampProgress 纯函数（TDD）"
```

---

### Task 2: 移除 framer-motion，改为纯 CSS 动画

**Files:**
- Modify: `package.json`（删 `framer-motion`）
- Modify: `src/styles/global.css`
- Modify: `src/components/home/HeroPanel.tsx`、`HomeMasonry.tsx`、`HomeMusicSection.tsx`
- Modify: `src/components/music/MiniPlayer.tsx`
- Modify: `src/components/widgets/ScrollProgress.tsx`、`BackToTop.tsx`、`FloatingClock.tsx`、`SearchButton.tsx`
- Modify: `src/layouts/Base.astro`（加 reveal 观察脚本）

- [ ] **Step 1: 在 global.css 末尾加动画类（在“卡片 hover 动效”段之后）**

```css
/* ============ 入场/滚动显现动画（替代 framer-motion） ============ */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: none; }
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
@keyframes pop-in {
  from { opacity: 0; transform: translateY(16px) scale(0.94); }
  to { opacity: 1; transform: none; }
}
.anim-fade-up { animation: fade-up 0.45s ease-out both; }
.anim-fade-in { animation: fade-in 0.4s ease-out both; }
.anim-pop-in { animation: pop-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
.reveal {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.reveal.revealed { opacity: 1; transform: none; }
```

并在 `@media (prefers-reduced-motion: reduce)` 块里追加：

```css
  .anim-fade-up,
  .anim-fade-in,
  .anim-pop-in,
  .reveal { animation: none !important; transition: none !important; opacity: 1; transform: none; }
```

- [ ] **Step 2: 在 Base.astro 的 inline script 区加滚动显现观察器**

在现有 `<script is:inline>`（快捷键脚本）之后新增：

```html
<script is:inline>
  const observeReveals = () => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => {
      if (!el.dataset.revealBound) {
        el.dataset.revealBound = '1';
        io.observe(el);
      }
    });
  };
  document.addEventListener('astro:page-load', observeReveals);
  if (document.readyState !== 'loading') observeReveals();
  else document.addEventListener('DOMContentLoaded', observeReveals);
</script>
```

- [ ] **Step 3: 改写组件（逐文件删除 motion 用法）**

`src/components/home/HeroPanel.tsx`：删除 `import { motion } from 'framer-motion'`，外层 `<motion.div ...>` 改为 `<div className="glass anim-fade-up flex flex-col gap-4 rounded-2xl p-4 sm:p-5">`，闭合标签同步改 `</div>`。

`src/components/home/HomeMasonry.tsx`：删除 framer 导入与 `fadeUp` 常量；`<motion.article key={post.id} {...fadeUp} className="glass card-hover flex h-full flex-col overflow-hidden rounded-2xl">` 改为 `<article key={post.id} className="glass card-hover reveal flex h-full flex-col overflow-hidden rounded-2xl">`，闭合改 `</article>`。

`src/components/home/HomeMusicSection.tsx`：删除 framer 导入；`<motion.button ... initial/whileInView/viewport/transition ...>` 改为 `<button type="button" onClick={...} className="glass card-hover reveal flex flex-col gap-3 rounded-2xl p-4 text-left">`，闭合改 `</button>`。

`src/components/music/MiniPlayer.tsx`：删除 framer 导入与 `AnimatePresence`；`{track && (<motion.div ...>...</motion.div>)}` 改为 `{track && (<div className="widget-glass widget-layer anim-pop-in right-5 bottom-5 z-[90] w-[300px] max-w-[calc(100vw-40px)] rounded-2xl p-3">...</div>)}`。

`src/components/widgets/ScrollProgress.tsx`：整文件替换为：

```tsx
import { useEffect, useRef } from 'react';
import { clampProgress } from '../../lib/scroll';

export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const progress = clampProgress(
          window.scrollY,
          document.documentElement.scrollHeight,
          window.innerHeight,
        );
        if (ref.current) ref.current.style.transform = `scaleX(${progress})`;
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="widget-layer top-0 right-0 left-0 h-1 origin-left"
      style={{ transform: 'scaleX(0)', background: 'linear-gradient(90deg, #8b5cf6, #22d3ee)' }}
    />
  );
}
```

`src/components/widgets/BackToTop.tsx`：删除 framer 导入；返回体改为普通 `<button>`，`className` 中可见时加 `anim-pop-in`、不可见时加 `hidden`：

```tsx
return (
  <button
    type="button"
    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    aria-label="返回顶部"
    className={`widget-glass widget-layer anim-pop-in right-5 bottom-24 flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-2)] transition-colors hover:-translate-y-0.5 hover:text-[var(--accent)] ${visible ? '' : 'hidden'}`}
  >
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m18 15-6-6-6 6"></path>
    </svg>
  </button>
);
```

`src/components/widgets/FloatingClock.tsx`：`<motion.div ...>` 改为 `<div className="widget-glass widget-layer anim-fade-in bottom-5 left-5 hidden rounded-2xl px-4 py-2.5 text-right sm:block" style={{ animationDelay: '0.4s' }}>`。

`src/components/widgets/SearchButton.tsx`：`<motion.button ...>` 改为 `<button type="button" className="widget-glass widget-layer anim-fade-in bottom-24 left-5 flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-2)] transition hover:text-[var(--accent)]" style={{ animationDelay: '0.5s' }} onClick={...}>`，闭合改 `</button>`。

- [ ] **Step 4: 删除依赖并安装**

```bash
npm uninstall framer-motion
```

- [ ] **Step 5: 验证构建产物不再含 framer**

Run: `npm run build`
Expected: `dist/_astro` 中不再出现 `proxy.*.js`（framer-motion 块）；总字节明显下降。

Run: `npm run check` 与 `npm test`
Expected: 0 errors；全部测试通过。

- [ ] **Step 6: 浏览器冒烟**

用 Playwright 打开 `/`：滚动进度条随滚动变化、回到顶部按钮在 scrollY>420 出现、首页卡片滚动进视口后 `.revealed` 出现、音乐页可播放、迷你播放器出现。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "perf: 移除 framer-motion，入场/滚动动画改为纯 CSS + IntersectionObserver"
```

---

### Task 3: 水合时机优化

**Files:**
- Modify: `src/layouts/Base.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: 小组件改为空闲时水合**

`src/layouts/Base.astro` 中：

```astro
<ScrollProgress client:load />
<BackToTop client:load />
<FloatingClock client:load />
<SearchButton client:load base={base} />
```

改为：

```astro
<ScrollProgress client:idle />
<BackToTop client:idle />
<FloatingClock client:idle />
<SearchButton client:idle base={base} />
```

`AudioHost` 与 `MiniPlayer` 保持 `client:load transition:persist` 不动（播放器需要持久状态）。

- [ ] **Step 2: 首屏外卡片改为可见时水合**

`src/pages/index.astro` 中：

```astro
<HomeMasonry client:load posts={postItems} base={base} />
```
与
```astro
<HomeMusicSection client:load songs={musicSectionSongs} />
```

分别改为 `client:visible`。

- [ ] **Step 3: 验证**

Run: `npm run build`；Playwright 打开 `/`，检查初始 HTML 里 `HomeMasonry`/`HomeMusicSection` 的 island 标签存在且未立即执行脚本（滚动到卡片区域后生效）。

- [ ] **Step 4: 提交**

```bash
git add src/layouts/Base.astro src/pages/index.astro
git commit -m "perf: 非关键组件改空闲水合，首屏外卡片改可见时水合"
```

---

### Task 4: 图片压缩（sharp + CI）

**Files:**
- Create: `scripts/optimize-images.mjs`
- Modify: `package.json`、`.github/workflows/deploy.yml`

- [ ] **Step 1: 安装 sharp**

```bash
npm install -D sharp
```

- [ ] **Step 2: 新建 `scripts/optimize-images.mjs`**

```js
#!/usr/bin/env node
import { readdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const RULES = [
  { dir: 'public/images/wallpapers', maxWidth: 1600, quality: 78 },
  { dir: 'public/images/posts', maxWidth: 1280, quality: 80 },
  { dir: 'public/images/photos', maxWidth: 1600, quality: 80 },
  { dir: 'public/music/covers', maxWidth: 512, quality: 80 },
  { dir: 'public/images', maxWidth: 512, quality: 80 },
];
const MIN_BYTES = 50 * 1024;
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function walk(dir, out) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
}

const seen = new Set();
const jobs = [];
for (const rule of RULES) {
  const files = [];
  walk(rule.dir, files);
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (!EXTS.has(ext) || seen.has(file)) continue;
    seen.add(file);
    const size = statSync(file).size;
    if (size < MIN_BYTES) continue;
    const tmp = `${file}.tmp`;
    jobs.push(
      (async () => {
        try {
          const pipeline = sharp(file, { failOn: 'none' })
            .rotate()
            .resize({ width: rule.maxWidth, withoutEnlargement: true });
          if (ext === '.png') await pipeline.png({ quality: rule.quality }).toFile(tmp);
          else if (ext === '.webp') await pipeline.webp({ quality: rule.quality }).toFile(tmp);
          else await pipeline.jpeg({ quality: rule.quality, mozjpeg: true }).toFile(tmp);
          const after = statSync(tmp).size;
          if (after < size) {
            renameSync(tmp, file);
            console.log(`✓ ${file} ${(size / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`);
          } else {
            unlinkSync(tmp);
            console.log(`= ${file} 已足够小，跳过`);
          }
        } catch (error) {
          console.warn(`跳过 ${file}: ${error.message}`);
        }
      })(),
    );
  }
}

await Promise.all(jobs);
console.log('图片优化完成。');
```

- [ ] **Step 3: package.json 增加脚本**

```json
"images": "node scripts/optimize-images.mjs"
```

- [ ] **Step 4: deploy.yml 在 Build 前插入**

```yaml
      - name: Optimize images
        run: npm run images
```

（放在 `npm run build` 之前。）

- [ ] **Step 5: 本地执行并验证**

Run: `npm run images`
Expected: wallpaper 从 914KB 降到 ~200KB 以下；两张大封面降到 ~120KB 以下；小于 50KB 的图跳过。

重新 `npm run build` 并确认 `dist` 中图片已变小。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "perf: sharp 图片压缩脚本 + CI 构建前自动压缩（壁纸/封面/文章图）"
```

---

### Task 5: Service Worker 缓存策略

**Files:**
- Modify: `src/pages/sw.js.ts`

- [ ] **Step 1: 缓存名升级 + 静态资源 stale-while-revalidate**

把 `const CACHE = 'blog-v1';` 改为 `const CACHE = 'blog-v2';`；把静态资源分支：

```js
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
```

改为：

```js
  event.respondWith(
    caches.match(request).then((cached) => {
      const update = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || update;
    }),
  );
```

导航请求保持 network-first 不动。

- [ ] **Step 2: 验证**

Run: `npm run build`；检查 `dist/sw.js` 包含 `blog-v2` 与 stale-while-revalidate 逻辑。

- [ ] **Step 3: 提交**

```bash
git add src/pages/sw.js.ts
git commit -m "perf: Service Worker 缓存升级为 v2，静态资源后台更新"
```

---

### Task 6: LCP 与图片解码小优化

**Files:**
- Modify: `src/layouts/Base.astro`、`src/components/ProfileCard.astro`、`src/pages/photowall.astro`、`src/components/music/MusicPlayer.tsx`、`src/components/music/MusicPageClient.tsx`、`src/components/home/HomeMasonry.tsx`、`src/components/home/HomeMusicSection.tsx`

- [ ] **Step 1: Base.astro `<head>` 增加壁纸 preload**

在现有 `<meta name="generator" ...>` 附近加：

```astro
{siteConfig.wallpaper && (
  <link rel="preload" as="image" href={assetPath(siteConfig.wallpaper)} />
)}
```

- [ ] **Step 2: 图片加解码属性**

对所有非首屏 `<img>`（photowall、HomeMasonry、HomeMusicSection、MusicPlayer 封面、MusicPageClient 列表封面）加 `decoding="async"`；`ProfileCard.astro` 的头像加 `decoding="async" fetchpriority="high"`。

- [ ] **Step 3: 验证**

Run: `npm run build`；首页 HTML 中出现 wallpaper preload 与 `fetchpriority="high"`。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "perf: 壁纸 preload、头像高优先级、图片异步解码"
```

---

### Task 7: 整体验证与收尾

- [ ] **Step 1: 全量验证**

Run: `npm test`（预期全部通过，含新增 scroll 测试）
Run: `npm run check`（预期 0 errors）
Run: `npm run build`（预期成功）

- [ ] **Step 2: 性能对比实测**

用 Playwright + CDP 记录首页加载总传输字节数（本地 dev 前/后对比），并核对：
- `dist/_astro` 不再有 framer proxy 块；
- 壁纸/封面体积达标；
- 首页 LCP 资源为压缩后的壁纸。

- [ ] **Step 3: 功能回归**

Playwright 检查：首页卡片 hover、说说轮播、音乐播放/歌词、暗色切换、后台 Keystatic 列表筛选工具条、照片/歌曲导入按钮均正常。

- [ ] **Step 4: 最终提交并报告**

```bash
git add -A
git commit -m "perf: 整体性能优化收尾（若本任务无新改动则跳过提交）"
```

报告优化前后对比数字（JS 体积、图片体积、总传输量）。
