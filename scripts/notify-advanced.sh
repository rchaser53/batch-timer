#!/bin/bash

# より高度な通知スクリプト（複数ボタン、入力フィールド対応）
#
# 使い方:
#   ./notify-advanced.sh
#
# このスクリプトは様々な通知パターンを提供します

show_simple_alert() {
    # シンプルなアラート（OKボタンのみ）
    osascript <<EOF
display alert "タスク完了" message "処理が正常に完了しました" as informational
EOF
}

show_critical_alert() {
    # 重要なアラート（クリティカル）
    osascript <<EOF
display alert "重要な通知" message "今すぐ確認してください" as critical buttons {"確認"} default button "確認"
EOF
}

show_multiple_buttons() {
    # 複数ボタンのダイアログ
    local result=$(osascript <<EOF
display alert "確認" message "続行しますか？" buttons {"キャンセル", "はい", "いいえ"} default button "はい" cancel button "キャンセル"
EOF
)
    echo "選択されたボタン: $result"
}

show_text_input() {
    # テキスト入力ダイアログ
    local result=$(osascript <<EOF
display dialog "名前を入力してください" default answer "" buttons {"キャンセル", "OK"} default button "OK"
text returned of result
EOF
)
    echo "入力されたテキスト: $result"
}

show_notification_with_sound() {
    # サウンド付き通知
    osascript <<EOF
display alert "リマインダー" message "時間です！" as warning buttons {"了解"} default button "了解"
beep 2
EOF
}

show_custom_icon_alert() {
    # カスタムメッセージとアイコン
    osascript <<EOF
display alert "バックアップ完了" message "すべてのファイルが正常にバックアップされました

実行時刻: $(date '+%Y-%m-%d %H:%M:%S')
ファイル数: 100個" as informational buttons {"閉じる"} default button "閉じる"
EOF
}

# メニュー表示
show_menu() {
    echo "=========================================="
    echo "通知スクリプト - デモメニュー"
    echo "=========================================="
    echo "1. シンプルなアラート"
    echo "2. 重要なアラート（クリティカル）"
    echo "3. 複数ボタンのダイアログ"
    echo "4. テキスト入力ダイアログ"
    echo "5. サウンド付き通知"
    echo "6. カスタムメッセージ"
    echo "0. 終了"
    echo "=========================================="
    read -p "選択してください: " choice
    
    case $choice in
        1) show_simple_alert ;;
        2) show_critical_alert ;;
        3) show_multiple_buttons ;;
        4) show_text_input ;;
        5) show_notification_with_sound ;;
        6) show_custom_icon_alert ;;
        0) exit 0 ;;
        *) echo "無効な選択です"; show_menu ;;
    esac
}

# 引数がない場合はメニューを表示
if [ $# -eq 0 ]; then
    show_menu
else
    # コマンドライン引数から直接実行
    TITLE="${1:-通知}"
    MESSAGE="${2:-メッセージ}"
    TYPE="${3:-informational}"  # informational, warning, critical
    
    osascript <<EOF
display alert "$TITLE" message "$MESSAGE" as $TYPE buttons {"OK"} default button "OK"
EOF
fi
