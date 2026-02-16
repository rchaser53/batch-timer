<template>
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
              <button @click="$emit('open', j.name)">開く</button>
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
});

defineEmits(['refresh', 'open', 'delete']);
</script>
