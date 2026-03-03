<template>
  <div class="card" style="margin-bottom: 12px;">
    <h3 style="margin: 0 0 8px;">当日未実行なら実行（Catchup）</h3>

    <div class="grid" style="grid-template-columns: 160px 1fr;">
      <div>有効化</div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <label style="display: inline-flex; align-items: center; gap: 8px;">
          <input type="checkbox" v-model="enabled" />
          <span class="mono">BATCH_TIMER_CATCHUP</span>
        </label>
        <span class="muted">（opt-in。ONにしたジョブのみ対象）</span>
      </div>

      <template v-if="enabled">
        <div>開始時刻</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input v-model.trim="afterHour" class="mono input" style="max-width: 90px;" inputmode="numeric" placeholder="20" />
          <span class="muted">時</span>
          <input v-model.trim="afterMinute" class="mono input" style="max-width: 90px;" inputmode="numeric" placeholder="0" />
          <span class="muted">分 以降にのみ実行（空なら 0:00）</span>
        </div>

        <div>前提</div>
        <div>
          <div v-if="!hasLogPaths" class="error">
            このジョブは StandardOutPath / StandardErrorPath が未設定です。実行済み判定ができないため、Catchup はスキップされます。
          </div>
          <div v-else class="muted">実行済み判定は StandardOutPath / StandardErrorPath の更新日（mtime）を使います。</div>
        </div>

        <div>毎時チェッカー</div>
        <div>
          <div v-if="checkerExists" class="actions" style="justify-content: flex-start;">
            <button class="secondary" @click="$emit('open-checker')">開く</button>
            <button @click="$emit('load-checker')">load</button>
            <button @click="$emit('unload-checker')" class="secondary">unload</button>
            <div class="muted" style="align-self: center;">{{ checkerName }}</div>
          </div>
          <div v-else class="muted">{{ checkerName }} が見つかりません（Workspace直下に置いてください）</div>
        </div>
      </template>
    </div>

    <div v-if="enabled" class="muted" style="margin-top: 8px;">
      ヒント: Catchupを動かすには、毎時チェッカーを load しておく必要があります。
    </div>
  </div>
</template>

<script setup>
const enabled = defineModel('enabled', { type: Boolean, default: false });
const afterHour = defineModel('afterHour', { type: String, default: '' });
const afterMinute = defineModel('afterMinute', { type: String, default: '' });

defineProps({
  hasLogPaths: { type: Boolean, default: true },
  checkerExists: { type: Boolean, default: false },
  checkerName: { type: String, default: 'com.user.batch-timer.catchup.hourly.plist' },
});

defineEmits(['open-checker', 'load-checker', 'unload-checker']);
</script>
