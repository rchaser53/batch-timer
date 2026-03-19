<template>
  <div class="wrap">
    <header class="header">
      <h1>
        <a href="/" class="titleLink" @click.prevent="goToList">Batch Timer GUI (Nuxt)</a>
      </h1>
      <div class="sub">Workspace: .（このフォルダ直下の .plist のみ対象）</div>
    </header>

    <main class="main single">
      <section class="card">
        <h2>詳細 / 編集</h2>
        <div>
          <div class="actions" style="margin-bottom: 12px;">
            <button @click="goToList" class="secondary">← 一覧に戻る</button>
          </div>

          <CatchupEditor
            v-model:enabled="catchupEnabled"
            v-model:afterHour="catchupAfterHour"
            v-model:afterMinute="catchupAfterMinute"
            :hasLogPaths="catchupHasLogPaths"
            :checkerExists="catchupCheckerExists"
            :checkerName="CATCHUP_CHECKER_NAME"
            @open-checker="openCatchupChecker"
            @load-checker="loadCatchupChecker"
            @unload-checker="unloadCatchupChecker"
          />

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

            <div>launchctl</div>
            <div>
              <div v-if="loadStateError" class="error">{{ loadStateError }}</div>
              <div v-else-if="loadStateInProgress" class="muted">確認中…</div>
              <div v-else-if="!loadState" class="muted">—</div>
              <div v-else-if="!loadState.isLoaded" class="muted">未ロード</div>
              <div v-else-if="loadState.matches" class="muted">ロード済み / 一致</div>
              <div v-else class="error">
                ロード済み / 不一致（{{ (loadState.diffs || []).join(', ') }}）
                <span
                  v-if="loadState.effective?.plistPath && loadState.workspace?.plistPath && loadState.effective.plistPath !== loadState.workspace.plistPath"
                  class="mono"
                >
                  / launchctl: {{ loadState.effective.plistPath }}
                </span>
              </div>
            </div>
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
                @refresh="refreshLogsAndState"
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
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { buildCronPreview } from '../../utils/cronPreview.js';
import { applyReminderVarsToData, extractReminderVars } from '../../composables/useReminderVars.js';
import { applyCatchupVarsToData, extractCatchupVars } from '../../composables/useCatchupVars.js';

const route = useRoute();

const jobs = ref([]);
const selectedName = ref('');
const selectedPath = ref('');
const selectedJson = ref('');
const detailError = ref('');

const loadState = ref(null);
const loadStateError = ref('');
const loadStateInProgress = ref(false);

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

const catchupEnabled = ref(false);
const catchupAfterHour = ref('');
const catchupAfterMinute = ref('');

const CATCHUP_CHECKER_NAME = 'com.user.batch-timer.catchup.hourly.plist';
const catchupCheckerExists = computed(() => jobs.value?.some?.((j) => j?.name === CATCHUP_CHECKER_NAME) ?? false);
const catchupHasLogPaths = computed(() => {
  const data = getDataForPreview();
  if (!data.ok) return true;
  const v = data.data;
  return Boolean(v?.StandardOutPath || v?.StandardErrorPath);
});

const cronPreview = computed(() => {
  const data = getDataForPreview();
  if (!data.ok) return data.errorMessage;
  return buildCronPreview(data.data);
});

function getRouteNameParam() {
  const value = route.params.name;
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function resetSelectionState() {
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
  loadState.value = null;
  loadStateError.value = '';
  loadStateInProgress.value = false;
  notifyTitle.value = 'Batch Timer';
  notifyMessage.value = '';
  notifySound.value = 'default';
  notifyMode.value = 'alert';
  notifyTemplatePath.value = '';
  notifyTemplateHtml.value = '';
  notifyInProgress.value = false;
  notifyError.value = '';
  catchupEnabled.value = false;
  catchupAfterHour.value = '';
  catchupAfterMinute.value = '';
}

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
    jobs.value = await $fetch('/api/jobs');
  } catch {
    jobs.value = [];
  }
}

async function openDetail(name) {
  selectedName.value = name;
  resetSelectionState();
  detailError.value = '';
  try {
    const r = await $fetch(`/api/jobs/${encodeURIComponent(name)}`);
    selectedPath.value = r.path;
    selectedJson.value = JSON.stringify(r.data, null, 2);
    selectedRows.value = objectToRows(r.data);

    const reminderVars = extractReminderVars(r.data);
    notifyTitle.value = reminderVars.title;
    notifyMessage.value = reminderVars.message;
    notifySound.value = reminderVars.sound;
    notifyMode.value = reminderVars.mode;
    notifyTemplatePath.value = reminderVars.templatePath;
    notifyTemplateHtml.value = reminderVars.templateHtml;

    const catchupVars = extractCatchupVars(r.data);
    catchupEnabled.value = catchupVars.enabled;
    catchupAfterHour.value = catchupVars.afterHour;
    catchupAfterMinute.value = catchupVars.afterMinute;

    await refreshLogs();
    await refreshLoadState();
  } catch (e) {
    detailError.value = e?.data?.message || e?.message || '取得に失敗しました';
  }
}

function goToList() {
  navigateTo('/');
  if (typeof window !== 'undefined') window.scrollTo(0, 0);
}

async function refreshLoadState() {
  if (!selectedName.value) return;
  loadStateError.value = '';
  loadStateInProgress.value = true;
  try {
    loadState.value = await $fetch(`/api/jobs/${encodeURIComponent(selectedName.value)}/state`);
  } catch (e) {
    loadState.value = null;
    loadStateError.value = e?.data?.message || e?.message || 'launchctl状態の取得に失敗しました';
  } finally {
    loadStateInProgress.value = false;
  }
}

async function refreshLogsAndState() {
  await refreshLogs();
  await refreshLoadState();
}

async function persistJobData(name, data) {
  await $fetch(`/api/jobs/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: { data },
  });

  await $fetch('/api/launchctl/unload', {
    method: 'POST',
    body: { name },
  }).catch(() => null);

  const loadResult = await $fetch('/api/launchctl/load', {
    method: 'POST',
    body: { name },
  }).catch((e) => e);

  await refreshJobs();

  if (selectedName.value === name) {
    await refreshLogs();
    await refreshLoadState();
  }

  if (!loadResult?.ok) {
    return `保存は成功しましたが、launchctl load に失敗しました: ${loadResult?.error || loadResult?.data?.message || loadResult?.message || ''}`;
  }

  return '';
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

      data = applyCatchupVarsToData(data, {
        enabled: catchupEnabled.value,
        afterHour: catchupAfterHour.value,
        afterMinute: catchupAfterMinute.value,
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

      data = applyCatchupVarsToData(data, {
        enabled: catchupEnabled.value,
        afterHour: catchupAfterHour.value,
        afterMinute: catchupAfterMinute.value,
      });

      selectedJson.value = JSON.stringify(data, null, 2);
      selectedRows.value = objectToRows(data);
    }
    const saveError = await persistJobData(selectedName.value, data);
    if (saveError) detailError.value = saveError;
  } catch (e) {
    detailError.value = e?.message || '保存に失敗しました（JSONを確認してください）';
  }
}

function addPropertyRow() {
  selectedRows.value.push(makeBlankRow());
}

function removePropertyRow(id) {
  selectedRows.value = selectedRows.value.filter((row) => row.id !== id);
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
    return;
  }

  try {
    const data = JSON.parse(selectedJson.value || '{}');
    selectedRows.value = objectToRows(data);
    rawMode.value = false;
  } catch {
    detailError.value = 'Raw JSONが不正です（修正してからフォーム編集へ戻してください）';
  }
}

async function renameAndOpen(oldName, newName) {
  await $fetch(`/api/jobs/${encodeURIComponent(oldName)}/rename`, {
    method: 'POST',
    body: { newName },
  });
  await refreshJobs();
  await navigateTo(`/jobs/${encodeURIComponent(newName)}`);
}

async function launchctlLoad() {
  if (!selectedName.value) return;
  const result = await $fetch('/api/launchctl/load', { method: 'POST', body: { name: selectedName.value } }).catch((e) => e);
  if (result?.ok) alert('loadしました');
  else alert(`失敗: ${result?.error || result?.data?.message || result?.message || ''}`);
  await refreshLoadState();
  await refreshLogs();
}

async function launchctlUnload() {
  if (!selectedName.value) return;
  const result = await $fetch('/api/launchctl/unload', { method: 'POST', body: { name: selectedName.value } }).catch((e) => e);
  if (result?.ok) alert('unloadしました');
  else alert(`失敗: ${result?.error || result?.data?.message || result?.message || ''}`);
  await refreshLoadState();
  await refreshLogs();
}

async function launchctlLoadName(name) {
  const result = await $fetch('/api/launchctl/load', { method: 'POST', body: { name } }).catch((e) => e);
  if (result?.ok) alert('loadしました');
  else alert(`失敗: ${result?.error || result?.data?.message || result?.message || ''}`);
}

async function launchctlUnloadName(name) {
  const result = await $fetch('/api/launchctl/unload', { method: 'POST', body: { name } }).catch((e) => e);
  if (result?.ok) alert('unloadしました');
  else alert(`失敗: ${result?.error || result?.data?.message || result?.message || ''}`);
}

async function openCatchupChecker() {
  if (!catchupCheckerExists.value) return;
  await navigateTo(`/jobs/${encodeURIComponent(CATCHUP_CHECKER_NAME)}`);
}

async function loadCatchupChecker() {
  if (!catchupCheckerExists.value) return;
  await launchctlLoadName(CATCHUP_CHECKER_NAME);
}

async function unloadCatchupChecker() {
  if (!catchupCheckerExists.value) return;
  await launchctlUnloadName(CATCHUP_CHECKER_NAME);
}

async function runNow() {
  if (!selectedName.value) return;
  runInProgress.value = true;
  runError.value = '';
  runResult.value = null;
  try {
    runResult.value = await $fetch(`/api/jobs/${encodeURIComponent(selectedName.value)}/run`, { method: 'POST' });
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

watch(
  () => route.params.name,
  async () => {
    const name = getRouteNameParam();
    if (!name) {
      goToList();
      return;
    }
    await openDetail(name);
  },
  { immediate: true }
);

onMounted(refreshJobs);
</script>