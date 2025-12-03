# 通知スクリプト使用ガイド

macOSでクリックするまで消えない通知を表示するスクリプトです。

## スクリプト一覧

### 1. `notify.sh` - シンプルな通知スクリプト

基本的な使い方：

```bash
# 基本的な通知
./scripts/notify.sh "タイトル" "メッセージ"

# 例
./scripts/notify.sh "タスク完了" "処理が正常に終了しました"
./scripts/notify.sh "リマインダー" "会議の時間です"
./scripts/notify.sh "エラー" "処理に失敗しました"
```

サウンド付き通知：

```bash
./scripts/notify.sh "重要" "確認してください" "Basso"
```

利用可能なサウンド名：
- `Basso` - 低音
- `Blow` - 吹く音
- `Bottle` - ボトル
- `Frog` - カエル
- `Funk` - ファンク
- `Glass` - グラス
- `Hero` - ヒーロー
- `Morse` - モールス信号
- `Ping` - ピン
- `Pop` - ポップ
- `Purr` - ゴロゴロ
- `Sosumi` - ソスミ
- `Submarine` - 潜水艦
- `Tink` - チーン

### 2. `notify-advanced.sh` - 高度な通知スクリプト

#### インタラクティブメニューモード

```bash
./scripts/notify-advanced.sh
```

メニューから選択：
1. シンプルなアラート
2. 重要なアラート（クリティカル）
3. 複数ボタンのダイアログ
4. テキスト入力ダイアログ
5. サウンド付き通知
6. カスタムメッセージ

#### コマンドライン引数モード

```bash
# 基本的な使い方
./scripts/notify-advanced.sh "タイトル" "メッセージ" "タイプ"

# 情報通知（青いアイコン）
./scripts/notify-advanced.sh "情報" "処理が完了しました" "informational"

# 警告通知（黄色いアイコン）
./scripts/notify-advanced.sh "警告" "ディスク容量が不足しています" "warning"

# 重要通知（赤いアイコン）
./scripts/notify-advanced.sh "エラー" "システムエラーが発生しました" "critical"
```

## 実際の使用例

### 定期タスクでの使用

`daily-task.sh` に組み込む：

```bash
#!/bin/bash

# タスクを実行
./backup.sh

# 完了通知を表示（クリックするまで消えない）
/Users/rchaser53/Desktop/batch-timer/scripts/notify.sh "バックアップ完了" "データのバックアップが正常に完了しました"
```

### エラー発生時の通知

```bash
#!/bin/bash

if ./important-task.sh; then
    ./scripts/notify.sh "成功" "タスクが正常に完了しました" "Glass"
else
    ./scripts/notify-advanced.sh "エラー" "タスクの実行に失敗しました" "critical"
fi
```

### 長時間実行タスクの完了通知

```bash
#!/bin/bash

echo "処理を開始します..."
sleep 10  # 長時間の処理をシミュレート

# 完了したら通知
./scripts/notify.sh "処理完了" "すべての処理が完了しました。結果を確認してください。"
```

## 特徴

- ✅ **クリックするまで消えない**: `display alert`を使用しているため、ユーザーがボタンをクリックするまで画面に表示され続けます
- ✅ **通知センターではなくダイアログ**: 通常の通知センターの通知と異なり、ダイアログボックスとして表示されるため見逃しません
- ✅ **カスタマイズ可能**: タイトル、メッセージ、アイコンタイプを自由に設定
- ✅ **複数ボタン対応**: ユーザーの選択を受け取ることも可能
- ✅ **スクリプトから簡単に呼び出せる**: 他のシェルスクリプトから簡単に統合可能

## 通知の種類

### informational（情報）
- 青いアイコン
- 一般的な情報やお知らせに使用

### warning（警告）
- 黄色いアイコン
- 注意が必要な状況に使用

### critical（重要）
- 赤いアイコン
- 緊急の対応が必要な場合に使用
- より目立つ表示

## トラブルシューティング

### 通知が表示されない場合

1. **システム環境設定を確認**
   - システム環境設定 > 通知とフォーカス
   - 「Script Editor」または「osascript」の通知が許可されているか確認

2. **Full Disk Accessの確認（cronから実行する場合）**
   - システム環境設定 > セキュリティとプライバシー > プライバシー
   - 「フルディスクアクセス」で必要なアプリケーションを許可

3. **スクリプトの実行権限を確認**
   ```bash
   ls -la scripts/notify.sh
   chmod +x scripts/notify.sh
   ```

## 応用例

### カウントダウン付き通知

```bash
#!/bin/bash
for i in {5..1}; do
    echo "$i秒後に通知します..."
    sleep 1
done
./scripts/notify.sh "時間です！" "休憩時間が終わりました"
```

### 条件付き通知

```bash
#!/bin/bash
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$DISK_USAGE" -gt 80 ]; then
    ./scripts/notify-advanced.sh "ディスク警告" "ディスク使用量が${DISK_USAGE}%です" "warning"
fi
```

### ユーザー入力を受け取る

```bash
#!/bin/bash
RESULT=$(osascript <<EOF
display dialog "処理を続行しますか？" buttons {"キャンセル", "続行"} default button "続行"
button returned of result
EOF
)

if [ "$RESULT" = "続行" ]; then
    echo "処理を続行します"
    # 処理を実行
else
    echo "キャンセルされました"
fi
```

## 参考

- macOSの`display alert`はAppleScriptの機能を使用
- `display notification`（通知センター）とは異なり、ユーザーの操作を必須とするダイアログ
- バックグラウンドで実行しても前面に表示される
