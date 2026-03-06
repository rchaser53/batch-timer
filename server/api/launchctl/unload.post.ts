import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { resolveWorkspacePlistPath } from '../../utils/workspacePlist';
import { createError } from 'h3';
import { readPlistFile } from '../../utils/workspacePlist';
import { deleteLoadedSnapshot } from '../../utils/loadedSnapshot';

function runLaunchctl(args: string[]) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }>((resolve) => {
    execFile('launchctl', args, { timeout: 8000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout || ''), stderr: String(stderr || ''), error: err ? String(err) : undefined });
    });
  });
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string }>(event);
  const name = String(body?.name || '');
  const filePath = resolveWorkspacePlistPath(name);

  if (!fs.existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: 'plist not found' });
  }

  let label = '';
  try {
    const data: any = readPlistFile(filePath);
    label = typeof data?.Label === 'string' ? data.Label : '';
    if (label && typeof (process as any).getuid === 'function') {
      const uid = (process as any).getuid();
      const bootout = await runLaunchctl(['bootout', `gui/${uid}/${label}`]);
      if (bootout.ok) {
        deleteLoadedSnapshot(label);
        return bootout;
      }
      // bootoutが失敗しても、従来コマンドへフォールバック
    }
  } catch {
    // ignore and fallback
  }

  const unloaded = await runLaunchctl(['unload', filePath]);
  if (unloaded.ok && label) {
    deleteLoadedSnapshot(label);
  }
  return unloaded;
});
