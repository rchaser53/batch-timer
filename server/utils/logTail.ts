import fs from 'node:fs';
import path from 'node:path';

export type TailResult = {
  path: string;
  exists: boolean;
  truncated: boolean;
  bytes: number;
  content: string;
};

export type TailLinesResult = {
  path: string;
  exists: boolean;
  truncated: boolean;
  from: number;
  to: number;
  bytes: number;
  lines: number;
  hasMore: boolean;
  content: string;
};

const DEFAULT_MAX_BYTES = 64 * 1024;
const DEFAULT_LINES_MAX_BYTES = 512 * 1024;

function isAllowedLogPath(filePath: string) {
  // Allow only:
  // - /tmp/...
  // - $HOME/Library/Logs/...
  // - <workspace>/logs/...
  const home = process.env.HOME || '';
  const resolved = path.resolve(filePath);
  const workspaceLogs = path.resolve(process.cwd(), 'logs') + path.sep;
  const allowedPrefixes = [`${home}/Library/Logs/`, `/tmp${path.sep}`, workspaceLogs].filter(Boolean);
  return allowedPrefixes.some((p) => p && resolved.startsWith(p));
}

export function assertAllowedLogPath(filePath: string) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('log path is missing');
  }
  if (!path.isAbsolute(filePath)) {
    throw new Error('log path must be absolute');
  }
  if (!isAllowedLogPath(filePath)) {
    throw new Error('log path is not allowed');
  }
}

export function readFileTail(filePath: string, maxBytes: number = DEFAULT_MAX_BYTES): TailResult {
  const resolved = path.resolve(filePath);
  assertAllowedLogPath(resolved);

  if (!fs.existsSync(resolved)) {
    return { path: resolved, exists: false, truncated: false, bytes: 0, content: '' };
  }

  const st = fs.statSync(resolved);
  const size = st.size;
  const start = Math.max(0, size - maxBytes);
  const bytesToRead = size - start;

  const fd = fs.openSync(resolved, 'r');
  try {
    const buf = Buffer.alloc(bytesToRead);
    fs.readSync(fd, buf, 0, bytesToRead, start);
    const content = buf.toString('utf8');
    return {
      path: resolved,
      exists: true,
      truncated: start > 0,
      bytes: bytesToRead,
      content,
    };
  } finally {
    fs.closeSync(fd);
  }
}

function clampInt(v: unknown, { min, max }: { min: number; max: number }) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

// Read the last N lines up to "before" byte offset (exclusive).
// - If before is omitted, reads from EOF.
// - Returns byte-range cursor (from/to) that can be used to page backwards.
export function readFileTailLines(
  filePath: string,
  opts: { lines?: number; before?: number; maxBytes?: number } = {},
): TailLinesResult {
  const resolved = path.resolve(filePath);
  assertAllowedLogPath(resolved);

  if (!fs.existsSync(resolved)) {
    return {
      path: resolved,
      exists: false,
      truncated: false,
      from: 0,
      to: 0,
      bytes: 0,
      lines: 0,
      hasMore: false,
      content: '',
    };
  }

  const st = fs.statSync(resolved);
  const size = st.size;

  const lines = clampInt(opts.lines, { min: 1, max: 1000 }) ?? 20;
  const maxBytes = clampInt(opts.maxBytes, { min: 4 * 1024, max: 2 * 1024 * 1024 }) ?? DEFAULT_LINES_MAX_BYTES;
  const beforeRaw = clampInt(opts.before, { min: 0, max: size }) ?? size;
  const end = Math.min(Math.max(0, beforeRaw), size);

  if (end === 0) {
    return {
      path: resolved,
      exists: true,
      truncated: false,
      from: 0,
      to: 0,
      bytes: 0,
      lines: 0,
      hasMore: false,
      content: '',
    };
  }

  const chunkSize = 32 * 1024;
  const fd = fs.openSync(resolved, 'r');
  try {
    let pos = end;
    let startOfCombined = end;
    let totalBytesRead = 0;
    let newlineCount = 0;
    const chunks: string[] = [];

    while (pos > 0 && newlineCount < lines + 1 && totalBytesRead < maxBytes) {
      const readEnd = pos;
      const readStart = Math.max(0, readEnd - chunkSize);
      const bytesToRead = readEnd - readStart;

      const buf = Buffer.alloc(bytesToRead);
      fs.readSync(fd, buf, 0, bytesToRead, readStart);
      const text = buf.toString('utf8');

      chunks.unshift(text);
      startOfCombined = readStart;
      totalBytesRead += bytesToRead;
      // Rough line counting is fine; later we do exact split.
      newlineCount += (text.match(/\n/g) || []).length;
      pos = readStart;
    }

    const combined = chunks.join('');
    const allLines = combined.split('\n');

    const takeCount = Math.min(lines, allLines.length);
    const selectedLines = allLines.slice(allLines.length - takeCount);
    const content = selectedLines.join('\n');

    const dropCount = allLines.length - takeCount;
    let prefixText = '';
    if (dropCount > 0) {
      prefixText = allLines.slice(0, dropCount).join('\n');
      prefixText += '\n';
    }

    const from = startOfCombined + Buffer.byteLength(prefixText, 'utf8');
    const to = end;
    const truncated = from > 0;

    return {
      path: resolved,
      exists: true,
      truncated,
      from,
      to,
      bytes: Buffer.byteLength(content, 'utf8'),
      lines: selectedLines.length,
      hasMore: from > 0,
      content,
    };
  } finally {
    fs.closeSync(fd);
  }
}
