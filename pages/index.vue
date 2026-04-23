<template>
  <div class="wrap">
    <header class="header">
      <h1>
        <a href="/" class="titleLink" @click.prevent="onTitleClick">Batch Timer GUI (Nuxt)</a>
      </h1>
      <div class="sub">Workspace: .（このフォルダ直下の .plist のみ対象）</div>
    </header>

    <main class="main">
      <JobsList
        :jobs="jobs"
        :listError="listError"
        :actionError="listActionError"
        :jobStates="jobStates"
        :stateLoading="listStateLoading"
        :saveInProgressName="listSaveInProgressName"
        @refresh="refreshJobs"
        @open="openDetail"
        @save="saveJobFromList"
        @rename="renameJob"
        @delete="deleteJob"
      />

      <NewJobForm @created="refreshJobs" />
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { getRequestErrorMessage, saveJobDataAndReload } from '../composables/useJobActions.js';

const jobs = ref([]);
const listError = ref('');
const listActionError = ref('');
const jobStates = ref({});
const listStateLoading = ref(false);
const listSaveInProgressName = ref('');
const refreshRequestVersion = ref(0);

async function refreshJobs() {
  const requestVersion = ++refreshRequestVersion.value;
  listActionError.value = '';
  try {
    const data = await $fetch('/api/jobs');
    if (requestVersion !== refreshRequestVersion.value) return;
    jobs.value = data;
    listError.value = '';

    listStateLoading.value = true;
    const settled = await Promise.allSettled(
      (data || []).map(async (job) => {
        const name = job?.name;
        if (!name) return null;
        const state = await $fetch(`/api/jobs/${encodeURIComponent(name)}/state`);
        return { name, state };
      })
    );
    if (requestVersion !== refreshRequestVersion.value) return;

    const nextStates = {};
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      const item = result.value;
      if (!item?.name || !item?.state) continue;
      nextStates[item.name] = item.state;
    }
    jobStates.value = nextStates;
  } catch (e) {
    if (requestVersion !== refreshRequestVersion.value) return;
    listError.value = e?.data?.message || e?.message || '一覧取得に失敗しました';
    jobStates.value = {};
  } finally {
    if (requestVersion !== refreshRequestVersion.value) return;
    listStateLoading.value = false;
  }
}

function onTitleClick() {
  navigateTo('/');
  if (typeof window !== 'undefined') window.scrollTo(0, 0);
}

async function saveJobFromList(name) {
  if (!name || listSaveInProgressName.value) return;
  listActionError.value = '';
  listSaveInProgressName.value = name;
  try {
    const job = await $fetch(`/api/jobs/${encodeURIComponent(name)}`);
    const saveError = await saveJobDataAndReload(name, job.data, {
      refreshJobs,
    });
    if (saveError) {
      listActionError.value = `${name}: ${saveError}`;
    }
  } catch (e) {
    listActionError.value = getRequestErrorMessage(e, '一覧からの保存に失敗しました');
  } finally {
    listSaveInProgressName.value = '';
  }
}

function openDetail(name) {
  navigateTo(`/jobs/${encodeURIComponent(name)}`);
}

async function deleteJob(name) {
  if (!confirm(`${name} を削除しますか？`)) return;
  try {
    await $fetch(`/api/jobs/${encodeURIComponent(name)}`, { method: 'DELETE' });
    await refreshJobs();
  } catch (e) {
    alert(getRequestErrorMessage(e, '削除に失敗しました'));
  }
}

async function renameJob(oldName) {
  const newName = prompt('新しいplistファイル名（.plist を含む）', oldName);
  if (!newName || typeof newName !== 'string') return;

  const trimmed = newName.trim();
  if (!trimmed) return;

  try {
    await $fetch(`/api/jobs/${encodeURIComponent(oldName)}/rename`, {
      method: 'POST',
      body: { newName: trimmed },
    });

    await refreshJobs();
  } catch (e) {
    alert(getRequestErrorMessage(e, '名前変更に失敗しました'));
  }
}

onMounted(refreshJobs);
</script>
