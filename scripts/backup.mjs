#!/usr/bin/env node
/**
 * 一键备份：把内容与媒体复制到 backups/<时间戳>/
 */
import { cpSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const target = resolve(`backups/${stamp}`);
mkdirSync(target, { recursive: true });

for (const [source, dest] of [
  ['src/content', 'content'],
  ['public/music', 'music'],
  ['public/images', 'images'],
]) {
  cpSync(source, join(target, dest), { recursive: true });
}

console.log(`备份完成：${target}`);
