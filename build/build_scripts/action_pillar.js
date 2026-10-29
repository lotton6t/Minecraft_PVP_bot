import { isProtected, isEditProtected } from "./block_protection.js";
import { putBlock } from "./block_put.js";
import { preparePillarJump } from "./action_jump.js";

export const PILLAR_BLOCK = "minecraft:cobblestone";

function createPillarBehavior({ isEditProtected, isProtected }) {
  const PILLAR_MAX = 40;
  const PILLAR_RANGE = 6;
  const PILLAR_STEP = 0.22;
  const PILLAR_CLEAR = 1.08;
  const PILLAR_SETTLE = 2;

  function startPillar(master, state) {
    const location = master.location;
    if (isEditProtected(master.dimension, location.x, location.y, location.z)) return;
    state.pillar = {
      active: true,
      bx: Math.floor(location.x),
      bz: Math.floor(location.z),
      placeY: null,
      phase: "jump",
      t: 0,
      placed: 0,
      fails: 0,
    };
  }

  function stopPillar(state) {
    if (state.pillar) state.pillar.active = false;
  }

  function pillarTick(master, target, dim, state) {
    const pillar = state.pillar;
    if (!pillar || !pillar.active) return false;

    const location = master.location;
    const dx = target.location.x - location.x;
    const dz = target.location.z - location.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    const verticalDistance = target.location.y - location.y;

    if (verticalDistance < 1.0 || pillar.placed >= PILLAR_MAX ||
        horizontalDistance > PILLAR_RANGE || pillar.fails > 3) {
      stopPillar(state);
      return false;
    }

    pillar.t++;
    let desiredY = location.y;

    if (pillar.phase === "jump") {
      const placementY = preparePillarJump(location, pillar, dim, isProtected);
      if (placementY === null) {
        stopPillar(state);
        return false;
      }

      pillar.placeY = placementY;
      pillar.phase = "rise";
      pillar.t = 0;
    } else if (pillar.phase === "rise") {
      const goalY = pillar.placeY + PILLAR_CLEAR;
      desiredY = Math.min(location.y + PILLAR_STEP, goalY);

      if (desiredY >= goalY - 0.001) {
        desiredY = goalY;
        let placed = false;
        try {
          const block = dim.getBlock({ x: pillar.bx, y: pillar.placeY, z: pillar.bz });
          if (block && (block.isAir || block.isLiquid)) {
            placed = putBlock(dim, block, PILLAR_BLOCK, {
              sound: "use.stone",
              soundLocation: {
                x: pillar.bx + 0.5,
                y: pillar.placeY + 0.5,
                z: pillar.bz + 0.5,
              },
              particle: "minecraft:crop_growth_emitter",
              particleLocation: {
                x: pillar.bx + 0.5,
                y: pillar.placeY + 1.1,
                z: pillar.bz + 0.5,
              },
            });
          }
        } catch {}

        if (placed) {
          pillar.placed++;
          pillar.fails = 0;
        } else {
          pillar.fails++;
        }
        pillar.phase = "settle";
        pillar.t = 0;
      } else if (pillar.t > 20) {
        pillar.fails++;
        pillar.phase = "jump";
        pillar.t = 0;
      }
    } else if (pillar.phase === "settle") {
      desiredY = pillar.placeY + 1.0;
      if (pillar.t >= PILLAR_SETTLE) {
        pillar.phase = "jump";
        pillar.t = 0;
      }
    }

    try {
      master.teleport(
        { x: pillar.bx + 0.5, y: desiredY, z: pillar.bz + 0.5 },
        { dimension: dim, keepVelocity: false }
      );
    } catch {
      stopPillar(state);
      return false;
    }

    return true;
  }

  return { startPillar, pillarTick };
}

export const pillarBehavior = createPillarBehavior({ isEditProtected, isProtected });