export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2025-12-21',
  nitro: {
    // Workspace直下のファイル操作を行うので、開発/運用の都合で明示
    // 追加設定は必要になったらここへ
  },
});
