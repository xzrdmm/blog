export interface ParsedSongMeta {
  title: string;
  artist: string;
  extension: string;
  coverData?: Uint8Array;
  coverFormat?: string;
}

export function sanitizeSlug(value: string): string {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim() || 'untitled';
}

export function buildSongEntry(
  meta: ParsedSongMeta,
  playlist: string,
  existingSlugs: string[],
): {
  slug: string;
  audioName: string;
  coverName?: string;
  entry: Record<string, unknown>;
} {
  const base = sanitizeSlug(meta.title);
  let slug = base;
  let suffix = 2;
  while (existingSlugs.includes(slug)) {
    slug = `${base}-${suffix}`;
    suffix++;
  }

  const audioName = `${slug}.${meta.extension}`;
  let coverName: string | undefined;
  if (meta.coverData && meta.coverFormat) {
    const ext = meta.coverFormat.includes('png')
      ? 'png'
      : meta.coverFormat.includes('webp')
        ? 'webp'
        : 'jpg';
    coverName = `${slug}.${ext}`;
  }

  const entry = {
    title: meta.title,
    artist: meta.artist || '未知歌手',
    playlist,
    cover: coverName ? `/music/covers/${coverName}` : '',
    audio: `/music/audio/${audioName}`,
    lyrics: '',
    rating: '',
    review: '',
    draft: false,
  };

  return { slug, audioName, coverName, entry };
}
