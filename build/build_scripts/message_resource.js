export const MSG_DATA = {
  LOAD_SUCCESS: {
    JPN: "§a[PVPbot] スクリプト v1.25.24 を読み込みました",
    ENG: "§a[PVPbot] Script v1.25.24 loaded successfully."
  },
  LOAD_FAIL: {
    JPN: "起動通知を送信できませんでした",
    ENG: "Failed to send startup notification."
  },
  SPAWN_MESSAGE: {
    JPN: (levelName) => `§e${levelName}がゲームに入室しました`,
    ENG: (levelName) => `§e${levelName} has joined the game.`
  },
  EXIT_MESSAGE: {
    JPN: (levelName) => `§e${levelName}がゲームを退出しました`,
    ENG: (levelName) => `§e${levelName} left the game.`
  },
  PLAYER_KILL_MESSAGE: {
    JPN: (levelName, killerName) => `§f${levelName}は${killerName}に倒された`,
    ENG: (levelName, killerName) => `§f${levelName} was killed by ${killerName}.`
  },
  BOT_KILL_MESSAGE: {
    JPN: (levelName, killerName) => `§f${levelName}は${killerName}に倒された`,
    ENG: (levelName, killerName) => `§f${levelName} was killed by ${killerName}.`
  },
  DEATH_MESSAGE: {
    JPN: (levelName, cause) => `§f${levelName}は${cause || "不明な原因"}で倒された`,
    ENG: (levelName, cause) => `§f${levelName} was killed by ${cause || "an unknown cause"}.`
  }
};

export const MSG_DEATH_CAUSE = {
  anvil: {
    JPN: "金床に押しつぶされた",
    ENG: "was squashed by a falling anvil"
  },
  blockExplosion: {
    JPN: "爆発で倒された",
    ENG: "was blown up"
  },
  drowning: {
    JPN: "溺死した",
    ENG: "drowned"
  },
  entityExplosion: {
    JPN: "爆発で倒された",
    ENG: "was blown up"
  },
  fall: {
    JPN: "落下死した",
    ENG: "fell from a high place"
  },
  fallingBlock: {
    JPN: "落下ブロックに押しつぶされた",
    ENG: "was squashed by a falling block"
  },
  fire: {
    JPN: "火で焼け死んだ",
    ENG: "went up in flames"
  },
  fireTick: {
    JPN: "火で焼け死んだ",
    ENG: "burned to death"
  },
  fireworks: {
    JPN: "花火で倒された",
    ENG: "went off with a bang"
  },
  flyIntoWall: {
    JPN: "壁に激突して倒れた",
    ENG: "experienced kinetic energy"
  },
  freezing: {
    JPN: "凍死した",
    ENG: "froze to death"
  },
  lava: {
    JPN: "溶岩で焼け死んだ",
    ENG: "tried to swim in lava"
  },
  lightning: {
    JPN: "雷に打たれた",
    ENG: "was struck by lightning"
  },
  magic: {
    JPN: "魔法で倒された",
    ENG: "was killed by magic"
  },
  magma: {
    JPN: "マグマブロックで倒れた",
    ENG: "discovered the floor was lava"
  },
  projectile: {
    JPN: "飛び道具で倒された",
    ENG: "was shot"
  },
  stalactite: {
    JPN: "鍾乳石に貫かれた",
    ENG: "was pierced by a falling stalactite"
  },
  stalagmite: {
    JPN: "尖った鍾乳石に貫かれた",
    ENG: "was impaled on a stalagmite"
  },
  starve: {
    JPN: "飢え死にした",
    ENG: "starved to death"
  },
  suffocation: {
    JPN: "窒息死した",
    ENG: "suffocated in a wall"
  },
  void: {
    JPN: "奈落に落ちた",
    ENG: "fell out of the world"
  },
  wither: {
    JPN: "衰弱して倒れた",
    ENG: "withered away"
  },
  sonicBoom: {
    JPN: "ソニックブームで倒された",
    ENG: "was obliterated by a sonic boom"
  },
  maceSmash: {
    JPN: "メイスで叩きつぶされた",
    ENG: "was smashed by a mace"
  }
};