function shellQuote(arg) {
  if (arg === '') return "''";
  if (/^[A-Za-z0-9_/:=.,@+-]+$/.test(String(arg))) return String(arg);
  return `'${String(arg).replaceAll("'", "'\\''")}'`;
}

function toCronDowFromLaunchdWeekday(weekday) {
  // launchd: 1=Sun ... 7=Sat
  // cron:   0=Sun ... 6=Sat
  if (typeof weekday !== 'number') return '*';
  if (weekday < 1 || weekday > 7) return '*';
  return String(weekday - 1);
}

function toCronField(n, { min, max } = {}) {
  if (n === undefined || n === null) return '*';
  if (typeof n !== 'number' || Number.isNaN(n)) return '*';
  if (min !== undefined && n < min) return '*';
  if (max !== undefined && n > max) return '*';
  return String(n);
}

export function buildCronPreview(data) {
  const lines = [];

  const runAtLoad = data?.RunAtLoad === true;
  if (runAtLoad) lines.push('@load');

  const sci = data?.StartCalendarInterval;
  const entries = Array.isArray(sci) ? sci : sci && typeof sci === 'object' ? [sci] : [];
  if (entries.length) {
    for (const e of entries) {
      const minute = toCronField(e?.Minute, { min: 0, max: 59 });
      const hour = toCronField(e?.Hour, { min: 0, max: 23 });
      const day = toCronField(e?.Day, { min: 1, max: 31 });
      const month = toCronField(e?.Month, { min: 1, max: 12 });
      const dow = e?.Weekday === undefined ? '*' : toCronDowFromLaunchdWeekday(e?.Weekday);
      lines.push(`${minute} ${hour} ${day} ${month} ${dow}`);
    }
  } else {
    lines.push('# (StartCalendarInterval 未設定)');
  }

  const args = Array.isArray(data?.ProgramArguments) ? data.ProgramArguments : null;
  if (args && args.length) {
    lines.push('');
    lines.push('# command');
    lines.push(args.map(shellQuote).join(' '));
  } else if (typeof data?.Program === 'string' && data.Program) {
    lines.push('');
    lines.push('# command');
    lines.push(String(data.Program));
  }

  return lines.join('\n');
}
