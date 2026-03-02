# Catchup Check（当日未実行なら実行）

「リスト一覧にあるジョブのうち、設定したもの（opt-in）が当日1回も動いていない場合に、定期チェックで起動する」ための仕組みです。

- 実体: [scripts/catchup-check.sh](scripts/catchup-check.sh)
- 起動用plistサンプル: [com.user.batch-timer.catchup.hourly.plist](com.user.batch-timer.catchup.hourly.plist)

## 仕組み
- 1時間ごとに `catchup-check.sh` を実行
- 対象ジョブ（`BATCH_TIMER_CATCHUP=1`）について、当日の実行有無をチェック
  - `StandardOutPath` / `StandardErrorPath` の更新日（mtime）が今日なら「実行済み」
- 未実行なら、ジョブを起動
  - load済みなら `launchctl kickstart` を優先
  - 未load等で失敗した場合は `ProgramArguments` を直接spawn
- 多重起動防止のため、起動を試行した日は `logs/stamps/catchup.<plist名>.stamp` に当日スタンプを保存

## 対象ジョブの設定（opt-in）
対象にしたいplistの `EnvironmentVariables` に以下を追加します。

- `BATCH_TIMER_CATCHUP`: `1`（必須）
- `BATCH_TIMER_CATCHUP_AFTER_HOUR`: 例 `20`（任意。指定時刻以降のみcatchup実行）
- `BATCH_TIMER_CATCHUP_AFTER_MINUTE`: 例 `0`（任意）

また、実行済み判定のため、対象ジョブは **`StandardOutPath` または `StandardErrorPath` を必ず設定** してください。
（無い場合は二重実行リスクがあるため、`catchup-check.sh` がスキップします）

## 有効化（launchd）
1. [com.user.batch-timer.catchup.hourly.plist](com.user.batch-timer.catchup.hourly.plist) のパス（ユーザー名/作業ディレクトリ）を自分の環境に合わせる
2. `~/Library/LaunchAgents/` にコピーしてロード

```bash
cp ./com.user.batch-timer.catchup.hourly.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.user.batch-timer.catchup.hourly.plist 2>/dev/null || true
launchctl load -w ~/Library/LaunchAgents/com.user.batch-timer.catchup.hourly.plist
```

## 手動実行（デバッグ）
```bash
./scripts/catchup-check.sh

tail -n 200 ./logs/catchup-check.log
```
