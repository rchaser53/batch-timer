import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { createError, defineEventHandler, readBody } from 'h3';

const TIMEOUT_MS = 8000;

function asSafeString(v: unknown, { maxLen }: { maxLen: number }) {
  if (v === undefined || v === null) return '';
  const s = typeof v === 'string' ? v : String(v);
  if (s.includes('\u0000')) throw new Error('NUL byte is not allowed');
  if (s.length > maxLen) throw new Error(`Too long (max ${maxLen})`);
  return s;
}

function runNotifyScript(scriptPath: string, { title, message, sound }: { title: string; message: string; sound: string }) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }>((resolve) => {
    execFile('/bin/bash', [scriptPath, title, message, sound], { timeout: TIMEOUT_MS }, (err, stdout, stderr) => {
      resolve({
        ok: !err,
        stdout: String(stdout || ''),
        stderr: String(stderr || ''),
        error: err ? String(err) : undefined,
      });
    });
  });
}

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event);

  let title = 'Batch Timer';
  let message = '';
  let sound = 'default';

  try {
    title = asSafeString(body?.title ?? title, { maxLen: 200 }) || 'Batch Timer';
    message = asSafeString(body?.message ?? message, { maxLen: 2000 });
    sound = asSafeString(body?.sound ?? sound, { maxLen: 80 }) || 'default';
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request', data: { details: String(e?.message || e) } });
  }

  const scriptPath = path.resolve(process.cwd(), 'scripts', 'notify.sh');
  if (!fs.existsSync(scriptPath)) {
    throw createError({ statusCode: 500, statusMessage: 'notify.sh not found', data: { scriptPath } });
  }

  const r = await runNotifyScript(scriptPath, { title, message, sound });

  if (!r.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send notification',
      data: { stdout: r.stdout, stderr: r.stderr, error: r.error },
    });
  }

  return { ok: true, title, message, sound, stdout: r.stdout, stderr: r.stderr };
});
