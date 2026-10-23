export function createBlockBreaker({ isProtected, isEditProtected }) {
  return function breakTowards(master, target, dim) {
    const location = master.location;
    const dx = target.location.x - location.x;
    const dy = target.location.y - location.y;
    const dz = target.location.z - location.z;
    const length = Math.sqrt(dx * dx + dz * dz) || 1;
    const nx = dx / length, nz = dz / length;

    const candidates = [
      { x: location.x + nx, y: location.y + 1, z: location.z + nz },
      { x: location.x + nx, y: location.y, z: location.z + nz },
    ];
    if (dy > 1.5) candidates.push({ x: location.x, y: location.y + 2, z: location.z });
    if (dy < -1.5) candidates.push({ x: location.x, y: location.y - 1, z: location.z });

    let broken = 0;
    for (const candidate of candidates) {
      if (broken >= 3) break;
      let block;
      try { block = dim.getBlock(candidate); } catch { continue; }
      if (!block || block.isAir || block.isLiquid) continue;
      if (isProtected(block.typeId)) continue;
      if (isEditProtected(dim, candidate.x, candidate.y, candidate.z)) continue;

      const bx = block.x, by = block.y, bz = block.z;
      try {
        dim.runCommand(`setblock ${bx} ${by} ${bz} air destroy`);
      } catch {
        try { block.setType("minecraft:air"); } catch { continue; }
      }
      try { dim.playSound("dig.stone", { x: bx + 0.5, y: by + 0.5, z: bz + 0.5 }); } catch {}
      broken++;
    }
  };
}