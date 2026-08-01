#!/usr/bin/env node
/**
 * 批量导入音乐：
 *   npm run music:import -- <音频文件夹> [歌单名]
 *
 * 自动读取 mp3/flac/m4a/ogg 等文件的标题与歌手元数据，
 * 把音频复制到 public/music/audio/，并生成 src/content/songs/*.json 歌曲条目。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { parseFile } from 'music-metadata';

const AUDIO_EXTS = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.opus', '.aac'];
const sourceDir = resolve(process.argv[2] ?? 'import-music');
const playlist = (process.argv[3] ?? basename(sourceDir)).trim() || '未分类';
const targetDir = resolve('public/music/audio');
const contentDir = resolve('src/content/songs');

const sanitize = (value) =>
  value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim() || 'untitled';

const stripAudioExt = (value) =>
  value.replace(/\.(mp3|flac|m4a|ogg|wav|opus|aac)$/i, '').trim() || value;

const containerToExt = {
  MPEG: '.mp3',
  FLAC: '.flac',
  OGG: '.ogg',
  'MPEG-4': '.m4a',
  MP4: '.m4a',
  ADTS: '.aac',
  WAVE: '.wav',
};

if (!existsSync(sourceDir)) {
  console.error(`找不到目录: ${sourceDir}`);
  console.error('用法: npm run music:import -- <音频文件夹> [歌单名]');
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
mkdirSync(contentDir, { recursive: true });

const files = readdirSync(sourceDir)
  .filter((file) => AUDIO_EXTS.includes(extname(file).toLowerCase()))
  .sort();

const existingSlugs = new Set(readdirSync(contentDir).map((file) => file.replace(/\.json$/, '')));
const existingAudio = new Set(readdirSync(targetDir));
const results = [];

for (const file of files) {
  const full = join(sourceDir, file);
  if (!statSync(full).isFile()) continue;

  let title = stripAudioExt(basename(file, extname(file)).trim());
  let artist = '';
  let outputExt = extname(file).toLowerCase();
  try {
    const meta = await parseFile(full);
    title = meta.common.title?.trim() || title;
    artist = meta.common.artist?.trim() || '';
    outputExt = containerToExt[meta.format.container] ?? outputExt;
  } catch (error) {
    results.push({ file, ok: false, error: `元数据解析失败，使用文件名：${error.message}` });
  }
  title = stripAudioExt(title);

  let slug = sanitize(title);
  if (existingSlugs.has(slug)) {
    results.push({ file, ok: false, error: `已存在同名歌曲「${title}」，跳过（可先删除旧条目）` });
    continue;
  }
  existingSlugs.add(slug);

  let audioName = `${slug}${outputExt}`;
  let suffix = 2;
  while (existingAudio.has(audioName)) {
    audioName = `${slug}-${suffix}${outputExt}`;
    suffix++;
  }
  existingAudio.add(audioName);

  copyFileSync(full, join(targetDir, audioName));

  const entry = {
    title,
    artist: artist || '未知歌手',
    playlist,
    cover: '',
    audio: `/music/audio/${audioName}`,
    lyrics: '',
    rating: '',
    review: '',
    draft: false,
  };
  writeFileSync(join(contentDir, `${slug}.json`), `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
  results.push({ file, ok: true, title, artist, audio: audioName });
}

const okCount = results.filter((r) => r.ok).length;
console.log(`\n导入完成：成功 ${okCount} / 共 ${files.length} 个文件，歌单「${playlist}」\n`);
for (const result of results) {
  if (result.ok) {
    console.log(`  ✓ ${result.file} → ${result.title} / ${result.artist} (${result.audio})`);
  } else {
    console.log(`  ✗ ${result.file}：${result.error}`);
  }
}
console.log('\n音频已复制到 public/music/audio/，条目已生成到 src/content/songs/。');
console.log('歌词可在后台「歌曲」里补充 .lrc 文件，或直接放到 public/music/lyrics/ 后在条目里填写路径。');
