const PROTECT_SCAN_DEPTH = 128;

export function isEditProtected(dim, x, y, z) {
  try {
    const bx = Math.floor(x), bz = Math.floor(z);
    let minY = -64;
    try { minY = dim.heightRange.min; } catch {}
    const start = Math.floor(y) - 1;
    const stop = Math.max(minY, start - PROTECT_SCAN_DEPTH);
    for (let yy = start; yy >= stop; yy--) {
      let block;
      try { block = dim.getBlock({ x: bx, y: yy, z: bz }); } catch { return false; }
      if (!block) return false;
      const id = block.typeId;
      if (id === "minecraft:deny" || id === "minecraft:border_block") return true;
      if (id === "minecraft:allow") return false;
    }
  } catch {}
  return false;
}