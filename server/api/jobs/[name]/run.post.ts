import fs from 'node:fs';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { createError, defineEventHandler, getRouterParam } from 'h3';
import { resolveWorkspacePlistPath, readPlistFile } from '../../../utils/workspacePlist';
import { readFileTail } from '../../../utils/logTail';

const SPAWN_CAPTURE_MAX_BYTES = 64 * 1024;
const KICKSTART_TIMEOUT_MS = 8000;
const SPAWN_WAIT_EXIT_MS = 1500;

function runLaunchctl(args: string[]) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }>((resolve) => {
    execFile('launchctl', args, { timeout: KICKSTART_TIMEOUT_MS }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout || ''), stderr: String(stderr || ''), error: err ? String(err) : undefined });
    });
  });
}

function parseLaunchctlPrint(text: string) {
  const stdoutMatch = text.match(/\n\s*stdout path = (.+)\n/);
  const stderrMatch = text.match(/\n\s*stderr path = (.+)\n/);
  const lastExitMatch = text.match(/\n\s*last exit code = (\d+)/);
  return {
    stdoutPath: stdoutMatch?.[1]?.trim() || '',
    stderrPath: stderrMatch?.[1]?.trim() || '',
    lastExitCode: lastExitMatch ? Number(lastExitMatch[1]) : null,
  };
}

function normalizeEnvVars(input: any): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof k !== 'string') continue;
    if (typeof v === 'string') out[k] = v;
    else if (v === null || v === undefined) continue;
    else out[k] = String(v);
  }
  return out;
}

function getProgramAndArgs(data: any): { command: string; args: string[] } {
  const pa = data?.ProgramArguments;
  if (Array.isArray(pa) && pa.length > 0 && pa.every((x) => typeof x === 'string')) {
    return { command: pa[0], args: pa.slice(1) };
  }

  const program = data?.Program;
  if (typeof program === 'string' && program) {
    return { command: program, args: [] };
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'ProgramArguments (or Program) is missing in this plist',
  });
}

function ensureParentDir(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

async function spawnFromPlist(data: any) {
  const { command, args } = getProgramAndArgs(data);

  const workingDirectory = typeof data?.WorkingDirectory === 'string' && data.WorkingDirectory
    ? data.WorkingDirectory
    : process.cwd();

  const env = {
    ...process.env,
    ...normalizeEnvVars(data?.EnvironmentVariables),
  } as Record<string, string>;

  const stdoutPath = typeof data?.StandardOutPath === 'string' ? data.StandardOutPath : '';
  const stderrPath = typeof data?.StandardErrorPath === 'string' ? data.StandardErrorPath : '';

  const stdoutFd = stdoutPath ? (ensureParentDir(stdoutPath), fs.openSync(stdoutPath, 'a')) : null;
  const stderrFd = stderrPath ? (ensureParentDir(stderrPath), fs.openSync(stderrPath, 'a')) : null;

  const child = spawn(command, args, {
    cwd: workingDirectory,
    env,
    stdio: ['ignore', stdoutFd ?? 'pipe', stderrFd ?? 'pipe'],
  });

  let stdoutCaptured = '';
  let stderrCaptured = '';

  if (stdoutFd === null && child.stdout) {
    child.stdout.on('data', (buf) => {
      if (stdoutCaptured.length >= SPAWN_CAPTURE_MAX_BYTES) return;
      stdoutCaptured += String(buf);
      if (stdoutCaptured.length > SPAWN_CAPTURE_MAX_BYTES) stdoutCaptured = stdoutCaptured.slice(0, SPAWN_CAPTURE_MAX_BYTES);
    });
  }
  if (stderrFd === null && child.stderr) {
    child.stderr.on('data', (buf) => {
      if (stderrCaptured.length >= SPAWN_CAPTURE_MAX_BYTES) return;
      stderrCaptured += String(buf);
      if (stderrCaptured.length > SPAWN_CAPTURE_MAX_BYTES) stderrCaptured = stderrCaptured.slice(0, SPAWN_CAPTURE_MAX_BYTES);
    });
  }

  const startedAt = new Date().toISOString();

  const result = await new Promise<{
    ok: boolean;
    mode: 'spawn';
    command: string;
    args: string[];
    cwd: string;
    pid?: number;
    startedAt: string;
    exited?: boolean;
    exitCode?: number | null;
    signal?: NodeJS.Signals | null;
    stdoutPath?: string | null;
    stderrPath?: string | null;
    stdoutCaptured?: string;
    stderrCaptured?: string;
    error?: string;
  }>((resolve) => {
    let settled = false;
    const finish = (payload: any) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    child.once('error', (err) => {
      finish({
        ok: false,
        mode: 'spawn',
        command,
        args,
        cwd: workingDirectory,
        pid: child.pid,
        startedAt,
        exited: true,
        exitCode: null,
        signal: null,
        stdoutPath: stdoutPath || null,
        stderrPath: stderrPath || null,
        stdoutCaptured,
        stderrCaptured,
        error: String(err),
      });
    });

    child.once('exit', (code, signal) => {
      finish({
        ok: code === 0,
        mode: 'spawn',
        command,
        args,
        cwd: workingDirectory,
        pid: child.pid,
        startedAt,
        exited: true,
        exitCode: code,
        signal,
        stdoutPath: stdoutPath || null,
        stderrPath: stderrPath || null,
        stdoutCaptured,
        stderrCaptured,
      });
    });

    // fire-and-forget: すぐに返しつつ、即時失敗だけ拾う
    setTimeout(() => {
      finish({
        ok: true,
        mode: 'spawn',
        command,
        args,
        cwd: workingDirectory,
        pid: child.pid,
        startedAt,
        exited: false,
        stdoutPath: stdoutPath || null,
        stderrPath: stderrPath || null,
        stdoutCaptured,
        stderrCaptured,
      });
    }, SPAWN_WAIT_EXIT_MS);
  });

  try {
    if (typeof stdoutFd === 'number') fs.closeSync(stdoutFd);
    if (typeof stderrFd === 'number') fs.closeSync(stderrFd);
  } catch {
    // ignore
  }

  return result;
}

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || '';
  const filePath = resolveWorkspacePlistPath(name);

  if (!fs.existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }

  let data: any;
  try {
    data = readPlistFile(filePath);
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: 'Failed to parse plist', data: { details: String(e) } });
  }

  const label = typeof data?.Label === 'string' ? data.Label : '';

  // まずは「実際に設定している plist」をそのまま launchd に kickstart して試す
  // （load済みならこちらが最も忠実）
  if (label && typeof (process as any).getuid === 'function') {
    const uid = (process as any).getuid();
    const kick = await runLaunchctl(['kickstart', '-k', `gui/${uid}/${label}`]);
    if (kick.ok) {
      // kickstart成功=ジョブ起動要求が通った、というだけなので、直近の失敗やログ場所も返してデバッグしやすくする
      await new Promise((r) => setTimeout(r, 200));
      const printed = await runLaunchctl(['print', `gui/${uid}/${label}`]);
      const parsed = printed.ok ? parseLaunchctlPrint(printed.stdout) : { stdoutPath: '', stderrPath: '', lastExitCode: null };
      const stderrTail = parsed.stderrPath ? readFileTail(parsed.stderrPath) : null;

      return {
        ok: parsed.lastExitCode === null ? true : parsed.lastExitCode === 0,
        mode: 'kickstart',
        name,
        plistPath: filePath,
        label,
        launchctl: kick,
        service: {
          domain: `gui/${uid}`,
          stdoutPath: parsed.stdoutPath || null,
          stderrPath: parsed.stderrPath || null,
          lastExitCode: parsed.lastExitCode,
        },
        stderrTail,
      };
    }

    // kickstart が失敗した場合（未load等）は、plistの ProgramArguments を読んで直接実行にフォールバック
    const spawned = await spawnFromPlist(data);
    return {
      ok: spawned.ok,
      mode: spawned.mode,
      name,
      plistPath: filePath,
      label,
      launchctl: kick,
      spawned,
    };
  }

  // label が無い / getuid が無い環境などは直接実行
  const spawned = await spawnFromPlist(data);
  return {
    ok: spawned.ok,
    mode: spawned.mode,
    name,
    plistPath: filePath,
    label: label || null,
    spawned,
  };
});
