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
│   ├── notify-web.sh                     # Web表示通知（HTMLテンプレ）
│   ├── setup.sh / uninstall.sh           # セットアップ/削除
├── templates/
│   ├── notify.html                       # Web通知テンプレ（{{TITLE}} 等）
├── docs/
│   ├── Scheduling.md                     # スケジュール詳細（launchd）
│   ├── OncePerDay.md                     # once-per-dayの使い方
└── README.md
```

## クイックスタート
1) セットアップ（LaunchAgentsに登録）
```bash
~/batch-timer/scripts/setup.sh
```
2) 状態確認・手動起動
```bash
launchctl list | grep com.user.batch-timer.daily
launchctl kickstart -k gui/$(id -u)/com.user.batch-timer.daily
```
3) ログ確認
```bash
# launchd標準出力/標準エラー
tail -n 50 ./logs/stdout.log
tail -n 50 ./logs/stderr.log

# ラッパー（once-per-day）のログ
tail -n 50 ./logs/once-per-day.log
```

## Web GUI（NuxtでCRUD）
- Nuxt 3でGUIを提供します。
- このフォルダ（Workspace）直下の`.plist`のみを一覧・参照・更新・追加・削除します。
- `launchctl load/unload`もボタンから実行できます（権限や保存場所により失敗することがあります）。

### 起動手順（開発）
```bash
cd ~/batch-timer
npm install
npm run dev
# ブラウザで表示されるURL（通常 http://localhost:3000 ）を開く
```



### 使い方
- 左「ジョブ一覧」にこのフォルダ直下の `.plist` が表示されます。
- 行の「開く」で詳細を開き、内容（JSON表示）を編集して「保存」。
- 「launchctl load -w」「launchctl unload」で反映操作。
- 下部フォームで新規作成（保存先は Workspace のみ）。

### 構成（Nuxt）
- GUI: [pages/index.vue](pages/index.vue)
- API: [server/api/jobs](server/api/jobs) / [server/api/launchctl](server/api/launchctl)
- 依存: [package.json](package.json)（`nuxt`, `plist`）

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

## Web表示通知（自由デザイン）
- 通知モードを `REMINDER_MODE=web` にすると、ダイアログではなくブラウザでHTMLを開く形で表示できます。
- テンプレは `REMINDER_TEMPLATE_PATH`（ファイル）または `REMINDER_TEMPLATE_HTML`（HTML文字列）で指定します。
- GUIの「通知メッセージ（REMINDER_*）」から `web` を選び、HTMLテンプレを編集して保存できます。

## 一日一回ラッパーの詳細
- 使い方・オプションは [docs/OncePerDay.md](docs/OncePerDay.md) を参照
- 他のコマンドにも適用可能（`-k`で用途分離、`-l`でログ指定）

## アンインストール
```bash
~/batch-timer/scripts/uninstall.sh
```

## トラブルシューティング（要点）
- ジョブの登録/起動確認：`launchctl list` / `launchctl kickstart`
- 権限・パス確認：`daily-task.sh`に実行権限があるか、絶対パスが正しいか
- ログ確認：`./logs/stdout.log` / `./logs/stderr.log` / `./logs/once-per-day.log`
- `Operation not permitted` が出る場合配下のスクリプトをlaunchdが読めないことがあります。`scripts/setup.sh`でインストールし直してください（`~/Library/Application Support/batch-timer`へ配置します）。
 

## 参考
- `launchd`の`StartCalendarInterval`仕様の詳細は`man launchd.plist`
- 通知の詳細は [NOTIFICATION_GUIDE.md](NOTIFICATION_GUIDE.md)