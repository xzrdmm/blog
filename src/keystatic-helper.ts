/**
 * 开发环境专用的 Keystatic 后台增强：
 * - 文件选中后显示文件名小标签（官方按钮文案固定为 "Choose file"，不随状态变化）
 * - 封面字段显示图片预览
 * - 上传音频后自动读取 mp3/flac 元数据，回填「歌名」「歌手/艺术家」
 */
import { parseBlob } from 'music-metadata';
import { buildSongEntry } from './lib/import-entry';
import { parsePostFrontmatter } from './lib/content';

const FIELD_LABELS = new Set(['封面', '音频文件', '歌词字幕']);
// 按文件类型放开后台上传限制（Keystatic 读取超大文件会严重卡顿，所以仍保留上限）
const MAX_ADMIN_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_ADMIN_AUDIO_SIZE = 15 * 1024 * 1024;
const MAX_ADMIN_OTHER_SIZE = 5 * 1024 * 1024;
// 已解析过元数据的文件，避免 React 重渲染后重复解析大文件导致卡顿
const autofilledSources = new Set<string>();

// 官方 zh-CN 翻译的修正与补充
const UI_TRANSLATIONS: Record<string, string> = {
  节省: '保存',
  仪表板: '控制台',
  收藏品: '内容',
  单例: '站点配置',
  'Choose file': '选择文件',
  Download: '下载文件',
  Remove: '移除',
  Regenerate: '重新生成',
  Add: '添加',
  Create: '创建',
  Save: '保存',
  Cancel: '取消',
  Dashboard: '控制台',
  COLLECTIONS: '内容',
  SINGLETONS: '站点设置',
  Name: '名称',
  Search: '搜索',
  'Slug*': '标识*',
  Slug: '标识',
  'No results': '暂无结果',
  Back: '返回',
  'Delete entry…': '删除条目…',
  'Reset changes': '重置更改',
  'Copy entry': '复制条目',
  'Paste entry': '粘贴条目',
  'Duplicate entry…': '复制为草稿…',
};
const flags = () => window as unknown as {
  __KS_HELPER_DISABLED?: boolean;
  __KS_NO_AUTOFILL?: boolean;
};

interface DirectoryPickerWindow {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
}

interface PermissionedDirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission?: (options: { mode: 'read' | 'readwrite' }) => Promise<string>;
  requestPermission?: (options: { mode: 'read' | 'readwrite' }) => Promise<string>;
}

function injectStyles(): void {
  if (document.getElementById('ks-helper-style')) return;
  const style = document.createElement('style');
  style.id = 'ks-helper-style';
  style.textContent = `
    .ks-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: 8px;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(124, 108, 246, 0.16);
      color: #c4b5fd;
      font-size: 12px;
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
    }
    .ks-preview {
      display: block;
      margin-top: 8px;
      border-radius: 10px;
      max-height: 120px;
      max-width: 180px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .ks-toast {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      max-width: 560px;
      padding: 10px 16px;
      border-radius: 12px;
      background: rgba(30, 20, 60, 0.95);
      border: 1px solid rgba(167, 139, 250, 0.4);
      color: #e9e4ff;
      font-size: 13px;
      line-height: 1.6;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .ks-preview-btn {
      position: fixed;
      bottom: 84px;
      right: 16px;
      z-index: 9998;
      padding: 8px 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, #7c6cf6, #38bdf8);
      color: #fff;
      font-size: 13px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      transition: transform 0.15s ease;
    }
    .ks-preview-btn:hover {
      transform: translateY(-2px);
    }
    .ks-import-btn {
      position: fixed;
      top: 64px;
      right: 16px;
      z-index: 9998;
      padding: 9px 14px;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #7c6cf6, #38bdf8);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    .ks-import-btn:hover {
      transform: translateY(-2px);
    }
    .ks-filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(167, 139, 250, 0.4);
      box-shadow: 0 8px 24px rgba(30, 20, 60, 0.12);
      font-size: 13px;
      color: #2a2a3e;
      max-width: 940px;
    }
    .ks-filter-label {
      color: #6b6b84;
      white-space: nowrap;
    }
    .ks-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .ks-chip-btn {
      border: 1px solid rgba(124, 108, 246, 0.32);
      background: transparent;
      color: #5b5b74;
      border-radius: 999px;
      padding: 3px 11px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ks-chip-btn:hover {
      border-color: #7c6cf6;
      color: #7c6cf6;
    }
    .ks-chip-btn.active {
      background: #7c6cf6;
      border-color: #7c6cf6;
      color: #fff;
    }
    .ks-filter-sort {
      border: 1px solid rgba(124, 108, 246, 0.32);
      border-radius: 8px;
      background: #fff;
      color: #2a2a3e;
      padding: 4px 8px;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);
}

function showToast(message: string): void {
  const existing = document.getElementById('ks-toast');
  existing?.remove();
  const div = document.createElement('div');
  div.id = 'ks-toast';
  div.className = 'ks-toast';
  div.textContent = message;
  // 挂到 <html> 上，避免被后台应用的 React 重渲染清掉
  document.documentElement.appendChild(div);
  window.setTimeout(() => div.remove(), 10000);
}

function installLargeFileGuard(): void {
  document.addEventListener(
    'change',
    (event) => {
      const input = event.target as HTMLInputElement | null;
      const file = input?.files?.[0];
      if (input?.type !== 'file' || !file) return;
      const isImage =
        file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name);
      const isAudio =
        file.type.startsWith('audio/') || /\.(mp3|flac|m4a|ogg|wav)$/i.test(file.name);
      const limit = isImage ? MAX_ADMIN_IMAGE_SIZE : isAudio ? MAX_ADMIN_AUDIO_SIZE : MAX_ADMIN_OTHER_SIZE;
      if (file.size > limit) {
        event.stopImmediatePropagation();
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        const limitMB = limit / 1024 / 1024;
        const message = isImage
          ? `「${file.name}」(${sizeMB}MB) 超过后台上传上限 ${limitMB}MB，请压缩图片后再上传`
          : isAudio
            ? `「${file.name}」(${sizeMB}MB) 超过后台上传上限 ${limitMB}MB，为避免页面崩溃，请改用批量导入：npm run music:import -- <文件夹> <歌单名>`
            : `「${file.name}」(${sizeMB}MB) 超过后台上传上限 ${limitMB}MB`;
        showToast(
          message,
        );
      }
    },
    true,
  );
}

function installPreviewButton(): void {
  const existing = document.getElementById('ks-preview-btn');
  const match = location.pathname.match(
    /^\/keystatic\/collection\/(posts|songs|chatters|projects|friends|photos)\/item\/([^/]+)/,
  );
  if (!match) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const [, collection, slug] = match;
const target = ({
    posts: `/posts/${encodeURIComponent(slug)}/`,
    songs: '/music',
    chatters: '/chatter/',
    friends: '/friends/',
    photos: '/photowall/',
  } as Record<string, string>)[collection] ?? '/';
  const btn = document.createElement('a');
  btn.id = 'ks-preview-btn';
  btn.className = 'ks-preview-btn';
  btn.href = target;
  btn.target = '_blank';
  btn.rel = 'noopener';
  btn.textContent = '前台预览 ↗';
  document.documentElement.appendChild(btn);
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ks-import-dirs', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('dirs');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await idbOpen();
    return await new Promise((resolve) => {
      const tx = db.transaction('dirs', 'readonly');
      const request = tx.objectStore('dirs').get(key);
      request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle) ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('dirs', 'readwrite');
      tx.objectStore('dirs').put(handle, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 忽略存储失败，下次重新选择目录即可
  }
}

async function pickProjectRoot(): Promise<FileSystemDirectoryHandle> {
  const stored = await idbGet('root');
  if (stored) {
    const permissioned = stored as PermissionedDirectoryHandle;
    if ((await permissioned.queryPermission?.({ mode: 'readwrite' })) === 'granted') return stored;
    if ((await permissioned.requestPermission?.({ mode: 'readwrite' })) === 'granted') return stored;
  }
  const picker = window as unknown as DirectoryPickerWindow;
  const dir = await picker.showDirectoryPicker?.({ mode: 'readwrite' });
  if (!dir) throw new Error('未选择目录');
  await idbSet('root', dir);
  return dir;
}

async function resolveDir(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const part of path.split('/')) {
    if (!part) continue;
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function listJsonSlugs(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const slugs: string[] = [];
  for await (const [name] of dir.entries()) {
    if (name.endsWith('.json')) slugs.push(name.replace(/\.json$/, ''));
  }
  return slugs;
}

async function writeFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: Uint8Array,
): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data as unknown as BufferSource);
  await writable.close();
}

async function runSongImport(): Promise<void> {
  // showDirectoryPicker 必须在用户手势内调用，所以先选目录、再选文件
  let root: FileSystemDirectoryHandle;
  try {
    showToast('请选择博客项目根目录（例如 D:\\new\\blog）');
    root = await pickProjectRoot();
  } catch (error) {
    if (isAbortError(error)) {
      showToast('已取消导入');
      return;
    }
    showToast(`选择目录失败：${String(error)}`);
    return;
  }
  const audioDir = await resolveDir(root, 'public/music/audio');
  const coversDir = await resolveDir(root, 'public/music/covers');
  const entriesDir = await resolveDir(root, 'src/content/songs');

  const existing = await listJsonSlugs(entriesDir);
  const playlistInput = window.prompt(
    '歌单/风格（同名的歌曲归入同一个歌单）：',
    localStorage.getItem('ks-playlist') ?? '',
  );
  const playlist = (playlistInput ?? '').trim() || '未分类';
  localStorage.setItem('ks-playlist', playlist);

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*,.lrc,.txt';
  input.multiple = true;
  input.onchange = async () => {
    const files = [...(input.files ?? [])];
    const audioFiles = files.filter((file) => !/\.(lrc|txt)$/i.test(file.name));
    const lyricFiles = files.filter((file) => /\.(lrc|txt)$/i.test(file.name));
    if (!audioFiles.length && !lyricFiles.length) return;
    showToast(`正在解析 ${files.length} 个音频文件…`);

    try {
      const results: { name: string; ok: boolean; error?: string }[] = [];
      const encoder = new TextEncoder();
      const imported: { slug: string; title: string }[] = [];

      for (const file of audioFiles) {
        try {
          const meta = await parseBlob(file);
          const title =
            meta.common.title?.trim() || file.name.replace(/\.[^.]+$/, '').trim() || '未知标题';
          const artist =
            meta.common.artist?.trim() || meta.common.albumartist?.trim() || '';
          const extension = (file.name.match(/\.([^.]+)$/)?.[1] ?? '').toLowerCase() || 'mp3';
          const picture = meta.common.picture?.[0];
          const built = buildSongEntry(
            {
              title,
              artist,
              extension,
              coverData: picture ? new Uint8Array(picture.data) : undefined,
              coverFormat: picture?.format,
            },
            playlist,
            existing,
          );
          existing.push(built.slug);
          imported.push({ slug: built.slug, title: built.entry.title as string });

          const audioSubDir = await resolveDir(audioDir, built.slug);
          await writeFile(
            audioSubDir,
            built.audioName.split('/').pop() ?? `audio.${extension}`,
            new Uint8Array(await file.arrayBuffer()),
          );
          if (built.coverName && picture) {
            const coverSubDir = await resolveDir(coversDir, built.slug);
            await writeFile(
              coverSubDir,
              built.coverName.split('/').pop() ?? 'cover',
              new Uint8Array(picture.data),
            );
          }
          await writeFile(
            entriesDir,
            `${built.slug}.json`,
            encoder.encode(`${JSON.stringify(built.entry, null, 2)}\n`),
          );
          // 写后自检：确认 audio/cover 写入成功，防止被后台/缓存重写时丢字段
          try {
            const checkHandle = await entriesDir.getFileHandle(`${built.slug}.json`);
            const checkFile = await checkHandle.getFile();
            const checkText = await checkFile.text();
            if (!checkText.includes('"audio"') || !checkText.includes('"cover"')) {
              await writeFile(
                entriesDir,
                `${built.slug}.json`,
                encoder.encode(`${JSON.stringify(built.entry, null, 2)}\n`),
              );
            }
          } catch {
            // 自检失败时忽略，下一轮导入会重新写入
          }
          results.push({ name: file.name, ok: true });
        } catch (error) {
          results.push({ name: file.name, ok: false, error: String(error) });
        }
      }
      // 歌词文件（.lrc/.txt）自动匹配同名歌曲，放进 <歌曲>/lyrics.<ext> 子目录
      const lyricsDir = await resolveDir(root, 'public/music/lyrics');
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
      let lyricsOk = 0;
      for (const file of lyricFiles) {
        try {
          const base = file.name.replace(/\.(lrc|txt)$/i, '').trim();
          let match = imported.find(
            (item) => norm(item.slug) === norm(base) || norm(item.title) === norm(base),
          );
          if (!match) {
            const slugs = await listJsonSlugs(entriesDir);
            const existingSlug = slugs.find((slug) => norm(slug) === norm(base));
            if (existingSlug) match = { slug: existingSlug, title: base };
          }
          if (!match) {
            results.push({
              name: file.name,
              ok: false,
              error: `没有找到同名歌曲「${base}」，请先导入对应的音频`,
            });
            continue;
          }
          const ext = (file.name.match(/\.(lrc|txt)$/i)?.[1] ?? 'lrc').toLowerCase();
          const lyricSubDir = await resolveDir(lyricsDir, match.slug);
          const lyricName = `lyrics.${ext}`;
          await writeFile(lyricSubDir, lyricName, new Uint8Array(await file.arrayBuffer()));
          const entryHandle = await entriesDir.getFileHandle(`${match.slug}.json`);
          const entryFile = await entryHandle.getFile();
          const entry = JSON.parse(await entryFile.text()) as Record<string, unknown>;
          entry.lyrics = `/music/lyrics/${match.slug}/${lyricName}`;
          await writeFile(
            entriesDir,
            `${match.slug}.json`,
            encoder.encode(`${JSON.stringify(entry, null, 2)}\n`),
          );
          lyricsOk++;
          results.push({ name: file.name, ok: true });
        } catch (error) {
          results.push({ name: file.name, ok: false, error: String(error) });
        }
      }

      const okCount = results.filter((result) => result.ok).length;
      showToast(`导入完成：成功 ${okCount} / ${files.length} 首（歌单「${playlist}」）`);
      if (lyricsOk > 0) {
        showToast(`歌词导入完成：成功 ${lyricsOk} / ${lyricFiles.length} 个`);
      }
      if (okCount < files.length) {
        console.warn(
          '[keystatic-helper] 导入失败项：',
          results.filter((r) => !r.ok),
        );
      }
    } catch (error) {
      showToast(`导入失败：${String(error)}`);
    }
  };
  input.click();
}

async function tryProjectRoot(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const stored = await idbGet('root');
    if (!stored) return null;
    const permissioned = stored as PermissionedDirectoryHandle;
    const state = await permissioned.queryPermission?.({ mode: 'readwrite' });
    return state === 'granted' ? stored : null;
  } catch {
    return null;
  }
}

async function listFileNames(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'file') names.push(name);
  }
  return names;
}

async function moveFile(
  fromDir: FileSystemDirectoryHandle,
  name: string,
  toDir: FileSystemDirectoryHandle,
  targetName: string,
): Promise<void> {
  const handle = await fromDir.getFileHandle(name);
  const file = await handle.getFile();
  await writeFile(toDir, targetName, new Uint8Array(await file.arrayBuffer()));
  await fromDir.removeEntry(name);
}

interface SongAssetField {
  key: 'audio' | 'cover' | 'lyrics';
  dir: string;
  publicPrefix: string;
  label: string;
}

async function repairSongEntry(
  root: FileSystemDirectoryHandle,
  slug: string,
): Promise<SongAssetField[]> {
  const entriesDir = await resolveDir(root, 'src/content/songs');
  let entry: Record<string, unknown>;
  try {
    const handle = await entriesDir.getFileHandle(`${slug}.json`);
    const file = await handle.getFile();
    entry = JSON.parse(await file.text()) as Record<string, unknown>;
  } catch {
    return [];
  }

  const fields: SongAssetField[] = [
    { key: 'audio', dir: 'public/music/audio', publicPrefix: '/music/audio', label: '音频' },
    { key: 'cover', dir: 'public/music/covers', publicPrefix: '/music/covers', label: '封面' },
    { key: 'lyrics', dir: 'public/music/lyrics', publicPrefix: '/music/lyrics', label: '歌词' },
  ];
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const changed: SongAssetField[] = [];

  for (const field of fields) {
    const value = typeof entry[field.key] === 'string' ? (entry[field.key] as string).trim() : '';
    const fieldDir = await resolveDir(root, field.dir);
    const subDir = await resolveDir(fieldDir, slug);
    const fileExists = async (dir: FileSystemDirectoryHandle, name: string): Promise<boolean> => {
      try {
        const handle = await dir.getFileHandle(name);
        await handle.getFile();
        return true;
      } catch {
        return false;
      }
    };
    const publicPathOf = (name: string) => `${field.publicPrefix}/${slug}/${name}`;

    if (value) {
      const rel = value.replace(field.publicPrefix, '').replace(/^\/+/, '');
      const parts = rel.split('/').filter(Boolean);
      const basename = parts[parts.length - 1] ?? '';
      if (parts.length === 1) {
        // 引用的是字段目录根下的文件：Keystatic 认不出，移到 <slug>/ 子目录
        if (basename && (await fileExists(fieldDir, basename))) {
          await moveFile(fieldDir, basename, subDir, basename);
          entry[field.key] = publicPathOf(basename);
          changed.push(field);
        }
      } else if (!basename || !(await fileExists(subDir, basename))) {
        // 子目录引用但文件缺失：尝试从字段目录根找回
        const rootNames = await listFileNames(fieldDir);
        const match = rootNames.find((name) => norm(name.replace(/\.[^.]+$/, '')) === norm(slug));
        if (match) {
          await moveFile(fieldDir, match, subDir, match);
          entry[field.key] = publicPathOf(match);
          changed.push(field);
        }
      }
      continue;
    }

    // 字段为空：先找 <slug>/ 子目录，再找字段目录根
    const subNames = await listFileNames(subDir);
    let best: string | undefined =
      subNames.find((name) => new RegExp(`^${field.key}\\.`, 'i').test(name)) ?? subNames[0];
    if (best) {
      entry[field.key] = publicPathOf(best);
      changed.push(field);
      continue;
    }
    const rootNames = await listFileNames(fieldDir);
    const title = typeof entry.title === 'string' ? entry.title : slug;
    best = rootNames.find(
      (name) =>
        norm(name.replace(/\.[^.]+$/, '')) === norm(slug) ||
        norm(name.replace(/\.[^.]+$/, '')) === norm(title),
    );
    if (best) {
      await moveFile(fieldDir, best, subDir, best);
      entry[field.key] = publicPathOf(best);
      changed.push(field);
    }
  }

  if (changed.length === 0) return [];
  await writeFile(
    entriesDir,
    `${slug}.json`,
    new TextEncoder().encode(`${JSON.stringify(entry, null, 2)}\n`),
  );
  return changed;
}

function installSaveRepair(): void {
  const match = location.pathname.match(/^\/keystatic\/collection\/songs\/item\/([^/]+)/);
  if (!match) return;
  const slug = decodeURIComponent(match[1]);
  window.setTimeout(() => {
    void (async () => {
      try {
        const root = await tryProjectRoot();
        if (!root) return;
        const changed = await repairSongEntry(root, slug);
        if (changed.length > 0) {
          showToast(`已自动补回被后台保存丢失的字段：${changed.map((f) => f.label).join('、')}，即将刷新`);
          window.setTimeout(() => location.reload(), 1200);
        }
      } catch {
        // 无目录权限或读取失败时静默跳过
      }
    })();
  }, 1500);
}

function installSongImporter(): void {
  const existing = document.getElementById('ks-import-btn');
  if (!/^\/keystatic\/collection\/songs\/?$/.test(location.pathname)) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const btn = document.createElement('button');
  btn.id = 'ks-import-btn';
  btn.className = 'ks-import-btn';
  btn.type = 'button';
  btn.textContent = '导入歌曲（自动识别作者/封面）';
  btn.addEventListener('click', () => {
    if (typeof (window as unknown as DirectoryPickerWindow).showDirectoryPicker !== 'function') {
      showToast('当前浏览器不支持直接导入，请用 Chrome / Edge 打开后台，或使用命令行：npm run music:import');
      return;
    }
    void runSongImport();
  });
  document.documentElement.appendChild(btn);
}

async function runPhotoImport(): Promise<void> {
  let root: FileSystemDirectoryHandle;
  try {
    showToast('请选择博客项目根目录（例如 D:\\new\\blog）');
    root = await pickProjectRoot();
  } catch (error) {
    if (isAbortError(error)) {
      showToast('已取消导入');
      return;
    }
    showToast(`选择目录失败：${String(error)}`);
    return;
  }
  const photosDir = await resolveDir(root, 'public/images/photos');
  const entriesDir = await resolveDir(root, 'src/content/photos');
  const existing = await listJsonSlugs(entriesDir);

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = async () => {
    const files = [...(input.files ?? [])].filter((file) =>
      /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name),
    );
    if (!files.length) {
      showToast('没有找到图片文件');
      return;
    }
    showToast(`正在导入 ${files.length} 张照片…`);
    const encoder = new TextEncoder();
    const results: { name: string; ok: boolean; error?: string }[] = [];
    const slugify = (value: string) =>
      value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim() || 'photo';

    for (const file of files) {
      try {
        const base = file.name
          .replace(/\.(jpe?g|png|webp|gif|avif|bmp)$/i, '')
          .trim();
        let slug = slugify(base);
        let suffix = 2;
        while (existing.includes(slug)) {
          slug = `${slugify(base)}-${suffix}`;
          suffix++;
        }
        existing.push(slug);
        const ext = (file.name.match(/\.([^.]+)$/)?.[1] ?? 'jpg').toLowerCase();
        const imageName = `image.${ext}`;
        const subDir = await resolveDir(photosDir, slug);
        await writeFile(subDir, imageName, new Uint8Array(await file.arrayBuffer()));
        const entry = {
          caption: base || slug,
          image: `/images/photos/${slug}/${imageName}`,
          date: new Date().toISOString().slice(0, 10),
          draft: false,
        };
        await writeFile(
          entriesDir,
          `${slug}.json`,
          encoder.encode(`${JSON.stringify(entry, null, 2)}\n`),
        );
        results.push({ name: file.name, ok: true });
      } catch (error) {
        results.push({ name: file.name, ok: false, error: String(error) });
      }
    }
    const okCount = results.filter((result) => result.ok).length;
    showToast(`照片导入完成：成功 ${okCount} / ${files.length} 张`);
    if (okCount < files.length) {
      console.warn('[keystatic-helper] 照片导入失败项：', results.filter((r) => !r.ok));
    }
  };
  input.click();
}

function installPhotoImporter(): void {
  const existing = document.getElementById('ks-photo-import-btn');
  if (!/^\/keystatic\/collection\/photos\/?$/.test(location.pathname)) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const btn = document.createElement('button');
  btn.id = 'ks-photo-import-btn';
  btn.className = 'ks-import-btn';
  btn.type = 'button';
  btn.textContent = '导入照片（批量）';
  btn.addEventListener('click', () => {
    if (typeof (window as unknown as DirectoryPickerWindow).showDirectoryPicker !== 'function') {
      showToast('当前浏览器不支持直接导入，请用 Chrome / Edge 打开后台');
      return;
    }
    void runPhotoImport();
  });
  document.documentElement.appendChild(btn);
}

interface FilterEntryMeta {
  slug: string;
  filterValues: string[];
  sortValues: Record<string, string>;
}

async function fetchTree(): Promise<{ path: string; sha: string }[]> {
  // Keystatic 本地 API 需要这个自定义头才返回数据（官方客户端就是这么请求的）
  const res = await fetch('/api/keystatic/tree', { headers: { 'no-cors': '1' } });
  if (!res.ok) return [];
  return (await res.json()) as { path: string; sha: string }[];
}

async function fetchBlob(sha: string, path: string): Promise<string> {
  const res = await fetch(`/api/keystatic/blob/${sha}/${encodeURI(path)}`, {
    headers: { 'no-cors': '1' },
  });
  if (!res.ok) throw new Error(`blob ${path}`);
  return res.text();
}

async function collectFilterMeta(
  kind: 'posts' | 'songs',
): Promise<Map<string, FilterEntryMeta>> {
  const tree = await fetchTree();
  const prefix = `src/content/${kind}/`;
  const files = tree.filter(
    (file) =>
      file.path.startsWith(prefix) &&
      (kind === 'posts' ? /\.(md|mdoc)$/.test(file.path) : file.path.endsWith('.json')),
  );
  const meta = new Map<string, FilterEntryMeta>();
  await Promise.all(
    files.map(async (file) => {
      const slug = file.path.slice(prefix.length).replace(/\.(md|mdoc|json)$/, '');
      try {
        const text = await fetchBlob(file.sha, file.path);
        if (kind === 'posts') {
          const parsed = parsePostFrontmatter(text);
          meta.set(slug, {
            slug,
            filterValues: parsed.tags,
            sortValues: { date: parsed.date, title: parsed.title || slug, artist: '', playlist: '' },
          });
        } else {
          const data = JSON.parse(text) as {
            title?: string;
            artist?: string;
            playlist?: string;
          };
          meta.set(slug, {
            slug,
            filterValues: data.playlist ? [data.playlist] : [],
            sortValues: {
              date: '',
              title: data.title || slug,
              artist: data.artist || '',
              playlist: data.playlist || '',
            },
          });
        }
      } catch {
        // 读取失败的条目保留默认显示
      }
    }),
  );
  return meta;
}

function slugOfRow(row: Element): string {
  return row.querySelector('[role="rowheader"]')?.textContent?.trim() ?? '';
}

function installCollectionFilter(): void {
  const match = location.pathname.match(/^\/keystatic\/collection\/(posts|songs)\/?$/);
  const existing = document.getElementById('ks-filter-bar');
  if (!match) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const kind = match[1] as 'posts' | 'songs';

  void (async () => {
    const meta = await collectFilterMeta(kind);
    let grid: Element | undefined;
    let rowsHost: HTMLElement | null = null;
    let rows: HTMLElement[] = [];
    for (let attempt = 0; attempt < 30; attempt++) {
      grid = [...document.querySelectorAll('div[role="grid"]')].find(
        (el) => el.querySelectorAll('div[role="row"]').length > 1,
      );
      // 只取 grid 直接子级的 rowgroup（表头外层还有一个嵌套的 rowgroup，不能匹配）
      const rowGroup = [...(grid?.children ?? [])].find(
        (child) => child.getAttribute('role') === 'rowgroup',
      );
      // 数据行实际放在 rowgroup 内的 presentation 容器里
      rowsHost =
        (rowGroup?.querySelector<HTMLElement>('div[role="presentation"]') as HTMLElement | null) ??
        (rowGroup as HTMLElement | null);
      rows = rowsHost
        ? [...rowsHost.querySelectorAll<HTMLElement>('div[role="row"]')]
        : [];
      if (grid?.parentElement && rowsHost && rows.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (!grid?.parentElement || !rowsHost || rows.length === 0) return;
    if (document.getElementById('ks-filter-bar')) return;

    const values = [...new Set([...meta.values()].flatMap((m) => m.filterValues))].sort((a, b) =>
      a.localeCompare(b, 'zh-CN'),
    );
    const bar = document.createElement('div');
    bar.id = 'ks-filter-bar';
    bar.className = 'ks-filter-bar';
    bar.dataset.kind = kind;
    const filterLabel = kind === 'posts' ? '标签' : '歌单';
    const options =
      kind === 'posts'
        ? [
            ['date-desc', '日期新 → 旧'],
            ['date-asc', '日期旧 → 新'],
            ['title', '标题 A → Z'],
          ]
        : [
            ['title', '歌名 A → Z'],
            ['artist', '歌手 A → Z'],
            ['playlist', '歌单 A → Z'],
          ];
    bar.innerHTML = `
      <span class="ks-filter-label">${filterLabel}：</span>
      <div class="ks-filter-chips">
        <button type="button" class="ks-chip-btn active" data-value="">全部</button>
        ${values
          .map(
            (value) =>
              `<button type="button" class="ks-chip-btn" data-value="${value.replace(/"/g, '&quot;')}">${value}</button>`,
          )
          .join('')}
      </div>
      <span class="ks-filter-label">排序：</span>
      <select class="ks-filter-sort">
        ${options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
      </select>
    `;

    let filterValue = '';
    const apply = () => {
      const sortValue =
        (bar.querySelector('.ks-filter-sort') as HTMLSelectElement | null)?.value ?? 'title';
      const items = rows
        .map((row) => ({ row, slug: slugOfRow(row), entry: meta.get(slugOfRow(row)) }))
        .filter((item) => {
          if (!filterValue) return true;
          return item.entry?.filterValues.includes(filterValue) ?? true;
        });
      const sortKey = (item: (typeof items)[number]): string => {
        if (sortValue === 'artist') return item.entry?.sortValues.artist ?? '';
        if (sortValue === 'playlist') return item.entry?.sortValues.playlist ?? '';
        if (sortValue === 'date-asc' || sortValue === 'date-desc')
          return item.entry?.sortValues.date ?? '';
        return item.entry?.sortValues.title ?? '';
      };
      items.sort((a, b) => {
        if (sortValue === 'date-desc') {
          return String(b.entry?.sortValues.date ?? '').localeCompare(
            String(a.entry?.sortValues.date ?? ''),
          );
        }
        if (sortValue === 'date-asc') {
          return String(a.entry?.sortValues.date ?? '').localeCompare(
            String(b.entry?.sortValues.date ?? ''),
          );
        }
        return sortKey(a).localeCompare(sortKey(b), 'zh-CN');
      });
      rows.forEach((row) => {
        row.style.display = items.some((item) => item.row === row) ? '' : 'none';
      });
      rowsHost.append(...items.map((item) => item.row));
    };

    bar.querySelectorAll('.ks-chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterValue = (btn as HTMLButtonElement).dataset.value ?? '';
        bar.querySelectorAll('.ks-chip-btn').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        apply();
      });
    });
    bar.querySelector('.ks-filter-sort')?.addEventListener('change', apply);

    grid.parentElement.insertBefore(bar, grid);
    apply();
  })();
}

function translateUI(selector = 'button, h1, h2, h3, h4, [role="menuitem"]'): void {
  for (const el of document.querySelectorAll<HTMLElement>(
    selector,
  )) {
    if (el.closest('.ks-chip, #ks-toast')) continue;
    // 只翻译纯文本叶子节点，避免破坏包含按钮/控件的容器结构
    if (el.children.length > 0) continue;
    const text = el.textContent?.trim();
    if (!text || text.length > 40) continue;
    if (Object.prototype.hasOwnProperty.call(UI_TRANSLATIONS, text)) {
      if (el.textContent !== UI_TRANSLATIONS[text]) {
        el.textContent = UI_TRANSLATIONS[text];
      }
    } else if (text.startsWith('No items matching')) {
      el.textContent = '没有匹配的项目';
    } else if (/^\d+ entries?$/.test(text)) {
      el.textContent = text.replace(/(\d+) entries?/, '$1 条');
    }
  }
}

function findFieldLabel(button: HTMLButtonElement): string | null {
  let node: HTMLElement | null = button.parentElement;
  for (let depth = 0; node && depth < 6; depth++) {
    for (const el of node.querySelectorAll('span,label')) {
      const text = (el.textContent ?? '').trim();
      if (FIELD_LABELS.has(text)) return text;
    }
    node = node.parentElement;
  }
  return null;
}

function inputForLabel(labelText: string): HTMLInputElement | null {
  const labels = [...document.querySelectorAll('span,label')].filter(
    (el) => (el.textContent ?? '').trim() === labelText,
  );
  for (const label of labels) {
    let node: HTMLElement | null = label as HTMLElement;
    for (let depth = 0; node && depth < 6; depth++) {
      const input = node.querySelector<HTMLInputElement>('input[type="text"]');
      if (input) return input;
      node = node.parentElement;
    }
  }
  return null;
}

function fallbackInputs(): (HTMLInputElement | null)[] {
  return [...document.querySelectorAll<HTMLInputElement>('input[type="text"]')];
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

async function autofillFromAudio(download: HTMLAnchorElement | HTMLButtonElement): Promise<void> {
  const href = download instanceof HTMLAnchorElement ? download.href : '';
  if (!href || autofilledSources.has(href)) return;
  autofilledSources.add(href);
  download.dataset.ksAutofilled = '1';
  try {
    const blob = await (await fetch(href, { signal: AbortSignal.timeout(8000) })).blob();
    // 超过 8MB 跳过自动解析，避免大文件拖慢页面（可手动填写）
    if (blob.size > 8 * 1024 * 1024) return;
    const meta = await parseBlob(blob);
    const title = meta.common.title?.trim();
    const artist = meta.common.artist?.trim();
    if (title) {
      // 每次设置前实时查询，避免 React 重渲染后引用失效；值相同则跳过
      const input = inputForLabel('歌名') ?? fallbackInputs()[0];
      if (input && input.value !== title) setInputValue(input, title);
    }
    if (artist) {
      const input = inputForLabel('歌手/艺术家') ?? fallbackInputs()[2];
      if (input && input.value !== artist) setInputValue(input, artist);
    }
  } catch {
    // 元数据解析失败时静默忽略，用户可手动填写
  }
}

function enhanceField(button: HTMLButtonElement): void {
  const group = button.parentElement;
  if (!group || group.dataset.ksEnhanced === '1') return;
  group.dataset.ksEnhanced = '1';
  const label = findFieldLabel(button);
  group.dataset.ksLabel = label ?? '';

  const apply = () => {
    const download = group.querySelector<HTMLAnchorElement | HTMLButtonElement>('[download]');
    const removeButton = [...group.querySelectorAll('button')].find(
      (b) => /^(Remove|\u79fb\u9664)$/.test(b.textContent.trim()),
    );
    const coverImg = group.querySelector<HTMLImageElement>('img:not(.ks-preview)');
    const valuePresent = Boolean(download) || Boolean(removeButton) || Boolean(coverImg);
    const chip = group.querySelector<HTMLElement>('.ks-chip');

    if (!valuePresent) {
      chip?.remove();
      group.querySelector('.ks-preview')?.remove();
      return;
    }

    if (download) {
      const filename = download.getAttribute('download') ?? '文件';
      const chipText =
        label === '音频文件'
          ? `已选择音频 ✓ 📎 ${filename}`
          : label === '歌词字幕'
            ? `已选择歌词 ✓ 📎 ${filename}`
            : `📎 ${filename}`;
      // 兜底：若按钮仍是英文 "Download"，改为中文避免和播放混淆
      if (download.textContent?.trim() === 'Download') {
        download.textContent = '下载文件';
      }
      if (!chip) {
        const el = document.createElement('span');
        el.className = 'ks-chip';
        el.textContent = chipText;
        group.appendChild(el);
      } else if (chip.textContent !== chipText) {
        chip.textContent = chipText;
      }

      if (label === '封面' && !group.querySelector('.ks-preview')) {
        const img = document.createElement('img');
        img.className = 'ks-preview';
        img.alt = '封面预览';
        const href = download instanceof HTMLAnchorElement ? download.href : '';
        if (href) {
          img.src = href;
          group.appendChild(img);
        }
      }

      if (label === '音频文件' && !flags().__KS_NO_AUTOFILL) {
        void autofillFromAudio(download);
      }
    } else if (label === '封面' && !chip) {
      const el = document.createElement('span');
      el.className = 'ks-chip';
      el.textContent = '已选择图片 ✓';
      group.appendChild(el);
    }
  };

  apply();
  const observer = new MutationObserver(apply);
  observer.observe(group, { childList: true, subtree: true });
}

function init(): void {
  if (flags().__KS_HELPER_DISABLED) return;
  injectStyles();
  installLargeFileGuard();
  installSaveFeedback();
  installPreviewButton();
  installSongImporter();
  installPhotoImporter();
  installCollectionFilter();
  installSaveRepair();
  let scanTimer: number | undefined;
  const scan = () => {
    translateUI();
    installPreviewButton();
    installSongImporter();
    installPhotoImporter();
    installCollectionFilter();
    for (const button of document.querySelectorAll<HTMLButtonElement>('button')) {
      const text = button.textContent?.trim();
      if (text === 'Choose file' || text === '选择文件') {
        enhanceField(button);
      }
    }
  };
  const scheduleScan = () => {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, 400);
  };
  // 延后到 React 水合完成后再开始修改 DOM，避免水合不匹配
  window.setTimeout(() => {
    // 首次全量翻译（覆盖列表计数、空状态等 div/span 文本）
    translateUI('button, h1, h2, h3, h4, span, label, a, div');
    scan();
  }, 1200);
  const bodyObserver = new MutationObserver(scheduleScan);
  bodyObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function installSaveFeedback(): void {
  // 保存成功会整页刷新：刷新后用标记再次提示“已保存”
  if (sessionStorage.getItem('ks-saved') === '1') {
    showToast('已保存 ✓');
    // Astro 内容变更会再触发一次刷新，延迟清除标记避免第二次刷新后丢失提示
    window.setTimeout(() => sessionStorage.removeItem('ks-saved'), 5000);
  } else if (sessionStorage.getItem('ks-created') === '1') {
    showToast('已创建 ✓');
    window.setTimeout(() => sessionStorage.removeItem('ks-created'), 5000);
  }
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest?.('button');
      if (!button) return;
      const text = button.textContent?.trim();
      if (text === '保存' || text === 'Save' || text === '节省') {
        sessionStorage.setItem('ks-saved', '1');
        showToast('已保存 ✓');
      } else if (text === '创建' || text === 'Create') {
        sessionStorage.setItem('ks-created', '1');
        showToast('已创建 ✓');
      }
    },
    true,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
