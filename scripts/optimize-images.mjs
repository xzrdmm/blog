#!/usr/bin/env node
/**
 * 压缩 public 下的壁纸/封面/文章图/照片（原地重编码，保留路径）。
 * 用法：npm run images
 */
import { readdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const RULES = [
  { dir: 'public/images/wallpapers', maxWidth: 1600, quality: 78 },
  { dir: 'public/images/posts', maxWidth: 1280, quality: 80 },
  { dir: 'public/images/photos', maxWidth: 1600, quality: 80 },
  { dir: 'public/music/covers', maxWidth: 512, quality: 80 },
  { dir: 'public/images', maxWidth: 512, quality: 80 },
];
const MIN_BYTES = 50 * 1024;
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function walk(dir, out) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
}

const seen = new Set();
const jobs = [];
for (const rule of RULES) {
  const files = [];
  walk(rule.dir, files);
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (!EXTS.has(ext) || seen.has(file)) continue;
    seen.add(file);
    const size = statSync(file).size;
    if (size < MIN_BYTES) continue;
    const tmp = `${file}.tmp`;
    jobs.push(
      (async () => {
        try {
          const pipeline = sharp(file, { failOn: 'none' })
            .rotate()
            .resize({ width: rule.maxWidth, withoutEnlargement: true });
          if (ext === '.png') await pipeline.png({ quality: rule.quality }).toFile(tmp);
          else if (ext === '.webp') await pipeline.webp({ quality: rule.quality }).toFile(tmp);
          else await pipeline.jpeg({ quality: rule.quality, mozjpeg: true }).toFile(tmp);
          const after = statSync(tmp).size;
          if (after < size) {
            renameSync(tmp, file);
            console.log(`✓ ${file} ${(size / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`);
          } else {
            unlinkSync(tmp);
            console.log(`= ${file} 已足够小，跳过`);
          }
        } catch (error) {
          console.warn(`跳过 ${file}: ${error.message}`);
        }
      })(),
    );
  }
}

await Promise.all(jobs);
console.log('图片优化完成。');
