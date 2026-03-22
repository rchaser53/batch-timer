import { applyReminderVarsToData } from './useReminderVars.js';
import { applyCatchupVarsToData } from './useCatchupVars.js';

export function getRequestErrorMessage(error, fallback = '') {
  return error?.data?.message || error?.message || fallback;
}

export function buildReminderPayload({ title, message, sound, mode, templatePath, templateHtml }) {
  return {
    title: title || 'Batch Timer',
    message: message ?? '',
    sound: sound || 'default',
    mode: mode === 'web' ? 'web' : 'alert',
    templatePath: templatePath || '',
    templateHtml: templateHtml || '',
  };
}

export function buildCatchupPayload({ enabled, afterHour, afterMinute }) {
  return {
    enabled: Boolean(enabled),
    afterHour: afterHour ?? '',
    afterMinute: afterMinute ?? '',
  };
}

export function applyEditorVarsToJobData(data, { reminder, catchup }) {
  let nextData = data;
  nextData = applyReminderVarsToData(nextData, reminder);
  nextData = applyCatchupVarsToData(nextData, catchup);
  return nextData;
}

export async function runLaunchctlAction(action, name) {
  return await $fetch(`/api/launchctl/${action}`, {
    method: 'POST',
    body: { name },
  }).catch((error) => error);
}

export function getLaunchctlActionMessage(action, result) {
  if (result?.ok) {
    return action === 'load' ? 'loadしました' : 'unloadしました';
  }

  return `失敗: ${getRequestErrorMessage(result, '不明なエラー')}`;
}

export function getReloadFailureMessage(result) {
  if (result?.ok) return '';
  return `保存は成功しましたが、launchctl load に失敗しました: ${getRequestErrorMessage(result, '不明なエラー')}`;
}

export async function saveJobDataAndReload(name, data, { refreshJobs, onReloaded } = {}) {
  await $fetch(`/api/jobs/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: { data },
  });

  await runLaunchctlAction('unload', name);
  const loadResult = await runLaunchctlAction('load', name);

  if (typeof refreshJobs === 'function') {
    await refreshJobs();
  }

  if (typeof onReloaded === 'function') {
    await onReloaded(loadResult);
  }

  return getReloadFailureMessage(loadResult);
}