/**
 * 开发环境专用的 Keystatic 后台增强：
 * - 文件选中后显示文件名小标签（官方按钮文案固定为 "Choose file"，不随状态变化）
 * - 封面字段显示图片预览
 * - 上传音频后自动读取 mp3/flac 元数据，回填「歌名」「歌手/艺术家」
 */
import { parseBlob } from 'music-metadata';

const FIELD_LABELS = new Set(['封面', '音频文件', '歌词字幕']);
const TEXT_LABELS = ['歌名', '歌手/艺术家', '歌单/风格'];

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
  `;
  document.head.appendChild(style);
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
    const blob = await (await fetch(href)).blob();
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

      if (label === '音频文件') {
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
  injectStyles();
  const scan = () => {
    for (const button of document.querySelectorAll<HTMLButtonElement>('button')) {
      if (button.textContent?.trim() === 'Choose file') {
        enhanceField(button);
      }
    }
  };
  scan();
  const bodyObserver = new MutationObserver(scan);
  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
