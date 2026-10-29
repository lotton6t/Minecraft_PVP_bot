import { system } from "@minecraft/server";

const HEAL_AMOUNT_BY_ITEM = {
  "minecraft:cooked_beef": 6,
  "minecraft:golden_carrot": 8,
  "minecraft:golden_apple": 10,
};
const HEAL_THRESHOLD = 8;
const HEAL_COOLDOWN = 100;

export function createHealingHandler({
  inventoryConfig,
  getLevel,
  getState,
  getBotInventory,
  broadcastMessage,
  getHealingItem,
  getMainhandMode,
  updateMainhandMode,
  equipWeapon,
}) {
  function consumeHealingItem(master) {
    const healingItem = inventoryConfig.levels[getLevel(master)].healingItem;
    const state = getState(master);
    if (state.healingItemId !== healingItem.id || state.healingItemAmount < 1) return false;
    state.healingItemAmount--;
    try {
      const container = getBotInventory(master);
      const item = container.getItem(0);
      if (item && item.typeId === healingItem.id) {
        container.setItem(0, state.healingItemAmount > 0
          ? new ItemStack(healingItem.id, state.healingItemAmount)
          : undefined);
      }
    } catch (error) {
      console.warn(`[PVPbot] 回復アイテム数をインベントリに反映できませんでした: ${error}`);
    }
    state.healingItemId = healingItem.id;
    return true;
  }

  return function tryStartHealing(master) {
    const state = getState(master);
    const health = master.getComponent("minecraft:health");
    if (!health) return false;

    const maxHealth = health.effectiveMax;
    const currentHealth = health.currentValue;
    if (!Number.isFinite(maxHealth) || maxHealth <= 0 || !Number.isFinite(currentHealth)) return false;
    if (currentHealth > HEAL_THRESHOLD) return false;

    if (state.healing || state.healCd > 0 || state.healingItemAmount < 1) return false;

    const healingItem = getHealingItem(master);
    const healAmount = HEAL_AMOUNT_BY_ITEM[healingItem.id];
    if (typeof healAmount !== "number") return false;

    if (!consumeHealingItem(master)) {
      state.healCd = HEAL_COOLDOWN;
      return false;
    }

    state.healing = true;

    state.healCd = HEAL_COOLDOWN;
    try {
      master.addEffect("slowness", 30, { amplifier: 5, showParticles: false });
      master.addEffect("weakness", 30, { amplifier: 5, showParticles: false });
    } catch (error) {
      console.warn(`[PVPbot] 回復中の効果を付与できませんでした: ${error}`);
    }
    for (let i = 0; i < 3; i++) {
      system.runTimeout(() => {
        try {
          master.dimension.playSound("random.eat", master.location, { volume: 1.0 });
        } catch {}
      }, i * 10);
    }

    system.runTimeout(() => {
      try {
        if (!master.isValid) return;
        const currentHealthComponent = master.getComponent("minecraft:health");
        if (!currentHealthComponent || currentHealthComponent.currentValue <= 0) return;

        const before = currentHealthComponent.currentValue;
        const targetHealth = Math.min(currentHealthComponent.effectiveMax, before + healAmount);
        if (Number.isFinite(targetHealth) && targetHealth > 0) {
          currentHealthComponent.setCurrentValue(targetHealth);
        }

        if (healingItem.id === "minecraft:golden_apple") {
          master.addEffect("regeneration", 100, { amplifier: 1, showParticles: true });
          master.addEffect("absorption", 600, { amplifier: 0, showParticles: true });
        }
        master.dimension.playSound("random.burp", master.location);
      } catch (error) {
        console.warn(`[PVPbot] 回復処理に失敗しました: ${error}`);
      } finally {
        state.healing = false;
        try {
          if (master.isValid && master.getComponent("minecraft:health")?.currentValue > 0) {
            equipWeapon(master);
          }
        } catch (error) {
          console.warn(`[PVPbot] 回復後に武器を戻せませんでした: ${error}`);
        }
      }
    }, 30);
    return true;
  };
}