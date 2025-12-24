import fs from 'node:fs';

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
  const home = process.env.HOME || '';
  const allowedPrefixes = [`${home}/Library/Logs/`, '/tmp/'];
  return allowedPrefixes.some((p) => p && filePath.startsWith(p));
}

export function assertAllowedLogPath(filePath: string) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('log path is missing');
  }
  if (!filePath.startsWith('/')) {
    throw new Error('log path must be absolute');
  }
  if (!isAllowedLogPath(filePath)) {
    throw new Error('log path is not allowed');
  }
}

export function readFileTail(filePath: string, maxBytes: number = DEFAULT_MAX_BYTES): TailResult {
  assertAllowedLogPath(filePath);

  if (!fs.existsSync(filePath)) {
    return { path: filePath, exists: false, truncated: false, bytes: 0, content: '' };
  }

  const st = fs.statSync(filePath);
  const size = st.size;
  const start = Math.max(0, size - maxBytes);
  const bytesToRead = size - start;

  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(bytesToRead);
    fs.readSync(fd, buf, 0, bytesToRead, start);
    const content = buf.toString('utf8');
    return {
      path: filePath,
      exists: true,
      truncated: start > 0,
      bytes: bytesToRead,
      content,
    };
  } finally {
    fs.closeSync(fd);
  }
}
