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
