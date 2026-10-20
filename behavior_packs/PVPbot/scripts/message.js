import { world } from "@minecraft/server";

// 1. 各言語ごとのメッセージテキスト定義
const LANGUAGES = {
  ja_JP: {
    LOAD_SUCCESS: "§a[PVPbot] スクリプト v1.25.24 を読み込みました",
    LOAD_FAIL: "起動通知を送信できませんでした",
    HEAL_FAIL_EFFECT: "回復中の効果を付与できませんでした",
    SPAWN_MESSAGE: (levelName) => `§ePVPbot（${levelName}）がゲームに入室しました`,
    DEATH_DETECT: "§e[PVPbot] Botの死亡イベントを検知しました",
    DEATH_FAIL_DROP: "§c[PVPbot] インベントリアイテムのドロップ準備に失敗しました",
    EXIT_MESSAGE_DROP: (name, count) => `§e${name}がゲームを退出しました（インベントリのアイテム ${count} 個をドロップ）`,
    EXIT_MESSAGE_NONE: (name) => `§e${name}がゲームを退出しました（ドロップできるインベントリアイテムはありません）`,
  },
  en_US: {
    LOAD_SUCCESS: "§a[PVPbot] Script v1.25.24 loaded successfully.",
    LOAD_FAIL: "Failed to send startup notification.",
    HEAL_FAIL_EFFECT: "Failed to apply effects during healing.",
    SPAWN_MESSAGE: (levelName) => `§ePVPbot (${levelName}) has joined the game.`,
    DEATH_DETECT: "§e[PVPbot] Detected Bot death event.",
    DEATH_FAIL_DROP: "§c[PVPbot] Failed to prepare inventory item drops.",
    EXIT_MESSAGE_DROP: (name, count) => `§e${name} left the game (Dropped ${count} inventory items)`,
    EXIT_MESSAGE_NONE: (name) => `§e${name} left the game (No inventory items to drop)`,
  }
};

// 共通固定接頭辞
export const MSG_PREFIX = "[PVPbot]";

// 2. プレイヤーの現在の設定言語を取得する関数（日本語以外はすべて en_US 扱い）
function getPlayerLang(player) {
  try {
    // プレイヤーの言語設定を取得
    const lang = player.clientSystemInfo?.language; 
    
    // 💡 もしデータが取得できて、かつ「en_US」など LANGUAGES に登録されている言語ならそれを返す
    if (lang && LANGUAGES[lang]) {
      return lang;
    }
    
    // 💡 取得に失敗した（undefinedだった）場合や、未登録の言語だった場合は、
    // 基本言語である「日本語（ja_JP）」をデフォルトとして返す
    return "ja_JP";
  } catch {
    // 万が一エラーが起きても日本語を返す
    return "ja_JP"; 
  }
}

// 3. メッセージをそのプレイヤーの言語で取得する関数（キー指定用）
export function getMsg(player, key) {
  const lang = getPlayerLang(player);
  // 指定された言語にキーがなければ日本語を返す
  return LANGUAGES[lang][key] || LANGUAGES["ja_JP"][key] || key;
}

// 4. メッセージをそのプレイヤーの言語で取得する関数（関数/引数が必要な動的テキスト用）
export function getMsgFn(player, key, ...args) {
  const lang = getPlayerLang(player);
  const fn = LANGUAGES[lang][key] || LANGUAGES["ja_JP"][key];
  return typeof fn === "function" ? fn(...args) : "";
}

// ログ出力用の関数（サーバーコンソール用なので英語固定、または固定テキスト）
export function logWarn(msgStr, error = "") {
  const detail = error ? `: ${error}` : "";
  console.warn(`${MSG_PREFIX} ${msgStr}${detail}`);
}

export function logError(msgStr, error = "") {
  const detail = error ? `: ${error}` : "";
  console.error(`${MSG_PREFIX} ${msgStr}${detail}`);
}

// チャット配信用関数（プレイヤーごとに言語を切り替えて配信）
export function broadcastChat(key, ...args) {
  try {
    for (const player of world.getPlayers()) {
      // そのプレイヤーの言語に翻訳したテキストを個別に送る
      const text = args.length > 0 ? getMsgFn(player, key, ...args) : getMsg(player, key);
      player.sendMessage(text);
    }
  } catch (error) {
    console.error(`${MSG_PREFIX} Failed to broadcast message: ${error}`);
  }
}