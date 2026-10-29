export function putBlock(dim, block, typeId, effects = {}) {
  try {
    block.setType(typeId);
  } catch {
    return false;
  }

  if (effects.sound && effects.soundLocation) {
    try {
      dim.playSound(effects.sound, effects.soundLocation);
    } catch {}
  }

  if (effects.particle && effects.particleLocation) {
    try {
      dim.spawnParticle(effects.particle, effects.particleLocation);
    } catch {}
  }

  return true;
}