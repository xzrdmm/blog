export interface LyricLine {
  time: number;
  text: string;
}

export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const rawLine of lrc.split(/\r?\n/)) {
    const timestamps = [...rawLine.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    if (timestamps.length === 0) continue;
    const text = rawLine.replace(/\[[^\]]*\]/g, '').trim();
    if (!text) continue;
    for (const match of timestamps) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fraction = match[3] ? parseFloat(`0.${match[3]}`) : 0;
      lines.push({ time: minutes * 60 + seconds + fraction, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function currentLineIndex(lines: LyricLine[], time: number): number {
  let index = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= time) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}

/**
 * 计算把某一行歌词在容器内垂直居中的滚动位置。
 * 只作用于歌词容器自身，避免 scrollIntoView 把页面一起滚走。
 */
export function centerScrollTop(
  lineOffsetTop: number,
  containerHeight: number,
  lineHeight: number,
): number {
  return Math.max(0, lineOffsetTop - containerHeight / 2 + lineHeight / 2);
}
