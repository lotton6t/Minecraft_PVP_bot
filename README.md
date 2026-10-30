# PVPbot

統合版マインクラフトでPVPのように戦えるBotを追加するアドオンです。
特殊な効果や演出はなく、可能な限り対人戦を再現できるようにしていることが特徴です。

## Commands

Bot召喚には次のコマンドを使用します。
レベルは1~5まで対応してます。

```text
/summon pvp:master ~ ~ ~ 0 0 pvp:set_level_1

##コンソールでのビルド

npm run build
```

##コンソールのログ
$logDir = "$env:AppData\Minecraft Bedrock\logs"; $latestLog = Get-ChildItem -Path $logDir -Filter "ContentLog*.txt" | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if ($latestLog) { Write-Host "最新のログを監視します(UTF-8): $($latestLog.Name)" -ForegroundColor Green; Get-Content -Path $latestLog.FullName -Wait -Tail 20 -Encoding UTF8 } else { Write-Host "ログファイルが見つかりません。" -ForegroundColor Red }

