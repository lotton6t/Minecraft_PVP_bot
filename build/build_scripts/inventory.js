export function getBotInventory(master) {
  const inventory = master.getComponent("minecraft:inventory");
  if (!inventory || !inventory.container) {
    throw new Error("Bot inventory is unavailable");
  }
  return inventory.container;
}