// ============================================================
//  PVPbot - AIスクリプト v3
//  機能: 追跡 / ストレイフ&クリティカル / 自己回復 /
//        水バケツMLG / ブロック破壊 / 勝敗判定 /
//        召喚イベントと5種類のレベル別スポーンエッグに対応
// ============================================================
import { world, system, GameMode, Direction } from "@minecraft/server";
import { MSG, logWarn, logError, broadcastChat, broadcastMessage } from "./message.js";
import { INVENTORY_CONFIG } from "./inventory_config.js";
import { getBotInventory } from "./inventory.js";
import { ensureWaterBucketInventory, tickWaterBucket } from "./action_water_bucket.js";
import { isProtected, isEditProtected } from "./block_protection.js";
import { registerSpawnSetup } from "./spawn_setup.js";
import { registerDeathHandler } from "./death_handler.js";
import { createLavaBehavior } from "./action_escape.js";
import { createInventoryDropper } from "./inventory_drop.js";
import { createFallBehavior } from "./action_fall_behavior.js";
import { createCqcAttackAction } from "./action_attack_cqc.js";
import { createPlayerAttackAction } from "./action_attack.js";
import { createBotDamageAction } from "./action_damage.js";
import { createStrafeAction } from "./action_strafe.js";
import { createCriticalAction } from "./action_critical.js";
import { createActionController } from "./action.js";
import { createTargetSearcher } from "./search_target.js";
import { knockback } from "./action_knockback.js";
import { updateHeadPose } from "./head_pose.js";
import { createBotStatus, getBotLevelName } from "./bot_status.js";
import { createHealingHandler } from "./action_healing.js";
import { PILLAR_BLOCK, pillarBehavior } from "./action_pillar.js";
import { createMainhandController, getHeldItemId } from "./inventory_mainhand.js";
import { createOffhandController } from "./inventory_offhand.js";
import { createInventorySetup } from "./inventory_setup.js";
import { createArmorEquipper } from "./inventory_armor.js";
import { createBlockBreaker } from "./block_break.js";
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
const applyPlayerAttackKnockback = createPlayerAttackAction({ masterId: MASTER_ID, knockback });
const SPAWN_EGG_LEVELS = {
  "pvpbot:spawn_egg_1": 1,
  "pvpbot:spawn_egg_2": 2,
  "pvpbot:spawn_egg_3": 3,
  "pvpbot:spawn_egg_4": 4,
  "pvpbot:spawn_egg_5": 5,
};

// ---------- 強さレベル定義 (1〜5) ----------
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
    if (Number.isInteger(level) && level >= 1 && level <= 5) return level;
  } catch {}
  return DEFAULT_LEVEL;
}

const updateName = createBotStatus({ getLevel });

const initializeInventory = createInventorySetup({
  inventoryConfig: INVENTORY_CONFIG,
  getLevel,
  getState,
  getBotInventory,
  ensureWaterBucketInventory,
});

const dropInventoryItems = createInventoryDropper({ getBotInventory, broadcastMessage });

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

const equipLevelArmor = createArmorEquipper({
  inventoryConfig: INVENTORY_CONFIG,
  getLevel,
});

const fallBehavior = createFallBehavior({ knockback });
const strafeAction = createStrafeAction({ knockback });
const criticalAction = createCriticalAction();
const cqcAttackAction = createCqcAttackAction({ strafeAction, getLevel, criticalAction });

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

const targetSearcher = createTargetSearcher({
  getTargetMode,
  targetTag: TARGET_TAG,
  distance: dist,
  excludeGameModes: [GameMode.creative, GameMode.spectator],
});

const tryStartHealing = createHealingHandler({
  inventoryConfig: INVENTORY_CONFIG,
  getLevel,
  getState,
  getBotInventory,
  broadcastMessage,
  getHealingItem: (master) => INVENTORY_CONFIG.levels[getLevel(master)].healingItem,
  getMainhandMode,
  updateMainhandMode,
  equipWeapon,
});
const handleBotDamage = createBotDamageAction({ masterId: MASTER_ID, getState, tryStartHealing });

// ---------- メインAIループ (毎tick) ----------
system.runInterval(() => {
  for (const dimId of DIMENSIONS) {
    let dim;
    try { dim = world.getDimension(dimId); } catch { continue; }
    for (const master of dim.getEntities({ type: MASTER_ID })) {
      try {
        if (system.currentTick % 5 === 0) updateName(master);
        tryStartHealing(master);
      } catch (error) {
        console.error(`[PVPbot] 独立した回復判定に失敗しました: ${error}`);
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
        if (system.currentTick % 100 === 0) {
          equipOffhandShield(master);
          updateMainhandMode(master, true);
        }
        aiTick(master, dim);
      } catch { /* チャンク未ロード等は無視 */ }
    }
  }
}, 1);


function aiTick(master, dim) {
  const s = getState(master);
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

  actionController(master, dim, s);
}


const lavaBehavior = createLavaBehavior({
  knockback,
  isEditProtected,
  pillarBlock: PILLAR_BLOCK,
});
const breakTowards = createBlockBreaker({ isProtected, isEditProtected });
const actionController = createActionController({
  lavaEscapeTick: lavaBehavior.lavaEscapeTick,
  updateTarget: targetSearcher.updateTarget,
  tryStartHealing,
  cqcAttackAction,
  pillarBehavior,
  tryDescend: fallBehavior.tryDescend,
  tryLavaBridge: lavaBehavior.tryLavaBridge,
  breakTowards,
  distance: dist,
});

// 600ティックごとに存在しなくなったエンティティの状態を破棄する(メモリリーク対策)
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
  getLevel,
  getBotLevelName,
  broadcastMessage,
  equipWeapon,
  equipLevelArmor,
  equipOffhandShield,
  syncSkin,
  updateName,
  applyTargetMode,
  initializeInventory,
});

registerDeathHandler({
  masterId: MASTER_ID,
  broadcastMessage,
  dropInventoryItems,
  states,
  getLevel,
  getBotLevelName,
});

// ダメージ時の処理
world.afterEvents.entityHurt.subscribe((ev) => {
  handleBotDamage(ev);
  applyPlayerAttackKnockback(ev);
});
