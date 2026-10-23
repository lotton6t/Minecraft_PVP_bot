@echo off
setlocal enabledelayedexpansion

rem 文字コードをUTF-8（コードページ65001）に変更して文字化けを防止
chcp 65001 >nul

rem 1. PowerShellによるビルドスクリプトの実行
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\behavior_packs\PVPbot\scripts\build.ps1"
if errorlevel 1 (
    echo.
    echo [Error] Build failed.
    pause
    exit /b 1
)

echo.
echo Build completed successfully.

rem 2. copyAddress.txt からコピー先ディレクトリのパスを読み込む
set "ADDRESS_FILE=%~dp0copyAddress.txt"
set "TARGET_DIR="

if not exist "!ADDRESS_FILE!" (
    echo [Warning] copyAddress.txt が見つからないため、自動コピーをスキップします。
    pause
    exit /b 0
)

rem ファイルの1行目を読み込んで変数に格納
set /p TARGET_DIR=<"!ADDRESS_FILE!"

rem パスの前後の余分な空白や改行の対策
set "TARGET_DIR=!TARGET_DIR!"

if "!TARGET_DIR!"=="" (
    echo [Warning] copyAddress.txt の中身が空のため、自動コピーをスキップします。
    pause
    exit /b 0
)

rem 3. 生成されたファイルの自動コピー処理
set "SOURCE_FILE=%~dp0..\behavior_packs\PVPbot\scripts\main.js"

echo.
echo コピー先ディレクトリ:
echo   !TARGET_DIR!
echo.

if exist "!SOURCE_FILE!" (
    rem コピー先フォルダが存在しない場合は自動作成
    if not exist "!TARGET_DIR!" mkdir "!TARGET_DIR!"
    
    rem ファイルを上書きコピー
    copy /y "!SOURCE_FILE!" "!TARGET_DIR!\" >nul
    
    if errorlevel 1 (
        echo [Error] ファイルのコピーに失敗しました。パスが正しいか確認してください。
        pause
        exit /b 1
    ) else (
        echo [Success] 生成された main.js を指定ディレクトリに自動コピーしました！
        echo.
        rem 💡 1秒間だけ画面を表示して自動終了します（>nul でカウントダウンの秒数表示を非表示にしています）
        timeout /t 1 >nul
        exit /b 0
    )
) else (
    echo [Error] コピー元の main.js が見つかりませんでした。
    pause
    exit /b 1
)