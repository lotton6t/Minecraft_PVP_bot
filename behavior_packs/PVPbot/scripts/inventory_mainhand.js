import { EquipmentSlot, ItemStack, world } from "@minecraft/server";

export function getHeldItemId(master) {
  try {
    const equippable = master.getComponent("minecraft:equippable");
    if (equippable) {
      const held = equippable.getEquipment(EquipmentSlot.Mainhand);
      return held ? held.typeId : "(素手)";
    }
  } catch {}
  return null;
}

export function createMainhandController({ inventoryConfig, getLevel, getState }) {
  function getWeaponId(master) {
    const override = world.getDynamicProperty("pvp_weapon");
    if (typeof override === "string" && override.length > 0) return override;
    return master
      ? inventoryConfig.levels[getLevel(master)].weapon
      : inventoryConfig.defaultWeapon;
  }

  function setMainhandItem(entity, item, label) {
    let equipped = false;
    const errors = [];

    try {
      const equippable = entity.getComponent("minecraft:equippable");
      if (!equippable) throw new Error("Equippable component is unavailable");
      equippable.setEquipment(EquipmentSlot.Mainhand, item);
      equipped = true;
    } catch (error) {
      errors.push(`equippable: ${error}`);
    }

    if (item) {
      try {
        const itemId = item.typeId.replace("minecraft:", "");
        const result = entity.runCommand(
          `replaceitem entity @s slot.weapon.mainhand 0 ${itemId} ${item.amount}`
        );
        if (result.successCount > 0) equipped = true;
        else errors.push(`replaceitem: ${result.statusMessage}`);
      } catch (error) {
        errors.push(`replaceitem: ${error}`);
      }
    }

    if (!equipped) console.warn(`[PVPbot] ${label}に失敗しました: ${errors.join("; ")}`);
    return equipped;
  }

  function getMainhandMode(master, state) {
    if (state.waterMlgPhase === "armed" || state.waterMlgPhase === "recovered") return "falling";
    if (state.waterMlgPhase === "placed") return "fallingEmpty";
    return state.healing ? "recovery" : "combat";
  }

  function updateMainhandMode(master, force = false) {
    const state = getState(master);
    const mode = getMainhandMode(master, state);
    if (!force && state.mainhandMode === mode) return true;

    let itemId;
    let label;
    switch (mode) {
      case "falling":
        itemId = inventoryConfig.waterBucket.fullItem;
        label = "落下モードの水バケツ装備";
        break;
      case "fallingEmpty":
        itemId = inventoryConfig.waterBucket.emptyItem;
        label = "落下モードの空バケツ装備";
        break;
      case "recovery":
        itemId = inventoryConfig.levels[getLevel(master)].healingItem.id;
        label = "回復モードの食料装備";
        break;
      default:
        itemId = getWeaponId(master);
        label = "戦闘モードの武器装備";
    }

    const equipped = setMainhandItem(master, new ItemStack(itemId, 1), label);
    if (equipped) state.mainhandMode = mode;
    return equipped;
  }

  return { getWeaponId, setMainhandItem, getMainhandMode, updateMainhandMode };
}