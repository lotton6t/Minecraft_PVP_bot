import { world, system } from "@minecraft/server";
import { ItemStack, EquipmentSlot } from "@minecraft/server";


export function registerSpawnSetup({
  masterId,
  getLevel,
  getBotLevelName,
  broadcastMessage,
  equipWeapon,
  equipLevelArmor,
  equipOffhandShield,
  syncSkin,
  updateName,
  applyTargetMode,
  initializeInventory,
}) {
  if (world.afterEvents.entityLoad)
    {
    world.afterEvents.entityLoad.subscribe((ev) => {
      const entity = ev.entity;
      if (!entity || entity.typeId !== masterId) return;
      system.runTimeout(() => {
        try
        {
          equipWeapon(entity);
          equipLevelArmor(entity);
          equipOffhandShield(entity);
          syncSkin(entity);
          updateName(entity);
          applyTargetMode(entity);
        }
        catch
        {
          console.warn(`[PVPbot] スポーン時の初期化に失敗しました: ${error}`);
        }
        initializeInventory(entity);
      }, 10);
    });
  }

  world.afterEvents.entitySpawn.subscribe((ev) => {
    const entity = ev.entity;
    if (!entity || entity.typeId !== masterId) return;

    try
    {
      // 入室メッセージを送信
      const lvNum = getLevel(entity);
      const lvName = getBotLevelName(lvNum);
      broadcastChat("SPAWN_MESSAGE", lvName);
    }
    catch (error)
    {
      console.warn(`[PVPbot] 入室メッセージを送信できませんでした: ${error}`);
    }

    try
    {
      system.runTimeout(() => {
        try
        {
          initializeInventory(entity);
          equipWeapon(entity);
          equipLevelArmor(entity);
          equipOffhandShield(entity);
          syncSkin(entity);
          updateName(entity);
          const health = entity.getComponent("minecraft:health");
          if (health) health.resetToMaxValue();
        }
        catch (error)
        {
          console.warn(`[PVPbot] スポーン時の初期化に失敗しました: ${error}`);
        }
      }, 10);
    }
    catch (error)
    {
      console.warn(`[PVPbot] スポーン時の初期化を予約できませんでした: ${error}`);
    }
  });
}