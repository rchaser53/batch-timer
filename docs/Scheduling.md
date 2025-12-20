# スケジュール設定ガイド（launchd）

`com.user.batch-timer.daily.plist`の`StartCalendarInterval`で実行タイミングを設定します。`~/Library/LaunchAgents/com.user.batch-timer.daily.plist`に配置・ロードすると有効になります。

## 基本（毎日9:00）
```xml
<key>StartCalendarInterval</key>
<dict>
  <key>Hour</key><integer>9</integer>
  <key>Minute</key><integer>0</integer>
</dict>
```

## 毎日複数時刻
`StartCalendarInterval`は配列で複数指定できます。
```xml
<key>StartCalendarInterval</key>
<array>
  <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
  <dict><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>
</array>
```

## 曜日指定（平日9:00）
曜日は`Weekday`（1=日曜 ... 7=土曜）。
```xml
<key>StartCalendarInterval</key>
<array>
  <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer><key>Weekday</key><integer>2</integer></dict>
  <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer><key>Weekday</key><integer>3</integer></dict>
  <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer><key>Weekday</key><integer>4</integer></dict>
  <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer><key>Weekday</key><integer>5</integer></dict>
  <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer><key>Weekday</key><integer>6</integer></dict>
</array>
```

## 月・日指定（毎月1日 0:00）
```xml
<key>StartCalendarInterval</key>
<dict>
  <key>Month</key><integer>1</integer>
  <key>Day</key><integer>1</integer>
  <key>Hour</key><integer>0</integer>
  <key>Minute</key><integer>0</integer>
</dict>
```

## 反映手順
plistを編集後、以下で再ロードします。
```bash
cp ./com.user.batch-timer.daily.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.user.batch-timer.daily.plist || true
launchctl load -w ~/Library/LaunchAgents/com.user.batch-timer.daily.plist
```

## 起動時に実行する
`RunAtLoad`を`true`にするとログイン時にも起動します。
```xml
<key>RunAtLoad</key><true/>
```