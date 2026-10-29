export function createFallBehavior({ knockback }) {
  const DROP_MIN = 2.5;
  const DROP_SCAN = 24;

  function tryDescend(master, target, dim, state) {
    if (state.dropCd > 0) return false;
    if (!master.isOnGround) return false;

    const location = master.location;
    const dy = target.location.y - location.y;
    if (dy > -DROP_MIN) return false;

    const dx = target.location.x - location.x;
    const dz = target.location.z - location.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length < 0.001) return false;
    const nx = dx / length, nz = dz / length;

    const frontX = location.x + nx * 0.9;
    const frontZ = location.z + nz * 0.9;
    try {
      const at = dim.getBlock({ x: frontX, y: location.y, z: frontZ });
      if (!at || !(at.isAir || at.isLiquid)) return false;

      const below = dim.getBlock({ x: frontX, y: location.y - 1, z: frontZ });
      if (below && !below.isAir && !below.isLiquid) return false;
    } catch { return false; }

    let landing = null;
    try {
      const hit = dim.getBlockFromRay(
        { x: frontX, y: location.y - 1.2, z: frontZ },
        { x: 0, y: -1, z: 0 },
        { maxDistance: DROP_SCAN, includeLiquidBlocks: true, includePassableBlocks: false }
      );
      if (hit && hit.block) landing = hit.block;
    } catch { return false; }

    if (!landing) return false;
    if (landing.typeId === "minecraft:lava" || landing.typeId === "minecraft:flowing_lava") {
      return false;
    }

    knockback(master, nx, nz, 0.42, 0.02);
    state.dropCd = 8;
    return true;
  }

  return { tryDescend };
}