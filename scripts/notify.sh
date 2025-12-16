#!/bin/bash

# クリックするまで消えない通知を表示するスクリプト
# 
# 使い方:
#   ./notify.sh "タイトル" "メッセージ"
#   ./notify.sh "タイトル" "メッセージ" "サウンド名"
#
# 例:
#   ./notify.sh "重要なお知らせ" "タスクが完了しました"
#   ./notify.sh "アラート" "確認してください" "Basso"

# 引数の取得
TITLE="${1:-通知}"
MESSAGE="${2:-メッセージ}"
SOUND="${3:-default}"

# AppleScriptで通知を表示
# display alert は自動で消えず、ユーザーがボタンをクリックするまで表示され続けます
osascript <<EOF
display alert "$TITLE" message "$MESSAGE" as critical buttons {"OK"} default button "OK"
EOF

# サウンドを再生（オプション）
if [ "$SOUND" != "default" ]; then
    afplay "/System/Library/Sounds/${SOUND}.aiff" 2>/dev/null
fi
