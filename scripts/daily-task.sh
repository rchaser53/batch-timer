#!/bin/bash

# 毎日実行されるタスクのサンプルスクリプト
# このスクリプトをカスタマイズして、実行したい処理を記述してください

# ログファイルのパス
LOG_DIR="$HOME/Library/Logs/batch-timer"
LOG_FILE="$LOG_DIR/daily-task.log"
STAMP_FILE="$LOG_DIR/last-run.stamp"

# ログディレクトリが存在しない場合は作成
mkdir -p "$LOG_DIR"

# 当日実行済みならスキップ
TODAY=$(date '+%Y-%m-%d')
if [ -f "$STAMP_FILE" ]; then
	LAST_RUN_DATE=$(cat "$STAMP_FILE" 2>/dev/null | head -n1)
	if [ "$LAST_RUN_DATE" = "$TODAY" ]; then
		echo "$(date '+%Y-%m-%d %H:%M:%S') 既に本日実行済みのためスキップ" >> "$LOG_FILE"
		exit 0
	fi
fi

# 実行日時をログに記録
echo "========================================" >> "$LOG_FILE"
echo "実行日時: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# ここに実行したい処理を記述
# 例: データのバックアップ、ファイルの整理、通知の送信など

# サンプル処理
echo "タスクを実行しました" >> "$LOG_FILE"
echo "現在のディレクトリ: $(pwd)" >> "$LOG_FILE"
echo "ユーザー: $(whoami)" >> "$LOG_FILE"

# 通知を送信（オプション）
osascript -e 'display notification "定期タスクが実行されました" with title "Batch Timer" sound name "Glass"' >> "$LOG_FILE" 2>&1

echo "完了: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# スタンプ更新（本日実行済みを記録）
echo "$TODAY" > "$STAMP_FILE"
