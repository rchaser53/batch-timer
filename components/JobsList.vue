<template>
  <section class="card">
    <h2>ジョブ一覧</h2>
    <p v-if="listError" class="error">{{ listError }}</p>
    <p v-if="actionError" class="error">{{ actionError }}</p>
    <table class="table">
      <thead>
        <tr>
          <th>ファイル名</th>
          <th>状態</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="j in jobs" :key="j.name">
          <td class="mono">{{ j.name }}</td>
          <td>
            <span v-if="stateLoading && !jobStates[j.name]" class="muted">確認中…</span>
            <span v-else-if="!jobStates[j.name]" class="muted">—</span>
            <span v-else-if="!jobStates[j.name].isLoaded" class="muted">未ロード</span>
            <span v-else-if="jobStates[j.name].matches" class="muted">ロード済み / 一致</span>
            <span v-else class="error">ロード済み / 不一致</span>
          </td>
          <td>
            <div class="actions">
              <button @click="$emit('open', j.name)">開く</button>
              <button
                v-if="jobStates[j.name]?.isLoaded && !jobStates[j.name]?.matches"
                class="secondary"
                :disabled="saveInProgressName === j.name"
                @click="$emit('save', j.name)"
              >
                {{ saveInProgressName === j.name ? '保存中…' : '保存して一致' }}
              </button>
              <button class="secondary" @click="$emit('rename', j.name)">名前変更</button>
              <button class="danger" @click="$emit('delete', j.name)">削除</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="actions" style="margin-top: 8px;">
      <button @click="$emit('refresh')">更新</button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  jobs: { type: Array, required: true },
  listError: { type: String, default: '' },
  actionError: { type: String, default: '' },
  jobStates: { type: Object, default: () => ({}) },
  stateLoading: { type: Boolean, default: false },
  saveInProgressName: { type: String, default: '' },
});

defineEmits(['refresh', 'open', 'save', 'rename', 'delete']);
</script>
