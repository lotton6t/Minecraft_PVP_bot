// ============================================================
//  PVPbot - AIスクリプト v3
//  機能: 追跡 / ストレイフ&クリティカル / 自己回復 /
//        水バケツMLG / ブロック破壊 / 勝敗判定 /
//        召喚イベントと5種類のレベル別スポーンエッグに対応
// ============================================================
import { world, system, GameMode, EquipmentSlot, ItemStack, Direction } from "@minecraft/server";
import { MSG, logWarn, logError, broadcastChat, broadcastMessage } from "./message.js";
import { INVENTORY_CONFIG } from "./inventory_config.js";
import { ensureWaterBucketInventory, tickWaterBucket } from "./water_bucket.js";
import { isProtected } from "./block_protection.js";
import { registerSpawnSetup } from "./spawn_setup.js";
import { registerDeathHandler } from "./death_handler.js";
import { createLavaBehavior } from "./lava_behavior.js";
import { createInventoryDropper } from "./inventory_drop.js";
import { createFallBehavior } from "./fall_behavior.js";
import { knockback } from "./knocback.js";
import { isEditProtected } from "./edit_protection.js";
import { updateHeadPose } from "./head_pose.js";
import { createHealingHandler } from "./healing.js";
import { PILLAR_BLOCK, pillarBehavior } from "./pillar.js";
import { createMainhandController } from "./mainhand.js";
import { createOffhandController } from "./offhand.js";
import { createInventorySetup } from "./inventory_setup.js";
import { createBlockBreaker } from "./break_towareds.js";
import { registerCommands } from "./command.js";

//ワールド読み込み時に、スポーンセットアップと死亡ハンドラを登録
world.afterEvents.playerSpawn.subscribe((ev) => {
  //初回スポーン時のみ通知を送信
  if (!ev.initialSpawn) return;

  //10ティック（約0.5秒）待ってから言語を判定してメッセージを送る
  system.runTimeout(() => {
    try
    {
      //プレイヤーのデータが完全に読み込まれた後に実行されるため、
      //正常に「ja_JP」が取得できるようになります。
      broadcastChat("LOAD_SUCCESS");
    }
    catch(error)
    {
      broadcastChat("LOAD_FAIL");
    }
  }, 10); //10ティック待機
});

const MASTER_ID = "pvp:master";
const SPAWN_EGG_LEVELS = {
  "pvpbot:spawn_egg_1": 1,
  "pvpbot:spawn_egg_2": 2,
  "pvpbot:spawn_egg_3": 3,
  "pvpbot:spawn_egg_4": 4,
  "pvpbot:spawn_egg_5": 5,
};

// ---------- 強さレベル定義 (1〜5) ----------
// strength/resistance/health_boost は -1 でエフェクトなし
const LEVELS = {
  1: { name: "見習い",   strength: -1, resistance: -1, hboost: -1, healAmt: 6,  healThr: 0.45, healCd: 240, crit: 0.15, strafePow: 0.30 },
  2: { name: "兵士",     strength: -1, resistance: -1, hboost: 0,  healAmt: 8,  healThr: 0.55, healCd: 200, crit: 0.25, strafePow: 0.35 },
  3: { name: "騎士",     strength: 0,  resistance: -1, hboost: 1,  healAmt: 10, healThr: 0.65, healCd: 160, crit: 0.35, strafePow: 0.40 },
  4: { name: "剣聖",     strength: 0,  resistance: 0,  hboost: 3,  healAmt: 12, healThr: 0.70, healCd: 130, crit: 0.45, strafePow: 0.45 },
  5: { name: "魔王級",   strength: 1,  resistance: 1,  hboost: 5,  healAmt: 15, healThr: 0.75, healCd: 100, crit: 0.55, strafePow: 0.50 },
};
const DEFAULT_LEVEL = 3;

// ターゲットモード: "all"=全プレイヤー / "tag"=pvp_targetタグのある人だけ
const TARGET_TAG = "pvp_target";

function getTargetMode() {
  const v = world.getDynamicProperty("pvp_target_mode");
  return v === "tag" ? "tag" : "all";
}

function applyTargetMode(master) {
  try {
    master.triggerEvent(`pvp:set_target_${getTargetMode()}`);
  } catch {}
}

function getLevel(master) {
  try {
    const level = master.getProperty("pvp:skin_level");
    if (typeof level === "number" && LEVELS[level]) return level;
  } catch {}
  return DEFAULT_LEVEL;
}
function cfg(master) { return LEVELS[getLevel(master)]; }

function getBotInventory(master) {
  const inventory = master.getComponent("minecraft:inventory");
  if (!inventory || !inventory.container) {
    throw new Error("Bot inventory is unavailable");
  }
  return inventory.container;
}

const initializeInventory = createInventorySetup({
  inventoryConfig: INVENTORY_CONFIG,
  getLevel,
  getState,
  getBotInventory,
  ensureWaterBucketInventory,
});

const dropInventoryItems = createInventoryDropper({ getBotInventory, broadcastMessage });

// 頭上に表示する名前をレベルに合わせる
function updateName(master) {
  const lv = getLevel(master);
  try {
    const health = master.getComponent("minecraft:health");
    const current = health ? Math.ceil(health.currentValue) : "?";
    const maximum = health ? Math.ceil(health.effectiveMax) : "?";
    const nameTag = `PVPbot（${LEVELS[lv].name}） §cHP ${current}/${maximum}`;
    if (master.nameTag !== nameTag) master.nameTag = nameTag;
  } catch {}
}

function syncSkin(master) {
  try { master.setProperty("pvp:skin_level", getLevel(master)); } catch {}
}

// 武器を持ち替えさせる。成功したら true を返す。
//
// 【重要】equippable コンポーネントと replaceitem コマンドの「両方」を必ず実行する。
// コンポーネントの読み返しは「設定した値」を返すだけで、実際に描画される
// 手持ちと食い違う環境がある(武器によって片方しか効かない症状の原因)。
// どちらも同じ武器に置き換えるだけなので、二重に実行しても害はない。
function equipWeapon(master) {
  return updateMainhandMode(master, true);
}

function equipLevelArmor(master) {
  const material = INVENTORY_CONFIG.levels[getLevel(master)].armor;
  for (const { slot, suffix } of INVENTORY_CONFIG.armorSlots) {
    const item = `${material}_${suffix}`;
    const equipmentSlot = {
      head: EquipmentSlot.Head,
      chest: EquipmentSlot.Chest,
      legs: EquipmentSlot.Legs,
      feet: EquipmentSlot.Feet,
    }[slot];
    let equipped = false;
    const errors = [];

    try {
      const equippable = master.getComponent("minecraft:equippable");
      if (!equippable || !equipmentSlot) throw new Error("Equippable component or armor slot is unavailable");
      equippable.setEquipment(equipmentSlot, new ItemStack(`minecraft:${item}`, 1));
      equipped = true;
    } catch (error) {
      errors.push(`equippable: ${error}`);
    }

    try {
      const result = master.runCommand(`replaceitem entity @s slot.armor.${slot} 0 ${item} 1`);
      if (result.successCount > 0) equipped = true;
      else errors.push(`replaceitem: ${result.statusMessage}`);
    } catch (error) {
      errors.push(`replaceitem: ${error}`);
    }
    if (!equipped) console.warn(`[PVPbot] 防具の装備に失敗しました (${item}): ${errors.join("; ")}`);
  }
}

// 実際に手に持っているものを読み取る(読めない環境では null)
function getHeldItemId(master) {
  try {
    const eq = master.getComponent("minecraft:equippable");
    if (eq) {
      const held = eq.getEquipment(EquipmentSlot.Mainhand);
      return held ? held.typeId : "(素手)";
    }
  } catch {}
  return null;
}


const fallBehavior = createFallBehavior({ knockback });

const DIMENSIONS = ["overworld", "nether", "the_end"];

// エンティティごとの状態管理
const states = new Map();
function getState(entity) {
  let s = states.get(entity.id);
  if (!s) {
    const healingItem = INVENTORY_CONFIG.levels[getLevel(entity)].healingItem;
    s = { healCd: 0, healing: false, strafeCd: 0, breakCd: 0, pillarCd: 0, stuckTicks: 0,
          lastPos: null, placedWater: [], pillar: null, scanCd: 0, cachedTarget: null,
          dropCd: 0, bridgeCd: 0, healingInventoryInitialized: false, healingInventoryRetry: 0,
          healingItemId: healingItem.id, healingItemAmount: healingItem.amount, healStatusCd: 0,
          waterMlgPhase: "idle", waterMlgTicks: 0, waterMlgLatched: false };
    states.set(entity.id, s);
  }
  return s;
}

const equipOffhandShield = createOffhandController(INVENTORY_CONFIG.shield);

const { setMainhandItem, getMainhandMode, updateMainhandMode } = createMainhandController({
  inventoryConfig: INVENTORY_CONFIG,
  getLevel,
  getState,
});

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function nearestPlayer(dim, loc) {
  const tagMode = getTargetMode() === "tag";
  let best = null, bestD = Infinity;
  for (const p of dim.getPlayers({
    location: loc, maxDistance: 150,
    excludeGameModes: [GameMode.creative, GameMode.spectator],
  })) {
    // タグモード中は pvp_target タグのあるプレイヤーだけを対象にする
    if (tagMode) {
      try { if (!p.hasTag(TARGET_TAG)) continue; } catch { continue; }
    }
    const d = dist(p.location, loc);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best ? { player: best, distance: bestD } : null;
}

// レベルに応じたバフを付与(定期的に更新)
function applyLevelBuffs(master) {
  const c = cfg(master);
  try {
    if (c.strength >= 0) master.addEffect("strength", 100, { amplifier: c.strength, showParticles: false });
    if (c.resistance >= 0) master.addEffect("resistance", 100, { amplifier: c.resistance, showParticles: false });
    if (c.hboost >= 0) master.addEffect("health_boost", 100, { amplifier: c.hboost, showParticles: false });
  } catch {}
}

const tryStartHealing = createHealingHandler({
  inventoryConfig: INVENTORY_CONFIG,
  getLevel,
  getState,
  getBotInventory,
  cfg,
  broadcastMessage,
  getHealingItem: (master) => INVENTORY_CONFIG.levels[getLevel(master)].healingItem,
  getMainhandMode,
  updateMainhandMode,
  equipWeapon,
});

// ---------- メインAIループ (毎tick) ----------
system.runInterval(() => {
  const refreshBuffs = system.currentTick % 40 === 0;
  for (const dimId of DIMENSIONS) {
    let dim;
    try { dim = world.getDimension(dimId); } catch { continue; }
    for (const master of dim.getEntities({ type: MASTER_ID })) {
      try {
        if (system.currentTick % 5 === 0) updateName(master);
        tryStartHealing(master);
      } catch (error) {
        console.error(`[PVPbot] 独立した回復判定に失敗しました: ${error}`);
        broadcastMessage(`[PVPbot] 回復判定エラー: ${error}`);
      }
      try {
        tickWaterBucket(master, dim, dimId, getState(master), isEditProtected);
      } catch (error) {
        console.error(`[PVPbot] 落下モード更新に失敗しました: ${error}`);
      }
      try {
        updateHeadPose(master, getState(master));
      } catch (error) {
        console.error(`[PVPbot] 頭部姿勢の更新に失敗しました: ${error}`);
      }
      try {
        updateMainhandMode(master);
      } catch (error) {
        console.error(`[PVPbot] メインハンドのモード切替に失敗しました: ${error}`);
      }
      try {
        if (refreshBuffs) applyLevelBuffs(master);
        if (system.currentTick % 100 === 0) {
          equipOffhandShield(master);
          updateMainhandMode(master, true);
        }
        aiTick(master, dim, dimId);
      } catch { /* チャンク未ロード等は無視 */ }
    }
  }
}, 1);

function aiTick(master, dim, dimId) {
  const s = getState(master);
  const c = cfg(master);
  if (s.healCd > 0) s.healCd--;
  if (s.strafeCd > 0) s.strafeCd--;
  if (s.breakCd > 0) s.breakCd--;
  if (s.pillarCd > 0) s.pillarCd--;
  if (s.dropCd > 0) s.dropCd--;
  if (s.healingInventoryRetry > 0) s.healingInventoryRetry--;
  if (s.healStatusCd > 0) s.healStatusCd--;
  if (!s.healingInventoryInitialized && s.healingInventoryRetry <= 0) {
    s.healingInventoryInitialized = initializeInventory(master);
    s.healingInventoryRetry = 100;
  }

  // ---- 溶岩脱出中は通常のAI行動を止める ----
  if (lavaBehavior.lavaEscapeTick(master, dim, s)) return;

  const loc = master.location;
  // 毎tick全プレイヤーを走査すると重くなるので、4tickごとに更新して使い回す
  if (s.scanCd === undefined || s.scanCd <= 0) {
    s.cachedTarget = nearestPlayer(dim, loc);
    s.scanCd = 4;
  } else {
    s.scanCd--;
    // 対象が消えた/死んだ場合に備えて有効性を確認
    if (s.cachedTarget && !s.cachedTarget.player.isValid) s.cachedTarget = null;
  }
  const found = s.cachedTarget
    ? { player: s.cachedTarget.player, distance: dist(s.cachedTarget.player.location, loc) }
    : null;

  tryStartHealing(master);

  if (!found) return;
  const target = found.player;
  const d = found.distance;

  // ---- 近接戦闘: ストレイフ&ジャンプクリティカル ----
  if (d < 5.5 && s.strafeCd <= 0 && master.isOnGround) {
    const dx = target.location.x - loc.x;
    const dz = target.location.z - loc.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const nx = dx / len, nz = dz / len;
    const side = Math.random() < 0.5 ? 1 : -1;
    const mixF = 0.55, mixS = 0.85;
    const kx = nx * mixF + (-nz * side) * mixS;
    const kz = nz * mixF + (nx * side) * mixS;
    const critJump = Math.random() < c.crit ? 0.45 : 0;
    knockback(master, kx, kz, c.strafePow, critJump);
    s.strafeCd = 7 + Math.floor(Math.random() * 7);
  }

  // ---- 相手が高所にいる → 足場を積んで登る ----
  const hdx0 = target.location.x - loc.x;
  const hdz0 = target.location.z - loc.z;
  const hdist0 = Math.sqrt(hdx0 * hdx0 + hdz0 * hdz0);
  const dyUp = target.location.y - loc.y;

  // 積み上げ中は他の移動処理を行わない(横に引っ張られて落ちるのを防ぐ)
  if (pillarBehavior.pillarTick(master, target, dim, s)) return;

  // 相手が2ブロック以上高く、真下付近まで来ていたら積み始める
  if (dyUp >= 2.0 && hdist0 <= 3.5 && master.isOnGround && s.pillarCd <= 0) {
    pillarBehavior.startPillar(master, s);
    s.pillarCd = 20;
    if (pillarBehavior.pillarTick(master, target, dim, s)) return;
  }

  // ---- 相手が下にいる → 崖から飛び降りる ----
  fallBehavior.tryDescend(master, target, dim, s);

  // ---- 溶岩が行く手を塞いでいる → ブロックを置いて渡る(lava onのみ) ----
  lavaBehavior.tryLavaBridge(master, target, dim, s, d);

  // ---- 囲い検知: 相手が近いのに壁で遮られて攻撃できない → 壁を壊す ----
  // (スタック検知は距離3超が条件のため、プレイヤーが自分の周りを
  //  囲った場合はここで対応する。視線が通っている間は何もしない)
  if (d <= 5 && s.breakCd <= 0) {
    const eye = { x: loc.x, y: loc.y + 1.5, z: loc.z };
    const tx = target.location.x - eye.x;
    const ty = (target.location.y + 1.0) - eye.y;
    const tz = target.location.z - eye.z;
    const tlen = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
    let blocked = false;
    try {
      const hit = dim.getBlockFromRay(
        eye,
        { x: tx / tlen, y: ty / tlen, z: tz / tlen },
        { maxDistance: Math.min(tlen, 5), includeLiquidBlocks: false, includePassableBlocks: false }
      );
      blocked = !!(hit && hit.block);
    } catch {}
    if (blocked) {
      s.boxTicks = (s.boxTicks || 0) + 1;
      if (s.boxTicks > 12) {   // 0.6秒遮られ続けたら壊す
        breakTowards(master, target, dim);
        s.breakCd = 10;
        s.boxTicks = 0;
      }
    } else {
      s.boxTicks = 0;
    }
  }

  // ---- スタック検知 → ブロック破壊で強行突破 ----
  if (d > 3) {
    if (s.lastPos) {
      const moved = dist(loc, s.lastPos);
      if (moved < 0.06) s.stuckTicks++;
      else s.stuckTicks = 0;
    }
    s.lastPos = { x: loc.x, y: loc.y, z: loc.z };
    if (s.stuckTicks > 15 && s.breakCd <= 0) {
      breakTowards(master, target, dim);
      s.breakCd = 10;
      s.stuckTicks = 0;
    }
  } else {
    s.stuckTicks = 0;
  }
}



// ============================================================
//  ブロック積み上げ(パルクールタワー)
//  ジャンプ → 空中で足元に設置 → 着地 → 再びジャンプ を繰り返して
//  相手の高さまで一気に登る
// ============================================================
const lavaBehavior = createLavaBehavior({
  knockback,
  isEditProtected,
  pillarBlock: PILLAR_BLOCK,
});
const breakTowards = createBlockBreaker({ isProtected, isEditProtected });

// 存在しなくなったエンティティの状態を定期的に破棄する(メモリリーク対策)
system.runInterval(() => {
  if (states.size === 0) return;
  const alive = new Set();
  for (const dimId of DIMENSIONS) {
    try {
      for (const m of world.getDimension(dimId).getEntities({ type: MASTER_ID })) {
        alive.add(m.id);
      }
    } catch {}
  }
  for (const id of [...states.keys()]) {
    if (!alive.has(id)) states.delete(id);
  }
}, 600);

// 手に持たせても見た目が表示されないことがあるアイテム(ゲーム本体の描画仕様)。
// スロットへの装備と攻撃力は正しく反映されるが、モデルが描画されない。
registerCommands({
  dimensions: DIMENSIONS,
  masterId: MASTER_ID,
  targetTag: TARGET_TAG,
  inventoryConfig: INVENTORY_CONFIG,
  getTargetMode,
  applyTargetMode,
  equipWeapon,
  getHeldItemId,
});

registerSpawnSetup({
  masterId: MASTER_ID,
  levels: LEVELS,
  getLevel,
  broadcastMessage,
  equipWeapon,
  equipLevelArmor,
  equipOffhandShield,
  syncSkin,
  updateName,
  applyLevelBuffs,
  applyTargetMode,
  initializeInventory,
});

// Level-specific custom spawn eggs set the entity's level before its normal initialization.
world.beforeEvents.itemUseOn.subscribe((ev) => {
  const level = SPAWN_EGG_LEVELS[ev.itemStack.typeId];
  if (!level || ev.source.typeId !== "minecraft:player") return;

  ev.cancel = true;
  const player = ev.source;
  const dimension = ev.block.dimension;
  const location = { ...ev.block.location };
  switch (ev.blockFace) {
    case Direction.Up: location.y += 1; break;
    case Direction.Down: location.y -= 1; break;
    case Direction.North: location.z -= 1; break;
    case Direction.South: location.z += 1; break;
    case Direction.West: location.x -= 1; break;
    case Direction.East: location.x += 1; break;
  }
  const eggId = ev.itemStack.typeId;

  system.run(() => {
    try {
      const master = dimension.spawnEntity(MASTER_ID, location);
      master.triggerEvent(`pvp:set_level_${level}`);

      if (player.getGameMode() !== GameMode.creative) {
        const equippable = player.getComponent("minecraft:equippable");
        const held = equippable && equippable.getEquipment(EquipmentSlot.Mainhand);
        if (held && held.typeId === eggId) {
          if (held.amount <= 1) {
            setMainhandItem(player, undefined, "スポーンエッグの消費");
          } else {
            held.amount--;
            setMainhandItem(player, held, "スポーンエッグの消費");
          }
        }
      }
    } catch (error) {
      player.sendMessage(`§c[PVPbot] スポーンエッグを使用できませんでした: ${error}`);
    }
  });
});

registerDeathHandler({
  masterId: MASTER_ID,
  broadcastMessage,
  dropInventoryItems,
  states,
});

// ---------- コンボ補正 ----------
world.afterEvents.entityHurt.subscribe((ev) => {
  const src = ev.damageSource ? ev.damageSource.damagingEntity : undefined;
  const hurt = ev.hurtEntity;
  
  if (hurt && hurt.typeId === MASTER_ID) {
    const hp = hurt.getComponent("minecraft:health");
    
    // 💡 安全ブレーキ：そもそも体力のコンポーネントがない、またはすでにHPが0以下の場合は即終了（回復させない）
    if (!hp || hp.currentValue <= 0) return;

    const state = getState(hurt);
    const c = cfg(hurt);
    if (state.healStatusCd <= 0) {
      state.healStatusCd = 40;
      const ratio = hp.effectiveMax > 0 ? hp.currentValue / hp.effectiveMax : 0;
      broadcastMessage(
        `[PVPbot] 回復判定: HP ${Math.round(hp.currentValue)}/${Math.round(hp.effectiveMax)} ` +
        `(${Math.round(ratio * 100)}%)、開始条件 ${Math.round(c.healThr * 100)}%以下、` +
        `食料 ${state.healingItemAmount}個、待機 ${Math.ceil(state.healCd / 20)}秒`
      );
    }
    
    system.run(() => {
      try {
        // 💡 実行される直前にも、念のためもう一度生存チェックを入れる
        if (hurt.isValid && hp.currentValue > 0) {
          tryStartHealing(hurt);
        }
      } catch (error) {
        console.error(`[PVPbot] 被ダメージ後の回復開始に失敗しました: ${error}`);
        broadcastMessage(`[PVPbot] 回復開始エラー: ${error}`);
      }
    });
  }
  
  if (!src || src.typeId !== MASTER_ID) return;
  if (!hurt || hurt.typeId !== "minecraft:player") return;
  if (Math.random() >= 0.25) return;
  try {
    const dx = hurt.location.x - src.location.x;
    const dz = hurt.location.z - src.location.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    knockback(hurt, dx / len, dz / len, 0.3, 0.2);
  } catch {}
});
