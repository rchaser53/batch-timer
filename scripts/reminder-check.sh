#!/bin/bash

# 20:00以降に未通知なら、次の起動/定期チェックでリマインダを出す
# - 20:00前: 何もしない（成功終了）
# - 20:00以降: once-per-day で 1日1回だけ notify.sh を実行
# - 文面は plist の EnvironmentVariables（REMINDER_TITLE/REMINDER_MESSAGE 等）から設定可能

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

REMINDER_HOUR="${REMINDER_HOUR:-20}"
REMINDER_MINUTE="${REMINDER_MINUTE:-0}"
REMINDER_KEY="${REMINDER_KEY:-daily-reminder}"

REMINDER_MODE="${REMINDER_MODE:-alert}" # alert | web
REMINDER_TEMPLATE_PATH="${REMINDER_TEMPLATE_PATH:-}"

TITLE="${REMINDER_TITLE:-Batch Timer}"
MESSAGE="${REMINDER_MESSAGE:-20:00 のリマインダです}"
SOUND="${REMINDER_SOUND:-default}"

STAMP_DIR="${BATCH_TIMER_STAMP_DIR:-${SCRIPT_DIR}/../logs/stamps}"
LOG_FILE="${BATCH_TIMER_ONCE_LOG_FILE:-${SCRIPT_DIR}/../logs/once-per-day.log}"

now_h=$(date '+%H')
now_m=$(date '+%M')
now_total=$((10#$now_h * 60 + 10#$now_m))
target_total=$((10#$REMINDER_HOUR * 60 + 10#$REMINDER_MINUTE))

# 目標時刻前は何もしない
if (( now_total < target_total )); then
  exit 0
fi

if [[ "$REMINDER_MODE" == "web" ]]; then
  "${SCRIPT_DIR}/once-per-day.sh" \
    -k "$REMINDER_KEY" \
    -d "$STAMP_DIR" \
    -l "$LOG_FILE" \
    -- "${SCRIPT_DIR}/notify-web.sh" "$TITLE" "$MESSAGE" "$REMINDER_TEMPLATE_PATH" "$SOUND"
else
  "${SCRIPT_DIR}/once-per-day.sh" \
    -k "$REMINDER_KEY" \
    -d "$STAMP_DIR" \
    -l "$LOG_FILE" \
    -- "${SCRIPT_DIR}/notify.sh" "$TITLE" "$MESSAGE" "$SOUND"
fi
