import { describe, expect, it } from 'vitest';
import { currentLineIndex, parseLrc } from '../lrc';

describe('parseLrc', () => {
  it('parses mm:ss.xx timestamps', () => {
    const lines = parseLrc('[00:12.34]你好，世界');
    expect(lines).toEqual([{ time: 12.34, text: '你好，世界' }]);
  });

  it('parses mm:ss timestamps without centiseconds', () => {
    const lines = parseLrc('[01:05]第二行');
    expect(lines).toEqual([{ time: 65, text: '第二行' }]);
  });

  it('parses minutes above 9', () => {
    const lines = parseLrc('[12:03.50]长曲目');
    expect(lines).toEqual([{ time: 723.5, text: '长曲目' }]);
  });

  it('expands multiple timestamps on one line', () => {
    const lines = parseLrc('[00:01.00][00:03.50]重复句');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({ time: 1, text: '重复句' });
    expect(lines[1]).toEqual({ time: 3.5, text: '重复句' });
  });

  it('skips metadata tags and empty lines', () => {
    const lines = parseLrc('[ti:歌名]\n[ar:歌手]\n\n[00:05.00]正文');
    expect(lines).toEqual([{ time: 5, text: '正文' }]);
  });

  it('ignores malformed lines', () => {
    const lines = parseLrc('没有时间戳的一行\n[xx:yy]坏行\n[00:10.00]正常');
    expect(lines).toEqual([{ time: 10, text: '正常' }]);
  });

  it('returns empty array for empty input', () => {
    expect(parseLrc('')).toEqual([]);
  });
});

describe('currentLineIndex', () => {
  const lines = [
    { time: 0, text: 'a' },
    { time: 5, text: 'b' },
    { time: 10, text: 'c' },
  ];

  it('returns the last line whose time is not after the given time', () => {
    expect(currentLineIndex(lines, 4.9)).toBe(0);
    expect(currentLineIndex(lines, 5)).toBe(1);
    expect(currentLineIndex(lines, 9.99)).toBe(1);
    expect(currentLineIndex(lines, 12)).toBe(2);
  });

  it('returns -1 before the first timestamp', () => {
    expect(currentLineIndex(lines, -1)).toBe(-1);
  });

  it('returns -1 for empty lines', () => {
    expect(currentLineIndex([], 5)).toBe(-1);
  });
});
