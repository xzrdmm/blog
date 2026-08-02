import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';

// Keystatic 后台（/keystatic 与 /api/keystatic）依赖服务端路由，
// 只在开发环境启用；生产构建保持纯静态，可直接部署到 GitHub Pages。
const isProduction = process.env.NODE_ENV === 'production';

// site 需要替换成你部署后的真实地址（GitHub Pages 项目站点格式）：
// https://<你的 GitHub 用户名>.github.io/blog/
export default defineConfig({
  output: 'static',
  site: 'https://xzrdmm.github.io/blog/',
  // 开发环境使用根路径（/keystatic 可直接访问）；
  // 生产构建保持 /blog/ 以匹配 GitHub Pages 项目站点。
  base: isProduction ? '/blog/' : '/',
  integrations: [react(), sitemap(), ...(isProduction ? [] : [keystatic()])],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
