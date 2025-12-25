#!/bin/bash

# Batch Timer アンインストール（launchd）
set -euo pipefail

LA_DIR="$HOME/Library/LaunchAgents"
PLIST="$LA_DIR/com.user.batch-timer.daily.plist"
INSTALL_DIR="$HOME/Library/Application Support/batch-timer"
LOG_DIR="$HOME/Library/Logs/batch-timer"
UID_NUM="$(id -u)"

echo "=========================================="
echo "Batch Timer アンインストール (launchd)"
echo "=========================================="
echo ""

if [ -f "$PLIST" ]; then
    launchctl bootout "gui/${UID_NUM}" "$PLIST" 2>/dev/null || launchctl unload -w "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    echo "削除: $PLIST"
else
    echo "LaunchAgent は見つかりません: $PLIST"
fi

echo ""
echo "ログは残しています: $LOG_DIR"
echo "スクリプト(インストール先)は残しています: $INSTALL_DIR"
echo "完全に削除する場合は以下を実行してください:"
echo "  rm -rf \"$LOG_DIR\" \"$INSTALL_DIR\""
