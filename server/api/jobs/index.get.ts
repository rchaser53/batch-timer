import { listWorkspacePlists } from '../../utils/workspacePlist';

export default defineEventHandler(() => {
  return listWorkspacePlists();
});
