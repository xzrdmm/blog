import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// Keystatic 后台（/keystatic 与 /api/keystatic）依赖服务端路由，
// 只在开发环境启用；生产构建保持纯静态，可直接部署到 GitHub Pages。
const isProduction = process.env.NODE_ENV === 'production';

// site 需要替换成你部署后的真实地址（GitHub Pages 项目站点格式）：
// https://<你的 GitHub 用户名>.github.io/blog/
export default defineConfig({
  output: 'static',
  site: 'https://your-username.github.io/blog/',
  base: '/blog/',
  integrations: [react(), ...(isProduction ? [] : [keystatic()])],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
