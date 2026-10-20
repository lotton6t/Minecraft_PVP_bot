import { world } from "@minecraft/server";

export function registerDeathHandler(dependencies) {
  world.afterEvents.entityDie.subscribe((ev) => handleEntityDeath(ev, dependencies));
}

function handleEntityDeath(ev, { masterId, broadcastMessage, dropInventoryItems, states }) {
  const dead = ev.deadEntity;
  if (!dead) return;

  if (dead.typeId === masterId) {
    broadcastMessage("§e[PVPbot] Botの死亡イベントを検知しました");
    let droppedAmount = 0;
    try {
      droppedAmount = dropInventoryItems(dead) || 0;
    } catch (error) {
      console.warn(`[PVPbot] 死亡時にインベントリアイテムを回収できませんでした: ${error}`);
      broadcastMessage(`§c[PVPbot] インベントリアイテムのドロップ準備に失敗しました: ${error}`);
    }

    let killer;
    let botName = "PVPbot";
    let cause;
    try { killer = ev.damageSource && ev.damageSource.damagingEntity; } catch {}
    try { botName = dead.nameTag || botName; } catch {}
    try { cause = ev.damageSource && ev.damageSource.cause; } catch {}

    const causes = {
      anvil: "金床に押しつぶされた",
      blockExplosion: "爆発で倒された",
      drowning: "溺死した",
      entityExplosion: "爆発で倒された",
      fall: "落下死した",
      fallingBlock: "落下ブロックに押しつぶされた",
      fire: "火で焼け死んだ",
      fireTick: "火で焼け死んだ",
      fireworks: "花火で倒された",
      flyIntoWall: "壁に激突して倒れた",
      freezing: "凍死した",
      lava: "溶岩で焼け死んだ",
      lightning: "雷に打たれた",
      magic: "魔法で倒された",
      magma: "マグマブロックで倒れた",
      projectile: "飛び道具で倒された",
      stalactite: "鍾乳石に貫かれた",
      stalagmite: "尖った鍾乳石に貫かれた",
      starve: "飢え死にした",
      suffocation: "窒息死した",
      void: "奈落に落ちた",
      wither: "衰弱して倒れた",
      sonicBoom: "ソニックブームで倒された",
      maceSmash: "メイスで叩きつぶされた",
    };
    let deathMessage = `§f${botName}は倒された`;
    try {
      if (killer && killer.typeId === "minecraft:player") {
        deathMessage = `§f${botName}は${killer.name}に殺害された`;
      } else if (killer) {
        const killerName = killer.nameTag || killer.typeId;
        deathMessage = `§f${botName}は${killerName}に倒された`;
      } else {
        deathMessage = `§f${botName}は${causes[cause] || `${cause || "不明な原因"}で倒された`}`;
      }
    } catch (error) {
      console.warn(`[PVPbot] 死因を取得できませんでした: ${error}`);
    }
    broadcastMessage(deathMessage);
    broadcastMessage(droppedAmount > 0
      ? `§e${botName}がゲームを退出しました（インベントリのアイテム ${droppedAmount} 個をドロップ）`
      : `§e${botName}がゲームを退出しました（ドロップできるインベントリアイテムはありません）`);

    const state = states.get(dead.id);
    if (state) {
      for (const water of state.placedWater) {
        try {
          const block = world.getDimension(water.dimId).getBlock({
            x: water.x,
            y: water.y,
            z: water.z,
          });
          if (block && block.typeId === "minecraft:water") block.setType("minecraft:air");
        } catch {}
      }
    }
    states.delete(dead.id);
    return;
  }

  const killer = ev.damageSource ? ev.damageSource.damagingEntity : undefined;
  if (dead.typeId === "minecraft:player" && killer && killer.typeId === masterId) {
    try {
      const health = killer.getComponent("minecraft:health");
      if (health) health.resetToMaxValue();
    } catch {}
  }
}