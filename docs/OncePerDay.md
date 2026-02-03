# once-per-day.sh の使い方

任意のコマンドを「一日一回だけ」実行するためのラッパースクリプトです。成功時に当日のスタンプを保存し、同日二度目以降の実行をスキップします。

- スクリプト: [scripts/once-per-day.sh](scripts/once-per-day.sh)
- 既定スタンプ: `<repo>/logs/stamps/<key>.stamp`
- 既定ログ: `<repo>/logs/once-per-day.log`

## 使い方
```bash
# 基本
~/batch-timer/scripts/once-per-day.sh -- /path/to/command arg1 arg2

# キー指定（用途ごとに分離したい場合）
~/batch-timer/scripts/once-per-day.sh -k mytask -- /path/to/command

# ログファイルを指定
~/batch-timer/scripts/once-per-day.sh -l ~/batch-timer/logs/mytask.log -- /path/to/command

# スタンプ保存ディレクトリを指定
~/batch-timer/scripts/once-per-day.sh -d ~/my/stamps -- /path/to/command
```

## オプション
- `-k, --key KEY`: 実行識別子。省略時はコマンド文字列から自動生成。
- `-l, --log-file FILE`: ログの出力先。既定は `<repo>/logs/once-per-day.log`。
- `-d, --dir DIR`: スタンプ保存ディレクトリ。既定は `<repo>/logs/stamps`。
- `-h, --help`: ヘルプ表示。

## 例
- `daily-task.sh` を一日一回に制御
```bash
~/batch-timer/scripts/once-per-day.sh -- ~/batch-timer/scripts/daily-task.sh
```

- `notify.sh` をキー付きで一日一回
```bash
~/batch-timer/scripts/once-per-day.sh -k notify -- ~/batch-timer/scripts/notify.sh "本日の通知" "一度だけ表示"
```

## launchdとの連携
plistの `ProgramArguments` で `once-per-day.sh` 経由にします。
```xml
<array>
  <string>/bin/bash</string>
  <string>/Users/<you>/batch-timer/scripts/once-per-day.sh</string>
  <string>-k</string>
  <string>daily-task</string>
  <string>-l</string>
  <string>/Users/<you>/batch-timer/logs/once-per-day.log</string>
  <string>--</string>
  <string>/Users/<you>/batch-timer/scripts/daily-task.sh</string>
</array>
```

## 例: 毎日20:00のリマインダ（未通知なら次のチェックで）

「20:00に通知」「もし通知が出ていなければ次にPCがアクティブになった時（ログイン直後など）に通知」を実現するには、`StartCalendarInterval` と `StartInterval` を併用し、時刻判定＆一日一回ガードは `reminder-check.sh` 側で行うのが簡単です。

- スクリプト: [scripts/reminder-check.sh](scripts/reminder-check.sh)
- 通知: [scripts/notify.sh](scripts/notify.sh)（OKを押すまで閉じない）
- 一日一回ガード: [scripts/once-per-day.sh](scripts/once-per-day.sh)

### plist例（要点のみ）

- `StartCalendarInterval`: 20:00
- `StartInterval`: 定期チェック（例: 60秒）
- `RunAtLoad`: ログイン直後にもチェック
- `EnvironmentVariables`: 文面などを設定ファイル（plist）で編集

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>REMINDER_TITLE</key>
  <string>Batch Timer</string>
  <key>REMINDER_MESSAGE</key>
  <string>20:00 のリマインダです</string>
  <key>REMINDER_SOUND</key>
  <string>default</string>

  <key>BATCH_TIMER_STAMP_DIR</key>
  <string>/Users/<you>/batch-timer/logs/stamps</string>
  <key>BATCH_TIMER_ONCE_LOG_FILE</key>
  <string>/Users/<you>/batch-timer/logs/once-per-day.log</string>
</dict>

<key>ProgramArguments</key>
<array>
  <string>/bin/bash</string>
  <string>/Users/<you>/batch-timer/scripts/reminder-check.sh</string>
</array>

<key>StartCalendarInterval</key>
<dict>
  <key>Hour</key><integer>20</integer>
  <key>Minute</key><integer>0</integer>
</dict>

<key>StartInterval</key>
<integer>60</integer>

<key>RunAtLoad</key>
<true/>
```
