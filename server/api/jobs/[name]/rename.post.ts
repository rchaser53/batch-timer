import fs from 'node:fs';
import { createError } from 'h3';
import { resolveWorkspacePlistPath, assertSafePlistName } from '../../../utils/workspacePlist';

export default defineEventHandler(async (event) => {
  const oldName = getRouterParam(event, 'name') || '';
  const oldPath = resolveWorkspacePlistPath(oldName);

  const body = await readBody<{ newName?: string }>(event);
  const newName = String(body?.newName || '');
  assertSafePlistName(newName);
  const newPath = resolveWorkspacePlistPath(newName);

  if (oldName === newName) {
    return { ok: true, oldName, newName, oldPath, newPath };
  }

  if (!fs.existsSync(oldPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }
  if (fs.existsSync(newPath)) {
    throw createError({ statusCode: 409, statusMessage: 'Already exists' });
  }

  try {
    fs.renameSync(oldPath, newPath);
    return { ok: true, oldName, newName, oldPath, newPath };
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: 'Failed to rename plist', data: { details: String(e) } });
  }
});
