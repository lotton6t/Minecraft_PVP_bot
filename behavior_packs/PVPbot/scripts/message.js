import { world } from "@minecraft/server";

// ============================================================
// 【設定】デバッグモードのオン(true) / オフ(false)の切り替え
// ============================================================
const IS_DEBUG = true; 

// ============================================================
// 言語テキストの一元管理（[0]が日本語、[1]が英語）
// ============================================================
const MSG_DATA = {
  LOAD_SUCCESS: [
    "§a[PVPbot] スクリプト v1.25.24 を読み込みました", 
    "§a[PVPbot] Script v1.25.24 loaded successfully."
  ],
  LOAD_FAIL: [
    "起動通知を送信できませんでした", 
    "Failed to send startup notification."
  ],
  HEAL_FAIL_EFFECT: [
    "回復中の効果を付与できませんでした", 
    "Failed to apply effects during healing."
  ],
  DEATH_DETECT: [
    "§e[PVPbot] Botの死亡イベントを検知しました",
    "§e[PVPbot] Detected Bot death event."
  ],
  DEATH_FAIL_DROP: [
    "§c[PVPbot] インベントリアイテムのドロップ準備に失敗しました",
    "§c[PVPbot] Failed to prepare inventory item drops."
  ],
  SPAWN_MESSAGE: [
    (levelName) => `§ePVPbot（${levelName}）がゲームに入室しました`,
    (levelName) => `§ePVPbot (${levelName}) has joined the game.`
  ],
  EXIT_MESSAGE_DROP: [
    (name, count) => `§e${name}がゲームを退出しました（インベントリのアイテム ${count} 個をドロップ）`,
    (name, count) => `§e${name} left the game (Dropped ${count} inventory items)`
  ],
  EXIT_MESSAGE_NONE: [
    (name) => `§e${name}がゲームを退出しました（ドロップできるインベントリアイテムはありません）`,
    (name) => `§e${name} left the game (No inventory items to drop)`
  ]
};

// 共通固定接頭辞
export const MSG_PREFIX = "[PVPbot]";

// プレイヤーの言語に応じて配列のインデックス（0=日本語、1=英語）を返す関数
function getLangIndex(player) {
  try {
    const lang = player.clientSystemInfo?.language;
    if (!lang) return 0; // 言語データがまだ読み込めていない初期状態は日本語(0)にする

    // 文字列をすべて小文字に変換（例: "ja_JP" も "ja-JP" も "ja_jp" に統一される）
    const lowerLang = lang.toLowerCase();

    // "ja" という文字がどこかに含まれていれば日本語(0)、それ以外は英語(1)と判定
    return lowerLang.includes("ja") ? 0 : 1;
  } catch {
    return 0; // 万が一エラーが起きても日本語をデフォルトにする
  }
}

// 【通常用】チャット配信用関数 (多言語を判定して全員へ送信)
export function broadcastChat(key, ...args) {
  try {
    const item = MSG_DATA[key];
    if (!item) return;

    for (const player of world.getPlayers()) {
      const idx = getLangIndex(player);
      const content = item[idx] || item[0]; // 万が一指定インデックスが空なら日本語を出す

      // 中身が関数（動的テキスト）か、ただの文字列かで処理を分ける
      const text = typeof content === "function" ? content(...args) : content;
      player.sendMessage(text);
    }
  } catch (error) {
    console.error(`${MSG_PREFIX} Failed to broadcast message: ${error}`);
  }
}

// 【デバッグ用】チャット配信用関数 (言語識別なし・そのまま送信)
export function broadcastDebug(text) {
  try {
    if (!IS_DEBUG) return;
    const formattedText = `§7${MSG_PREFIX} [DEBUG] ${text}`;
    for (const player of world.getPlayers()) {
      player.sendMessage(formattedText);
    }
  } catch (error) {
    console.error(`${MSG_PREFIX} Failed to broadcast debug message: ${error}`);
  }
}

// 外部からデバッグ状態を確認するための関数
export function isDebugMode() {
  return IS_DEBUG;
}