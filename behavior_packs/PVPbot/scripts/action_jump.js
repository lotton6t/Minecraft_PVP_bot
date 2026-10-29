import { breakBlock } from "./block_break.js";

export function preparePillarJump(location, pillar, dim, isProtected) {
  let placementY = Math.floor(location.y + 0.02);
  try {
    const blockBelow = dim.getBlock({ x: pillar.bx, y: placementY, z: pillar.bz });
    if (blockBelow && !blockBelow.isAir && !blockBelow.isLiquid) placementY++;
  } catch {}

  try {
    const targetBlock = dim.getBlock({ x: pillar.bx, y: placementY, z: pillar.bz });
    if (targetBlock && !targetBlock.isAir && !targetBlock.isLiquid) return null;
  } catch {}

  try {
    const headBlock = dim.getBlock({ x: pillar.bx, y: placementY + 2, z: pillar.bz });
    if (headBlock && !headBlock.isAir && !headBlock.isLiquid) {
      if (isProtected(headBlock.typeId)) return null;
      breakBlock(dim, headBlock);
    }
  } catch {}

  return placementY;
}