import { world } from "@minecraft/server";
import { MSG_DEATH_CAUSE } from "./message_resource.js";

export function registerDeathHandler(dependencies) {
  world.afterEvents.entityDie.subscribe((ev) => handleEntityDeath(ev, dependencies));
}

function handleEntityDeath(ev, { masterId, broadcastMessage, dropInventoryItems, states }) {
  const dead = ev.deadEntity;
  if (!dead) return;

  if (dead.typeId === masterId)
    {
    let droppedAmount = 0;
    try
    {
      droppedAmount = dropInventoryItems(dead) || 0;
    }
    catch (error)
    {
      console.warn(`[PVPbot] 死亡時にインベントリアイテムを回収できませんでした: ${error}`);
    }

    let killer;
    let botName = "PVPbot";
    let cause;
    try
    {
      killer = ev.damageSource && ev.damageSource.damagingEntity;
    }
    catch
    {

    }
    try
    {
      const lvNum = getLevel(dead); 
      botName = LEVELS[lvNum]?.name || "PVPbot";
    }
    catch
    {
      botName = "PVPbot"; // 万が一レベルが読めなくてもフリーズしない
    }
    try
    {
      cause = ev.damageSource && ev.damageSource.cause;
    }
    catch
    {

    }

    let deathMessage = `§f${botName}は倒された`;
    try
    {
      //プレイヤーによるキルの場合
      if (killer && killer.typeId === "minecraft:player")
      {
        deathMessage = `§f${botName}は${killer.name}に殺害された`;
        broadcastMessage(MSG_DATA.PLAYER_KILL_MESSAGE(botName, killer.name));         // 死亡メッセージを送信
      }
      //ボットによるキルの場合
      else if (killer)
      {
        const killerName = killer.nameTag || killer.typeId;
        deathMessage = `§f${botName}は${killerName}に倒された`;
        broadcastMessage(MSG_DATA.BOT_KILL_MESSAGE(botName, killerName));         // 死亡メッセージを送信
      }
      //死因が取得できない場合
      else
      {
        deathMessage = `§f${botName}は${MSG_DEATH_CAUSE[cause]?.[langKey] || `${cause || "不明な原因"}で倒された`}`;
        broadcastMessage(MSG_DATA.DEATH_MESSAGE(botName, cause));         // 死亡メッセージを送信
      }
    }
    catch (error)
    {
      console.warn(`${MSG_PREFIX} 死因を取得できませんでした: ${error}`);
    }
    //broadcastMessage(deathMessage);         // 死亡メッセージを送信
    broadcastChat("EXIT_MESSAGE", botName); // 退出メッセージを送信

    return;
  }

  const killer = ev.damageSource ? ev.damageSource.damagingEntity : undefined;
  if (dead.typeId === "minecraft:player" && killer && killer.typeId === masterId)
  {
    try
    {
      const health = killer.getComponent("minecraft:health");
      if (health) health.resetToMaxValue();
    }
    catch
    {
      console.warn(`[PVPbot] キル後に体力を回復できませんでした: ${killer.name}`);
    }
  }
}