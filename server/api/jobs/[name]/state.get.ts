import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { createError } from 'h3';
import { resolveWorkspacePlistPath, readPlistFile } from '../../../utils/workspacePlist';
import { getFileContentHash, readLoadedSnapshot } from '../../../utils/loadedSnapshot';

function runLaunchctl(args: string[]) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }>((resolve) => {
    execFile('launchctl', args, { timeout: 8000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout || ''), stderr: String(stderr || ''), error: err ? String(err) : undefined });
    });
  });
}

function normalizeWrappedValue(input: string) {
  return String(input || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLaunchctlPrint(text: string) {
  const normalized = String(text || '').replace(/\r\n/g, '\n');

  const pathMatch = normalized.match(/\n\s*path\s*=\s*([\s\S]*?)\s+type\s*=\s*/);
  const programMatch = normalized.match(/\n\s*program\s*=\s*(.+)\n/);
  const argsBlockMatch = normalized.match(/\n\s*arguments\s*=\s*\{([\s\S]*?)\n\s*\}\n/);
  const stdoutMatch = normalized.match(/\n\s*stdout path\s*=\s*(.+)\n/);
  const stderrMatch = normalized.match(/\n\s*stderr path\s*=\s*(.+)\n/);
  const runIntervalMatch = normalized.match(/\n\s*run interval\s*=\s*(\d+)\s+seconds\n/);
  const propertiesMatch = normalized.match(/\n\s*properties\s*=\s*(.+)\n/);

  const argsLines = argsBlockMatch?.[1]
    ? argsBlockMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => Boolean(l))
    : [];

  const propertiesRaw = propertiesMatch?.[1]?.trim() || '';
  const properties = propertiesRaw
    .split('|')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  return {
    plistPath: pathMatch?.[1] ? normalizeWrappedValue(pathMatch[1]) : '',
    program: programMatch?.[1]?.trim() || '',
    arguments: argsLines,
    stdoutPath: stdoutMatch?.[1]?.trim() || '',
    stderrPath: stderrMatch?.[1]?.trim() || '',
    runIntervalSeconds: runIntervalMatch ? Number(runIntervalMatch[1]) : null,
    runAtLoad: properties.includes('runatload'),
  };
}

function getWorkspaceComparable(data: any) {
  const programArguments = data?.ProgramArguments;
  let program = '';
  let args: string[] = [];
  if (Array.isArray(programArguments) && programArguments.length > 0 && programArguments.every((x) => typeof x === 'string')) {
    program = programArguments[0];
    args = programArguments.slice(1);
  } else if (typeof data?.Program === 'string' && data.Program) {
    program = data.Program;
    args = [];
  }

  const stdoutPath = typeof data?.StandardOutPath === 'string' ? data.StandardOutPath : '';
  const stderrPath = typeof data?.StandardErrorPath === 'string' ? data.StandardErrorPath : '';
  const startInterval = Number.isFinite(data?.StartInterval) ? Number(data.StartInterval) : null;
  const runAtLoad = Boolean(data?.RunAtLoad);

  return { program, args, stdoutPath, stderrPath, startIntervalSeconds: startInterval, runAtLoad };
}

function arrayEq(a: string[], b: string[]) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
  if (!label) {
    return {
      name,
      label: '',
      isLoaded: false,
      matches: null,
      diffs: ['Label'],
      note: 'Label が無いため launchctl 側を確認できません。',
      workspace: { plistPath: filePath, ...getWorkspaceComparable(data) },
    };
  }

  if (typeof (process as any).getuid !== 'function') {
    return {
      name,
      label,
      isLoaded: false,
      matches: null,
      diffs: ['uid'],
      note: 'この環境では uid を取得できないため launchctl 側を確認できません。',
      workspace: { plistPath: filePath, ...getWorkspaceComparable(data) },
    };
  }

  const uid = (process as any).getuid();
  const printed = await runLaunchctl(['print', `gui/${uid}/${label}`]);
  if (!printed.ok) {
    return {
      name,
      label,
      isLoaded: false,
      matches: null,
      diffs: [],
      launchctl: printed,
      workspace: { plistPath: filePath, ...getWorkspaceComparable(data) },
    };
  }

  const loaded = parseLaunchctlPrint(printed.stdout);
  const workspace = { plistPath: filePath, ...getWorkspaceComparable(data) };
  const currentContentHash = getFileContentHash(filePath);
  const snapshot = readLoadedSnapshot(label);

  const diffs = new Set<string>();
  if (loaded.plistPath && workspace.plistPath !== loaded.plistPath) diffs.add('plistPath');
  if (workspace.program && loaded.program && workspace.program !== loaded.program) diffs.add('program');

  // launchctl print の arguments は program を含むので、workspace側も同形式に合わせて比較
  const workspaceArgsForCompare = workspace.program ? [workspace.program, ...workspace.args] : [];
  if (workspaceArgsForCompare.length && loaded.arguments.length && !arrayEq(workspaceArgsForCompare, loaded.arguments)) {
    diffs.add('arguments');
  }

  if (workspace.stdoutPath && loaded.stdoutPath && workspace.stdoutPath !== loaded.stdoutPath) diffs.add('stdoutPath');
  if (workspace.stderrPath && loaded.stderrPath && workspace.stderrPath !== loaded.stderrPath) diffs.add('stderrPath');

  if (
    workspace.startIntervalSeconds !== null &&
    loaded.runIntervalSeconds !== null &&
    workspace.startIntervalSeconds !== loaded.runIntervalSeconds
  ) {
    diffs.add('StartInterval');
  }

  // 片側にしか無い場合は「差分」として扱う
  if (workspace.runAtLoad !== loaded.runAtLoad) {
    diffs.add('RunAtLoad');
  }

  // load時点のハッシュと現在ファイルのハッシュを比較し、
  // launchctl print で取得できないキー変更も検知する。
  if (snapshot && snapshot.contentHash !== currentContentHash) {
    diffs.add('fileContent');
  }

  if (snapshot && snapshot.plistPath && snapshot.plistPath !== filePath) {
    diffs.add('snapshotPath');
  }

  const diffList = Array.from(diffs);

  return {
    name,
    label,
    isLoaded: true,
    matches: diffList.length === 0,
    diffs: diffList,
    workspace,
    snapshot: snapshot
      ? {
          plistPath: snapshot.plistPath,
          loadedAt: snapshot.loadedAt,
          hasContentMismatch: snapshot.contentHash !== currentContentHash,
        }
      : null,
    effective: {
      plistPath: loaded.plistPath,
      program: loaded.program,
      arguments: loaded.arguments,
      stdoutPath: loaded.stdoutPath,
      stderrPath: loaded.stderrPath,
      runIntervalSeconds: loaded.runIntervalSeconds,
      runAtLoad: loaded.runAtLoad,
    },
  };
});
