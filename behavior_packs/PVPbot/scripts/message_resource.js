export const MSG_DATA = {
  LOAD_SUCCESS: {
    JPN: "§a[PVPbot] スクリプト v1.25.24 を読み込みました",
    ENG: "§a[PVPbot] Script v1.25.24 loaded successfully."
  },
  LOAD_FAIL: {
    JPN: "起動通知を送信できませんでした",
    ENG: "Failed to send startup notification."
  },
  HEAL_FAIL_EFFECT: {
    JPN: "回復中の効果を付与できませんでした",
    ENG: "Failed to apply effects during healing."
  },
  DEATH_DETECT: {
    JPN: "§e[PVPbot] Botの死亡イベントを検知しました",
    ENG: "§e[PVPbot] Detected Bot death event."
  },
  DEATH_FAIL_DROP: {
    JPN: "§c[PVPbot] インベントリアイテムのドロップ準備に失敗しました",
    ENG: "§c[PVPbot] Failed to prepare inventory item drops."
  },
  SPAWN_MESSAGE: {
    JPN: (levelName) => `§ePVPbot（${levelName}）がゲームに入室しました`,
    ENG: (levelName) => `§ePVPbot (${levelName}) has joined the game.`
  },
  EXIT_MESSAGE_DROP: {
    JPN: (name, count) => `§e${name}がゲームを退出しました（インベントリのアイテム ${count} 個をドロップ）`,
    ENG: (name, count) => `§e${name} left the game (Dropped ${count} inventory items)`
  },
  EXIT_MESSAGE_NONE: {
    JPN: (name) => `§e${name}がゲームを退出しました（ドロップできるインベントリアイテムはありません）`,
    ENG: (name) => `§e${name} left the game (No inventory items to drop)`
  }
};