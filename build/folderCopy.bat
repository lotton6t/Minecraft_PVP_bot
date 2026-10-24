@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================================
REM  PVPbot ディレクトリ自動クレンジング＆転送バッチ
REM ============================================================

set "CURRENT_DIR=%~dp0"
set "TXT_FILE=%CURRENT_DIR%copyFolder.txt"

echo [PVPbot] 転送先パスを読み込んでいます...

if not exist "%TXT_FILE%" (
    echo [エラー] "%TXT_FILE%" が見つかりません。
    pause
    exit /b
)

set /p DEST_DIR=<"%TXT_FILE%"
set "DEST_DIR=%DEST_DIR:"=%"

if "%DEST_DIR%"=="" (
    echo [エラー] copyFolder.txt の中身が空っぽです。
    pause
    exit /b
)

echo [PVPbot] 転送先: %DEST_DIR%
echo ------------------------------------------------------------

REM ------------------------------------------------------------
REM 1. resource_packs の丸ごと転送
REM ------------------------------------------------------------
echo [PVPbot] リソースパックを転送中...
if exist "%CURRENT_DIR%resource_packs" (
    xcopy "%CURRENT_DIR%resource_packs" "%DEST_DIR%\resource_packs" /E /I /Y /Q >nul
    echo リソースパックのコピーが完了しました。
) else (
    echo resource_packs フォルダが見つかりません（スキップ）。
)

echo ------------------------------------------------------------

REM ------------------------------------------------------------
REM 2. behavior_packs の転送（scriptsフォルダのクレンジング機能付き）
REM ------------------------------------------------------------
echo [PVPbot] ビヘイビアパックを転送中...
if exist "%CURRENT_DIR%behavior_packs" (
    REM まずはビヘイビアパック全体を一度丸ごと上書きコピー
    xcopy "%CURRENT_DIR%behavior_packs" "%DEST_DIR%\behavior_packs" /E /I /Y /Q >nul

    REM 転送先にある PVPbot の scripts フォルダのパスを特定
    set "DEST_SCRIPTS=%DEST_DIR%\behavior_packs\PVPbot\scripts"

    if exist "!DEST_SCRIPTS!" (
        echo [PVPbot] scripts フォルダ内の不要な開発ファイルをクレンジング中...
        
        REM 転送先の scripts フォルダへ移動
        pushd "!DEST_SCRIPTS!"
        
        REM main.js 以外のファイルをすべて安全に強制消去
        for %%F in (*) do (
            if /i not "%%F"=="main.js" (
                del /F /Q "%%F" >nul 2>&1
            )
        )
        
        REM 元のフォルダに戻る
        popd
        echo ビヘイビアパックのコピーとスクリプトのクレンジングが完了しました。
    ) else (
        echo ビヘイビアパックのコピーが完了しました。(scriptsなし)
    )
) else (
    echo behavior_packs フォルダが見つかりません（スキップ）。
)

echo ------------------------------------------------------------
echo [PVPbot] すべての転送とクレンジングが成功しました！
timeout /t 2 >nul
exit /b