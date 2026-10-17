import { world } from "@minecraft/server";

//落下時に水源を設置する処理
function findMlgGroundBlock(master, dim, state)
{
  let ground;

  //プレイヤーの落下速度を取得する
  const velocity = master.getVelocity();

  //落下速度が-0.55以上で、プレイヤーが水中にいない場合、かつmlgCdが0以下の場合、かつ次元がネザーでない場合
  if (velocity.y < -0.55 && !master.isInWater && state.mlgCd <= 0 && dim.id !== "minecraft:the_nether")
  {
    const location = master.location;
    const x = Math.floor(location.x);
    const y = Math.floor(location.y);
    const z = Math.floor(location.z);

    for (let depth = 1; depth <= 9; depth++)
    {
      const block = dim.getBlock({ x, y: y - depth, z });
      if (!block || block.isAir) continue;
      if (block.isLiquid) break;
      ground = block;
      break;
    }
  }

  return ground;
}

//水源を設置してから6tick後に消す
export function cleanupWater(state)
{
  //設置した水源のリストを逆順にループして、寿命が0になった水源を消す
  for (let i = state.placedWater.length - 1; i >= 0; i--)
  {
    //寿命を1減らす
    const water = state.placedWater[i];
    water.ttl--;

    //寿命が0になった水源を消す
    if (water.ttl > 0) continue;

    try
    {
      //水源を消す
      const waterDimension = world.getDimension(water.dimId);

      //水源の座標にあるブロックを取得する
      const block = waterDimension.getBlock({ x: water.x, y: water.y, z: water.z });

      //ブロックが水源である場合は、空気ブロックに置き換える
      if (block && block.typeId === "minecraft:water")
      {
        //水源を消す
        block.setType("minecraft:air");

        //水源を消したことを示す音を再生する
        waterDimension.playSound("bucket.fill_water",
        {
          x: water.x + 0.5, y: water.y + 0.5, z: water.z + 0.5,
        });
      }
    }
    catch
    {

    }

    //寿命が0になった水源をリストから削除する
    state.placedWater.splice(i, 1);
  }
}

//落下時に水源を設置する
export function placeWaterForMlg(master, dim, dimId, state, isEditProtected) {
  try
  {
    //落下地点の地面ブロックを取得する
    const ground = findMlgGroundBlock(master, dim, state);

    //地面ブロックが見つからなかった場合は、処理を終了する
    if (!ground) return;

    const location = master.location;
    const above = ground.above();

    //地面ブロックの上に水源を設置する
    if (!above || !above.isAir || isEditProtected(dim, above.x, above.y + 1, above.z)) return;

    try
    {
      // setTypeが失敗する場合は、コマンドで水源を設置する
      above.setType("minecraft:water");
    }
    // setTypeが失敗する場合は、コマンドで水源を設置する
    catch (setTypeError)
    {
      // setTypeが失敗する場合は、コマンドで水源を設置する
      const result = dim.runCommand(`setblock ${above.x} ${above.y} ${above.z} water`);

      // コマンドが失敗した場合は、エラーをスローする
      if (result.successCount < 1) throw new Error(`${setTypeError}; ${result.statusMessage}`);
    }

    //水源を設置した座標と残り寿命を記録する
    state.placedWater.push({ x: above.x, y: above.y, z: above.z, dimId, ttl: 6 });

    //水源を設置したことを示すクールダウンを設定する
    state.mlgCd = 20;
    try
    {
      //水源を設置したことを示す音を再生する
      dim.playSound("bucket.empty_water", location);
    }
    catch
    {

    }
  }
  catch (error)
  {
    //水源を設置する処理でエラーが発生した場合は、クールダウンを設定してエラーをログに出力するww
    state.mlgCd = 20;
    console.warn(`[PVPbot] 落下時の水設置に失敗しました: ${error}`);
  }
}
