import { world } from "@minecraft/server";
import { MSG_DATA } from "./message_resource.js";

// ============================================================
// 【設定】デバッグモードのオン(true) / オフ(false)の切り替え
// ============================================================
const IS_DEBUG = true; 

// 共通固定接頭辞
export const MSG_PREFIX = "[PVPbot]";

// 全プレイヤーにメッセージを送信する関数
export function broadcastMessage(message) {
  let players;
  try {
    players = world.getPlayers();
  } catch (error) {
    console.error(`[PVPbot] プレイヤー一覧を取得できませんでした: ${error}`);
    return;
  }
  for (const player of players) {
    try {
      player.sendMessage(message);
    } catch (error) {
      console.error(`[PVPbot] ${player.name}へのメッセージ送信に失敗しました: ${error}`);
    }
  }
}

// プレイヤーの言語に応じてJPNまたはENGを返す
function getLangKey(player) {
  try
  {
    const lang = player.clientSystemInfo?.language; // プレイヤーの言語情報を取得

    // 言語情報が取得できなかった場合
    if (!lang)
    {
      // デバッグモードの場合
      if(IS_DEBUG)
      {
        console.warn(`${MSG_PREFIX} 言語取得できないため日本語に設定します: ${player.name}.`);
      }
      return "JPN";
    }

    // 文字列をすべて小文字に変換（例: "ja_JP" も "ja-JP" も "ja_jp" に統一される）
    const lowerLang = lang.toLowerCase();

    return lowerLang.includes("ja") ? "JPN" : "ENG";
  }
  catch
  {
    // デバッグモードの場合
    if(IS_DEBUG)
    {
      console.warn(`${MSG_PREFIX} 例外発生のため日本語に設定します: ${player.name}.`);
    }
    return "JPN"; // 万が一エラーが起きても日本語をデフォルトにする
  }
}

// 【通常用】チャット配信用関数 (多言語を判定して全員へ送信)
export function broadcastChat(key, ...args) {
  try
  {
    const item = MSG_DATA[key]; // メッセージキーに対応する言語別定義を取得

    // メッセージキーが存在しない場合
    if (!item)
    {
      // 警告を出して処理を中断
      console.warn(`${MSG_PREFIX} Message key "${key}" not found.`);
      return;
    }

    // メッセージを全プレイヤーに送信
    for (const player of world.getPlayers())
    {
      const langKey = getLangKey(player);         // プレイヤーの言語に応じたキーを取得
      const content = item[langKey] || item.JPN;  // 言語キーに対応するメッセージを取得、存在しなければ日本語を使用

      // 中身が関数（動的テキスト）か、ただの文字列かで処理を分ける
      const text = typeof content === "function" ? content(...args) : content;
      player.sendMessage(text);
    }
  }
  catch (error)
  {
    console.error(`${MSG_PREFIX} Failed to broadcast message: ${error}`);
  }
}

// 【デバッグ用】チャット配信用関数 (言語識別なし・そのまま送信)
export function broadcastDebug(text) {
  try
  {
    // デバッグモードでない場合は何もしない
    if (!IS_DEBUG) {return;}

    // デバッグ用のメッセージを整形
    const formattedText = `§7${MSG_PREFIX} [DEBUG] ${text}`;
    for (const player of world.getPlayers())
    {
      player.sendMessage(formattedText);
    }
  }
  catch (error)
  {
    console.error(`${MSG_PREFIX} Failed to broadcast debug message: ${error}`);
  }
}

// 外部からデバッグ状態を確認するための関数
export function isDebugMode()
{
  return IS_DEBUG;
}
