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
