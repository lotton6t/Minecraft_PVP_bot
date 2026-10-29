const CRIT_CHANCE_BY_LEVEL = {
  1: 0.15,
  2: 0.25,
  3: 0.35,
  4: 0.45,
  5: 0.55,
};

export function createCriticalAction() {
  return function getCriticalJumpPower(level) {
    const chance = CRIT_CHANCE_BY_LEVEL[level] ?? CRIT_CHANCE_BY_LEVEL[3];
    return Math.random() < chance ? 0.45 : 0;
  };
}