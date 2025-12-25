<template>
  <div class="wrap">
    <header class="header">
      <h1>Batch Timer GUI (Nuxt)</h1>
      <div class="sub">Workspace: .（このフォルダ直下の .plist のみ対象）</div>
    </header>

    <main class="main">
      <section class="card">
        <h2>ジョブ一覧</h2>
        <p v-if="listError" class="error">{{ listError }}</p>
        <table class="table">
          <thead>
            <tr>
              <th>ファイル名</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in jobs" :key="j.name">
              <td class="mono">{{ j.name }}</td>
              <td>
                <div class="actions">
                  <button @click="openDetail(j.name)">開く</button>
                  <button class="danger" @click="deleteJob(j.name)">削除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="actions" style="margin-top: 8px;">
          <button @click="refreshJobs">更新</button>
        </div>
      </section>

      <section class="card">
        <h2>詳細 / 編集</h2>
        <div v-if="!selectedName" class="muted">ジョブを選択してください。</div>
        <div v-else>
          <div class="grid">
            <div>ファイル</div>
            <div class="mono">{{ selectedPath }}</div>
            <div>crontab表示</div>
            <div>
              <pre class="mono pre">{{ cronPreview }}</pre>
            </div>
            <div>ログ</div>
            <div>
              <div class="actions" style="margin-bottom: 8px;">
                <button @click="refreshLogs" :disabled="!selectedName">ログ更新</button>
              </div>
              <p v-if="logsError" class="error">{{ logsError }}</p>

              <div v-if="logs?.stdout" class="logBlock">
                <div class="logHeader">
                  <div class="mono">stdout: {{ logs.stdout.path }}</div>
                  <div class="muted">{{ logs.stdout.exists ? '' : '（未作成）' }}{{ logs.stdout.truncated ? '（末尾のみ表示）' : '' }}</div>
                </div>
                <pre class="mono pre">{{ logs.stdout.content || '（空）' }}</pre>
              </div>

              <div v-if="logs?.stderr" class="logBlock" style="margin-top: 8px;">
                <div class="logHeader">
                  <div class="mono">stderr: {{ logs.stderr.path }}</div>
                  <div class="muted">{{ logs.stderr.exists ? '' : '（未作成）' }}{{ logs.stderr.truncated ? '（末尾のみ表示）' : '' }}</div>
                </div>
                <pre class="mono pre">{{ logs.stderr.content || '（空）' }}</pre>
              </div>

              <div v-if="logs?.note" class="muted">{{ logs.note }}</div>
            </div>
            <div>内容(JSON)</div>
            <div>
              <textarea v-model="selectedJson" rows="16" class="mono textarea" />
            </div>
          </div>

          <div class="actions" style="margin-top: 8px;">
            <button @click="saveSelected">保存</button>
            <button @click="runNow" :disabled="!selectedName || runInProgress">今すぐ実行(テスト)</button>
            <button @click="launchctlLoad" :disabled="!selectedName">launchctl load -w</button>
            <button @click="launchctlUnload" :disabled="!selectedName">launchctl unload</button>
          </div>
          <p v-if="runInProgress" class="muted" style="margin-top: 8px;">実行中…</p>
          <p v-if="runError" class="error" style="margin-top: 8px;">{{ runError }}</p>
          <div v-if="runResult" class="logBlock" style="margin-top: 8px;">
            <div class="logHeader">
              <div>実行結果</div>
              <div class="muted">mode: {{ runResult.mode }}</div>
            </div>
            <pre class="mono pre">{{ JSON.stringify(runResult, null, 2) }}</pre>
          </div>
          <p v-if="detailError" class="error">{{ detailError }}</p>
        </div>
      </section>

      <section class="card" style="grid-column: 1 / -1;">
        <h2>新規ジョブ作成</h2>
        <div class="grid">
          <label>ファイル名（.plist）</label>
          <input v-model.trim="createName" placeholder="com.example.job.plist" />

          <label>内容（JSON形式）</label>
          <textarea v-model="createJson" rows="8" class="mono textarea"
            placeholder='{"Label":"com.example.job","ProgramArguments":["/bin/bash","/path/to/script.sh"],"StartCalendarInterval":{"Hour":9,"Minute":0},"RunAtLoad":true}' />
        </div>

        <div class="actions" style="margin-top: 8px;">
          <button @click="createJob">作成</button>
        </div>
        <p v-if="createError" class="error">{{ createError }}</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const jobs = ref([]);
const listError = ref('');

const selectedName = ref('');
const selectedPath = ref('');
const selectedJson = ref('');
const detailError = ref('');

const runInProgress = ref(false);
const runError = ref('');
const runResult = ref(null);

const logs = ref(null);
const logsError = ref('');

const createName = ref('');
const createJson = ref('');
const createError = ref('');

function shellQuote(arg) {
  if (arg === '') return "''";
  // Quote only when needed
  if (/^[A-Za-z0-9_/:=.,@+-]+$/.test(arg)) return arg;
  // POSIX-ish single-quote escaping: ' -> '\''
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

function buildCronPreview(data) {
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

const cronPreview = computed(() => {
  if (!selectedJson.value) return '';
  try {
    const data = JSON.parse(selectedJson.value);
    return buildCronPreview(data);
  } catch {
    return '（JSONが不正なため crontab表示できません）';
  }
});

async function refreshJobs() {
  try {
    const data = await $fetch('/api/jobs');
    jobs.value = data;
    listError.value = '';
  } catch (e) {
    listError.value = e?.data?.message || e?.message || '一覧取得に失敗しました';
  }
}

async function openDetail(name) {
  selectedName.value = name;
  detailError.value = '';
  logs.value = null;
  logsError.value = '';
  runInProgress.value = false;
  runError.value = '';
  runResult.value = null;
  try {
    const r = await $fetch(`/api/jobs/${encodeURIComponent(name)}`);
    selectedPath.value = r.path;
    selectedJson.value = JSON.stringify(r.data, null, 2);
    await refreshLogs();
  } catch (e) {
    detailError.value = e?.data?.message || e?.message || '取得に失敗しました';
  }
}

async function refreshLogs() {
  if (!selectedName.value) return;
  logsError.value = '';
  try {
    logs.value = await $fetch(`/api/logs/${encodeURIComponent(selectedName.value)}`);
  } catch (e) {
    logsError.value = e?.data?.message || e?.message || 'ログ取得に失敗しました';
  }
}

async function saveSelected() {
  if (!selectedName.value) return;
  detailError.value = '';
  try {
    const data = JSON.parse(selectedJson.value);
    await $fetch(`/api/jobs/${encodeURIComponent(selectedName.value)}`, {
      method: 'PUT',
      body: { data },
    });
    await refreshJobs();
  } catch (e) {
    detailError.value = e?.message || '保存に失敗しました（JSONを確認してください）';
  }
}

async function deleteJob(name) {
  if (!confirm(`${name} を削除しますか？`)) return;
  try {
    await $fetch(`/api/jobs/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (selectedName.value === name) {
      selectedName.value = '';
      selectedPath.value = '';
      selectedJson.value = '';
    }
    await refreshJobs();
  } catch (e) {
    alert(e?.data?.message || e?.message || '削除に失敗しました');
  }
}

async function createJob() {
  createError.value = '';
  try {
    if (!createName.value) throw new Error('ファイル名を入力してください');
    const data = createJson.value ? JSON.parse(createJson.value) : {};
    await $fetch('/api/jobs', {
      method: 'POST',
      body: { name: createName.value, data },
    });
    createName.value = '';
    createJson.value = '';
    await refreshJobs();
  } catch (e) {
    createError.value = e?.data?.message || e?.message || '作成に失敗しました';
  }
}

async function launchctlLoad() {
  if (!selectedName.value) return;
  const r = await $fetch('/api/launchctl/load', { method: 'POST', body: { name: selectedName.value } }).catch((e) => e);
  if (r?.ok) alert('loadしました');
  else alert(`失敗: ${r?.error || r?.data?.message || r?.message || ''}`);
}

async function launchctlUnload() {
  if (!selectedName.value) return;
  const r = await $fetch('/api/launchctl/unload', { method: 'POST', body: { name: selectedName.value } }).catch((e) => e);
  if (r?.ok) alert('unloadしました');
  else alert(`失敗: ${r?.error || r?.data?.message || r?.message || ''}`);
}

async function runNow() {
  if (!selectedName.value) return;
  runInProgress.value = true;
  runError.value = '';
  runResult.value = null;
  try {
    const r = await $fetch(`/api/jobs/${encodeURIComponent(selectedName.value)}/run`, { method: 'POST' });
    runResult.value = r;
    // すぐにログへ反映されないことがあるので少し待ってから再取得
    await new Promise((resolve) => setTimeout(resolve, 500));
    await refreshLogs();
  } catch (e) {
    runError.value = e?.data?.message || e?.message || '実行に失敗しました';
  } finally {
    runInProgress.value = false;
  }
}

onMounted(refreshJobs);
</script>

<style scoped>
.wrap { font-family: system-ui, -apple-system, sans-serif; }
.header { padding: 12px 16px; background: #0f172a; color: white; }
.sub { opacity: 0.9; font-family: ui-monospace, Menlo, monospace; }
.main { padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: white; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
.actions { display: flex; gap: 8px; }
.mono { font-family: ui-monospace, Menlo, monospace; }
.grid { display: grid; grid-template-columns: 160px 1fr; gap: 8px; }
.textarea { width: 100%; padding: 8px; }
.pre { margin: 0; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; white-space: pre-wrap; }
.logBlock { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; background: white; }
.logHeader { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; margin-bottom: 6px; }
.error { color: #b91c1c; }
.muted { color: #475569; }
button { padding: 8px 10px; font-size: 14px; }
button.danger { background: #fee2e2; }
</style>
