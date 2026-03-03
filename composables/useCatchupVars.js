function truthy(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(s);
}

export function extractCatchupVars(data) {
  const env = data?.EnvironmentVariables;
  if (!env || typeof env !== 'object') {
    return { enabled: false, afterHour: '', afterMinute: '' };
  }

  const enabled = truthy(env.BATCH_TIMER_CATCHUP);

  const afterHourRaw = env.BATCH_TIMER_CATCHUP_AFTER_HOUR;
  const afterMinuteRaw = env.BATCH_TIMER_CATCHUP_AFTER_MINUTE;

  const afterHour = afterHourRaw === null || afterHourRaw === undefined ? '' : String(afterHourRaw);
  const afterMinute = afterMinuteRaw === null || afterMinuteRaw === undefined ? '' : String(afterMinuteRaw);

  return { enabled, afterHour, afterMinute };
}

export function applyCatchupVarsToData(data, vars) {
  if (!data || typeof data !== 'object') return data;
  if (!data.EnvironmentVariables || typeof data.EnvironmentVariables !== 'object') data.EnvironmentVariables = {};

  if (vars?.enabled) {
    data.EnvironmentVariables.BATCH_TIMER_CATCHUP = '1';

    const h = String(vars.afterHour ?? '').trim();
    const m = String(vars.afterMinute ?? '').trim();

    if (h) data.EnvironmentVariables.BATCH_TIMER_CATCHUP_AFTER_HOUR = h;
    else delete data.EnvironmentVariables.BATCH_TIMER_CATCHUP_AFTER_HOUR;

    if (m) data.EnvironmentVariables.BATCH_TIMER_CATCHUP_AFTER_MINUTE = m;
    else delete data.EnvironmentVariables.BATCH_TIMER_CATCHUP_AFTER_MINUTE;
  } else {
    delete data.EnvironmentVariables.BATCH_TIMER_CATCHUP;
    delete data.EnvironmentVariables.BATCH_TIMER_CATCHUP_AFTER_HOUR;
    delete data.EnvironmentVariables.BATCH_TIMER_CATCHUP_AFTER_MINUTE;
  }

  return data;
}
