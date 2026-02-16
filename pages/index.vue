<template>
  <div class="wrap">
    <header class="header">
      <h1>
        <a href="/" class="titleLink" @click.prevent="onTitleClick">Batch Timer GUI (Nuxt)</a>
      </h1>
      <div class="sub">Workspace: .（このフォルダ直下の .plist のみ対象）</div>
    </header>

    <main class="main">
      <JobsList :jobs="jobs" :listError="listError" @refresh="refreshJobs" @open="openDetail" @delete="deleteJob" />

      <section class="card">
        <h2>詳細 / 編集</h2>
        <div v-if="!selectedName" class="muted">ジョブを選択してください。</div>
        <div v-else>
          <div class="actions" style="margin-bottom: 12px;">
            <button @click="clearSelection" class="secondary">← 一覧に戻る</button>
          </div>

          <ReminderEditor
            v-model:title="notifyTitle"
            v-model:message="notifyMessage"
            v-model:sound="notifySound"
            v-model:mode="notifyMode"
            v-model:templatePath="notifyTemplatePath"
            v-model:templateHtml="notifyTemplateHtml"
            :inProgress="notifyInProgress"
            :error="notifyError"
            @send="sendNotify"
          />

          <div class="grid">
            <div>ファイル</div>
            <div class="mono">{{ selectedPath }}</div>
            <div>crontab表示</div>
            <div>
              <pre class="mono pre">{{ cronPreview }}</pre>
            </div>
            <div>ログ</div>
            <div>
              <LogsViewer
                :selectedName="selectedName"
                :logs="logs"
                :logsError="logsError"
                :logLoadState="logLoadState"
                @refresh="refreshLogs"
                @log-scroll="onLogScroll"
              />
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
                <PropertyRowsTable :rows="selectedRows" :rowsError="rowsError" @remove="removePropertyRow" />
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

      <NewJobForm @created="refreshJobs" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { buildCronPreview } from '../utils/cronPreview.js';
import { applyReminderVarsToData, extractReminderVars } from '../composables/useReminderVars.js';

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

const { makeBlankRow, objectToRows, buildObjectFromRowsRef } = usePropertyRows();
const { logs, logsError, logLoadState, refreshLogs, onLogScroll, resetLogsState } = useJobLogs(selectedName);

const notifyTitle = ref('Batch Timer');
const notifyMessage = ref('');
const notifySound = ref('default');
const notifyMode = ref('alert');
const notifyTemplatePath = ref('');
const notifyTemplateHtml = ref('');
const notifyInProgress = ref(false);
const notifyError = ref('');

const cronPreview = computed(() => {
  const data = getDataForPreview();
  if (!data.ok) return data.errorMessage;
  return buildCronPreview(data.data);
});
function buildObjectFromRows({ strict } = { strict: true }) {
  return buildObjectFromRowsRef(selectedRows, rowsError, { strict, skipBlankRows: false });
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
  resetLogsState();
  runInProgress.value = false;
  runError.value = '';
  runResult.value = null;
  notifyError.value = '';
  try {
    const r = await $fetch(`/api/jobs/${encodeURIComponent(name)}`);
    selectedPath.value = r.path;
    selectedJson.value = JSON.stringify(r.data, null, 2);
    selectedRows.value = objectToRows(r.data);

    const v = extractReminderVars(r.data);
    notifyTitle.value = v.title;
    notifyMessage.value = v.message;
    notifySound.value = v.sound;
    notifyMode.value = v.mode;
    notifyTemplatePath.value = v.templatePath;
    notifyTemplateHtml.value = v.templateHtml;

    await refreshLogs();
  } catch (e) {
    detailError.value = e?.data?.message || e?.message || '取得に失敗しました';
  }
}

function clearSelection() {
  selectedName.value = '';
  selectedPath.value = '';
  selectedJson.value = '';
  selectedRows.value = [];
  detailError.value = '';
  rowsError.value = '';
  rawMode.value = false;
  resetLogsState();
  runInProgress.value = false;
  runError.value = '';
  runResult.value = null;

  notifyTitle.value = 'Batch Timer';
  notifyMessage.value = '';
  notifySound.value = 'default';
  notifyMode.value = 'alert';
  notifyTemplatePath.value = '';
  notifyTemplateHtml.value = '';
  notifyInProgress.value = false;
  notifyError.value = '';
}

function onTitleClick() {
  clearSelection();
  if (typeof window !== 'undefined') window.scrollTo(0, 0);
}

async function saveSelected() {
  if (!selectedName.value) return;
  detailError.value = '';
  try {
    let data;
    if (rawMode.value) {
      data = JSON.parse(selectedJson.value || '{}');
      data = applyReminderVarsToData(data, {
        title: notifyTitle.value || 'Batch Timer',
        message: notifyMessage.value ?? '',
        sound: notifySound.value || 'default',
        mode: notifyMode.value === 'web' ? 'web' : 'alert',
        templatePath: notifyTemplatePath.value || '',
        templateHtml: notifyTemplateHtml.value || '',
      });
      selectedJson.value = JSON.stringify(data, null, 2);
      selectedRows.value = objectToRows(data);
    } else {
      const built = buildObjectFromRows({ strict: true });
      if (!built.ok) throw new Error(built.errorMessage || '入力にエラーがあります');
      data = built.data;
      data = applyReminderVarsToData(data, {
        title: notifyTitle.value || 'Batch Timer',
        message: notifyMessage.value ?? '',
        sound: notifySound.value || 'default',
        mode: notifyMode.value === 'web' ? 'web' : 'alert',
        templatePath: notifyTemplatePath.value || '',
        templateHtml: notifyTemplateHtml.value || '',
      });
      selectedJson.value = JSON.stringify(data, null, 2);
      selectedRows.value = objectToRows(data);
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
  selectedRows.value.push(makeBlankRow());
}

function removePropertyRow(id) {
  selectedRows.value = selectedRows.value.filter((r) => r.id !== id);
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

async function sendNotify() {
  notifyInProgress.value = true;
  notifyError.value = '';
  try {
    await $fetch('/api/notify', {
      method: 'POST',
      body: {
        title: notifyTitle.value || 'Batch Timer',
        message: notifyMessage.value ?? '',
        sound: notifySound.value || 'default',
        mode: notifyMode.value === 'web' ? 'web' : 'alert',
        templatePath: notifyTemplatePath.value || '',
        templateHtml: notifyTemplateHtml.value || '',
      },
    });
  } catch (e) {
    notifyError.value = e?.data?.message || e?.message || '通知の送信に失敗しました';
  } finally {
    notifyInProgress.value = false;
  }
}

onMounted(refreshJobs);
</script>

<style>
.wrap { font-family: system-ui, -apple-system, sans-serif; }
.header { padding: 12px 16px; background: #0f172a; color: white; }
.titleLink { color: inherit; text-decoration: none; cursor: pointer; }
.titleLink:hover { text-decoration: none; }
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
