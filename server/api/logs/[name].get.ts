import fs from 'node:fs';
import { createError, getQuery } from 'h3';
import { readFileTailLines } from '../../utils/logTail';
import { readPlistFile, resolveWorkspacePlistPath } from '../../utils/workspacePlist';

type LogStream = 'stdout' | 'stderr';

export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name') || '';
  const plistPath = resolveWorkspacePlistPath(name);

  if (!fs.existsSync(plistPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }

  const query = getQuery(event);
  const requestedStream = typeof query.stream === 'string' ? query.stream : '';
  if (requestedStream && requestedStream !== 'stdout' && requestedStream !== 'stderr') {
    throw createError({ statusCode: 400, statusMessage: 'stream must be stdout or stderr' });
  }

  try {
    const data = readPlistFile(plistPath) as Record<string, unknown>;
    const paths: Record<LogStream, unknown> = {
      stdout: data.StandardOutPath,
      stderr: data.StandardErrorPath,
    };
    const streams: LogStream[] = requestedStream
      ? [requestedStream as LogStream]
      : ['stdout', 'stderr'];
    const result: Record<string, unknown> = {};

    for (const stream of streams) {
      const logPath = paths[stream];
      if (typeof logPath === 'string' && logPath) {
        result[stream] = readFileTailLines(logPath, {
          lines: query.lines as string | undefined,
          before: query.before as string | undefined,
        });
      }
    }

    if (!result.stdout && !result.stderr) {
      result.note = 'StandardOutPath / StandardErrorPath が設定されていません';
    }

    return result;
  } catch (e: any) {
    if (e?.statusCode) throw e;
    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to read logs',
      data: { details: String(e) },
    });
  }
});
