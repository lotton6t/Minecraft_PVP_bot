import { system } from "@minecraft/server";

export function createInventoryDropper({ getBotInventory, broadcastMessage }) {
  return function dropInventoryItems(master) {
    const container = getBotInventory(master);
    const items = [];
    for (let slot = 0; slot < container.size; slot++) {
      const item = container.getItem(slot);
      if (!item) continue;
      items.push(item.clone());
      container.setItem(slot, undefined);
    }
    if (items.length === 0) return 0;

    const dimension = master.dimension;
    const location = { ...master.location, y: master.location.y + 0.25 };
    system.runTimeout(() => {
      for (const item of items) {
        try {
          dimension.spawnItem(item, location);
          console.info(`[PVPbot] インベントリアイテムをドロップしました: ${item.typeId} x${item.amount}`);
        } catch (error) {
          console.error(`[PVPbot] インベントリアイテムをドロップできませんでした (${item.typeId} x${item.amount}): ${error}`);
          broadcastMessage(`§c[PVPbot] ${item.typeId.replace("minecraft:", "")} のドロップに失敗しました: ${error}`);
        }
      }
    }, 1);
    return items.reduce((total, item) => total + item.amount, 0);
  };
}