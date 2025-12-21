import fs from 'node:fs';
import path from 'node:path';
import plist from 'plist';
import { createError } from 'h3';

export type PlistJobListItem = { name: string; path: string };

export function getWorkspaceRoot() {
  // Nuxt/Nitroはビルド後に実行パスが変わりうるため、
  // "起動したカレントディレクトリ" を基準にする。
  return process.cwd();
}

export function assertSafePlistName(name: string) {
  if (!name || typeof name !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'name is required' });
  }
  if (!name.endsWith('.plist')) {
    throw createError({ statusCode: 400, statusMessage: 'name must end with .plist' });
  }
  // パストラバーサル防止: / や .. を拒否
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'invalid name' });
  }
  // 最低限の許可文字
  if (!/^[A-Za-z0-9._-]+\.plist$/.test(name)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid name' });
  }
}

export function resolveWorkspacePlistPath(name: string) {
  assertSafePlistName(name);
  return path.join(getWorkspaceRoot(), name);
}

export function listWorkspacePlists(): PlistJobListItem[] {
  const root = getWorkspaceRoot();
  const files = fs.readdirSync(root).filter((f) => f.endsWith('.plist'));
  return files.map((name) => ({ name, path: path.join(root, name) }));
}

export function readPlistFile(filePath: string) {
  const xml = fs.readFileSync(filePath, 'utf8');
  return plist.parse(xml);
}

export function writePlistFile(filePath: string, data: any) {
  const xml = plist.build(data);
  fs.writeFileSync(filePath, xml, 'utf8');
}
