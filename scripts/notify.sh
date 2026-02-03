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
# 引数をそのまま渡して、引用符などで AppleScript が壊れないようにする
osascript - "$TITLE" "$MESSAGE" <<'APPLESCRIPT'
on run argv
    set t to "通知"
    set m to "メッセージ"
    if (count of argv) >= 1 then set t to item 1 of argv
    if (count of argv) >= 2 then set m to item 2 of argv
    display alert t message m as critical buttons {"OK"} default button "OK"
end run
APPLESCRIPT

# サウンドを再生（オプション）
if [ "$SOUND" != "default" ]; then
    afplay "/System/Library/Sounds/${SOUND}.aiff" 2>/dev/null
fi
