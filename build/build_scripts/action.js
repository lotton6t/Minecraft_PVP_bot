export function createActionController({
  lavaEscapeTick,
  updateTarget,
  tryStartHealing,
  cqcAttackAction,
  pillarBehavior,
  tryDescend,
  tryLavaBridge,
  breakTowards,
  distance,
}) {
  return function decideActions(master, dim, state) {
    if (lavaEscapeTick(master, dim, state)) return;

    const location = master.location;
    const found = updateTarget(dim, location, state);
    tryStartHealing(master);

    if (!found) return;
    const target = found.player;
    const targetDistance = found.distance;

    cqcAttackAction(master, target, targetDistance, state);

    const targetDx = target.location.x - location.x;
    const targetDz = target.location.z - location.z;
    const horizontalDistance = Math.sqrt(targetDx * targetDx + targetDz * targetDz);
    const verticalDistance = target.location.y - location.y;

    if (pillarBehavior.pillarTick(master, target, dim, state)) return;

    if (verticalDistance >= 2.0 && horizontalDistance <= 3.5 &&
        master.isOnGround && state.pillarCd <= 0) {
      pillarBehavior.startPillar(master, state);
      state.pillarCd = 20;
      if (pillarBehavior.pillarTick(master, target, dim, state)) return;
    }

    tryDescend(master, target, dim, state);
    tryLavaBridge(master, target, dim, state, targetDistance);

    if (targetDistance <= 5 && state.breakCd <= 0) {
      const eye = { x: location.x, y: location.y + 1.5, z: location.z };
      const tx = target.location.x - eye.x;
      const ty = target.location.y + 1.0 - eye.y;
      const tz = target.location.z - eye.z;
      const rayLength = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
      let blocked = false;
      try {
        const hit = dim.getBlockFromRay(
          eye,
          { x: tx / rayLength, y: ty / rayLength, z: tz / rayLength },
          { maxDistance: Math.min(rayLength, 5), includeLiquidBlocks: false, includePassableBlocks: false }
        );
        blocked = !!(hit && hit.block);
      } catch {}
      if (blocked) {
        state.boxTicks = (state.boxTicks || 0) + 1;
        if (state.boxTicks > 12) {
          breakTowards(master, target, dim);
          state.breakCd = 10;
          state.boxTicks = 0;
        }
      } else {
        state.boxTicks = 0;
      }
    }

    if (targetDistance > 3) {
      if (state.lastPos) {
        const moved = distance(location, state.lastPos);
        if (moved < 0.06) state.stuckTicks++;
        else state.stuckTicks = 0;
      }
      state.lastPos = { x: location.x, y: location.y, z: location.z };
      if (state.stuckTicks > 15 && state.breakCd <= 0) {
        breakTowards(master, target, dim);
        state.breakCd = 10;
        state.stuckTicks = 0;
      }
    } else {
      state.stuckTicks = 0;
    }
  };
}