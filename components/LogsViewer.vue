<template>
  <div>
    <div class="actions" style="margin-bottom: 8px;">
      <button @click="$emit('refresh')" :disabled="!selectedName">ログ更新</button>
    </div>
    <p v-if="logsError" class="error">{{ logsError }}</p>

    <div v-if="logs?.stdout" class="logBlock">
      <div class="logHeader">
        <div class="mono">stdout: {{ logs.stdout.path }}</div>
        <div class="muted">
          {{ logs.stdout.exists ? '' : '（未作成）' }}
          {{ logs.stdout.hasMore ? '（上にスクロールで過去を追加表示）' : '' }}
          {{ logLoadState?.stdout ? '（読込中…）' : '' }}
        </div>
      </div>
      <pre class="mono pre logPre" @scroll.passive="$emit('log-scroll', 'stdout', $event)">{{ logs.stdout.content || '（空）' }}</pre>
    </div>

    <div v-if="logs?.stderr" class="logBlock" style="margin-top: 8px;">
      <div class="logHeader">
        <div class="mono">stderr: {{ logs.stderr.path }}</div>
        <div class="muted">
          {{ logs.stderr.exists ? '' : '（未作成）' }}
          {{ logs.stderr.hasMore ? '（上にスクロールで過去を追加表示）' : '' }}
          {{ logLoadState?.stderr ? '（読込中…）' : '' }}
        </div>
      </div>
      <pre class="mono pre logPre" @scroll.passive="$emit('log-scroll', 'stderr', $event)">{{ logs.stderr.content || '（空）' }}</pre>
    </div>

    <div v-if="logs?.note" class="muted">{{ logs.note }}</div>
  </div>
</template>

<script setup>
defineProps({
  selectedName: { type: String, default: '' },
  logs: { type: Object, default: null },
  logsError: { type: String, default: '' },
  logLoadState: { type: Object, default: () => ({ stdout: false, stderr: false }) },
});

defineEmits(['refresh', 'log-scroll']);
</script>
