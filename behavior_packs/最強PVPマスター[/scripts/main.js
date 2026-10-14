// ============================================================
//  最強PVPマスター - AIスクリプト v3
//  機能: 追跡 / ストレイフ&クリティカル / 自己回復 /
//        水バケツMLG / ブロック破壊 / 勝敗判定 /
//        コマンドによる強さレベル調整 (/scriptevent pvp:level N)
// ============================================================
import { world, system, GameMode, EquipmentSlot, ItemStack } from "@minecraft/server";

const MASTER_ID = "pvp:master";

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

// 溶岩・炎ダメージを受けるか(初期値: 受けない = 従来の挙動)
function isLavaOn() {
  return world.getDynamicProperty("pvp_lava") === true;
}

// 溶岩・炎の中にいるか(プロパティが無い環境ではブロックで判定)
function isInLavaOrFire(master, dim) {
  try {
    if (master.isInLava === true) return "lava";
  } catch {}
  try {
    const loc = master.location;
    const feet = dim.getBlock(loc);
    if (feet) {
      const id = feet.typeId;
      if (id === "minecraft:lava" || id === "minecraft:flowing_lava") return "lava";
      if (id === "minecraft:fire" || id === "minecraft:soul_fire") return "fire";
    }
  } catch {}
  return null;
}

// 溶岩モードON中に呼ばれる。10tickごとにダメージを与える。
// 【方式について】fire_immune はイベントでの付け外しが効かない環境が
// あるため、耐性は常時ONのまま、ダメージだけをスクリプトから直接与える。
// override 指定は耐性を貫通するので確実に減る。
function lavaDamageTick(master, dim) {
  if (!isLavaOn()) return;
  if (system.currentTick % 10 !== 0) return;   // 0.5秒ごと(バニラの溶岩と同じ間隔)
  const kind = isInLavaOrFire(master, dim);
  if (!kind) return;
  const dmg = kind === "lava" ? 4 : 1;         // バニラ相当: 溶岩4 / 炎1
  try {
    master.runCommand(`damage @s ${dmg} override`);
  } catch {
    try { master.applyDamage(dmg); } catch {}
  }
}


// ============================================================
//  溶岩からの脱出(溶岩ダメージONのときだけ働く)
//  プレイヤーと同じように、ジャンプ連打で浮上しながら岸を探し、
//  這い上がったら少しだけ溶岩から離れる。
//  【互換性】pvp:lava off のときは一切動作しない(従来は無敵で
//  溶岩を突っ切って追跡するのが正しい挙動のため)
// ============================================================

// 周囲8方向×距離5マスから「立てる岸」を探す
function findLavaExit(master, dim) {
  const loc = master.location;
  const baseY = Math.floor(loc.y);
  const DIRS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [0.707, 0.707], [0.707, -0.707], [-0.707, 0.707], [-0.707, -0.707],
  ];
  for (let r = 1; r <= 5; r++) {
    for (const [dx, dz] of DIRS) {
      const x = Math.floor(loc.x + dx * r);
      const z = Math.floor(loc.z + dz * r);
      for (const dy of [0, 1]) {   // 同じ高さ or 1段上の岸
        try {
          const feet = dim.getBlock({ x, y: baseY + dy, z });
          const head = dim.getBlock({ x, y: baseY + dy + 1, z });
          const ground = dim.getBlock({ x, y: baseY + dy - 1, z });
          if (!feet || !head || !ground) continue;
          const gid = ground.typeId;
          if (feet.isAir && head.isAir &&
              !ground.isAir && !ground.isLiquid &&
              gid !== "minecraft:magma") {
            return { dx, dz, up: dy };
          }
        } catch {}
      }
    }
  }
  return null;
}

// 脱出中は true を返す(その間、通常のAI行動は行わない)
function lavaEscapeTick(master, dim, s, inLava) {
  if (inLava) {
    s.lavaEsc = s.lavaEsc || { t: 0, scanCd: 0, exit: null, awayT: 0 };
    const e = s.lavaEsc;
    e.awayT = 14;   // 抜けた後に離れる時間を予約
    e.t++;

    // 岸の場所を定期的に探し直す
    if (e.scanCd <= 0 || !e.exit) {
      e.exit = findLavaExit(master, dim);
      e.scanCd = 10;
    } else {
      e.scanCd--;
    }

    // 5tickごとに泳ぎジャンプ(プレイヤーがジャンプ連打で浮くのと同じ)
    if (e.t % 5 === 0) {
      if (e.exit) {
        // 岸に向かって浮上。1段上の岸なら強めに跳ぶ
        const vert = e.exit.up === 1 ? 0.52 : 0.42;
        knockback(master, e.exit.dx, e.exit.dz, 0.28, vert);
      } else {
        // 岸が見つからなければ、とにかく浮上して視界を確保
        knockback(master, 0, 0, 0, 0.46);
      }
    }
    return true;
  }

  // 溶岩から出た直後: 予約した時間だけ同じ方向へ離れて距離を取る
  if (s.lavaEsc && s.lavaEsc.awayT > 0) {
    const e = s.lavaEsc;
    e.awayT--;
    if (e.exit && e.awayT % 3 === 0) {
      knockback(master, e.exit.dx, e.exit.dz, 0.3, 0.05);
    }
    if (e.awayT <= 0) s.lavaEsc = null;   // 脱出完了。通常のAIに戻る
    return true;
  }

  return false;
}


// ============================================================
//  溶岩の橋渡し(溶岩ダメージONのときだけ働く)
//  目の前に溶岩が広がっていて相手が向こう側にいるとき、
//  プレイヤーと同じように足元へブロックを置きながら渡っていく。
//  【互換性】pvp:lava off のときは一切動作しない(無敵で
//  突っ切るのが従来の正しい挙動のため)
// ============================================================
function tryLavaBridge(master, target, dim, s, d) {
  if (!isLavaOn()) return false;
  if (s.bridgeCd > 0) { s.bridgeCd--; return false; }
  if (!master.isOnGround || d < 2.5) return false;

  const loc = master.location;
  const dy = target.location.y - loc.y;
  if (Math.abs(dy) >= 3) return false;   // 高低差が大きい場合は積み上げ/降下に任せる

  const dx = target.location.x - loc.x;
  const dz = target.location.z - loc.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  const nx = dx / len, nz = dz / len;

  const feetY = Math.floor(loc.y + 0.02);
  const ax = Math.floor(loc.x + nx * 1.2);
  const az = Math.floor(loc.z + nz * 1.2);

  let feetAhead, stepAhead, below2;
  try {
    feetAhead = dim.getBlock({ x: ax, y: feetY, z: az });       // 一歩先の足の高さ
    stepAhead = dim.getBlock({ x: ax, y: feetY - 1, z: az });   // 一歩先の床
    below2    = dim.getBlock({ x: ax, y: feetY - 2, z: az });
  } catch { return false; }
  if (!feetAhead || !stepAhead) return false;

  // 足の高さまで溶岩がある場合は、渡る場所ではない(脱出・迂回に任せる)
  const isLava = (b) => b && (b.typeId === "minecraft:lava" || b.typeId === "minecraft:flowing_lava");
  if (isLava(feetAhead)) return false;
  if (!feetAhead.isAir) return false;   // 一歩先に壁がある場合は壁破壊に任せる

  // 「一歩先の床が溶岩」または「床が空気で、そのすぐ下が溶岩」→ 橋を架ける
  const needBridge = isLava(stepAhead) || (stepAhead.isAir && isLava(below2));
  if (!needBridge) return false;

  // deny保護範囲には設置しない
  if (isEditProtected(dim, ax, feetY - 1, az)) return false;

  try {
    stepAhead.setType(PILLAR_BLOCK);
    dim.playSound("use.stone", { x: ax + 0.5, y: feetY - 0.5, z: az + 0.5 });
  } catch { return false; }

  // 置いた足場の上へ一歩進む(経路探索は溶岩を避けたがるので軽く押す)
  knockback(master, nx, nz, 0.22, 0.05);
  s.bridgeCd = 6;
  return true;
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

function getLevel() {
  const v = world.getDynamicProperty("pvp_level");
  return (typeof v === "number" && LEVELS[v]) ? v : DEFAULT_LEVEL;
}
function cfg() { return LEVELS[getLevel()]; }

// ---------- 武器システム ----------
// 使い方: /scriptevent pvp:weapon diamond_sword
const DEFAULT_WEAPON = "minecraft:netherite_sword";

function getWeaponId() {
  const v = world.getDynamicProperty("pvp_weapon");
  return (typeof v === "string" && v.length > 0) ? v : DEFAULT_WEAPON;
}



// 頭上に表示する名前をレベルに合わせる
function updateName(master) {
  const lv = getLevel();
  try {
    master.nameTag = `最強PVPマスター（${LEVELS[lv].name}）`;
  } catch {}
}

function syncSkin(master) {
  try { master.setProperty("pvp:skin_level", getLevel()); } catch {}
}

// 武器を持ち替えさせる。成功したら true を返す。
//
// 【重要】equippable コンポーネントと replaceitem コマンドの「両方」を必ず実行する。
// コンポーネントの読み返しは「設定した値」を返すだけで、実際に描画される
// 手持ちと食い違う環境がある(武器によって片方しか効かない症状の原因)。
// どちらも同じ武器に置き換えるだけなので、二重に実行しても害はない。
function equipWeapon(master) {
  const id = getWeaponId();
  const short = id.replace("minecraft:", "");
  let ok = false;

  // 手段1: equippable コンポーネント
  try {
    const eq = master.getComponent("minecraft:equippable");
    if (eq) {
      eq.setEquipment(EquipmentSlot.Mainhand, new ItemStack(id, 1));
      ok = true;
    }
  } catch {}

  // 手段2: replaceitem コマンド(手段1の成否に関わらず必ず実行する)
  try {
    master.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${short} 1`);
    ok = true;
  } catch {
    try {
      master.runCommandAsync(`replaceitem entity @s slot.weapon.mainhand 0 ${short} 1`);
      ok = true;
    } catch {}
  }
  return ok;
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


// 壊してはいけないブロック
// setblock ... destroy はチェストの中身もドロップさせてしまうため、
// 配布アドオンとして他人のワールドを荒らさないよう保護対象を広く取る
const UNBREAKABLE = new Set([
  // 破壊不能・システム系
  "minecraft:bedrock", "minecraft:barrier", "minecraft:deny", "minecraft:allow",
  "minecraft:border_block", "minecraft:light_block", "minecraft:moving_block",
  "minecraft:structure_block", "minecraft:structure_void", "minecraft:jigsaw",
  "minecraft:command_block", "minecraft:chain_command_block",
  "minecraft:repeating_command_block",
  "minecraft:end_portal", "minecraft:end_portal_frame", "minecraft:end_gateway",
  "minecraft:portal", "minecraft:reinforced_deepslate",
  // 収納系(中身が飛び散るのを防ぐ)
  "minecraft:chest", "minecraft:trapped_chest", "minecraft:ender_chest",
  "minecraft:barrel", "minecraft:shulker_box", "minecraft:undyed_shulker_box",
  "minecraft:hopper", "minecraft:dispenser", "minecraft:dropper",
  "minecraft:furnace", "minecraft:lit_furnace",
  "minecraft:blast_furnace", "minecraft:lit_blast_furnace",
  "minecraft:smoker", "minecraft:lit_smoker",
  "minecraft:brewing_stand", "minecraft:chiseled_bookshelf",
  "minecraft:decorated_pot", "minecraft:lectern", "minecraft:jukebox",
  // 貴重・機能ブロック
  "minecraft:beacon", "minecraft:conduit", "minecraft:enchanting_table",
  "minecraft:anvil", "minecraft:chipped_anvil", "minecraft:damaged_anvil",
  "minecraft:mob_spawner", "minecraft:trial_spawner", "minecraft:vault",
  "minecraft:respawn_anchor", "minecraft:lodestone",
  "minecraft:bed", "minecraft:sculk_catalyst", "minecraft:sculk_shrieker",
  // 触ると危険
  "minecraft:tnt", "minecraft:water", "minecraft:lava",
  "minecraft:flowing_water", "minecraft:flowing_lava",
]);


// ============================================================
//  デニーブロック(建築保護)への対応
//  deny ブロックは「その真上の列」の破壊・設置を禁止する。
//  途中に allow があれば、そこから上は再び編集可能。
//  この判定は、対象座標から真下を走査して deny / allow の
//  どちらが先に見つかるかで決める(本来の仕様と同じ順序)。
//
//  【互換性への配慮】
//  ・deny が存在しないワールドでは必ず false を返し、従来と同一動作
//  ・走査中にエラーが出た場合も false(従来動作を優先)
// ============================================================
const PROTECT_SCAN_DEPTH = 128;   // 走査する最大深さ

function isEditProtected(dim, x, y, z) {
  try {
    const bx = Math.floor(x), bz = Math.floor(z);
    let minY = -64;
    try { minY = dim.heightRange.min; } catch {}
    const start = Math.floor(y) - 1;
    const stop = Math.max(minY, start - PROTECT_SCAN_DEPTH);
    for (let yy = start; yy >= stop; yy--) {
      let b;
      try { b = dim.getBlock({ x: bx, y: yy, z: bz }); } catch { return false; }
      if (!b) return false;                              // 未ロードは判定不能→従来動作
      const id = b.typeId;
      if (id === "minecraft:deny" || id === "minecraft:border_block") return true;
      if (id === "minecraft:allow") return false;        // allowから上は編集可
    }
  } catch {}
  return false;
}

// シュルカーボックスは色ごとにIDが違うため接尾辞でも判定する
function isProtected(typeId) {
  if (UNBREAKABLE.has(typeId)) return true;
  if (typeId.endsWith("shulker_box")) return true;
  if (typeId.endsWith("_bed")) return true;
  if (typeId.endsWith("_command_block")) return true;
  return false;
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

const DIMENSIONS = ["overworld", "nether", "the_end"];

// エンティティごとの状態管理
const states = new Map();
function getState(entity) {
  let s = states.get(entity.id);
  if (!s) {
    s = { healCd: 0, strafeCd: 0, breakCd: 0, mlgCd: 0, pillarCd: 0, stuckTicks: 0,
          lastPos: null, placedWater: [], pillar: null, scanCd: 0, cachedTarget: null,
          dropCd: 0, bridgeCd: 0 };
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
  const c = cfg();
  try {
    if (c.strength >= 0) master.addEffect("strength", 100, { amplifier: c.strength, showParticles: false });
    if (c.resistance >= 0) master.addEffect("resistance", 100, { amplifier: c.resistance, showParticles: false });
    if (c.hboost >= 0) master.addEffect("health_boost", 100, { amplifier: c.hboost, showParticles: false });
  } catch {}
}
function clearLevelBuffs(master) {
  for (const e of ["strength", "resistance", "health_boost", "speed"]) {
    try { master.removeEffect(e); } catch {}
  }
}

// ---------- メインAIループ (毎tick) ----------
system.runInterval(() => {
  const refreshBuffs = system.currentTick % 40 === 0;
  for (const dimId of DIMENSIONS) {
    let dim;
    try { dim = world.getDimension(dimId); } catch { continue; }
    for (const master of dim.getEntities({ type: MASTER_ID })) {
      try {
        if (refreshBuffs) applyLevelBuffs(master);
        if (system.currentTick % 100 === 0) equipWeapon(master); // 5秒ごとに武器を強制適用
        lavaDamageTick(master, dim);
        aiTick(master, dim, dimId);
      } catch { /* チャンク未ロード等は無視 */ }
    }
  }
}, 1);

function aiTick(master, dim, dimId) {
  const s = getState(master);
  const c = cfg();
  if (s.healCd > 0) s.healCd--;
  if (s.strafeCd > 0) s.strafeCd--;
  if (s.breakCd > 0) s.breakCd--;
  if (s.mlgCd > 0) s.mlgCd--;
  if (s.pillarCd > 0) s.pillarCd--;
  if (s.dropCd > 0) s.dropCd--;

  cleanupWater(s);

  // ---- 溶岩ダメージON中に溶岩へ落ちたら、何よりも先に脱出する ----
  const inLavaNow = isLavaOn() && isInLavaOrFire(master, dim) === "lava";
  if (lavaEscapeTick(master, dim, s, inLavaNow)) return;

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

  // ---- 水バケツMLG ----
  const vel = master.getVelocity();
  if (vel.y < -0.55 && !master.isInWater && s.mlgCd <= 0) {
    const hit = dim.getBlockFromRay(
      { x: loc.x, y: loc.y + 0.1, z: loc.z },
      { x: 0, y: -1, z: 0 },
      { maxDistance: 9, includeLiquidBlocks: true, includePassableBlocks: false }
    );
    if (hit && hit.block) {
      const ground = hit.block;
      if (!ground.isLiquid) {
        const above = ground.above();
        if (above && above.isAir && !isEditProtected(dim, above.x, above.y + 1, above.z)) {
          above.setType("minecraft:water");
          s.placedWater.push({ x: above.x, y: above.y, z: above.z, dimId, ttl: 60 });
          s.mlgCd = 20;
          try { dim.playSound("bucket.empty_water", loc); } catch {}
        }
      }
    }
  }

  // ---- 自己回復: 立ち止まって食べる ----
  const hp = master.getComponent("minecraft:health");
  if (hp && s.healCd <= 0 && hp.currentValue < hp.effectiveMax * c.healThr) {
    s.healCd = c.healCd;
    master.addEffect("slowness", 30, { amplifier: 5, showParticles: false });
    master.addEffect("weakness", 30, { amplifier: 5, showParticles: false });
    for (let i = 0; i < 3; i++) {
      system.runTimeout(() => {
        try {
          master.dimension.playSound("random.eat", master.location, { volume: 1.0 });
          master.dimension.spawnParticle("minecraft:crop_growth_emitter", {
            x: master.location.x, y: master.location.y + 1.5, z: master.location.z,
          });
        } catch {}
      }, i * 10);
    }
    system.runTimeout(() => {
      try {
        const h = master.getComponent("minecraft:health");
        if (h) h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + c.healAmt));
        master.addEffect("regeneration", 100, { amplifier: 1, showParticles: true });
        master.addEffect("absorption", 600, { amplifier: 0, showParticles: false });
        master.dimension.playSound("random.burp", master.location);
        for (let i = 0; i < 5; i++) {
          master.dimension.spawnParticle("minecraft:heart_particle", {
            x: master.location.x + (Math.random() - 0.5),
            y: master.location.y + 1.2 + Math.random(),
            z: master.location.z + (Math.random() - 0.5),
          });
        }
      } catch {}
    }, 30);
  }

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
  if (dyUp <= -DROP_MIN) {
    tryDescend(master, target, dim, s);
  }

  // ---- 溶岩が行く手を塞いでいる → ブロックを置いて渡る(lava onのみ) ----
  tryLavaBridge(master, target, dim, s, d);

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
//  高所からの降下
//  バニラの経路探索は落下ダメージを嫌って崖から降りようとしないため、
//  水バケツMLGを持っているこのMobは自分から飛び降りるようにする
// ============================================================
const DROP_MIN = 2.5;      // 相手がこれ以上下にいたら降りる判断をする
const DROP_SCAN = 24;      // 着地点を探す深さ

function tryDescend(master, target, dim, s) {
  if (s.dropCd > 0) return false;
  if (!master.isOnGround) return false;

  const loc = master.location;
  const dy = target.location.y - loc.y;
  if (dy > -DROP_MIN) return false;          // 相手が下にいない

  const dx = target.location.x - loc.x;
  const dz = target.location.z - loc.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) return false;
  const nx = dx / len, nz = dz / len;

  // 進行方向のすぐ先を調べる
  const fx = loc.x + nx * 0.9;
  const fz = loc.z + nz * 0.9;
  try {
    const at = dim.getBlock({ x: fx, y: loc.y, z: fz });
    if (!at || !(at.isAir || at.isLiquid)) return false;   // 壁なので進めない

    const below = dim.getBlock({ x: fx, y: loc.y - 1, z: fz });
    if (below && !below.isAir && !below.isLiquid) return false; // まだ床がある
  } catch { return false; }

  // 着地点を確認する
  let landing = null;
  try {
    const hit = dim.getBlockFromRay(
      { x: fx, y: loc.y - 1.2, z: fz },
      { x: 0, y: -1, z: 0 },
      { maxDistance: DROP_SCAN, includeLiquidBlocks: true, includePassableBlocks: false }
    );
    if (hit && hit.block) landing = hit.block;
  } catch { return false; }

  // 着地点が見つからない = 奈落やあまりに深い落下 → 飛び降りない
  if (!landing) return false;
  // 溶岩の上にも飛び降りない
  if (landing.typeId === "minecraft:lava" || landing.typeId === "minecraft:flowing_lava") {
    return false;
  }

  // 崖なので踏み出す(落下中は水バケツMLGが働く)
  knockback(master, nx, nz, 0.42, 0.02);
  s.dropCd = 8;
  return true;
}

// ============================================================
//  ブロック積み上げ(パルクールタワー)
//  ジャンプ → 空中で足元に設置 → 着地 → 再びジャンプ を繰り返して
//  相手の高さまで一気に登る
// ============================================================
const PILLAR_BLOCK = "minecraft:cobblestone";
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

function cleanupWater(s) {
  for (let i = s.placedWater.length - 1; i >= 0; i--) {
    const w = s.placedWater[i];
    w.ttl--;
    if (w.ttl > 0) continue;
    try {
      const dim = world.getDimension(w.dimId);
      const block = dim.getBlock({ x: w.x, y: w.y, z: w.z });
      if (block && block.typeId === "minecraft:water") {
        block.setType("minecraft:air");
        dim.playSound("bucket.fill_water", { x: w.x + 0.5, y: w.y + 0.5, z: w.z + 0.5 });
      }
    } catch {}
    s.placedWater.splice(i, 1);
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

// ---------- コマンドによる強さ調整 ----------
// 使い方: /scriptevent pvp:level 4   (1〜5)
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "pvp:level") return;
  const n = parseInt(ev.message, 10);
  if (!LEVELS[n]) {
    world.sendMessage("§c[PVPマスター] 使い方: /scriptevent pvp:level <1〜5>");
    world.sendMessage("§7  1=見習い 2=兵士 3=騎士(標準) 4=剣聖 5=魔王級");
    return;
  }
  world.setDynamicProperty("pvp_level", n);
  world.sendMessage(`§6[PVPマスター] §e強さレベルを §c${n} (${LEVELS[n].name}) §eに設定しました`);
  // 既存の個体に即反映(バフを一度リセットして再付与+全回復)
  for (const dimId of DIMENSIONS) {
    try {
      const dim = world.getDimension(dimId);
      for (const m of dim.getEntities({ type: MASTER_ID })) {
        clearLevelBuffs(m);
        applyLevelBuffs(m);
        syncSkin(m);
        updateName(m);
        const h = m.getComponent("minecraft:health");
        if (h) h.resetToMaxValue();
        dim.playSound("random.anvil_use", m.location);
      }
    } catch {}
  }
});

// 手に持たせても見た目が表示されないことがあるアイテム(ゲーム本体の描画仕様)。
// スロットへの装備と攻撃力は正しく反映されるが、モデルが描画されない。
const RENDER_LIMITED = new Set([
  "minecraft:trident",
  "minecraft:shield",
]);




// ---------- コマンドによる溶岩ダメージのON/OFF ----------
// 使い方: /scriptevent pvp:lava on  → 溶岩・炎のダメージを受けるようになる
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "pvp:lava") return;
  const m = (ev.message || "").trim().toLowerCase();
  if (m !== "on" && m !== "off") {
    world.sendMessage("§c[PVPマスター] 使い方: /scriptevent pvp:lava <on / off>");
    world.sendMessage("§7  on = 溶岩・炎のダメージを受ける / off = 無効(初期値)");
    world.sendMessage(`§7  現在: ${isLavaOn() ? "受ける" : "無効"}`);
    world.sendMessage("§7  ※TNTやエンドクリスタルなどの爆発ダメージは元々受けます");
    return;
  }
  world.setDynamicProperty("pvp_lava", m === "on");
  world.sendMessage(m === "on"
    ? "§6[PVPマスター] §e溶岩・炎のダメージを §c受ける §eようにしました"
    : "§6[PVPマスター] §e溶岩・炎のダメージを §a無効 §eに戻しました");
  if (m === "on") {
    world.sendMessage("§7  ※燃えるエフェクトは出ませんが、体力はボスバーで減っていきます");
  }
});

// ---------- コマンドによるターゲット選択 ----------
// 使い方: /scriptevent pvp:target tag  /  /scriptevent pvp:target all
// タグの付け方: /tag <プレイヤー名> add pvp_target
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "pvp:target") return;
  const m = (ev.message || "").trim().toLowerCase();

  if (m !== "tag" && m !== "all") {
    world.sendMessage("§c[PVPマスター] 使い方: /scriptevent pvp:target <all / tag>");
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
    world.sendMessage("§6[PVPマスター] §epvp_target §bタグのあるプレイヤーだけ §eを狙うモードにしました");
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
    world.sendMessage("§6[PVPマスター] §e全プレイヤー §eを狙うモードに戻しました");
  }
});

// ---------- コマンドによる武器変更 ----------
// 使い方: /scriptevent pvp:weapon <アイテムID>  例: diamond_sword, netherite_axe, trident
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "pvp:weapon") return;
  let id = (ev.message || "").trim().toLowerCase();
  if (id.length === 0) {
    world.sendMessage("§c[PVPマスター] 使い方: /scriptevent pvp:weapon <アイテムID>");
    world.sendMessage("§7  例: diamond_sword / netherite_axe / iron_sword / stick");
    world.sendMessage("§7  ※trident等の一部は装備されても見た目が表示されない場合あり");
    world.sendMessage(`§7  現在の武器: ${getWeaponId()}`);
    return;
  }
  if (!id.includes(":")) id = "minecraft:" + id;
  // アイテムIDが正しいか検証
  try {
    new ItemStack(id, 1);
  } catch {
    world.sendMessage(`§c[PVPマスター] アイテムID「${id}」が見つかりません`);
    return;
  }
  world.setDynamicProperty("pvp_weapon", id);
  // 描画されないアイテムは、先にその旨を正直に伝える
  if (RENDER_LIMITED.has(id)) {
    world.sendMessage(`§e[PVPマスター] 注意: §b${id.replace("minecraft:", "")} §eはマイクラの仕様で、Mobが手に持った見た目が表示されないことがあります`);
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
    world.sendMessage(`§6[PVPマスター] §e武器を §b${short} §eに設定しました(次にスポーンした個体から反映)`);
  } else if (done === total) {
    world.sendMessage(`§6[PVPマスター] §e武器を §b${short} §eに変更しました(${done}体)`);
  } else {
    world.sendMessage(`§c[PVPマスター] ${total}体中${done}体しか持ち替えられませんでした`);
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


// ワールドの再読込などで既存の個体が読み込まれたときにも、武器・見た目を適用し直す
if (world.afterEvents.entityLoad) {
  world.afterEvents.entityLoad.subscribe((ev) => {
    const e = ev.entity;
    if (!e || e.typeId !== MASTER_ID) return;
    system.runTimeout(() => {
      try { equipWeapon(e); syncSkin(e); updateName(e); applyLevelBuffs(e); applyTargetMode(e); } catch {}
    }, 10);
  });
}

// ---------- スポーン時の初期設定 ----------
world.afterEvents.entitySpawn.subscribe((ev) => {
  const e = ev.entity;
  if (!e || e.typeId !== MASTER_ID) return;
  try {
    applyLevelBuffs(e);
    system.runTimeout(() => { try { equipWeapon(e); syncSkin(e); updateName(e); } catch {} }, 10);
    const h = e.getComponent("minecraft:health");
    if (h) system.runTimeout(() => { try { h.resetToMaxValue(); } catch {} }, 5);
    world.sendMessage(`§e最強PVPマスター（${LEVELS[getLevel()].name}）がゲームに入室しました`);
  } catch {}
});

// ---------- 死亡時の処理 ----------
world.afterEvents.entityDie.subscribe((ev) => {
  const dead = ev.deadEntity;
  const killer = ev.damageSource ? ev.damageSource.damagingEntity : undefined;
  if (!dead) return;

  if (dead.typeId === MASTER_ID) {
    // 死ぬ前にMLGで置いた水が残らないよう、先に回収する
    const st = states.get(dead.id);
    if (st) {
      for (const w of st.placedWater) {
        try {
          const b = world.getDimension(w.dimId).getBlock({ x: w.x, y: w.y, z: w.z });
          if (b && b.typeId === "minecraft:water") b.setType("minecraft:air");
        } catch {}
      }
    }
    states.delete(dead.id);
    const botName = dead.nameTag || "最強PVPマスター";
    if (killer && killer.typeId === "minecraft:player") {
      world.sendMessage(`§f${botName}は${killer.name}に殺害された`);
    } else if (killer) {
      const killerName = killer.nameTag || killer.typeId;
      world.sendMessage(`§f${botName}は${killerName}に倒された`);
    } else {
      const causes = {
        anvil: "金床に押しつぶされた",
        blockExplosion: "爆発で倒された",
        drowning: "溺死した",
        entityExplosion: "爆発で倒された",
        fall: "落下死した",
        fallingBlock: "落下ブロックに押しつぶされた",
        fire: "火で焼け死んだ",
        fireTick: "火で焼け死んだ",
        fireworks: "花火で倒された",
        flyIntoWall: "壁に激突して倒れた",
        freezing: "凍死した",
        lava: "溶岩で焼け死んだ",
        lightning: "雷に打たれた",
        magic: "魔法で倒された",
        magma: "マグマブロックで倒れた",
        projectile: "飛び道具で倒された",
        stalactite: "鍾乳石に貫かれた",
        stalagmite: "尖った鍾乳石に貫かれた",
        starve: "飢え死にした",
        suffocation: "窒息死した",
        void: "奈落に落ちた",
        wither: "衰弱して倒れた",
        sonicBoom: "ソニックブームで倒された",
        maceSmash: "メイスで叩きつぶされた",
      };
      const cause = ev.damageSource && ev.damageSource.cause;
      world.sendMessage(`§f${botName}は${causes[cause] || `${cause || "不明な原因"}で倒された`}`);
    }
    world.sendMessage(`§e${botName}がゲームを退出しました`);
    return;
  }

  if (dead.typeId === "minecraft:player" && killer && killer.typeId === MASTER_ID) {
    try {
      // マスターの全回復は演出ではなく仕様なので、設定に関わらず行う
      const hp = killer.getComponent("minecraft:health");
      if (hp) hp.resetToMaxValue();
    } catch {}
  }
});

// ---------- コンボ補正 ----------
world.afterEvents.entityHurt.subscribe((ev) => {
  const src = ev.damageSource ? ev.damageSource.damagingEntity : undefined;
  const hurt = ev.hurtEntity;
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
