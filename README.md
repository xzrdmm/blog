# 我的博客（Astro + Keystatic + GitHub Pages）

毛玻璃（Glassmorphism）风格的个人博客：文章、项目、说说、标签、归档、RSS、暗色模式、代码高亮，以及**带歌词的音乐播放器与乐评区**，内容由 Keystatic 后台管理。

## 技术栈

- [Astro 5](https://astro.build)（静态站点，TypeScript strict）
- [Keystatic](https://keystatic.com)（Git-based 可视化后台，内容落盘为 Markdown/JSON）
- Tailwind CSS 4 + Framer Motion（动画与交互组件）
- GitHub Pages（GitHub Actions 自动构建发布）

## 本地开发

```bash
npm install
npm run dev
```

打开 http://localhost:4321 预览站点，打开 http://localhost:4321/keystatic 进入管理后台（本地模式，直接读写仓库文件）。

> Keystatic 后台依赖服务端路由，**只在开发服务器上启用**；生产构建是纯静态产物（`dist/`），不包含 `/keystatic`，可以直接部署到 GitHub Pages。

常用命令：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发服务器 |
| `npm run build` | 构建到 `dist/` |
| `npm run preview` | 本地预览构建产物 |
| `npm run test` | 运行单元测试 |

## 内容结构

```
src/content/posts/     文章（Markdown + frontmatter）
src/content/chatters/  说说（Markdown）
src/content/songs/     歌曲（JSON：歌名/歌手/歌单/音频/歌词/评分/乐评）
src/siteConfig.json    站点设置（博客名、简介、头像、社交、主题色）
```

文章的 frontmatter 字段：`title`、`date`、`excerpt`、`cover`、`tags`、`draft`、正文。
设 `draft: true` 的文章不会出现在列表与 RSS 中。

## 音乐系统

在后台（`/keystatic`）的「歌曲」集合里添加歌曲：

1. 填歌名、歌手和**歌单/风格**（同名自动归为一个歌单，可建多个风格歌单）。
2. 上传**音频文件**（支持 mp3 / flac / m4a / ogg / wav，单文件 ≤ 100MB，GitHub 限制），保存到 `public/music/audio/`。
3. 上传**歌词字幕**（推荐 `.lrc` 格式，逐行同步高亮；纯文本 `.txt` 会静态展示），保存到 `public/music/lyrics/`。
4. 可选：填 1-5 星评分和**乐评**（短评），会显示在音乐页右侧。
5. 保存后 `git push` 即发布。

后台上传音频后会自动显示文件名标签；**mp3/flac 的标题和歌手会被自动识别并回填**到「歌名」「歌手/艺术家」；封面选择后会显示预览。这些增强只在本地开发的后台生效（生产站点不含后台）。

> ⚠️ **后台上传上限 1MB**：Keystatic 把文件读进浏览器内存的耗时是超线性增长的（1MB 约 2 秒、5MB 约 12 秒、10MB 会卡死），所以后台只适合上传封面、歌词和小片段；**正常音乐文件请一律用下面的批量导入命令**（后台会给出提示）。

### 批量导入音乐（推荐大量导入时使用）

后台上传大文件会比较慢。批量导入时，把音频文件放进一个文件夹，然后执行：

### 后台直接导入（推荐）

打开后台「歌曲」列表页，点击右上角「**导入歌曲（自动识别作者/封面）**」按钮：

1. 选择任意数量的音频文件（mp3/flac/m4a/ogg/wav 均可，大小不限）。
2. 按提示依次选择项目里的三个文件夹（只需第一次选择，之后会自动记住）：
   `public/music/audio`、`public/music/covers`、`src/content/songs`。
3. 输入歌单/风格名，程序会**自动读取标题、作者，并提取 mp3/flac 内嵌封面**写入对应目录，
   同时生成歌曲条目；完成后刷新页面即可在音乐页看到。

这个方式完全绕过后台上传的大小限制，不会卡顿，也不需要命令行。

### 批量导入照片（照片墙）

打开后台「照片墙」列表页，点击右上角「**导入照片（批量）**」按钮，选择任意数量的图片
（jpg/png/webp/gif/avif 均可，大小不限），程序会把每张图写入 `public/images/photos/<说明>/`，
并以文件名生成照片条目（日期取当天，可在后台修改）。手机相册导出的照片通常超过后台
1MB 上限，请优先使用这个按钮而不是在表单里直接上传。

### 命令行批量导入（备用）

也可以把音频文件放进一个文件夹，然后执行：

```bash
npm run music:import -- D:\音乐\我的歌单 我的歌单
```

脚本会自动读取每个文件的**标题/歌手元数据**（mp3、flac、m4a、ogg、wav 均可），把音频复制到 `public/music/audio/`，并在 `src/content/songs/` 生成对应的歌曲条目（歌单名取第二个参数，默认取文件夹名）。之后在后台补封面和歌词即可。

LRC 歌词格式示例：

```lrc
[00:12.34]第一句歌词
[00:16.00]第二句歌词
[00:20.50]第三句歌词
```

首页顶部有播放器（自动选中第一首），播放中右下角会出现迷你播放器，切页不停歌；`/music` 页支持按歌单筛选、播放、歌词与乐评。

音乐增强：

- 播放模式：顺序 / 随机 / 单曲循环（播放器内一键切换，自动记忆）。
- 播放队列：音乐页每首歌可「入队」，队列按顺序播放。
- 播放记忆：音量、播放模式、上次播放的歌曲自动记住，刷新后恢复。
- 歌词两种方式：上传 `.lrc` 文件，或直接在后台「歌词文本（LRC）」里粘贴/编辑（文件优先）。

## 搜索

- 按 `/` 键或左下角搜索按钮进入 `/search`，支持中文前缀与模糊匹配，索引包含文章与说说全文。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个**公开**仓库（免费计划下 Pages 不支持私有仓库），仓库名任意，例如 `blog`。
2. 把本目录推送上去：

   ```bash
   git init -b main
   git add .
   git commit -m "init blog"
   git remote add origin git@github.com:<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

3. 在仓库 Settings → Pages 中，Source 选择 **GitHub Actions**。
4. 推送后 Actions 会自动构建并发布，站点地址为 `https://<你的用户名>.github.io/<仓库名>/`。

### 修改站点地址

打开 `astro.config.mjs`，把 `site` 改成你的真实地址，并确认 `base` 与仓库名一致：

```js
export default defineConfig({
  site: 'https://<你的用户名>.github.io/<仓库名>/',
  base: '/<仓库名>/',
  // ...
});
```

如果绑定了自定义域名，把 `base` 改为 `'/'`，并在仓库 Pages 设置中配置域名。

## 远程编辑（可选）

**本地模式**：开发时在 `/keystatic` 编辑，保存后内容直接写入仓库，`git push` 即发布。

**网页端远程编辑**：Keystatic 的 GitHub 模式需要 Node.js 运行时处理 OAuth 与 API 路由，而 GitHub Pages 只提供静态文件，**无法在 Pages 上使用网页端编辑**。如果你希望在任何设备上通过网页写文章，有两个方案：

1. 把同一个仓库部署到支持 Node 运行时的平台（如 Vercel、Netlify、Cloudflare Pages），
   在 `astro.config.mjs` 中移除生产环境对 Keystatic 集成的排除（`isProduction ? [] : [keystatic()]` 改为始终启用），
   安装对应平台的适配器，并在 `keystatic.config.ts` 中把 `storage` 改为：

   ```ts
   storage: {
     kind: 'github',
     repo: '<你的用户名>/<仓库名>',
   },
   ```

   然后按 [Keystatic 官方文档](https://keystatic.com/docs/connect-to-github) 创建 GitHub App，并在部署平台配置生成的四个环境变量。

2. 使用 [Keystatic Cloud](https://keystatic.com/docs/cloud)（免费额度）托管认证，同样在部署平台运行。

## 个性化

- 博客名、简介、头像、社交链接、背景图、主题色：在 `/keystatic` 的「站点设置」中修改。
- **主页内容选择**：站点设置里可以挑选「主页展示的文章 / 歌曲」；文章会显示在首页「灵感与作品」板块（默认取最新 6 篇，等高新布局），歌曲会显示在首页「音乐」板块（封面、评分、乐评）。
- **主页壁纸与不透明度**：后台「站点设置 → 主页壁纸 / 壁纸不透明度」直接控制，无需改代码。
- **特效开关**：后台可单独关闭「粒子特效」和「光晕特效」，关闭后更省性能。
- 背景特效为纯 CSS（无滤镜光晕 + transform 粒子），位于 `src/styles/global.css`；系统开启「减弱动态效果」时自动停用，移动端自动减少粒子并关闭卡片模糊。
- 暗色模式：默认跟随系统，右上角按钮手动切换（记忆在 localStorage）。
- 页面切换动画：Astro View Transitions（淡入 + 轻微上移）；首页卡片渐次入场，支持 `prefers-reduced-motion`。
- 悬浮组件：顶部滚动进度条、返回顶部、角落时钟、迷你播放器，均为玻璃拟态样式。
- 后台界面为中文（保存/添加/选择文件/移除等），保存后会出现「已保存 ✓」提示。
- 键盘快捷键：`/` 打开搜索；`空格` 播放/暂停。

## 更多页面

- `/about`：关于我（后台「关于我」单页编辑）。
- `/friends`：友链（后台「友链」集合）。
- `/photowall`：照片墙（后台「照片墙」集合）。
- 文章页：目录、阅读时长/字数、代码复制按钮、图片灯箱、分享/复制链接、相关文章推荐。

## SEO 与统计

- 自动生成 `sitemap-index.xml`，文章页带 Open Graph / Twitter Card / JSON-LD。
- 访问统计：后台「站点设置 → GoatCounter 站点 ID」填入你的 GoatCounter ID 即启用。

## 维护

- 备份：`npm run backup` 一键把内容与媒体复制到 `backups/<时间戳>/`。
- 类型检查：`npm run check`（`astro check`），已接入 GitHub Actions。
- PWA：生产站点可安装到桌面/手机，基础离线缓存（音频与后台 API 不缓存）。

## 常见问题

- **改了 `site` / `base` 后资源 404？** 确认 `base` 与仓库名一致，且所有 `/images/...` 路径已自动加上 `base` 前缀（代码中使用 `assetPath` 处理）。
- **RSS 地址**：`https://<你的用户名>.github.io/<仓库名>/rss.xml`。
- **Keystatic 保存后页面没变化？** 本地开发时保存后热更新即时生效；发布需要 `git push` 触发部署。
- **音乐不播放？** 确认音频文件确实上传（`public/music/audio/` 下有文件），且歌曲条目里的「音频文件」字段已选择该文件；浏览器需要用户先点击一次播放按钮。
