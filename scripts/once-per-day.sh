#!/bin/bash

# 一日一回だけコマンドを実行するヘルパースクリプト
# 既に当日実行済みならスキップします。
#
# 使い方例:
#   ./once-per-day.sh -- /Users/rchaser53/Desktop/batch-timer/scripts/daily-task.sh
#   ./once-per-day.sh -k notify -- /Users/rchaser53/Desktop/batch-timer/scripts/notify.sh "タイトル" "メッセージ"
#   ./once-per-day.sh -- /bin/echo "Hello"
#
# オプション:
#   -k, --key KEY    実行識別子（省略時はコマンド内容から自動生成）
#   -d, --dir DIR    スタンプ保存ディレクトリ（既定: $HOME/Library/Logs/batch-timer/stamps）
#   -l, --log-file FILE  ログ出力先ファイル（既定: $HOME/Library/Logs/batch-timer/once-per-day.log）
#   -h, --help       このヘルプを表示

set -euo pipefail

KEY=""
STAMP_DIR="$HOME/Library/Logs/batch-timer/stamps"
LOG_FILE="$HOME/Library/Logs/batch-timer/once-per-day.log"

log() {
  local ts
  ts=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$ts] $*" | tee -a "$LOG_FILE"
}

print_help() {
  sed -n '1,999p' "$0" | awk 'BEGIN{p=0} /一日一回/{p=1} {if(p) print} /このヘルプを表示/{exit}'
}

# 引数パース
while [[ $# -gt 0 ]]; do
  case "$1" in
    -k|--key)
      KEY="$2"; shift 2;;
    -d|--dir)
      STAMP_DIR="$2"; shift 2;;
    -l|--log-file)
      LOG_FILE="$2"; shift 2;;
    -h|--help)
      print_help; exit 0;;
    --)
      shift; break;;
    *)
      # コマンドの開始とみなす
      break;;
  esac
done

if [[ $# -eq 0 ]]; then
  echo "使い方: $0 [--key KEY] [--dir DIR] -- <command> [args...]" >&2
  exit 1
fi

COMMAND=("$@")

# 既定のキーはコマンド文字列のハッシュ
if [[ -z "$KEY" ]]; then
  if command -v shasum >/dev/null 2>&1; then
    KEY="$(printf '%s' "${COMMAND[*]}" | shasum -a 1 | awk '{print $1}')"
  else
    KEY="$(printf '%s' "${COMMAND[*]}" | md5 | awk '{print $NF}')"
  fi
fi

mkdir -p "$STAMP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"
STAMP_FILE="$STAMP_DIR/${KEY}.stamp"
TODAY=$(date '+%Y-%m-%d')

# 当日実行済みならスキップ
if [[ -f "$STAMP_FILE" ]]; then
  LAST_RUN_DATE=$(head -n1 "$STAMP_FILE" 2>/dev/null || echo "")
  if [[ "$LAST_RUN_DATE" == "$TODAY" ]]; then
    log "本日は既に実行済みのためスキップ (key=${KEY})"
    exit 0
  fi
fi

# 実行
log "START key=${KEY} command=${COMMAND[*]}"
"${COMMAND[@]}" >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

# 成功時のみスタンプ更新（失敗なら次回再試行可能）
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "$TODAY" > "$STAMP_FILE"
  log "END OK key=${KEY}"
else
  log "END NG key=${KEY} code=$EXIT_CODE"
fi

exit $EXIT_CODE
