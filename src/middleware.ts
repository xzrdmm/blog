import { defineMiddleware } from 'astro:middleware';

// 仅在开发环境、且访问 Keystatic 后台时注入增强脚本（文件名/预览/元数据自动回填）。
// 生产构建为纯静态站点，不包含后台，此中间件在 PROD 下直接放行。
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (import.meta.env.PROD) return response;

  const pathname = new URL(context.request.url).pathname;
  if (!pathname.startsWith('/keystatic')) return response;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return response;

  const html = await response.text();
  const injected = '<script type="module" src="/src/keystatic-helper.ts"></script>';
  const nextHtml = html.includes('</body>')
    ? html.replace('</body>', `${injected}\n</body>`)
    : `${html}\n${injected}`;

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(nextHtml, {
    status: response.status,
    headers,
  });
});
