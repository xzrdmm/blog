export function assetPath(path: string, base: string = import.meta.env.BASE_URL): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  if (path.startsWith(normalizedBase) || (normalizedBase === '/' && path.startsWith('/'))) {
    return path;
  }
  return `${normalizedBase}${path.replace(/^\/+/, '')}`;
}
