---
title: 博客上线：为什么用 Astro 与 Keystatic
date: 2026-07-30
excerpt: 聊聊这个博客的搭建思路：静态优先、Markdown 内容、Git 管理，以及一个开箱即用的可视化后台。
cover: /images/covers/tech.svg
tags:
  - 博客
  - 技术
draft: false
---

欢迎来到我的博客。这个站点是**静态优先**的：没有数据库，没有服务器，只有构建后的 HTML、CSS 与少量 JavaScript。

## 技术选型

- **Astro**：内容站点的一等公民，默认零 JS，加载快。
- **Keystatic**：本地可视化后台，内容以 Markdown 与 JSON 的形式落在 Git 仓库里。
- **GitHub Pages**：免费托管，推送即发布。

## 一段示例代码

```ts
export function hello(name: string): string {
  return `你好，${name}！`;
}
```

## 写作约定

- 在 `src/content/posts` 下新建 Markdown 文件，或直接打开 `/keystatic` 后台编辑。
- 标签支持中文，归档按年份聚合。
- 设为 `draft: true` 的文章不会出现在列表与 RSS 中。

接下来会慢慢补上更多笔记，欢迎常来看看。
