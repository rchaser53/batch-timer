#!/bin/bash
set -euo pipefail

# Webモードの動作確認用タスク
# - notify-web.sh でHTML通知をブラウザ表示
# - 可能なら setup.sh が配置した Application Support 側を優先

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="$HOME/Library/Application Support/batch-timer"

NOTIFY_WEB="${INSTALL_DIR}/scripts/notify-web.sh"
TEMPLATE_PATH="${INSTALL_DIR}/templates/notify.html"

if [ ! -x "$NOTIFY_WEB" ]; then
  NOTIFY_WEB="${ROOT_DIR}/scripts/notify-web.sh"
fi

if [ ! -f "$TEMPLATE_PATH" ]; then
  TEMPLATE_PATH="${ROOT_DIR}/templates/notify.html"
fi

TITLE="Batch Timer (Web Test)"
MESSAGE="Web通知テストです\n$(date '+%Y-%m-%d %H:%M:%S')\n\n不要になったらこのジョブを unload してください。"

"$NOTIFY_WEB" "$TITLE" "$MESSAGE" "$TEMPLATE_PATH" "default"
