import { describe, expect, it } from 'vitest';
import { makeExcerpt, parsePostFrontmatter, stripMarkdown } from '../content';

describe('stripMarkdown', () => {
  it('removes emphasis markers', () => {
    expect(stripMarkdown('**加粗** 和 *斜体*')).toBe('加粗 和 斜体');
  });

  it('keeps link text and drops the url', () => {
    expect(stripMarkdown('访问[官网](https://example.com)吧')).toBe('访问官网吧');
  });

  it('drops images entirely', () => {
    expect(stripMarkdown('前文 ![配图](a.png) 后文')).toBe('前文 后文');
  });

  it('strips heading markers', () => {
    expect(stripMarkdown('## 二级标题\n正文')).toBe('二级标题\n正文');
  });

  it('removes fenced code blocks', () => {
    const md = '前言\n```ts\nconst a = 1\n```\n后语';
    expect(stripMarkdown(md)).toBe('前言\n后语');
  });

  it('removes inline code backticks', () => {
    expect(stripMarkdown('运行 `npm run dev` 即可')).toBe('运行 npm run dev 即可');
  });

  it('strips blockquote and list markers', () => {
    expect(stripMarkdown('> 引用\n- 列表项')).toBe('引用\n列表项');
  });
});

describe('makeExcerpt', () => {
  it('returns text unchanged when shorter than limit', () => {
    expect(makeExcerpt('你好世界', 20)).toBe('你好世界');
  });

  it('truncates with an ellipsis when longer than limit', () => {
    const result = makeExcerpt('这是一段非常非常长的文字内容用于测试截断', 10);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(11);
  });

  it('collapses whitespace and strips markdown first', () => {
    expect(makeExcerpt('**加粗** 的\n\n  多行  内容', 20)).toBe('加粗 的 多行 内容');
  });

  it('returns empty string for empty input', () => {
    expect(makeExcerpt('', 20)).toBe('');
  });
});

describe('parsePostFrontmatter', () => {
  it('parses title, date and inline tags array', () => {
    const text = `---
title: "我的第一篇文章"
date: 2026-08-01
tags: [技术, 生活]
draft: false
---

正文内容`;
    expect(parsePostFrontmatter(text)).toEqual({
      title: '我的第一篇文章',
      date: '2026-08-01',
      tags: ['技术', '生活'],
    });
  });

  it('parses tags in list form', () => {
    const text = `---
title: 列表标签
date: 2026-07-30
tags:
  - 摄影
  - 随笔
---

内容`;
    expect(parsePostFrontmatter(text).tags).toEqual(['摄影', '随笔']);
  });

  it('returns empty defaults when frontmatter is missing', () => {
    expect(parsePostFrontmatter('只有正文')).toEqual({ title: '', date: '', tags: [] });
  });
});
