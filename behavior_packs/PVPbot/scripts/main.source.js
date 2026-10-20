// ============================================================
//  PVPbot - AIスクリプト v3
//  機能: 追跡 / ストレイフ&クリティカル / 自己回復 /
//        水バケツMLG / ブロック破壊 / 勝敗判定 /
//        召喚イベントと5種類のレベル別スポーンエッグに対応
// ============================================================
import { world, system, GameMode, EquipmentSlot, ItemStack, Direction } from "@minecraft/server";
import { INVENTORY_CONFIG } from "./inventory_config.js";
import { ensureWaterBucketInventory, tickWaterBucket } from "./water_bucket.js";
import { isProtected } from "./block_protection.js";
import { registerSpawnSetup } from "./spawn_setup.js";
import { registerDeathHandler } from "./death_handler.js";
import { createLavaBehavior, registerLavaCommand } from "./lava_behavior.js";
import { createInventoryDropper } from "./inventory_drop.js";
import { createFallBehavior } from "./fall_behavior.js";
import { isEditProtected } from "./edit_protection.js";
import { updateHeadPose } from "./head_pose.js";

world.afterEvents.playerSpawn.subscribe((ev) => {
  if (!ev.initialSpawn) return;
  try {
    ev.player.sendMessage("§a[PVPbot] スクリプト v1.25.24 を読み込みました");
  } catch (error) {
    console.error(`[PVPbot] 起動通知を送信できませんでした: ${error}`);
  }
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

function broadcastMessage(message) {
  let players;
  try {
    players = world.getPlayers();
  } catch (error) {
    console.error(`[PVPbot] プレイヤー一覧を取得できませんでした: ${error}`);
    return;
  }
  for (const player of players) {
    try {
      player.sendMessage(message);
    } catch (error) {
      console.error(`[PVPbot] ${player.name}へのメッセージ送信に失敗しました: ${error}`);
    }
  }
}

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

// ---------- 武器システム ----------
// 使い方: /scriptevent pvpbot:weapon diamond_sword
function getWeaponId(master) {
  const v = world.getDynamicProperty("pvp_weapon");
  if (typeof v === "string" && v.length > 0) return v;
  return master
    ? INVENTORY_CONFIG.levels[getLevel(master)].weapon
    : INVENTORY_CONFIG.defaultWeapon;
}

function setMainhandItem(entity, item, label) {
  let equipped = false;
  const errors = [];

  try {
    const equippable = entity.getComponent("minecraft:equippable");
    if (!equippable) throw new Error("Equippable component is unavailable");
    equippable.setEquipment(EquipmentSlot.Mainhand, item);
    equipped = true;
  } catch (error) {
    errors.push(`equippable: ${error}`);
  }

  if (item) {
    try {
      const itemId = item.typeId.replace("minecraft:", "");
      const result = entity.runCommand(
        `replaceitem entity @s slot.weapon.mainhand 0 ${itemId} ${item.amount}`
      );
      if (result.successCount > 0) equipped = true;
      else errors.push(`replaceitem: ${result.statusMessage}`);
    } catch (error) {
      errors.push(`replaceitem: ${error}`);
    }
  }

  if (!equipped) console.warn(`[PVPbot] ${label}に失敗しました: ${errors.join("; ")}`);
  return equipped;
}

function getMainhandMode(master, state) {
  if (state.waterMlgPhase === "armed" || state.waterMlgPhase === "recovered") return "falling";
  if (state.waterMlgPhase === "placed") return "fallingEmpty";
  return state.healing ? "recovery" : "combat";
}

function updateMainhandMode(master, force = false) {
  const state = getState(master);
  const mode = getMainhandMode(master, state);
  if (!force && state.mainhandMode === mode) return true;

  let itemId;
  let label;
  switch (mode) {
    case "falling":
      itemId = INVENTORY_CONFIG.waterBucket.fullItem;
      label = "落下モードの水バケツ装備";
      break;
    case "fallingEmpty":
      itemId = INVENTORY_CONFIG.waterBucket.emptyItem;
      label = "落下モードの空バケツ装備";
      break;
    case "recovery":
      itemId = INVENTORY_CONFIG.levels[getLevel(master)].healingItem.id;
      label = "回復モードの食料装備";
      break;
    default:
      itemId = getWeaponId(master);
      label = "戦闘モードの武器装備";
  }

  const equipped = setMainhandItem(master, new ItemStack(itemId, 1), label);
  if (equipped) state.mainhandMode = mode;
  return equipped;
}

function getBotInventory(master) {
  const inventory = master.getComponent("minecraft:inventory");
  if (!inventory || !inventory.container) {
    throw new Error("Bot inventory is unavailable");
  }
  return inventory.container;
}

function initializeHealingInventory(master) {
  const healingItem = INVENTORY_CONFIG.levels[getLevel(master)].healingItem;
  const state = getState(master);
  if (state.healingItemId !== healingItem.id || typeof state.healingItemAmount !== "number") {
    state.healingItemId = healingItem.id;
    state.healingItemAmount = healingItem.amount;
  }
  try {
    const container = getBotInventory(master);
    const item = container.getItem(0);
    if (!item) {
      container.setItem(0, new ItemStack(healingItem.id, state.healingItemAmount));
    } else if (item.typeId !== healingItem.id) {
      const validHealingItem = Object.values(INVENTORY_CONFIG.levels).some(
        (configured) => configured.healingItem.id === item.typeId
      );
      if (!validHealingItem) {
        throw new Error(`Unexpected item in healing inventory: ${item.typeId}`);
      }
      container.setItem(0, new ItemStack(healingItem.id, Math.min(state.healingItemAmount, healingItem.amount)));
    } else {
      state.healingItemAmount = Math.min(item.amount, healingItem.amount);
      if (item.amount !== state.healingItemAmount) {
        item.amount = state.healingItemAmount;
        container.setItem(0, item);
      }
    }
  } catch (error) {
    console.warn(`[PVPbot] 回復用インベントリを同期できません。内部の所持数で管理します: ${error}`);
  }
  try {
    ensureWaterBucketInventory(master);
  } catch (error) {
    console.warn(`[PVPbot] 水バケツをインベントリに準備できません: ${error}`);
  }
  return true;
}

function consumeHealingItem(master) {
  const healingItem = INVENTORY_CONFIG.levels[getLevel(master)].healingItem;
  const state = getState(master);
  if (state.healingItemId !== healingItem.id || state.healingItemAmount < 1) return false;
  state.healingItemAmount--;
  try {
    const container = getBotInventory(master);
    const item = container.getItem(0);
    if (item && item.typeId === healingItem.id) {
      container.setItem(0, state.healingItemAmount > 0
        ? new ItemStack(healingItem.id, state.healingItemAmount)
        : undefined);
    }
  } catch (error) {
    console.warn(`[PVPbot] 回復アイテム数をインベントリに反映できませんでした: ${error}`);
  }
  state.healingItemId = healingItem.id;
  return true;
}

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

function equipOffhandShield(master) {
  try {
    const item = INVENTORY_CONFIG.shield.replace("minecraft:", "");
    const result = master.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${item} 1`);
    if (result.successCount < 1) {
      console.warn(`[PVPbot] 盾の装備に失敗しました: ${item} (${result.statusMessage})`);
    }
  } catch (error) {
    console.warn(`[PVPbot] 盾の装備に失敗しました: ${error}`);
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


// applyKnockback はバージョンによって引数の形が違うため、両方に対応させる
// 旧: applyKnockback(dirX, dirZ, 水平, 垂直)
// 新: applyKnockback({x, z}, 垂直)
function knockback(entity, dx, dz, horizontal, vertical) {
  try {
    entity.applyKnockback(dx, dz, horizontal, vertical);
    return true;
  } catch {}
  try {
    entity.applyKnockback({ x: dx * horizontal, z: dz * horizontal }, vertical);
    return true;
  } catch {}
  return false;
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

function tryStartHealing(master) {
  const s = getState(master);
  const c = cfg(master);
  const hp = master.getComponent("minecraft:health");
  if (!hp) return false;

  const maxHealth = hp.effectiveMax;
  const currentHealth = hp.currentValue;
  if (!Number.isFinite(maxHealth) || maxHealth <= 0 || !Number.isFinite(currentHealth)) return false;
  const healthRatio = currentHealth / maxHealth;
  if (healthRatio > c.healThr) return false;
  if (s.healStatusCd <= 0) {
    s.healStatusCd = 40;
    broadcastMessage(
      `[PVPbot] 回復判定: HP ${Math.round(currentHealth)}/${Math.round(maxHealth)} ` +
      `(${Math.round(healthRatio * 100)}%)、しきい値 ${Math.round(c.healThr * 100)}%、` +
      `食料 ${s.healingItemAmount}個、待機 ${Math.ceil(s.healCd / 20)}秒、回復中 ${s.healing}`
    );
  }
  if (s.healing || s.healCd > 0 || s.healingItemAmount < 1) return false;

  if (!consumeHealingItem(master)) {
    s.healCd = c.healCd;
    broadcastMessage("[PVPbot] 回復を開始できません: 食料の残数がありません");
    return false;
  }

  const healingItem = INVENTORY_CONFIG.levels[getLevel(master)].healingItem;
  s.healing = true;
  const mainhandMode = getMainhandMode(master, s);
  const switchedToModeItem = updateMainhandMode(master, true);

  const mainhandStatus = !switchedToModeItem
    ? "手持ちの切り替えに失敗しました"
    : mainhandMode === "falling"
      ? "落下中のため水バケツを保持します"
      : `${healingItem.id.replace("minecraft:", "")}（残り${s.healingItemAmount}個）`;
  broadcastMessage(`§e[PVPbot] 回復開始: HP ${Math.round(currentHealth)}/${Math.round(maxHealth)}、${mainhandStatus}`);

  s.healCd = c.healCd;
  try {
    master.addEffect("slowness", 30, { amplifier: 5, showParticles: false });
    master.addEffect("weakness", 30, { amplifier: 5, showParticles: false });
  } catch (error) {
    console.warn(`[PVPbot] 回復中の効果を付与できませんでした: ${error}`);
  }
  for (let i = 0; i < 3; i++) {
    system.runTimeout(() => {
      try {
        master.dimension.playSound("random.eat", master.location, { volume: 1.0 });
      } catch {}
    }, i * 10);
  }
  system.runTimeout(() => {
    try {
      const health = master.getComponent("minecraft:health");
      if (!health) throw new Error("Bot health component is unavailable");
      const before = health.currentValue;
      health.setCurrentValue(Math.min(health.effectiveMax, before + c.healAmt));
      if (health.currentValue <= before) {
        health.resetToMaxValue();
        console.warn("[PVPbot] 指定量の回復が反映されなかったため、体力を最大まで回復しました");
      }
      broadcastMessage(`§a[PVPbot] 回復しました（体力 ${Math.round(before)} → ${Math.round(health.currentValue)}）`);
      if (healingItem.id === "minecraft:golden_apple") {
        master.addEffect("regeneration", 100, { amplifier: 1, showParticles: true });
        master.addEffect("absorption", 600, { amplifier: 0, showParticles: true });
      }
      master.dimension.playSound("random.burp", master.location);
    } catch (error) {
      console.warn(`[PVPbot] 回復処理に失敗しました: ${error}`);
      broadcastMessage(`§c[PVPbot] 回復処理に失敗しました: ${error}`);
    } finally {
      s.healing = false;
      try { equipWeapon(master); } catch (error) {
        console.warn(`[PVPbot] 回復後に武器を戻せませんでした: ${error}`);
      }
    }
  }, 30);
  return true;
}

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
    s.healingInventoryInitialized = initializeHealingInventory(master);
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
  if (pillarTick(master, target, dim, s)) return;

  // 相手が2ブロック以上高く、真下付近まで来ていたら積み始める
  if (dyUp >= 2.0 && hdist0 <= 3.5 && master.isOnGround && s.pillarCd <= 0) {
    startPillar(master, s);
    s.pillarCd = 20;
    if (pillarTick(master, target, dim, s)) return;
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
const PILLAR_BLOCK = "minecraft:cobblestone";
const lavaBehavior = createLavaBehavior({
  knockback,
  isEditProtected,
  pillarBlock: PILLAR_BLOCK,
});
const PILLAR_MAX = 40;      // 1回で積める最大段数
const PILLAR_RANGE = 6;     // 相手がこれ以上横に離れたら中断
const PILLAR_STEP = 0.22;   // 1tickあたりの上昇量(ブロック)
const PILLAR_CLEAR = 1.08;  // 足がこの高さまで上がったらブロックを置く
const PILLAR_SETTLE = 2;    // 設置後に足場へ乗るまでのtick

function startPillar(master, s) {
  const loc = master.location;
  // deny保護範囲では足場ブロックを置かない(柱は同じ列に積むため、開始時の1回の判定で全段カバーできる)
  if (isEditProtected(master.dimension, loc.x, loc.y, loc.z)) return;
  s.pillar = {
    active: true,
    bx: Math.floor(loc.x),   // 柱を立てる列(X)
    bz: Math.floor(loc.z),   // 柱を立てる列(Z)
    placeY: null,            // 設置先。ジャンプのたびに実測から計算し直す
    phase: "jump",
    t: 0,
    placed: 0,
    fails: 0,
  };
}

function stopPillar(s) {
  if (s.pillar) s.pillar.active = false;
}

// 積み上げ中は true を返す(この間は通常の移動処理をスキップする)
//
// 【設計方針】
// applyImpulse による物理ジャンプは、環境によって跳ぶ高さが大きく変わるうえ、
// 空中にいる間に再度加算されると青天井に打ち上がってしまう。
// そのため上下移動はスクリプトで座標を直接制御し、常に一定の動きにする。
function pillarTick(master, target, dim, s) {
  const p = s.pillar;
  if (!p || !p.active) return false;

  const loc = master.location;
  const hdx = target.location.x - loc.x;
  const hdz = target.location.z - loc.z;
  const hdist = Math.sqrt(hdx * hdx + hdz * hdz);
  const dy = target.location.y - loc.y;

  // ---- 中断条件 ----
  if (dy < 1.0 || p.placed >= PILLAR_MAX || hdist > PILLAR_RANGE || p.fails > 3) {
    stopPillar(s);
    return false;
  }

  p.t++;
  let desiredY = loc.y;   // 既定は現在の高さを維持

  // ---- 段取り: 設置先を実測から決める ----
  if (p.phase === "jump") {
    let py = Math.floor(loc.y + 0.02);
    try {
      const here = dim.getBlock({ x: p.bx, y: py, z: p.bz });
      // ハーフブロックなどの上に立っている場合は1つ上が設置先
      if (here && !here.isAir && !here.isLiquid) py += 1;
    } catch {}

    // 設置先が既に埋まっているなら積めない
    try {
      const tgt = dim.getBlock({ x: p.bx, y: py, z: p.bz });
      if (tgt && !tgt.isAir && !tgt.isLiquid) { stopPillar(s); return false; }
    } catch {}

    // 頭がぶつかる位置を空ける(deny保護は同じ列のため startPillar 時の判定でカバー済み)
    try {
      const head = dim.getBlock({ x: p.bx, y: py + 2, z: p.bz });
      if (head && !head.isAir && !head.isLiquid) {
        if (isProtected(head.typeId)) { stopPillar(s); return false; }
        dim.runCommand(`setblock ${p.bx} ${py + 2} ${p.bz} air destroy`);
      }
    } catch {}

    p.placeY = py;
    p.phase = "rise";
    p.t = 0;
  }

  // ---- 上昇: 一定速度で持ち上げ、足が抜けたらブロックを置く ----
  else if (p.phase === "rise") {
    const goal = p.placeY + PILLAR_CLEAR;
    desiredY = Math.min(loc.y + PILLAR_STEP, goal);

    if (desiredY >= goal - 0.001) {
      desiredY = goal;
      let placed = false;
      try {
        const b = dim.getBlock({ x: p.bx, y: p.placeY, z: p.bz });
        if (b && (b.isAir || b.isLiquid)) {
          b.setType(PILLAR_BLOCK);
          placed = true;
          dim.playSound("use.stone",
            { x: p.bx + 0.5, y: p.placeY + 0.5, z: p.bz + 0.5 });
          dim.spawnParticle("minecraft:crop_growth_emitter",
            { x: p.bx + 0.5, y: p.placeY + 1.1, z: p.bz + 0.5 });
        }
      } catch {}

      if (placed) { p.placed++; p.fails = 0; } else { p.fails++; }
      p.phase = "settle";
      p.t = 0;
    } else if (p.t > 20) {
      // 何らかの理由で上がれない場合は測り直してやり直す
      p.fails++;
      p.phase = "jump";
      p.t = 0;
    }
  }

  // ---- 着地: 置いたブロックの上に乗る ----
  else if (p.phase === "settle") {
    desiredY = p.placeY + 1.0;
    if (p.t >= PILLAR_SETTLE) {
      p.phase = "jump";
      p.t = 0;
    }
  }

  // ---- 柱の中心と目標の高さへ移動 ----
  // x/z を固定することで、追跡AIに引っ張られて柱から落ちるのを防ぐ
  try {
    master.teleport(
      { x: p.bx + 0.5, y: desiredY, z: p.bz + 0.5 },
      { dimension: dim, keepVelocity: false }
    );
  } catch {
    stopPillar(s);
    return false;
  }

  return true;
}

function breakTowards(master, target, dim) {
  const loc = master.location;
  const dx = target.location.x - loc.x;
  const dy = target.location.y - loc.y;
  const dz = target.location.z - loc.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  const nx = dx / len, nz = dz / len;

  const candidates = [
    { x: loc.x + nx, y: loc.y + 1, z: loc.z + nz },
    { x: loc.x + nx, y: loc.y, z: loc.z + nz },
  ];
  if (dy > 1.5) candidates.push({ x: loc.x, y: loc.y + 2, z: loc.z });
  if (dy < -1.5) candidates.push({ x: loc.x, y: loc.y - 1, z: loc.z });

  let broken = 0;
  for (const cnd of candidates) {
    if (broken >= 3) break;
    let block;
    try { block = dim.getBlock(cnd); } catch { continue; }
    if (!block || block.isAir || block.isLiquid) continue;
    if (isProtected(block.typeId)) continue;
    if (isEditProtected(dim, cnd.x, cnd.y, cnd.z)) continue;  // deny保護範囲は壊さない
    const bx = block.x, by = block.y, bz = block.z;
    try {
      dim.runCommand(`setblock ${bx} ${by} ${bz} air destroy`);
    } catch {
      try { block.setType("minecraft:air"); } catch { continue; }
    }
    try { dim.playSound("dig.stone", { x: bx + 0.5, y: by + 0.5, z: bz + 0.5 }); } catch {}
    broken++;
  }
}

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
const RENDER_LIMITED = new Set([
  "minecraft:trident",
  "minecraft:shield",
]);




registerLavaCommand();

// ---------- コマンドによるターゲット選択 ----------
// 使い方: /scriptevent pvpbot:target tag  /  /scriptevent pvpbot:target all
// タグの付け方: /tag <プレイヤー名> add pvp_target
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "pvpbot:target") return;
  const m = (ev.message || "").trim().toLowerCase();

  if (m !== "tag" && m !== "all") {
    world.sendMessage("§c[PVPbot] 使い方: /scriptevent pvpbot:target <all / tag>");
    world.sendMessage("§7  all = 全プレイヤーを狙う(初期値)");
    world.sendMessage("§7  tag = /tag <名前> add pvp_target を付けた人だけ狙う");
    world.sendMessage(`§7  現在: ${getTargetMode()}`);
    return;
  }

  world.setDynamicProperty("pvp_target_mode", m);
  // 既存の個体に即反映
  for (const dimId of DIMENSIONS) {
    try {
      const dim = world.getDimension(dimId);
      for (const e of dim.getEntities({ type: MASTER_ID })) {
        applyTargetMode(e);
      }
    } catch {}
  }

  if (m === "tag") {
    world.sendMessage("§6[PVPbot] §epvp_target §bタグのあるプレイヤーだけ §eを狙うモードにしました");
    // タグ付きプレイヤーがいるか確認して案内する
    let count = 0;
    try {
      for (const p of world.getPlayers()) {
        if (p.hasTag(TARGET_TAG)) count++;
      }
    } catch {}
    if (count === 0) {
      world.sendMessage("§e  ⚠ タグの付いたプレイヤーがいません。このままだと誰も狙いません");
      world.sendMessage("§7  /tag <プレイヤー名> add pvp_target で対象を指定してください");
    } else {
      world.sendMessage(`§7  現在の対象: ${count}人`);
    }
  } else {
    world.sendMessage("§6[PVPbot] §e全プレイヤー §eを狙うモードに戻しました");
  }
});

// ---------- コマンドによる武器変更 ----------
// 使い方: /scriptevent pvpbot:weapon <アイテムID>  例: diamond_sword, netherite_axe, trident
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "pvpbot:weapon") return;
  let id = (ev.message || "").trim().toLowerCase();
  if (id.length === 0) {
    world.sendMessage("§c[PVPbot] 使い方: /scriptevent pvpbot:weapon <アイテムID>");
    world.sendMessage("§7  例: diamond_sword / netherite_axe / iron_sword / stick");
    world.sendMessage("§7  ※trident等の一部は装備されても見た目が表示されない場合あり");
    const weaponOverride = world.getDynamicProperty("pvp_weapon");
    world.sendMessage(typeof weaponOverride === "string" && weaponOverride.length > 0
      ? `§7  現在の武器設定: ${weaponOverride}（全レベル共通）`
      : `§7  現在の武器設定: レベル別（${Object.entries(INVENTORY_CONFIG.levels)
        .map(([level, settings]) => `${level}=${settings.weapon.replace("minecraft:", "")}`)
        .join(", ")}）`);
    return;
  }
  if (!id.includes(":")) id = "minecraft:" + id;
  // アイテムIDが正しいか検証
  try {
    new ItemStack(id, 1);
  } catch {
    world.sendMessage(`§c[PVPbot] アイテムID「${id}」が見つかりません`);
    return;
  }
  world.setDynamicProperty("pvp_weapon", id);
  // 描画されないアイテムは、先にその旨を正直に伝える
  if (RENDER_LIMITED.has(id)) {
    world.sendMessage(`§e[PVPbot] 注意: §b${id.replace("minecraft:", "")} §eはマイクラの仕様で、Mobが手に持った見た目が表示されないことがあります`);
    world.sendMessage(`§7  装備と攻撃力は反映されています(素手に見えても${id.replace("minecraft:", "")}の威力で殴ってきます)`);
  }
  // 先に持ち替えを実行し、実際の結果を確認してから報告する
  let total = 0, done = 0;
  for (const dimId of DIMENSIONS) {
    try {
      const dim = world.getDimension(dimId);
      for (const m of dim.getEntities({ type: MASTER_ID })) {
        total++;
        if (equipWeapon(m)) {
          done++;
          dim.playSound("armor.equip_generic", m.location);
        }
      }
    } catch {}
  }
  const short = id.replace("minecraft:", "");
  if (total === 0) {
    world.sendMessage(`§6[PVPbot] §e武器を §b${short} §eに設定しました(次にスポーンした個体から反映)`);
  } else if (done === total) {
    world.sendMessage(`§6[PVPbot] §e武器を §b${short} §eに変更しました(${done}体)`);
  } else {
    world.sendMessage(`§c[PVPbot] ${total}体中${done}体しか持ち替えられませんでした`);
    world.sendMessage(`§7  5秒ごとに自動で再適用されます。直らない場合は個体を出し直してください`);
  }
  // 実際の手持ちを読み取れる環境なら、確認結果も表示する
  system.runTimeout(() => {
    try {
      for (const dimId of DIMENSIONS) {
        const dim = world.getDimension(dimId);
        for (const m of dim.getEntities({ type: MASTER_ID })) {
          const held = getHeldItemId(m);
          if (held !== null) {
            world.sendMessage(`§7[確認] 現在の手持ち: ${held.replace("minecraft:", "")}`);
            return;
          }
        }
      }
    } catch {}
  }, 5);
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
  initializeHealingInventory,
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
    const state = getState(hurt);
    const c = cfg(hurt);
    const hp = hurt.getComponent("minecraft:health");
    if (hp && state.healStatusCd <= 0) {
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
        tryStartHealing(hurt);
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
