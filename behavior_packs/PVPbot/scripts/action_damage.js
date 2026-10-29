import { system } from "@minecraft/server";

export function createBotDamageAction({ masterId, getState, tryStartHealing }) {
  return function handleBotDamage(ev) {
    const hurt = ev.hurtEntity;
    if (!hurt || hurt.typeId !== masterId) return;

    const health = hurt.getComponent("minecraft:health");
    if (!health || health.currentValue <= 0) return;

    const state = getState(hurt);
    if (state.healStatusCd <= 0) state.healStatusCd = 40;

    system.run(() => {
      try {
        if (hurt.isValid && health.currentValue > 0) {
          tryStartHealing(hurt);
        }
      } catch (error) {
        console.error(`[PVPbot] 被ダメージ後の回復開始に失敗しました: ${error}`);
      }
    });
  };
}