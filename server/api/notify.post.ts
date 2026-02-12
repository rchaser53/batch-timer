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

function runNotifyScript(
  scriptPath: string,
  {
    title,
    message,
    sound,
    env,
  }: { title: string; message: string; sound: string; env?: Record<string, string | undefined> },
) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }>((resolve) => {
    execFile('/bin/bash', [scriptPath, title, message, sound], { timeout: TIMEOUT_MS, env: { ...process.env, ...(env || {}) } }, (err, stdout, stderr) => {
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
  let mode: 'alert' | 'web' = 'alert';
  let templateHtml = '';

  try {
    title = asSafeString(body?.title ?? title, { maxLen: 200 }) || 'Batch Timer';
    message = asSafeString(body?.message ?? message, { maxLen: 2000 });
    sound = asSafeString(body?.sound ?? sound, { maxLen: 80 }) || 'default';

    const m = asSafeString(body?.mode ?? 'alert', { maxLen: 20 }) || 'alert';
    if (m === 'alert' || m === 'web') mode = m;
    else throw new Error('mode must be alert or web');

    templateHtml = asSafeString(body?.templateHtml ?? '', { maxLen: 100_000 });
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request', data: { details: String(e?.message || e) } });
  }

  const scriptName = mode === 'web' ? 'notify-web.sh' : 'notify.sh';
  const scriptPath = path.resolve(process.cwd(), 'scripts', scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw createError({ statusCode: 500, statusMessage: `${scriptName} not found`, data: { scriptPath } });
  }

  const env: Record<string, string | undefined> = {};
  if (mode === 'web' && templateHtml) env.REMINDER_TEMPLATE_HTML = templateHtml;

  const r = await runNotifyScript(scriptPath, { title, message, sound, env });

  if (!r.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send notification',
      data: { stdout: r.stdout, stderr: r.stderr, error: r.error },
    });
  }

  return { ok: true, mode, title, message, sound, stdout: r.stdout, stderr: r.stderr };
});
