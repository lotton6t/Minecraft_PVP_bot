const STRAFE_POW_BY_LEVEL = {
  1: 0.30,
  2: 0.35,
  3: 0.40,
  4: 0.45,
  5: 0.50,
};

export function createStrafeAction({ knockback }) {
  return function strafe(master, target, level, side, jumpPower) {
    const dx = target.location.x - master.location.x;
    const dz = target.location.z - master.location.z;
    const length = Math.sqrt(dx * dx + dz * dz) || 1;
    const nx = dx / length;
    const nz = dz / length;
    const knockbackX = nx * 0.55 + (-nz * side) * 0.85;
    const knockbackZ = nz * 0.55 + (nx * side) * 0.85;
    const strafePow = STRAFE_POW_BY_LEVEL[level] ?? STRAFE_POW_BY_LEVEL[3];

    knockback(master, knockbackX, knockbackZ, strafePow, jumpPower);
  };
}