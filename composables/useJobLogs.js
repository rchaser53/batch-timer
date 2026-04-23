import { nextTick, ref } from 'vue';

export function useJobLogs(selectedName) {
  const logs = ref(null);
  const logsError = ref('');
  const logLoadState = ref({ stdout: false, stderr: false });
  const refreshRequestVersion = ref(0);

  async function refreshLogs(name = selectedName.value) {
    const targetName = String(name || '');
    if (!targetName) return;
    const requestVersion = ++refreshRequestVersion.value;
    logsError.value = '';
    try {
      const nextLogs = await $fetch(`/api/logs/${encodeURIComponent(targetName)}`);
      if (requestVersion !== refreshRequestVersion.value || selectedName.value !== targetName) return;
      logs.value = nextLogs;
    } catch (e) {
      if (requestVersion !== refreshRequestVersion.value || selectedName.value !== targetName) return;
      logsError.value = e?.data?.message || e?.message || 'ログ取得に失敗しました';
    }
  }

  async function loadOlder(stream, el) {
    const targetName = String(selectedName.value || '');
    if (!targetName) return;
    const requestVersion = refreshRequestVersion.value;
    if (logLoadState.value[stream]) return;
    const cur = logs.value?.[stream];
    if (!cur?.hasMore) return;

    logLoadState.value = { ...logLoadState.value, [stream]: true };
    try {
      const oldScrollHeight = el.scrollHeight;
      const before = cur.from;
      const r = await $fetch(`/api/logs/${encodeURIComponent(targetName)}`, {
        query: { stream, before, lines: 200 },
      });
      if (requestVersion !== refreshRequestVersion.value || selectedName.value !== targetName) return;
      const older = r?.[stream];
      if (!older?.content) {
        logs.value[stream].hasMore = false;
        logs.value[stream].truncated = false;
        logs.value[stream].from = 0;
        return;
      }

      const prev = logs.value?.[stream]?.content || '';
      const joiner = older.content.endsWith('\n') || prev.startsWith('\n') || prev === '' ? '' : '\n';
      logs.value[stream].content = `${older.content}${joiner}${prev}`;
      logs.value[stream].from = older.from;
      logs.value[stream].hasMore = older.hasMore;
      logs.value[stream].truncated = older.truncated;

      await nextTick();
      const newScrollHeight = el.scrollHeight;
      const delta = newScrollHeight - oldScrollHeight;
      el.scrollTop = delta;
    } catch (e) {
      if (requestVersion !== refreshRequestVersion.value || selectedName.value !== targetName) return;
      logsError.value = e?.data?.message || e?.message || 'ログ取得に失敗しました';
    } finally {
      if (requestVersion !== refreshRequestVersion.value || selectedName.value !== targetName) return;
      logLoadState.value = { ...logLoadState.value, [stream]: false };
    }
  }

  function onLogScroll(stream, ev) {
    const el = ev?.target;
    if (!el) return;
    if (el.scrollTop <= 0) {
      loadOlder(stream, el);
    }
  }

  function resetLogsState() {
    refreshRequestVersion.value++;
    logs.value = null;
    logsError.value = '';
    logLoadState.value = { stdout: false, stderr: false };
  }

  return { logs, logsError, logLoadState, refreshLogs, onLogScroll, resetLogsState };
}
