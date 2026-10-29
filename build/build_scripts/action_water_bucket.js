import { ItemStack, world } from "@minecraft/server";
import { INVENTORY_CONFIG } from "./inventory_config.js";

// 着地可能なブロックを探す
function findMlgGroundBlock(master, dim, maxDistance)
{
  let ground;
  let distance;
  const location = master.location;
  const x = Math.floor(location.x);
  const y = Math.floor(location.y);
  const z = Math.floor(location.z);

  // 上から下に向かってブロックを探す
  for (let depth = 1; depth <= maxDistance + 1; depth++)
  {
    const block = dim.getBlock({ x, y: y - depth, z }); // 1ブロック下から順にチェック
    if (!block || block.isAir) continue;  // 空気ブロックは無視
    if (block.isLiquid) break;            // 液体ブロックは着地できないので探索終了
    ground = block;                       // 着地可能なブロックを見つけた
    distance = Math.max(0, location.y - (block.y + 1)); // ブロックの上面までの距離を計算
    break;
  }

  return ground ? { block: ground, distance } : undefined;  // 着地可能なブロックが見つかった場合はその情報を返す
}

// 水バケツのスロットに指定されたアイテムをセットする
function setInventoryBucket(master, itemId)
{
  const inventory = master.getComponent("minecraft:inventory"); // インベントリコンポーネントを取得

  // インベントリが取得できない場合はエラーをスロー
  if (!inventory || !inventory.container)
  {
    throw new Error("Bot inventory is unavailable");
  }
  // 指定されたスロットにアイテムをセットする
  inventory.container.setItem(
    INVENTORY_CONFIG.waterBucket.slot,
    new ItemStack(itemId, 1)
  );
}

// 水バケツMLG中は頭を下に向ける
function setWaterMlgLookDown(master, state, enabled)
{
  state.waterMlgLookDown = enabled;
}

// 水バケツMLG中は頭を下に向ける
function lookDownDuringWaterMlg(master, state)
{
  setWaterMlgLookDown(master, state, true);
}

// 水バケツMLG中は頭を下に向ける
export function ensureWaterBucketInventory(master) {
  // インベントリコンポーネントを取得
  const inventory = master.getComponent("minecraft:inventory");

  // インベントリが取得できない場合はエラーをスロー
  if (!inventory || !inventory.container)
  {
    throw new Error("Bot inventory is unavailable");
  }

  const container = inventory.container;          // インベントリコンテナを取得
  const slot = INVENTORY_CONFIG.waterBucket.slot; // 水バケツのスロット番号を取得
  const item = container.getItem(slot);           // 指定されたスロットのアイテムを取得

  // スロットが空、または空の水バケツの場合は満タンの水バケツをセットする
  if (!item || item.typeId === INVENTORY_CONFIG.waterBucket.emptyItem)
  {
    container.setItem(slot, new ItemStack(INVENTORY_CONFIG.waterBucket.fullItem, 1));
  }
  // スロットに予期しないアイテムが入っている場合はエラーをスローする
  else if (item.typeId !== INVENTORY_CONFIG.waterBucket.fullItem)
  {
    throw new Error(`Unexpected item in water bucket slot: ${item.typeId}`);
  }
}

// 水源を回収する
function cleanupWater(state, master) {
  let waterRecovered = false; // 水源を回収したかどうかのフラグ

  // 期限切れの水源を回収する
  for (let i = state.placedWater.length - 1; i >= 0; i--)
  {
    const water = state.placedWater[i]; // 配置された水源の情報を取得
    water.ttl--;  // 水源の寿命を1減らす
    if (water.ttl > 0) continue;  // 期限が切れていない場合は次の水源へ

    waterRecovered = true;  // 水源を回収したことを記録
    try
    {
      const waterDimension = world.getDimension(water.dimId); 
      const block = waterDimension.getBlock({ x: water.x, y: water.y, z: water.z });

      // 水源ブロックが存在する場合は空気ブロックに置き換えて水源を回収する
      if (block && block.typeId === "minecraft:water")
      {
        block.setType("minecraft:air");
        waterDimension.playSound("bucket.fill_water", {
          x: water.x + 0.5, y: water.y + 0.5, z: water.z + 0.5,
        });
      }
    }
    catch (error)
    {
      console.warn(`[PVPbot] 水源の回収に失敗しました: ${error}`);
    }
    state.placedWater.splice(i, 1);
  }

  // 水源を回収した場合は、水バケツを補充する
  if (waterRecovered && state.waterMlgPhase === "placed")
  {
    try
    {
      // 水バケツを補充する
      setInventoryBucket(master, INVENTORY_CONFIG.waterBucket.fullItem);
    }
    catch (error)
    {
      console.warn(`[PVPbot] 回収後に水バケツを補充できませんでした: ${error}`);
    }
    state.waterMlgPhase = "recovered";  // 回収後の状態に遷移
    state.waterMlgTicks = 6;            // 回収後の状態を維持するためのカウントダウン
    state.waterMlgLatched = true;       // 回収後の状態では、着地するまで水バケツMLGを再度行わないようにする
    setWaterMlgLookDown(master, state, false);  // 回収後の状態では、頭を下に向けない
  }
  return waterRecovered;
}

// 水バケツを設置する
function placeWaterForMlg(master, dim, dimId, state, ground, isEditProtected) {
  const location = master.location;
  const above = ground.above();
  if (!above || !above.isAir || isEditProtected(dim, above.x, above.y + 1, above.z)) return false;

  // 水バケツを空にする
  setInventoryBucket(master, INVENTORY_CONFIG.waterBucket.emptyItem);
  try
  {
    try
    {
      above.setType("minecraft:water"); // 水源ブロックを設置する
    } catch (setTypeError)
    {
      // setTypeが失敗した場合は、setblockコマンドを使用して水源ブロックを設置する
      const result = dim.runCommand(`setblock ${above.x} ${above.y} ${above.z} water`);
      if (result.successCount < 1) throw new Error(`${setTypeError}; ${result.statusMessage}`);
    }

    // 設置したブロックが水源ブロックであることを確認する
    const placed = dim.getBlock({ x: above.x, y: above.y, z: above.z });

    // 設置したブロックが水源ブロックでない場合は、setblockコマンドを使用して水源ブロックを設置する
    if (!placed || placed.typeId !== "minecraft:water")
    {
      const result = dim.runCommand(`setblock ${above.x} ${above.y} ${above.z} water`);

      // 設置に失敗した場合はエラーをスローする
      if (result.successCount < 1) throw new Error(result.statusMessage);
    }
  }
  catch (error)
  {
    try
    {
      // 設置に失敗した場合は、水バケツを元に戻す
      setInventoryBucket(master, INVENTORY_CONFIG.waterBucket.fullItem);
    }
    catch (restoreError)
    {
      console.warn(`[PVPbot] 水バケツを戻せませんでした: ${restoreError}`);
    }
    throw error;
  }

  // 設置した水源ブロックの情報を記録する
  state.placedWater.push({ x: above.x, y: above.y, z: above.z, dimId, ttl: 6 });
  state.waterMlgPhase = "placed"; // 水バケツMLGの状態を「設置済み」に変更する
  try
  {
    // 水を設置した位置で水を汲む音を再生する
    dim.playSound("bucket.empty_water", location);
  }
  catch
  {

  }

  return true;
}

// 水バケツMLGの処理を行う
export function tickWaterBucket(master, dim, dimId, state, isEditProtected) {
  const recoveredThisTick = cleanupWater(state, master);
  const velocity = master.getVelocity();
  const isFalling = velocity.y < -0.55 && !master.isInWater && dimId !== "nether";

  // 水バケツMLG中は頭を下に向ける
  if (state.waterMlgPhase === "armed" || state.waterMlgPhase === "placed")
  {
    lookDownDuringWaterMlg(master, state);
  }

  // 水バケツMLGの回収後の状態では、一定時間経過後に通常状態に戻す
  if (state.waterMlgPhase === "recovered")
  {
    // 回収後の状態では、一定時間経過後に通常状態に戻す
    if (!recoveredThisTick) state.waterMlgTicks--;

    // 回収後の状態で一定時間経過した場合は、通常状態に戻す
    if (state.waterMlgTicks <= 0)
    {
      state.waterMlgPhase = "idle";   // 水バケツMLGの状態を「通常」に戻す
      setWaterMlgLookDown(master, state, false);  // 頭を下に向けないようにする
    }
    return;
  }

  // 水バケツMLGのラッチ状態では、着地するまで水バケツMLGを再度行わないようにする
  if (state.waterMlgLatched)
  {
    // 着地しているか、落下速度が緩やかになった場合はラッチを解除する
    if (master.isOnGround || velocity.y >= -0.55) state.waterMlgLatched = false;
    else return;
  }

  // 水バケツMLGの設置済み状態では、再度水バケツMLGを行わないようにする
  if (state.waterMlgPhase === "placed") return;

  // 落下中でない場合は水バケツMLGを行わない
  if (!isFalling)
  {
    state.waterMlgPhase = "idle"; // 水バケツMLGの状態を「通常」に戻す
    setWaterMlgLookDown(master, state, false);  // 頭を下に向けないようにする
    return;
  }

  let landing = findMlgGroundBlock(master, dim, 20);

  // 落下中で、かつ水バケツMLGの状態が「通常」の場合は、水バケツMLGを行う準備をする
  if (!landing || landing.distance > 20)
  {
    state.waterMlgPhase = "idle"; // 水バケツMLGの状態を「通常」に戻す
    setWaterMlgLookDown(master, state, false);  // 頭を下に向けないようにする
    return;
  }

  // 落下中で、かつ水バケツMLGの状態が「通常」の場合は、水バケツMLGを行う準備をする
  if (state.waterMlgPhase !== "armed")
  {
    ensureWaterBucketInventory(master); // 水バケツのインベントリを確認し、必要に応じて補充する
    state.waterMlgPhase = "armed";  // 水バケツMLGの状態を「準備完了」に変更する
    lookDownDuringWaterMlg(master, state);  // 水バケツMLG中は頭を下に向ける
    return;
  }

  // 落下中で、かつ水バケツMLGの状態が「準備完了」の場合は、水バケツMLGを行う
  landing = findMlgGroundBlock(master, dim, 20);  // 再度着地可能なブロックを探す

  // 落下中で、かつ水バケツMLGの状態が「準備完了」の場合は、水バケツMLGを行う
  if (!landing || landing.distance > 20)
  {
    state.waterMlgPhase = "idle"; // 水バケツMLGの状態を「通常」に戻す
    setWaterMlgLookDown(master, state, false);  // 頭を下に向けないようにする
    return;
  }

  // 落下中で、かつ水バケツMLGの状態が「準備完了」の場合は、水バケツMLGを行う
  if (landing.distance <= 3.5) {
    try
    {
      // 水バケツMLGを行う
      placeWaterForMlg(master, dim, dimId, state, landing.block, isEditProtected);

      // 水バケツMLG中は頭を下に向ける
      if (state.waterMlgPhase === "placed") lookDownDuringWaterMlg(master, state);
    }
    catch (error)
    {
      state.waterMlgPhase = "idle"; // 水バケツMLGの状態を「通常」に戻す
      setWaterMlgLookDown(master, state, false);  // 頭を下に向けないようにする
      console.warn(`[PVPbot] 落下時の水設置に失敗しました: ${error}`); 
    }
  }
}
