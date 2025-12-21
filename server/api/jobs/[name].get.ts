import fs from 'node:fs';
import { resolveWorkspacePlistPath, readPlistFile } from '../../utils/workspacePlist';
import { createError } from 'h3';

export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name') || '';
  const filePath = resolveWorkspacePlistPath(name);

  if (!fs.existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }

  try {
    const data = readPlistFile(filePath);
    return { name, path: filePath, data };
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: 'Failed to parse plist', data: { details: String(e) } });
  }
});
