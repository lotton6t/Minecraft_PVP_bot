export function createLavaEscapeBehavior({ knockback }) {
  function isInLavaOrFire(master, dim) {
    try {
      if (master.isInLava === true) return "lava";
    } catch {}
    try {
      const location = master.location;
      const feet = dim.getBlock(location);
      if (feet) {
        const id = feet.typeId;
        if (id === "minecraft:lava" || id === "minecraft:flowing_lava") return "lava";
        if (id === "minecraft:fire" || id === "minecraft:soul_fire") return "fire";
      }
    } catch {}
    return null;
  }

  function findLavaExit(master, dim) {
    const location = master.location;
    const baseY = Math.floor(location.y);
    const directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [0.707, 0.707], [0.707, -0.707], [-0.707, 0.707], [-0.707, -0.707],
    ];
    for (let radius = 1; radius <= 5; radius++) {
      for (const [dx, dz] of directions) {
        const x = Math.floor(location.x + dx * radius);
        const z = Math.floor(location.z + dz * radius);
        for (const dy of [0, 1]) {
          try {
            const feet = dim.getBlock({ x, y: baseY + dy, z });
            const head = dim.getBlock({ x, y: baseY + dy + 1, z });
            const ground = dim.getBlock({ x, y: baseY + dy - 1, z });
            if (!feet || !head || !ground) continue;
            if (feet.isAir && head.isAir && !ground.isAir && !ground.isLiquid &&
                ground.typeId !== "minecraft:magma") {
              return { dx, dz, up: dy };
            }
          } catch {}
        }
      }
    }
    return null;
  }

  return function lavaEscapeTick(master, dim, state) {
    const inLava = isInLavaOrFire(master, dim) === "lava";
    if (inLava) {
      state.lavaEsc = state.lavaEsc || { t: 0, scanCd: 0, exit: null, awayT: 0 };
      const escape = state.lavaEsc;
      escape.awayT = 14;
      escape.t++;

      if (escape.scanCd <= 0 || !escape.exit) {
        escape.exit = findLavaExit(master, dim);
        escape.scanCd = 10;
      } else {
        escape.scanCd--;
      }

      if (escape.t % 5 === 0) {
        if (escape.exit) {
          const vertical = escape.exit.up === 1 ? 0.52 : 0.42;
          knockback(master, escape.exit.dx, escape.exit.dz, 0.28, vertical);
        } else {
          knockback(master, 0, 0, 0, 0.46);
        }
      }
      return true;
    }

    if (state.lavaEsc && state.lavaEsc.awayT > 0) {
      const escape = state.lavaEsc;
      escape.awayT--;
      if (escape.exit && escape.awayT % 3 === 0) {
        knockback(master, escape.exit.dx, escape.exit.dz, 0.3, 0.05);
      }
      if (escape.awayT <= 0) state.lavaEsc = null;
      return true;
    }

    return false;
  };
}