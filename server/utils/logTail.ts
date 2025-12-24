import fs from 'node:fs';
import path from 'node:path';

export type TailResult = {
  path: string;
  exists: boolean;
  truncated: boolean;
  bytes: number;
  content: string;
};

const DEFAULT_MAX_BYTES = 64 * 1024;

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
