import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getWorkspaceRoot } from './workspacePlist';

type SnapshotItem = {
  label: string;
  plistPath: string;
  contentHash: string;
  loadedAt: string;
};

type SnapshotStore = {
  byLabel: Record<string, SnapshotItem>;
};

function getSnapshotFilePath() {
  return path.join(getWorkspaceRoot(), 'logs', '.loaded-plist-snapshots.json');
}

function readStore(): SnapshotStore {
  const p = getSnapshotFilePath();
  if (!fs.existsSync(p)) return { byLabel: {} };
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { byLabel: {} };
    const byLabel = parsed.byLabel && typeof parsed.byLabel === 'object' ? parsed.byLabel : {};
    return { byLabel };
  } catch {
    return { byLabel: {} };
  }
}

function writeStore(store: SnapshotStore) {
  const p = getSnapshotFilePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(store, null, 2), 'utf8');
}

export function getFileContentHash(filePath: string) {
  const buf = fs.readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

export function saveLoadedSnapshot(label: string, plistPath: string) {
  if (!label) return;
  const store = readStore();
  store.byLabel[label] = {
    label,
    plistPath,
    contentHash: getFileContentHash(plistPath),
    loadedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function readLoadedSnapshot(label: string): SnapshotItem | null {
  if (!label) return null;
  const store = readStore();
  return store.byLabel[label] || null;
}

export function deleteLoadedSnapshot(label: string) {
  if (!label) return;
  const store = readStore();
  if (!store.byLabel[label]) return;
  delete store.byLabel[label];
  writeStore(store);
}
