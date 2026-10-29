const BOT_LEVEL_NAMES = {
  1: "見習い",
  2: "兵士",
  3: "騎士",
  4: "剣聖",
  5: "魔王級",
};

export function getBotLevelName(level) {
  return BOT_LEVEL_NAMES[level] || "unknown";
}

export function createBotStatus({ getLevel }) {
  return function updateName(master) {
    const level = getLevel(master);
    try {
      const health = master.getComponent("minecraft:health");
      const current = health ? Math.ceil(health.currentValue) : "?";
      const maximum = health ? Math.ceil(health.effectiveMax) : "?";
      const nameTag = `PVPbot（${getBotLevelName(level)}） §cHP ${current}/${maximum}`;
      if (master.nameTag !== nameTag) master.nameTag = nameTag;
    } catch {}
  };
}