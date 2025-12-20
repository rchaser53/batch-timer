# Batch Timer

macOSで指定時刻やログイン時にshellスクリプトを自動実行するためのツールです。`launchd`と一日一回ガード用ラッパー`once-per-day.sh`で安定運用します。

## 特徴
- `launchd`でログイン時・時刻指定の自動実行
- 一日一回ガード（同日二度目は自動スキップ）
- ログの保存（ラッパーとタスクで分離）
- 通知スクリプトの同梱（任意）

## 構成
```
batch-timer/
├── com.user.batch-timer.daily.plist      # launchd設定（ユーザーエージェント）
├── scripts/
│   ├── daily-task.sh                     # メインタスク
│   ├── once-per-day.sh                   # 一日一回ラッパー
│   ├── notify.sh / notify-advanced.sh    # 通知スクリプト（任意）
│   ├── setup.sh / uninstall.sh           # セットアップ/削除
├── docs/
│   ├── Scheduling.md                     # スケジュール詳細（launchd）
│   ├── OncePerDay.md                     # once-per-dayの使い方
└── README.md
```

## クイックスタート
1) セットアップ（LaunchAgentsに登録）
```bash
~/Desktop/batch-timer/scripts/setup.sh
```
2) 状態確認・手動起動
```bash
launchctl list | grep com.user.batch-timer.daily
launchctl kickstart -k gui/$(id -u)/com.user.batch-timer.daily
```
3) ログ確認
```bash
# ラッパー（once-per-day）のログ
tail -n 50 ~/Library/Logs/batch-timer/once-per-day.log
# タスクのログ
tail -n 50 ~/Library/Logs/batch-timer/daily-task.log
```

## 仕組み
- `launchd`が指定時刻（`StartCalendarInterval`）とログイン時（`RunAtLoad`）にジョブを起動
- ジョブは`once-per-day.sh`経由で`daily-task.sh`を実行し、同日に二度目以降はスキップ
- ログは`once-per-day.log`と`daily-task.log`に分けて記録

## スケジュールの変更
- 毎日9:00に設定済み。詳細は [docs/Scheduling.md](docs/Scheduling.md) を参照
- 変更後は再ロードします：
```bash
cp ./com.user.batch-timer.daily.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.user.batch-timer.daily.plist || true
launchctl load -w ~/Library/LaunchAgents/com.user.batch-timer.daily.plist
```

## タスクのカスタマイズ
- 処理内容は [scripts/daily-task.sh](scripts/daily-task.sh) を編集
- 通知の使い方は [NOTIFICATION_GUIDE.md](NOTIFICATION_GUIDE.md) や [scripts/notify.sh](scripts/notify.sh) を参照

## 一日一回ラッパーの詳細
- 使い方・オプションは [docs/OncePerDay.md](docs/OncePerDay.md) を参照
- 他のコマンドにも適用可能（`-k`で用途分離、`-l`でログ指定）

## アンインストール
```bash
~/Desktop/batch-timer/scripts/uninstall.sh
```

## トラブルシューティング（要点）
- ジョブの登録/起動確認：`launchctl list` / `launchctl kickstart`
- 権限・パス確認：`daily-task.sh`に実行権限があるか、絶対パスが正しいか
- ログ確認：`~/Library/Logs/batch-timer/once-per-day.log` / `daily-task.log`
 

## 参考
- `launchd`の`StartCalendarInterval`仕様の詳細は`man launchd.plist`
- 通知の詳細は [NOTIFICATION_GUIDE.md](NOTIFICATION_GUIDE.md)
