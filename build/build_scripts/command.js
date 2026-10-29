import { world, system, ItemStack } from "@minecraft/server";

const RENDER_LIMITED = new Set([
  "minecraft:trident",
  "minecraft:shield",
]);

export function registerCommands({
  dimensions,
  masterId,
  targetTag,
  inventoryConfig,
  getTargetMode,
  applyTargetMode,
  equipWeapon,
  getHeldItemId,
}) {
  // Usage: /scriptevent pvpbot:target tag or /scriptevent pvpbot:target all
  system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id !== "pvpbot:target") return;
    const mode = (ev.message || "").trim().toLowerCase();

    if (mode !== "tag" && mode !== "all") {
      world.sendMessage("§c[PVPbot] 使い方: /scriptevent pvpbot:target <all / tag>");
      world.sendMessage("§7  all = 全プレイヤーを狙う(初期値)");
      world.sendMessage("§7  tag = /tag <名前> add pvp_target を付けた人だけ狙う");
      world.sendMessage(`§7  現在: ${getTargetMode()}`);
      return;
    }

    world.setDynamicProperty("pvp_target_mode", mode);
    for (const dimId of dimensions) {
      try {
        const dim = world.getDimension(dimId);
        for (const entity of dim.getEntities({ type: masterId })) {
          applyTargetMode(entity);
        }
      } catch {}
    }

    if (mode === "tag") {
      world.sendMessage("§6[PVPbot] §epvp_target §bタグのあるプレイヤーだけ §eを狙うモードにしました");
      let count = 0;
      try {
        for (const player of world.getPlayers()) {
          if (player.hasTag(targetTag)) count++;
        }
      } catch {}
      if (count === 0) {
        world.sendMessage("§e  ⚠ タグの付いたプレイヤーがいません。このままだと誰も狙いません");
        world.sendMessage("§7  /tag <プレイヤー名> add pvp_target で対象を指定してください");
      } else {
        world.sendMessage(`§7  現在の対象: ${count}人`);
      }
    } else {
      world.sendMessage("§6[PVPbot] §e全プレイヤー §eを狙うモードに戻しました");
    }
  });

  // Usage: /scriptevent pvpbot:weapon <item ID>
  system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id !== "pvpbot:weapon") return;
    let id = (ev.message || "").trim().toLowerCase();
    if (id.length === 0) {
      world.sendMessage("§c[PVPbot] 使い方: /scriptevent pvpbot:weapon <アイテムID>");
      world.sendMessage("§7  例: diamond_sword / netherite_axe / iron_sword / stick");
      world.sendMessage("§7  ※trident等の一部は装備されても見た目が表示されない場合あり");
      const weaponOverride = world.getDynamicProperty("pvp_weapon");
      world.sendMessage(typeof weaponOverride === "string" && weaponOverride.length > 0
        ? `§7  現在の武器設定: ${weaponOverride}（全レベル共通）`
        : `§7  現在の武器設定: レベル別（${Object.entries(inventoryConfig.levels)
          .map(([level, settings]) => `${level}=${settings.weapon.replace("minecraft:", "")}`)
          .join(", ")}）`);
      return;
    }
    if (!id.includes(":")) id = "minecraft:" + id;
    try {
      new ItemStack(id, 1);
    } catch {
      world.sendMessage(`§c[PVPbot] アイテムID「${id}」が見つかりません`);
      return;
    }
    world.setDynamicProperty("pvp_weapon", id);
    if (RENDER_LIMITED.has(id)) {
      world.sendMessage(`§e[PVPbot] 注意: §b${id.replace("minecraft:", "")} §eはマイクラの仕様で、Mobが手に持った見た目が表示されないことがあります`);
      world.sendMessage(`§7  装備と攻撃力は反映されています(素手に見えても${id.replace("minecraft:", "")}の威力で殴ってきます)`);
    }
    let total = 0, done = 0;
    for (const dimId of dimensions) {
      try {
        const dim = world.getDimension(dimId);
        for (const master of dim.getEntities({ type: masterId })) {
          total++;
          if (equipWeapon(master)) {
            done++;
            dim.playSound("armor.equip_generic", master.location);
          }
        }
      } catch {}
    }
    const short = id.replace("minecraft:", "");
    if (total === 0) {
      world.sendMessage(`§6[PVPbot] §e武器を §b${short} §eに設定しました(次にスポーンした個体から反映)`);
    } else if (done === total) {
      world.sendMessage(`§6[PVPbot] §e武器を §b${short} §eに変更しました(${done}体)`);
    } else {
      world.sendMessage(`§c[PVPbot] ${total}体中${done}体しか持ち替えられませんでした`);
      world.sendMessage("§7  5秒ごとに自動で再適用されます。直らない場合は個体を出し直してください");
    }
    system.runTimeout(() => {
      try {
        for (const dimId of dimensions) {
          const dim = world.getDimension(dimId);
          for (const master of dim.getEntities({ type: masterId })) {
            const held = getHeldItemId(master);
            if (held !== null) {
              world.sendMessage(`§7[確認] 現在の手持ち: ${held.replace("minecraft:", "")}`);
              return;
            }
          }
        }
      } catch {}
    }, 5);
  });
}
