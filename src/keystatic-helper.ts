/**
 * 开发环境专用的 Keystatic 后台增强：
 * - 文件选中后显示文件名小标签（官方按钮文案固定为 "Choose file"，不随状态变化）
 * - 封面字段显示图片预览
 * - 上传音频后自动读取 mp3/flac 元数据，回填「歌名」「歌手/艺术家」
 */
import { parseBlob } from 'music-metadata';
import { buildSongEntry } from './lib/import-entry';

const FIELD_LABELS = new Set(['封面', '音频文件', '歌词字幕']);
// 超过该大小的文件不让 Keystatic 读取（Keystatic 读取大文件会严重卡顿）
const MAX_ADMIN_FILE_SIZE = 1 * 1024 * 1024;
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
      top: 16px;
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
      if (input?.type === 'file' && file && file.size > MAX_ADMIN_FILE_SIZE) {
        event.stopImmediatePropagation();
        showToast(
          `「${file.name}」(${(file.size / 1024 / 1024).toFixed(1)}MB) 超过后台上传上限 1MB，` +
            '为避免页面崩溃，请改用批量导入：npm run music:import -- <文件夹> <歌单名>',
        );
      }
    },
    true,
  );
}

function installPreviewButton(): void {
  const match = location.pathname.match(
    /^\/keystatic\/collection\/(posts|songs|chatters|projects|friends|photos)\/item\/([^/]+)/,
  );
  if (!match || document.getElementById('ks-preview-btn')) return;
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
  input.accept = 'audio/*';
  input.multiple = true;
  input.onchange = async () => {
    const files = [...(input.files ?? [])];
    if (!files.length) return;
    showToast(`正在解析 ${files.length} 个音频文件…`);

    try {
      const results: { name: string; ok: boolean; error?: string }[] = [];
      const encoder = new TextEncoder();

      for (const file of files) {
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

          await writeFile(audioDir, built.audioName, new Uint8Array(await file.arrayBuffer()));
          if (built.coverName && picture) {
            await writeFile(coversDir, built.coverName, new Uint8Array(picture.data));
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
      const okCount = results.filter((result) => result.ok).length;
      showToast(`导入完成：成功 ${okCount} / ${files.length} 首（歌单「${playlist}」）`);
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

function installSongImporter(): void {
  if (!/^\/keystatic\/collection\/songs\/?$/.test(location.pathname)) return;
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
    const hasRemove = [...group.querySelectorAll('button')].some(
      (b) => b.textContent.trim() === 'Remove',
    );
    const valuePresent = Boolean(download) || hasRemove;
    const chip = group.querySelector<HTMLElement>('.ks-chip');

    if (!valuePresent) {
      chip?.remove();
      group.querySelector('.ks-preview')?.remove();
      return;
    }

    if (download) {
      const filename = download.getAttribute('download') ?? '文件';
      // 兜底：若按钮仍是英文 "Download"，改为中文避免和播放混淆
      if (download.textContent?.trim() === 'Download') {
        download.textContent = '下载文件';
      }
      if (!chip) {
        const el = document.createElement('span');
        el.className = 'ks-chip';
        el.textContent = `📎 ${filename}`;
        group.appendChild(el);
      } else if (chip.textContent !== `📎 ${filename}`) {
        chip.textContent = `📎 ${filename}`;
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
  let scanTimer: number | undefined;
  const scan = () => {
    translateUI();
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
