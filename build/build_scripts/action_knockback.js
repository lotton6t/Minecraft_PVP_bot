// Support both applyKnockback signatures used by different Minecraft versions.
// Legacy: applyKnockback(dirX, dirZ, horizontal, vertical)
// Current: applyKnockback({ x, z }, vertical)
export function knockback(entity, dx, dz, horizontal, vertical) {
  try {
    entity.applyKnockback(dx, dz, horizontal, vertical);
    return true;
  } catch {}
  try {
    entity.applyKnockback({ x: dx * horizontal, z: dz * horizontal }, vertical);
    return true;
  } catch {}
  return false;
}
