export function createBridgeAction({
  knockback,
  isEditProtected,
  bridgeBlock,
}) {
  return function tryBridge(master, target, dim, state, distance) {
    if (state.bridgeCd > 0) { state.bridgeCd--; return false; }
    if (!master.isOnGround || distance < 2.5) return false;

    const location = master.location;
    const dy = target.location.y - location.y;
    if (Math.abs(dy) >= 3) return false;

    const dx = target.location.x - location.x;
    const dz = target.location.z - location.z;
    const length = Math.sqrt(dx * dx + dz * dz) || 1;
    const nx = dx / length, nz = dz / length;
    const feetY = Math.floor(location.y + 0.02);
    const ax = Math.floor(location.x + nx * 1.2);
    const az = Math.floor(location.z + nz * 1.2);

    let feetAhead, stepAhead, below2;
    try {
      feetAhead = dim.getBlock({ x: ax, y: feetY, z: az });
      stepAhead = dim.getBlock({ x: ax, y: feetY - 1, z: az });
      below2 = dim.getBlock({ x: ax, y: feetY - 2, z: az });
    } catch { return false; }
    if (!feetAhead || !stepAhead) return false;

    const isLava = (block) => block &&
      (block.typeId === "minecraft:lava" || block.typeId === "minecraft:flowing_lava");
    if (isLava(feetAhead) || !feetAhead.isAir) return false;

    const needBridge = isLava(stepAhead) || (stepAhead.isAir && isLava(below2));
    if (!needBridge || isEditProtected(dim, ax, feetY - 1, az)) return false;

    try {
      stepAhead.setType(bridgeBlock);
      dim.playSound("use.stone", { x: ax + 0.5, y: feetY - 0.5, z: az + 0.5 });
    } catch { return false; }

    knockback(master, nx, nz, 0.22, 0.05);
    state.bridgeCd = 6;
    return true;
  };
}