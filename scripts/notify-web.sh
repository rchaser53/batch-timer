#!/bin/bash

# HTMLテンプレートを使って「Webアプリ風」の通知画面をブラウザで開くスクリプト
#
# 使い方:
#   ./notify-web.sh "タイトル" "メッセージ" [テンプレートパス] [サウンド名]
#
# テンプレートは以下の優先順位で決定します:
#   1) 環境変数 REMINDER_TEMPLATE_HTML（HTML文字列）
#   2) 引数3のテンプレートパス
#   3) 環境変数 REMINDER_TEMPLATE_PATH
#   4) (scripts/../templates/notify.html)
#
# 置換されるプレースホルダ:
#   {{TITLE}} / {{MESSAGE_HTML}} / {{TIMESTAMP}}

set -euo pipefail

TITLE="${1:-通知}"
MESSAGE="${2:-メッセージ}"
TEMPLATE_ARG_PATH="${3:-}"
SOUND="${4:-default}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_TEMPLATE_PATH="${SCRIPT_DIR}/../templates/notify.html"

# temp file
TS="$(date '+%Y%m%d-%H%M%S')"
OUT_FILE="${TMPDIR:-/tmp}/batch-timer-notify-${TS}-$$.html"

# pass values to python via env (NUL禁止は呼び出し側/上位で担保)
BT_TITLE="$TITLE" \
BT_MESSAGE="$MESSAGE" \
BT_TEMPLATE_ARG_PATH="$TEMPLATE_ARG_PATH" \
BT_DEFAULT_TEMPLATE_PATH="$DEFAULT_TEMPLATE_PATH" \
BT_TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')" \
BT_OUT_FILE="$OUT_FILE" \
python3 - <<'PY'
import html
import os
from pathlib import Path

title = os.environ.get('BT_TITLE', '')
message = os.environ.get('BT_MESSAGE', '')
template_arg_path = os.environ.get('BT_TEMPLATE_ARG_PATH', '')
default_template_path = os.environ.get('BT_DEFAULT_TEMPLATE_PATH', '')

raw_template = os.environ.get('REMINDER_TEMPLATE_HTML')
if raw_template:
    template = raw_template
else:
    template_path = template_arg_path or os.environ.get('REMINDER_TEMPLATE_PATH') or default_template_path
    p = Path(template_path)
    if not p.exists():
        raise SystemExit(f'Template not found: {template_path}')
    template = p.read_text(encoding='utf-8')

safe_title = html.escape(title, quote=True)
safe_message_html = html.escape(message, quote=True).replace('\n', '<br />\n')

ts = os.environ.get('BT_TIMESTAMP', '')
safe_ts = html.escape(ts, quote=True)

out = template.replace('{{TITLE}}', safe_title)
out = out.replace('{{MESSAGE_HTML}}', safe_message_html)
out = out.replace('{{TIMESTAMP}}', safe_ts)

Path(os.environ['BT_OUT_FILE']).write_text(out, encoding='utf-8')
PY

# open in default browser
open "$OUT_FILE" >/dev/null 2>&1 || true

# optional sound
if [ "$SOUND" != "default" ]; then
  afplay "/System/Library/Sounds/${SOUND}.aiff" 2>/dev/null || true
fi
