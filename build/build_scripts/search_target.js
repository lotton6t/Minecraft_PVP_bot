export function createTargetSearcher({ getTargetMode, targetTag, distance, excludeGameModes }) {
  function findNearestPlayer(dim, location) {
    const tagMode = getTargetMode() === "tag";
    let nearest = null;
    let nearestDistance = Infinity;
    for (const player of dim.getPlayers({
      location,
      maxDistance: 150,
      excludeGameModes,
    })) {
      if (tagMode) {
        try {
          if (!player.hasTag(targetTag)) continue;
        } catch {
          continue;
        }
      }
      const playerDistance = distance(player.location, location);
      if (playerDistance < nearestDistance) {
        nearestDistance = playerDistance;
        nearest = player;
      }
    }
    return nearest ? { player: nearest, distance: nearestDistance } : null;
  }

  function updateTarget(dim, location, state) {
    if (state.scanCd === undefined || state.scanCd <= 0) {
      state.cachedTarget = findNearestPlayer(dim, location);
      state.scanCd = 4;
    } else {
      state.scanCd--;
      if (state.cachedTarget && !state.cachedTarget.player.isValid) state.cachedTarget = null;
    }

    return state.cachedTarget
      ? { player: state.cachedTarget.player, distance: distance(state.cachedTarget.player.location, location) }
      : null;
  }

  return { updateTarget };
}