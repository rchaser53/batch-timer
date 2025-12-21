import fs from 'node:fs';
import { resolveWorkspacePlistPath } from '../../utils/workspacePlist';
import { createError } from 'h3';

export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name') || '';
  const filePath = resolveWorkspacePlistPath(name);

  if (!fs.existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }

  try {
    fs.unlinkSync(filePath);
    return { deleted: name };
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: 'Failed to delete plist', data: { details: String(e) } });
  }
});
