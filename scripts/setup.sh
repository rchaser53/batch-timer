#!/bin/bash

# Batch Timer セットアップ（launchd）
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST_SRC="$ROOT_DIR/com.user.batch-timer.daily.plist"
LA_DIR="$HOME/Library/LaunchAgents"
PLIST_DST="$LA_DIR/com.user.batch-timer.daily.plist"
LOG_DIR="$ROOT_DIR/logs"

echo "=========================================="
echo "Batch Timer セットアップ (launchd)"
echo "=========================================="
echo ""

# 前提ファイル確認
if [ ! -f "$PLIST_SRC" ]; then
    echo "エラー: plistが見つかりません -> $PLIST_SRC"
    exit 1
fi

# ログ・LaunchAgentsディレクトリ作成
mkdir -p "$LOG_DIR"
mkdir -p "$LA_DIR"

# plistを設置
cp "$PLIST_SRC" "$PLIST_DST"

# 既存ロードを解除（あれば）
launchctl unload "$PLIST_DST" 2>/dev/null || true

# 有効化＆ロード
launchctl load -w "$PLIST_DST"

echo ""
echo "✅ セットアップが完了しました！"
echo "配置: $PLIST_DST"
echo "ログ: $LOG_DIR"
echo ""
echo "現在のジョブ一覧 (抜粋):"
launchctl list | grep com.user.batch-timer.daily || true
echo ""
echo "起動時に実行され、毎日設定時刻にも実行されます（同日2回目はスキップ）。"
echo "時刻変更は plist の StartCalendarInterval の Hour/Minute を編集してください。"
