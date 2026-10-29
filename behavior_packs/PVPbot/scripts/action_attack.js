export function createPlayerAttackAction({ masterId, knockback }) {
  return function applyPlayerAttackKnockback(ev) {
    const attacker = ev.damageSource ? ev.damageSource.damagingEntity : undefined;
    const hurt = ev.hurtEntity;
    if (!attacker || attacker.typeId !== masterId) return;
    if (!hurt || hurt.typeId !== "minecraft:player") return;
    if (Math.random() >= 0.25) return;

    try {
      const dx = hurt.location.x - attacker.location.x;
      const dz = hurt.location.z - attacker.location.z;
      const length = Math.sqrt(dx * dx + dz * dz) || 1;
      knockback(hurt, dx / length, dz / length, 0.3, 0.2);
    } catch {}
  };
}