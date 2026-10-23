import { isProtected } from "./block_protection.js";
import { isEditProtected } from "./edit_protection.js";

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
      let placementY = Math.floor(location.y + 0.02);
      try {
        const blockBelow = dim.getBlock({ x: pillar.bx, y: placementY, z: pillar.bz });
        if (blockBelow && !blockBelow.isAir && !blockBelow.isLiquid) placementY++;
      } catch {}

      try {
        const targetBlock = dim.getBlock({ x: pillar.bx, y: placementY, z: pillar.bz });
        if (targetBlock && !targetBlock.isAir && !targetBlock.isLiquid) {
          stopPillar(state);
          return false;
        }
      } catch {}

      try {
        const headBlock = dim.getBlock({ x: pillar.bx, y: placementY + 2, z: pillar.bz });
        if (headBlock && !headBlock.isAir && !headBlock.isLiquid) {
          if (isProtected(headBlock.typeId)) {
            stopPillar(state);
            return false;
          }
          dim.runCommand(`setblock ${pillar.bx} ${placementY + 2} ${pillar.bz} air destroy`);
        }
      } catch {}

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
            block.setType(PILLAR_BLOCK);
            placed = true;
            dim.playSound("use.stone", {
              x: pillar.bx + 0.5,
              y: pillar.placeY + 0.5,
              z: pillar.bz + 0.5,
            });
            dim.spawnParticle("minecraft:crop_growth_emitter", {
              x: pillar.bx + 0.5,
              y: pillar.placeY + 1.1,
              z: pillar.bz + 0.5,
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