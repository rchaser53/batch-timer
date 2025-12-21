import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { resolveWorkspacePlistPath } from '../../utils/workspacePlist';
import { createError } from 'h3';

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

  return await runLaunchctl(['load', '-w', filePath]);
});
