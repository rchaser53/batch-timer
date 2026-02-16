<template>
  <section class="card" style="grid-column: 1 / -1;">
    <h2>新規ジョブ作成</h2>
    <div class="grid">
      <label>ファイル名（.plist）</label>
      <input v-model.trim="createName" placeholder="com.example.job.plist" />

      <label>内容（プロパティ）</label>
      <div>
        <div class="actions" style="margin-bottom: 8px;">
          <button @click="addCreatePropertyRow">プロパティ追加</button>
        </div>

        <PropertyRowsTable :rows="createRows" :rowsError="createRowsError" />
      </div>
    </div>

    <div class="actions" style="margin-top: 8px;">
      <button @click="createJob" :disabled="!canCreateJob">作成</button>
    </div>
    <p v-if="createError" class="error">{{ createError }}</p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';

const emit = defineEmits(['created']);

const { makeBlankRow, buildObjectFromRowsRef } = usePropertyRows();

function makeDefaultCreateRows() {
  return [
    { id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, key: 'Label', type: 'string', value: '', jsonText: '', error: '' },
    { id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, key: 'ProgramArguments', type: 'array', value: [], jsonText: '[]', error: '' },
  ];
}

const createName = ref('');
const createError = ref('');
const createRowsError = ref('');
const createRows = ref(makeDefaultCreateRows());

function isBlankRow(row) {
  const key = String(row?.key || '').trim();
  if (key) return false;
  if (row?.type === 'object' || row?.type === 'array') return false;
  if (row?.type === 'null') return true;
  if (row?.type === 'boolean') return true;
  const v = row?.value;
  return v === '' || v === null || v === undefined;
}

const canCreateJob = computed(() => {
  const name = String(createName.value || '').trim();
  if (!name) return false;
  if (!name.endsWith('.plist')) return false;

  const built = buildObjectFromRowsRef(createRows, { value: '' }, { strict: false, skipBlankRows: true });
  const data = built?.data || {};
  const labelOk = typeof data.Label === 'string' && data.Label.trim().length > 0;
  const programOk = typeof data.Program === 'string' && data.Program.trim().length > 0;
  const programArgsOk = Array.isArray(data.ProgramArguments) && data.ProgramArguments.length > 0;

  return labelOk && (programOk || programArgsOk);
});

function addCreatePropertyRow() {
  createRows.value.push(makeBlankRow());
}

async function createJob() {
  createError.value = '';
  createRowsError.value = '';
  try {
    if (!createName.value) throw new Error('ファイル名を入力してください');
    const built = buildObjectFromRowsRef(createRows, createRowsError, { strict: true, skipBlankRows: true });
    if (!built.ok) throw new Error(built.errorMessage || '入力にエラーがあります');
    const data = built.data;

    const { $fetch } = useNuxtApp();
    await $fetch('/api/jobs', {
      method: 'POST',
      body: { name: createName.value, data },
    });

    createName.value = '';
    createRows.value = makeDefaultCreateRows();
    emit('created');
  } catch (e) {
    createError.value = e?.data?.message || e?.message || '作成に失敗しました';
  }
}
</script>
