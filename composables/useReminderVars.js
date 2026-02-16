export function extractReminderVars(data) {
  const env = data?.EnvironmentVariables;
  if (!env || typeof env !== 'object') {
    return { title: 'Batch Timer', message: '', sound: 'default', mode: 'alert', templatePath: '', templateHtml: '' };
  }
  const title = typeof env.REMINDER_TITLE === 'string' ? env.REMINDER_TITLE : 'Batch Timer';
  const message = typeof env.REMINDER_MESSAGE === 'string' ? env.REMINDER_MESSAGE : '';
  const sound = typeof env.REMINDER_SOUND === 'string' ? env.REMINDER_SOUND : 'default';

  const rawMode = typeof env.REMINDER_MODE === 'string' ? env.REMINDER_MODE : 'alert';
  const mode = rawMode === 'web' ? 'web' : 'alert';
  const templatePath = typeof env.REMINDER_TEMPLATE_PATH === 'string' ? env.REMINDER_TEMPLATE_PATH : '';
  const templateHtml = typeof env.REMINDER_TEMPLATE_HTML === 'string' ? env.REMINDER_TEMPLATE_HTML : '';
  return { title, message, sound, mode, templatePath, templateHtml };
}

export function applyReminderVarsToData(data, vars) {
  if (!data || typeof data !== 'object') return data;
  if (!data.EnvironmentVariables || typeof data.EnvironmentVariables !== 'object') data.EnvironmentVariables = {};
  data.EnvironmentVariables.REMINDER_TITLE = vars.title || 'Batch Timer';
  data.EnvironmentVariables.REMINDER_MESSAGE = vars.message ?? '';
  data.EnvironmentVariables.REMINDER_SOUND = vars.sound || 'default';
  data.EnvironmentVariables.REMINDER_MODE = vars.mode === 'web' ? 'web' : 'alert';

  if (vars.templatePath) data.EnvironmentVariables.REMINDER_TEMPLATE_PATH = vars.templatePath;
  else delete data.EnvironmentVariables.REMINDER_TEMPLATE_PATH;

  if (vars.templateHtml) data.EnvironmentVariables.REMINDER_TEMPLATE_HTML = vars.templateHtml;
  else delete data.EnvironmentVariables.REMINDER_TEMPLATE_HTML;

  return data;
}
