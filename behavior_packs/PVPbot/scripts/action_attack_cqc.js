export function createCqcAttackAction({ strafeAction, getLevel, criticalAction }) {
  return function attackAtCloseRange(master, target, distance, state) {
    if (distance >= 5.5 || state.strafeCd > 0 || !master.isOnGround) return false;

    const side = Math.random() < 0.5 ? 1 : -1;
    const level = getLevel(master);
    const jumpPower = criticalAction(level);

    strafeAction(master, target, level, side, jumpPower);
    state.strafeCd = 7 + Math.floor(Math.random() * 7);
    return true;
  };
}