export function clampProgress(scrollY: number, scrollHeight: number, innerHeight: number): number {
  const max = Math.max(0, scrollHeight - innerHeight);
  return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
}
