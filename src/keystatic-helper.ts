/**
 * 开发环境专用的 Keystatic 后台增强：
 * - 文件选中后显示文件名小标签（官方按钮文案固定为 "Choose file"，不随状态变化）
 * - 封面字段显示图片预览
 * - 上传音频后自动读取 mp3/flac 元数据，回填「歌名」「歌手/艺术家」
 */
import { parseBlob } from 'music-metadata';

const FIELD_LABELS = new Set(['封面', '音频文件', '歌词字幕']);
const TEXT_LABELS = ['歌名', '歌手/艺术家', '歌单/风格'];
// 超过该大小的文件不让 Keystatic 读取（读取大文件会导致页面卡死/崩溃）
const MAX_ADMIN_FILE_SIZE = 15 * 1024 * 1024;

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
};
const flags = () => window as unknown as {
  __KS_HELPER_DISABLED?: boolean;
  __KS_NO_AUTOFILL?: boolean;
};

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
          `「${file.name}」(${(file.size / 1024 / 1024).toFixed(1)}MB) 超过后台上传上限 15MB，` +
            '为避免页面崩溃，请改用批量导入：npm run music:import -- <文件夹> <歌单名>',
        );
      }
    },
    true,
  );
}

function translateUI(): void {
  for (const el of document.querySelectorAll<HTMLElement>(
    'button, h1, h2, h3, h4, span, label, a, div',
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
  if (download.dataset.ksAutofilled === '1') return;
  download.dataset.ksAutofilled = '1';
  try {
    const href = download instanceof HTMLAnchorElement ? download.href : '';
    if (!href) return;
    const blob = await (await fetch(href, { signal: AbortSignal.timeout(8000) })).blob();
    // 超大文件跳过元数据解析，避免内存压力导致页面卡死
    if (blob.size > 100 * 1024 * 1024) return;
    const meta = await parseBlob(blob, { mimeType: blob.type || 'audio/mpeg' });
    const title = meta.common.title?.trim();
    const artist = meta.common.artist?.trim();
    if (title) {
      // 每次设置前实时查询，避免 React 重渲染后引用失效
      const input = inputForLabel('歌名') ?? fallbackInputs()[0];
      if (input) setInputValue(input, title);
    }
    if (artist) {
      const input = inputForLabel('歌手/艺术家') ?? fallbackInputs()[2];
      if (input) setInputValue(input, artist);
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
  scan();
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
