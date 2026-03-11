import fs from 'node:fs';
import { createError } from 'h3';
import {
  resolveWorkspacePlistPath,
  assertSafePlistName,
  plistNameToLabel,
  readPlistFile,
  writePlistFile,
} from '../../../utils/workspacePlist';
import { deleteLoadedSnapshot } from '../../../utils/loadedSnapshot';

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
    const oldData = readPlistFile(oldPath);
    if (!oldData || typeof oldData !== 'object' || Array.isArray(oldData)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid plist payload' });
    }

    const oldLabel = typeof (oldData as any).Label === 'string' ? (oldData as any).Label : '';
    const newLabel = plistNameToLabel(newName);
    const newData = { ...(oldData as Record<string, any>), Label: newLabel };

    writePlistFile(newPath, newData);
    fs.unlinkSync(oldPath);

    if (oldLabel && oldLabel !== newLabel) {
      deleteLoadedSnapshot(oldLabel);
    }

    return { ok: true, oldName, newName, oldPath, newPath, oldLabel, newLabel };
  } catch (e: any) {
    if (fs.existsSync(newPath)) {
      try {
        if (fs.existsSync(oldPath)) fs.unlinkSync(newPath);
        else fs.renameSync(newPath, oldPath);
      } catch {
        // 復旧できない場合は元のエラーを優先して返す
      }
    }
    throw createError({ statusCode: 400, statusMessage: 'Failed to rename plist', data: { details: String(e) } });
  }
});
