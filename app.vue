<template>
  <NuxtPage />
</template>

<style>
.wrap { font-family: system-ui, -apple-system, sans-serif; }
.header { padding: 12px 16px; background: #0f172a; color: white; }
.titleLink { color: inherit; text-decoration: none; cursor: pointer; }
.titleLink:hover { text-decoration: none; }
.sub { opacity: 0.9; font-family: ui-monospace, Menlo, monospace; }
.main { padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.main.single { grid-template-columns: 1fr; }
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
