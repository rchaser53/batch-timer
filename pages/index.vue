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
                  <div class="muted">
                    {{ logs.stdout.exists ? '' : '（未作成）' }}
                    {{ logs.stdout.hasMore ? '（上にスクロールで過去を追加表示）' : '' }}
                    {{ logLoadState.stdout ? '（読込中…）' : '' }}
                  </div>
                </div>
                <pre class="mono pre logPre" @scroll.passive="onLogScroll('stdout', $event)">{{ logs.stdout.content || '（空）' }}</pre>
              </div>

              <div v-if="logs?.stderr" class="logBlock" style="margin-top: 8px;">
                <div class="logHeader">
                  <div class="mono">stderr: {{ logs.stderr.path }}</div>
                  <div class="muted">
                    {{ logs.stderr.exists ? '' : '（未作成）' }}
                    {{ logs.stderr.hasMore ? '（上にスクロールで過去を追加表示）' : '' }}
                    {{ logLoadState.stderr ? '（読込中…）' : '' }}
                  </div>
                </div>
                <pre class="mono pre logPre" @scroll.passive="onLogScroll('stderr', $event)">{{ logs.stderr.content || '（空）' }}</pre>
              </div>

              <div v-if="logs?.note" class="muted">{{ logs.note }}</div>
            </div>
            <div>内容</div>
            <div>
              <div class="actions" style="margin-bottom: 8px;">
                <button @click="addPropertyRow">プロパティ追加</button>
                <button @click="toggleRawMode" class="secondary">
                  {{ rawMode ? 'フォーム編集へ' : 'Raw JSONへ' }}
                </button>
              </div>

              <div v-if="!rawMode">
                <p v-if="rowsError" class="error" style="margin: 0 0 8px;">{{ rowsError }}</p>
                <table class="table tableEdit">
                  <thead>
                    <tr>
                      <th style="width: 220px;">キー</th>
                      <th style="width: 140px;">型</th>
                      <th>値</th>
                      <th style="width: 90px;">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in selectedRows" :key="row.id">
                      <td>
                        <input v-model.trim="row.key" class="mono input" placeholder="例: Label" />
                      </td>
                      <td>
                        <select v-model="row.type" class="input" @change="onRowTypeChange(row)">
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                          <option value="null">null</option>
                          <option value="object">object</option>
                          <option value="array">array</option>
                        </select>
                      </td>
                      <td>
                        <template v-if="row.type === 'string'">
                          <input v-model="row.value" class="mono input" placeholder="文字列" />
                        </template>

                        <template v-else-if="row.type === 'number'">
                          <input v-model="row.value" class="mono input" placeholder="数値" inputmode="numeric" />
                        </template>

                        <template v-else-if="row.type === 'boolean'">
                          <select v-model="row.value" class="input">
                            <option :value="true">true</option>
                            <option :value="false">false</option>
                          </select>
                        </template>

                        <template v-else-if="row.type === 'null'">
                          <div class="muted">null</div>
                        </template>

                        <template v-else>
                          <textarea
                            v-model="row.jsonText"
                            rows="4"
                            class="mono textarea"
                            placeholder="JSONを入力"
                            @input="onRowJsonTextInput(row)"
                          />
                          <div v-if="row.error" class="error" style="margin-top: 4px;">{{ row.error }}</div>
                        </template>
                      </td>
                      <td>
                        <button class="danger" @click="removePropertyRow(row.id)">削除</button>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div class="muted" style="margin-top: 8px;">
                  例: <span class="mono">Label</span>, <span class="mono">ProgramArguments</span>, <span class="mono">StartCalendarInterval</span>
                </div>
              </div>

              <div v-else>
                <textarea v-model="selectedJson" rows="16" class="mono textarea" />
                <div class="muted" style="margin-top: 8px;">Raw JSONを編集して保存するとフォームにも反映されます。</div>
              </div>
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
import { ref, onMounted, computed, nextTick } from 'vue';

const jobs = ref([]);
const listError = ref('');

const selectedName = ref('');
const selectedPath = ref('');
const selectedJson = ref('');
const detailError = ref('');

const rawMode = ref(false);
const rowsError = ref('');
const selectedRows = ref([]);

const runInProgress = ref(false);
const runError = ref('');
const runResult = ref(null);

const logs = ref(null);
const logsError = ref('');
const logLoadState = ref({ stdout: false, stderr: false });

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
  const data = getDataForPreview();
  if (!data.ok) return data.errorMessage;
  return buildCronPreview(data.data);
});

function genId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function detectType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  return 'object';
}

function objectToRows(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  return Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => {
      const value = obj[key];
      const type = detectType(value);
      const row = {
        id: genId(),
        key,
        type,
        value: null,
        jsonText: '',
        error: '',
      };

      if (type === 'object' || type === 'array') {
        row.value = value;
        row.jsonText = JSON.stringify(value, null, 2);
      } else {
        row.value = type === 'number' ? String(value) : value;
      }
      return row;
    });
}

function normalizeRowValueForType(row) {
  row.error = '';
  if (row.type === 'string') {
    row.value = row.value ?? '';
  } else if (row.type === 'number') {
    row.value = row.value === undefined || row.value === null ? '' : String(row.value);
  } else if (row.type === 'boolean') {
    row.value = row.value === true;
  } else if (row.type === 'null') {
    row.value = null;
  } else if (row.type === 'object') {
    const base = row.value && typeof row.value === 'object' && !Array.isArray(row.value) ? row.value : {};
    row.value = base;
    row.jsonText = JSON.stringify(base, null, 2);
  } else if (row.type === 'array') {
    const base = Array.isArray(row.value) ? row.value : [];
    row.value = base;
    row.jsonText = JSON.stringify(base, null, 2);
  }
}

function parseJsonTextForRow(row) {
  row.error = '';
  try {
    const parsed = row.jsonText ? JSON.parse(row.jsonText) : row.type === 'array' ? [] : {};
    if (row.type === 'array' && !Array.isArray(parsed)) {
      row.error = 'array型なので、JSON配列（[]）を入力してください';
      return;
    }
    if (row.type === 'object' && (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object')) {
      row.error = 'object型なので、JSONオブジェクト（{}）を入力してください';
      return;
    }
    row.value = parsed;
  } catch (e) {
    row.error = 'JSONの形式が不正です';
  }
}

function buildObjectFromRows({ strict } = { strict: true }) {
  rowsError.value = '';
  let hasError = false;
  const obj = {};
  const seen = new Set();

  for (const row of selectedRows.value) {
    row.error = row.error || '';
    const key = String(row.key || '').trim();
    if (!key) {
      row.error = row.error || 'キーが空です';
      hasError = true;
      continue;
    }
    if (seen.has(key)) {
      row.error = row.error || 'キーが重複しています';
      hasError = true;
      continue;
    }
    seen.add(key);

    if (row.type === 'string') {
      obj[key] = row.value ?? '';
    } else if (row.type === 'number') {
      const n = Number(row.value);
      if (Number.isNaN(n)) {
        row.error = row.error || 'number型なので数値を入力してください';
        hasError = true;
        continue;
      }
      obj[key] = n;
    } else if (row.type === 'boolean') {
      obj[key] = row.value === true;
    } else if (row.type === 'null') {
      obj[key] = null;
    } else if (row.type === 'object' || row.type === 'array') {
      if (row.error) {
        hasError = true;
        continue;
      }
      obj[key] = row.value;
    }
  }

  if (hasError && strict) {
    rowsError.value = '入力にエラーがあります（赤字の行を修正してください）';
    return { ok: false, errorMessage: rowsError.value, data: null };
  }

  return { ok: true, data: obj, errorMessage: '' };
}

function getDataForPreview() {
  if (rawMode.value) {
    if (!selectedJson.value) return { ok: true, data: {}, errorMessage: '' };
    try {
      return { ok: true, data: JSON.parse(selectedJson.value), errorMessage: '' };
    } catch {
      return { ok: false, data: null, errorMessage: '（JSONが不正なため crontab表示できません）' };
    }
  }

  const built = buildObjectFromRows({ strict: false });
  if (!built.ok) return { ok: false, data: null, errorMessage: '（入力が不正なため crontab表示できません）' };
  return built;
}

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
  rowsError.value = '';
  rawMode.value = false;
  logs.value = null;
  logsError.value = '';
  runInProgress.value = false;
  runError.value = '';
  runResult.value = null;
  try {
    const r = await $fetch(`/api/jobs/${encodeURIComponent(name)}`);
    selectedPath.value = r.path;
    selectedJson.value = JSON.stringify(r.data, null, 2);
    selectedRows.value = objectToRows(r.data);
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

async function loadOlder(stream, el) {
  if (!selectedName.value) return;
  if (logLoadState.value[stream]) return;
  const cur = logs.value?.[stream];
  if (!cur?.hasMore) return;

  logLoadState.value = { ...logLoadState.value, [stream]: true };
  try {
    const oldScrollHeight = el.scrollHeight;
    const before = cur.from;
    const r = await $fetch(`/api/logs/${encodeURIComponent(selectedName.value)}`, {
      query: { stream, before, lines: 200 },
    });
    const older = r?.[stream];
    if (!older?.content) {
      // no more content
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
    logsError.value = e?.data?.message || e?.message || 'ログ取得に失敗しました';
  } finally {
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

async function saveSelected() {
  if (!selectedName.value) return;
  detailError.value = '';
  try {
    let data;
    if (rawMode.value) {
      data = JSON.parse(selectedJson.value || '{}');
      selectedRows.value = objectToRows(data);
    } else {
      const built = buildObjectFromRows({ strict: true });
      if (!built.ok) throw new Error(built.errorMessage || '入力にエラーがあります');
      data = built.data;
      selectedJson.value = JSON.stringify(data, null, 2);
    }
    await $fetch(`/api/jobs/${encodeURIComponent(selectedName.value)}`, {
      method: 'PUT',
      body: { data },
    });

    // 使い勝手のため、保存後に launchctl をリロードする
    // unload は未ロード等で失敗することがあるため best-effort で続行
    await $fetch('/api/launchctl/unload', {
      method: 'POST',
      body: { name: selectedName.value },
    }).catch(() => null);

    const loadResult = await $fetch('/api/launchctl/load', {
      method: 'POST',
      body: { name: selectedName.value },
    }).catch((e) => e);

    if (!loadResult?.ok) {
      detailError.value = `保存は成功しましたが、launchctl load に失敗しました: ${loadResult?.error || loadResult?.data?.message || loadResult?.message || ''}`;
    }

    await refreshJobs();
  } catch (e) {
    detailError.value = e?.message || '保存に失敗しました（JSONを確認してください）';
  }
}

function addPropertyRow() {
  selectedRows.value.push({
    id: genId(),
    key: '',
    type: 'string',
    value: '',
    jsonText: '',
    error: '',
  });
}

function removePropertyRow(id) {
  selectedRows.value = selectedRows.value.filter((r) => r.id !== id);
}

function onRowTypeChange(row) {
  normalizeRowValueForType(row);
}

function onRowJsonTextInput(row) {
  parseJsonTextForRow(row);
}

function toggleRawMode() {
  detailError.value = '';
  rowsError.value = '';

  if (!rawMode.value) {
    const built = buildObjectFromRows({ strict: true });
    if (!built.ok) {
      detailError.value = built.errorMessage || '入力にエラーがあります';
      return;
    }
    selectedJson.value = JSON.stringify(built.data, null, 2);
    rawMode.value = true;
  } else {
    try {
      const data = JSON.parse(selectedJson.value || '{}');
      selectedRows.value = objectToRows(data);
      rawMode.value = false;
    } catch {
      detailError.value = 'Raw JSONが不正です（修正してからフォーム編集へ戻してください）';
    }
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
      selectedRows.value = [];
      rawMode.value = false;
      rowsError.value = '';
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
.input { width: 100%; padding: 8px; box-sizing: border-box; }
.pre { margin: 0; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; white-space: pre-wrap; }
.logPre { height: 240px; overflow: auto; white-space: pre; }
.logBlock { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; background: white; }
.logHeader { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; margin-bottom: 6px; }
.error { color: #b91c1c; }
.muted { color: #475569; }
button { padding: 8px 10px; font-size: 14px; }
button.danger { background: #fee2e2; }
button.secondary { background: #e2e8f0; }
.tableEdit td { vertical-align: top; }
</style>
