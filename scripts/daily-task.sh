#!/bin/bash

# 毎日実行されるタスクのサンプルスクリプト
# このスクリプトをカスタマイズして、実行したい処理を記述してください

# ログファイルのパス（プロジェクト直下）
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/daily-task.log"

# ログディレクトリが存在しない場合は作成
mkdir -p "$LOG_DIR"

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
