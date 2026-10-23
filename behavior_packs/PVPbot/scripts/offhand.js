export function createOffhandController(shieldId) {
  return function equipOffhandShield(master) {
    try {
      const item = shieldId.replace("minecraft:", "");
      const result = master.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${item} 1`);
      if (result.successCount < 1) {
        console.warn(`[PVPbot] 盾の装備に失敗しました: ${item} (${result.statusMessage})`);
      }
    } catch (error) {
      console.warn(`[PVPbot] 盾の装備に失敗しました: ${error}`);
    }
  };
}