import { ItemStack, world } from "@minecraft/server";
import { INVENTORY_CONFIG } from "./inventory_config.js";

function findMlgGroundBlock(master, dim, maxDistance)
{
  let ground;
  let distance;
  const location = master.location;
  const x = Math.floor(location.x);
  const y = Math.floor(location.y);
  const z = Math.floor(location.z);

  for (let depth = 1; depth <= maxDistance + 1; depth++)
  {
    const block = dim.getBlock({ x, y: y - depth, z });
    if (!block || block.isAir) continue;
    if (block.isLiquid) break;
    ground = block;
    distance = Math.max(0, location.y - (block.y + 1));
    break;
  }

  return ground ? { block: ground, distance } : undefined;
}

function setInventoryBucket(master, itemId)
{
  const inventory = master.getComponent("minecraft:inventory");
  if (!inventory || !inventory.container) {
    throw new Error("Bot inventory is unavailable");
  }
  inventory.container.setItem(
    INVENTORY_CONFIG.waterBucket.slot,
    new ItemStack(itemId, 1)
  );
}

function setWaterMlgLookDown(master, state, enabled)
{
  state.waterMlgLookDown = enabled;
}

function lookDownDuringWaterMlg(master, state)
{
  setWaterMlgLookDown(master, state, true);
}

export function ensureWaterBucketInventory(master) {
  const inventory = master.getComponent("minecraft:inventory");
  if (!inventory || !inventory.container) {
    throw new Error("Bot inventory is unavailable");
  }
  const container = inventory.container;
  const slot = INVENTORY_CONFIG.waterBucket.slot;
  const item = container.getItem(slot);
  if (!item || item.typeId === INVENTORY_CONFIG.waterBucket.emptyItem) {
    container.setItem(slot, new ItemStack(INVENTORY_CONFIG.waterBucket.fullItem, 1));
  } else if (item.typeId !== INVENTORY_CONFIG.waterBucket.fullItem) {
    throw new Error(`Unexpected item in water bucket slot: ${item.typeId}`);
  }
}

function cleanupWater(state, master) {
  let waterRecovered = false;
  for (let i = state.placedWater.length - 1; i >= 0; i--) {
    const water = state.placedWater[i];
    water.ttl--;
    if (water.ttl > 0) continue;

    waterRecovered = true;
    try {
      const waterDimension = world.getDimension(water.dimId);
      const block = waterDimension.getBlock({ x: water.x, y: water.y, z: water.z });
      if (block && block.typeId === "minecraft:water") {
        block.setType("minecraft:air");
        waterDimension.playSound("bucket.fill_water", {
          x: water.x + 0.5, y: water.y + 0.5, z: water.z + 0.5,
        });
      }
    } catch (error) {
      console.warn(`[PVPbot] 水源の回収に失敗しました: ${error}`);
    }
    state.placedWater.splice(i, 1);
  }

  if (waterRecovered && state.waterMlgPhase === "placed") {
    try {
      setInventoryBucket(master, INVENTORY_CONFIG.waterBucket.fullItem);
    } catch (error) {
      console.warn(`[PVPbot] 回収後に水バケツを補充できませんでした: ${error}`);
    }
    state.waterMlgPhase = "recovered";
    state.waterMlgTicks = 6;
    state.waterMlgLatched = true;
    setWaterMlgLookDown(master, state, false);
  }
  return waterRecovered;
}

function placeWaterForMlg(master, dim, dimId, state, ground, isEditProtected) {
  const location = master.location;
  const above = ground.above();
  if (!above || !above.isAir || isEditProtected(dim, above.x, above.y + 1, above.z)) return false;

  setInventoryBucket(master, INVENTORY_CONFIG.waterBucket.emptyItem);
  try {
    try {
      above.setType("minecraft:water");
    } catch (setTypeError) {
      const result = dim.runCommand(`setblock ${above.x} ${above.y} ${above.z} water`);
      if (result.successCount < 1) throw new Error(`${setTypeError}; ${result.statusMessage}`);
    }

    const placed = dim.getBlock({ x: above.x, y: above.y, z: above.z });
    if (!placed || placed.typeId !== "minecraft:water") {
      const result = dim.runCommand(`setblock ${above.x} ${above.y} ${above.z} water`);
      if (result.successCount < 1) throw new Error(result.statusMessage);
    }
  } catch (error) {
    try {
      setInventoryBucket(master, INVENTORY_CONFIG.waterBucket.fullItem);
    } catch (restoreError) {
      console.warn(`[PVPbot] 水バケツを戻せませんでした: ${restoreError}`);
    }
    throw error;
  }

  state.placedWater.push({ x: above.x, y: above.y, z: above.z, dimId, ttl: 6 });
  state.waterMlgPhase = "placed";
  try {
    dim.playSound("bucket.empty_water", location);
  } catch {}
  return true;
}

export function tickWaterBucket(master, dim, dimId, state, isEditProtected) {
  const recoveredThisTick = cleanupWater(state, master);
  const velocity = master.getVelocity();
  const isFalling = velocity.y < -0.55 && !master.isInWater && dimId !== "nether";

  if (state.waterMlgPhase === "armed" || state.waterMlgPhase === "placed") {
    lookDownDuringWaterMlg(master, state);
  }

  if (state.waterMlgPhase === "recovered") {
    if (!recoveredThisTick) state.waterMlgTicks--;
    if (state.waterMlgTicks <= 0) {
      state.waterMlgPhase = "idle";
      setWaterMlgLookDown(master, state, false);
    }
    return;
  }

  if (state.waterMlgLatched) {
    if (master.isOnGround || velocity.y >= -0.55) state.waterMlgLatched = false;
    else return;
  }

  if (state.waterMlgPhase === "placed") return;
  if (!isFalling) {
    state.waterMlgPhase = "idle";
    setWaterMlgLookDown(master, state, false);
    return;
  }

  let landing = findMlgGroundBlock(master, dim, 20);
  if (!landing || landing.distance > 20) {
    state.waterMlgPhase = "idle";
    setWaterMlgLookDown(master, state, false);
    return;
  }

  if (state.waterMlgPhase !== "armed") {
    ensureWaterBucketInventory(master);
    state.waterMlgPhase = "armed";
    lookDownDuringWaterMlg(master, state);
    return;
  }

  landing = findMlgGroundBlock(master, dim, 20);
  if (!landing || landing.distance > 20) {
    state.waterMlgPhase = "idle";
    setWaterMlgLookDown(master, state, false);
    return;
  }

  if (landing.distance <= 3.5) {
    try {
      placeWaterForMlg(master, dim, dimId, state, landing.block, isEditProtected);
      if (state.waterMlgPhase === "placed") lookDownDuringWaterMlg(master, state);
    } catch (error) {
      state.waterMlgPhase = "idle";
      setWaterMlgLookDown(master, state, false);
      console.warn(`[PVPbot] 落下時の水設置に失敗しました: ${error}`);
    }
  }
}
