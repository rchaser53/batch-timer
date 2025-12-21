import fs from 'node:fs';
import { resolveWorkspacePlistPath, writePlistFile } from '../../utils/workspacePlist';
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || '';
  const filePath = resolveWorkspacePlistPath(name);

  if (!fs.existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }

  const body = await readBody<{ data?: any }>(event);
  const data = body?.data;

  try {
    writePlistFile(filePath, data);
    return { name, path: filePath };
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: 'Failed to write plist', data: { details: String(e) } });
  }
});
