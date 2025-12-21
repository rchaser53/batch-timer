import fs from 'node:fs';
import { resolveWorkspacePlistPath, writePlistFile } from '../../utils/workspacePlist';
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; data?: any }>(event);
  const name = body?.name;
  const data = body?.data ?? {};

  const filePath = resolveWorkspacePlistPath(String(name || ''));
  if (fs.existsSync(filePath)) {
    throw createError({ statusCode: 409, statusMessage: 'Already exists' });
  }

  try {
    writePlistFile(filePath, data);
    return { name, path: filePath };
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: 'Failed to write plist', data: { details: String(e) } });
  }
});
