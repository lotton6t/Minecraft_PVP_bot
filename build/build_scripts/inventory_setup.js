import { ItemStack } from "@minecraft/server";

export function createInventorySetup({
  inventoryConfig,
  getLevel,
  getState,
  getBotInventory,
  ensureWaterBucketInventory,
}) {
  return function initializeInventory(master) {
    const healingItem = inventoryConfig.levels[getLevel(master)].healingItem;
    const state = getState(master);
    if (state.healingItemId !== healingItem.id || typeof state.healingItemAmount !== "number") {
      state.healingItemId = healingItem.id;
      state.healingItemAmount = healingItem.amount;
    }
    try {
      const container = getBotInventory(master);
      const item = container.getItem(0);
      if (!item) {
        container.setItem(0, new ItemStack(healingItem.id, state.healingItemAmount));
      } else if (item.typeId !== healingItem.id) {
        const validHealingItem = Object.values(inventoryConfig.levels).some(
          (configured) => configured.healingItem.id === item.typeId
        );
        if (!validHealingItem) {
          throw new Error(`Unexpected item in healing inventory: ${item.typeId}`);
        }
        container.setItem(0, new ItemStack(
          healingItem.id,
          Math.min(state.healingItemAmount, healingItem.amount)
        ));
      } else {
        state.healingItemAmount = Math.min(item.amount, healingItem.amount);
        if (item.amount !== state.healingItemAmount) {
          item.amount = state.healingItemAmount;
          container.setItem(0, item);
        }
      }
    } catch (error) {
      console.warn(`[PVPbot] 回復用インベントリを同期できません。内部の所持数で管理します: ${error}`);
    }
    try {
      ensureWaterBucketInventory(master);
    } catch (error) {
      console.warn(`[PVPbot] 水バケツをインベントリに準備できません: ${error}`);
    }
    return true;
  };
}