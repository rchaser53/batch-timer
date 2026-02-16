<template>
  <div class="card" style="margin-bottom: 12px;">
    <h3 style="margin: 0 0 8px;">通知メッセージ（REMINDER_*）</h3>
    <div class="grid" style="grid-template-columns: 160px 1fr;">
      <div>モード</div>
      <select v-model="mode" class="mono input">
        <option value="alert">alert（ダイアログ）</option>
        <option value="web">web（HTMLをブラウザで開く）</option>
      </select>

      <div>タイトル</div>
      <input v-model.trim="title" class="mono input" placeholder="例: Batch Timer" />

      <div>メッセージ</div>
      <textarea
        v-model="message"
        rows="3"
        class="mono textarea"
        placeholder="例: 20:00 のリマインダです\n2行目も書けます"
      />

      <div>サウンド</div>
      <input v-model.trim="sound" class="mono input" placeholder="default" />

      <template v-if="mode === 'web'">
        <div>テンプレ（パス）</div>
        <input
          v-model.trim="templatePath"
          class="mono input"
          placeholder="例: /Users/<you>/batch-timer/templates/notify.html"
        />

        <div>テンプレ（HTML）</div>
        <textarea
          v-model="templateHtml"
          rows="6"
          class="mono textarea"
          placeholder="REMINDER_TEMPLATE_HTML（HTML文字列）。空ならテンプレパス（REMINDER_TEMPLATE_PATH）や既定テンプレを使います"
        />
      </template>
    </div>

    <div v-if="mode === 'web'" class="muted" style="margin-top: 8px;">
      ヒント: HTML文字列（REMINDER_TEMPLATE_HTML）が最優先です。launchd 経由でファイルを参照する場合は、テンプレパスを絶対パスにしてください。
    </div>

    <div class="actions" style="margin-top: 8px;">
      <button @click="$emit('send')" :disabled="inProgress">通知を送る(テスト)</button>
      <div class="muted" style="align-self: center;">保存するとこの内容が plist の EnvironmentVariables に反映されます</div>
    </div>
    <p v-if="inProgress" class="muted" style="margin-top: 8px;">送信中…</p>
    <p v-if="error" class="error" style="margin-top: 8px;">{{ error }}</p>
  </div>
</template>

<script setup>
const title = defineModel('title', { type: String, default: 'Batch Timer' });
const message = defineModel('message', { type: String, default: '' });
const sound = defineModel('sound', { type: String, default: 'default' });
const mode = defineModel('mode', { type: String, default: 'alert' });
const templatePath = defineModel('templatePath', { type: String, default: '' });
const templateHtml = defineModel('templateHtml', { type: String, default: '' });

defineProps({
  inProgress: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

defineEmits(['send']);
</script>
