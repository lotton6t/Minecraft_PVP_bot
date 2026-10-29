import { EquipmentSlot, ItemStack } from "@minecraft/server";

export function createArmorEquipper({ inventoryConfig, getLevel }) {
  return function equipLevelArmor(master) {
    const material = inventoryConfig.levels[getLevel(master)].armor;
    for (const { slot, suffix } of inventoryConfig.armorSlots) {
      const item = `${material}_${suffix}`;
      const equipmentSlot = {
        head: EquipmentSlot.Head,
        chest: EquipmentSlot.Chest,
        legs: EquipmentSlot.Legs,
        feet: EquipmentSlot.Feet,
      }[slot];
      let equipped = false;
      const errors = [];

      try {
        const equippable = master.getComponent("minecraft:equippable");
        if (!equippable || !equipmentSlot) throw new Error("Equippable component or armor slot is unavailable");
        equippable.setEquipment(equipmentSlot, new ItemStack(`minecraft:${item}`, 1));
        equipped = true;
      } catch (error) {
        errors.push(`equippable: ${error}`);
      }

      try {
        const result = master.runCommand(`replaceitem entity @s slot.armor.${slot} 0 ${item} 1`);
        if (result.successCount > 0) equipped = true;
        else errors.push(`replaceitem: ${result.statusMessage}`);
      } catch (error) {
        errors.push(`replaceitem: ${error}`);
      }
      if (!equipped) console.warn(`[PVPbot] 防具の装備に失敗しました (${item}): ${errors.join("; ")}`);
    }
  };
}