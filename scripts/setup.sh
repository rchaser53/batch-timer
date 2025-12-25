#!/bin/bash

# Batch Timer セットアップ（launchd）
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LA_DIR="$HOME/Library/LaunchAgents"
PLIST_DST="$LA_DIR/com.user.batch-timer.daily.plist"
INSTALL_DIR="$HOME/Library/Application Support/batch-timer"
INSTALL_SCRIPTS="$INSTALL_DIR/scripts"
LOG_DIR="$ROOT_DIR/logs"
UID_NUM="$(id -u)"

echo "=========================================="
echo "Batch Timer セットアップ (launchd)"
echo "=========================================="
echo ""

# ディレクトリ作成
mkdir -p "$INSTALL_SCRIPTS"
mkdir -p "$LOG_DIR"
mkdir -p "$LA_DIR"

# スクリプトをインストール（Desktop配下だとlaunchdから"Operation not permitted"になることがあるため）
cp -R "$ROOT_DIR/scripts/." "$INSTALL_SCRIPTS/"
chmod +x "$INSTALL_SCRIPTS"/*.sh 2>/dev/null || true

# LaunchAgent plist を生成（インストール先のスクリプトを参照）
cat > "$PLIST_DST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
    <dict>
        <key>Label</key>
        <string>com.user.batch-timer.daily</string>

        <key>ProgramArguments</key>
        <array>
            <string>/bin/bash</string>
            <string>${INSTALL_SCRIPTS}/once-per-day.sh</string>
            <string>-k</string>
            <string>daily-task</string>
            <string>-d</string>
            <string>${LOG_DIR}/stamps</string>
            <string>-l</string>
            <string>${LOG_DIR}/once-per-day.log</string>
            <string>--</string>
            <string>${INSTALL_SCRIPTS}/daily-task.sh</string>
        </array>

        <key>StartCalendarInterval</key>
        <dict>
            <key>Hour</key>
            <integer>10</integer>
            <key>Minute</key>
            <integer>0</integer>
        </dict>

        <key>WorkingDirectory</key>
        <string>${ROOT_DIR}</string>

        <key>StandardOutPath</key>
        <string>${LOG_DIR}/stdout.log</string>
        <key>StandardErrorPath</key>
        <string>${LOG_DIR}/stderr.log</string>

        <key>KeepAlive</key>
        <false/>
        <key>RunAtLoad</key>
        <true/>
    </dict>
</plist>
EOF

# 既存ロードを解除（あれば）
launchctl bootout "gui/${UID_NUM}" "$PLIST_DST" 2>/dev/null || launchctl unload "$PLIST_DST" 2>/dev/null || true

# 有効化＆ロード
launchctl bootstrap "gui/${UID_NUM}" "$PLIST_DST" 2>/dev/null || launchctl load -w "$PLIST_DST"

echo ""
echo "✅ セットアップが完了しました！"
echo "配置: $PLIST_DST"
echo "スクリプト: $INSTALL_SCRIPTS"
echo "ログ: $LOG_DIR"
echo ""
echo "現在のジョブ一覧 (抜粋):"
launchctl list | grep com.user.batch-timer.daily || true
echo ""
echo "起動時に実行され、毎日設定時刻にも実行されます（同日2回目はスキップ）。"
echo "時刻変更は plist の StartCalendarInterval の Hour/Minute を編集してください。"
