import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { resolveWorkspacePlistPath } from '../../utils/workspacePlist';
import { createError } from 'h3';
import { readPlistFile } from '../../utils/workspacePlist';
import { saveLoadedSnapshot } from '../../utils/loadedSnapshot';

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

  // 同じLabelが別パスから既にロードされている場合、
  // `unload <workspace-plist>` では外れず、loadしても置き換わらないことがある。
  // そのため Label をキーに bootout->bootstrap で差し替える（失敗時は従来コマンドへフォールバック）。
  let label = '';
  try {
    const data: any = readPlistFile(filePath);
    label = typeof data?.Label === 'string' ? data.Label : '';
    if (label && typeof (process as any).getuid === 'function') {
      const uid = (process as any).getuid();
      await runLaunchctl(['bootout', `gui/${uid}/${label}`]).catch(() => null);
      const boot = await runLaunchctl(['bootstrap', `gui/${uid}`, filePath]);
      if (boot.ok) {
        saveLoadedSnapshot(label, filePath);
        return boot;
      }
    }
  } catch {
    // ignore and fallback
  }

  const loaded = await runLaunchctl(['load', '-w', filePath]);
  if (loaded.ok && label) {
    saveLoadedSnapshot(label, filePath);
  }
  return loaded;
});
