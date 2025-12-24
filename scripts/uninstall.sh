#!/bin/bash

# Batch Timer アンインストールスクリプト
# このスクリプトは定期タスクをcrontabから削除します

MARKER="# batch-timer"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=========================================="
echo "Batch Timer アンインストール"
echo "=========================================="
echo ""

# 現在のcrontabを取得
TEMP_CRON=$(mktemp)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# batch-timer設定があるか確認
if grep -q "$MARKER" "$TEMP_CRON"; then
    echo "タスクの登録を解除しています..."
    
    # batch-timer設定を削除
    sed -i '' "/$MARKER/d" "$TEMP_CRON"
    
    #!/bin/bash

    # Batch Timer アンインストール（launchd）
    set -euo pipefail

    LA_DIR="$HOME/Library/LaunchAgents"
    PLIST="$LA_DIR/com.user.batch-timer.daily.plist"
    LOG_DIR="$ROOT_DIR/logs"

    echo "=========================================="
    echo "Batch Timer アンインストール (launchd)"
    echo "=========================================="
    echo ""

    # ジョブ停止・無効化
    if [ -f "$PLIST" ]; then
        launchctl unload -w "$PLIST" 2>/dev/null || true
        rm -f "$PLIST"
    fi

    echo "✅ アンインストールが完了しました！"
    echo "削除: $PLIST"
    echo ""
    echo "ログは残しています: $LOG_DIR"
    echo "ログも削除する場合は以下を実行してください:"
    echo "  rm -rf \"$LOG_DIR\""
