$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourcePath = Join-Path $scriptDirectory "main.source.js"
$messagePath = Join-Path $scriptDirectory "message.js"
$messageResourcePath = Join-Path $scriptDirectory "message_resource.js"
$configPath = Join-Path $scriptDirectory "inventory_config.js"
$waterBucketPath = Join-Path $scriptDirectory "action_water_bucket.js"
$blockProtectionPath = Join-Path $scriptDirectory "block_protection.js"
$spawnSetupPath = Join-Path $scriptDirectory "spawn_setup.js"
$deathHandlerPath = Join-Path $scriptDirectory "death_handler.js"
$lavaBehaviorPath = Join-Path $scriptDirectory "action_escape.js"
$lavaEscapePath = Join-Path $scriptDirectory "action_escape_lava.js"
$bridgeActionPath = Join-Path $scriptDirectory "action_bridge.js"
$inventoryDropPath = Join-Path $scriptDirectory "inventory_drop.js"
$fallBehaviorPath = Join-Path $scriptDirectory "action_fall_behavior.js"
$cqcAttackActionPath = Join-Path $scriptDirectory "action_attack_cqc.js"
$playerAttackActionPath = Join-Path $scriptDirectory "action_attack.js"
$botDamageActionPath = Join-Path $scriptDirectory "action_damage.js"
$strafeActionPath = Join-Path $scriptDirectory "action_strafe.js"
$criticalActionPath = Join-Path $scriptDirectory "action_critical.js"
$actionPath = Join-Path $scriptDirectory "action.js"
$searchTargetPath = Join-Path $scriptDirectory "search_target.js"
$knockbackPath = Join-Path $scriptDirectory "action_knockback.js"
$blockBreakPath = Join-Path $scriptDirectory "block_break.js"
$jumpPath = Join-Path $scriptDirectory "action_jump.js"
$putBlockPath = Join-Path $scriptDirectory "block_put.js"
$headPosePath = Join-Path $scriptDirectory "head_pose.js"
$botStatusPath = Join-Path $scriptDirectory "bot_status.js"
$healingPath = Join-Path $scriptDirectory "action_healing.js"
$pillarPath = Join-Path $scriptDirectory "action_pillar.js"
$mainhandPath = Join-Path $scriptDirectory "inventory_mainhand.js"
$offhandPath = Join-Path $scriptDirectory "inventory_offhand.js"
$inventoryPath = Join-Path $scriptDirectory "inventory.js"
$inventorySetupPath = Join-Path $scriptDirectory "inventory_setup.js"
$inventoryArmorPath = Join-Path $scriptDirectory "inventory_armor.js"
$commandPath = Join-Path $scriptDirectory "command.js"
$outputPath = Join-Path $scriptDirectory "main.js"
$importLine = 'import { INVENTORY_CONFIG } from "./inventory_config.js";'
$messageImportLine = 'import { MSG, logWarn, logError, broadcastChat, broadcastMessage } from "./message.js";'
$healingImportLine = 'import { createHealingHandler } from "./action_healing.js";'
$pillarImportLine = 'import { PILLAR_BLOCK, pillarBehavior } from "./action_pillar.js";'
$mainhandImportLine = 'import { createMainhandController, getHeldItemId } from "./inventory_mainhand.js";'
$offhandImportLine = 'import { createOffhandController } from "./inventory_offhand.js";'
$inventorySetupImportLine = 'import { createInventorySetup } from "./inventory_setup.js";'
$inventoryImportLine = 'import { getBotInventory } from "./inventory.js";'
$inventoryArmorImportLine = 'import { createArmorEquipper } from "./inventory_armor.js";'
$messageResourceImportLine = 'import { MSG_DATA } from "./message_resource.js";'
$deathCauseImportLine = 'import { MSG_DEATH_CAUSE } from "./message_resource.js";'
$waterImportLine = 'import { ensureWaterBucketInventory, tickWaterBucket } from "./action_water_bucket.js";'
$blockProtectionImportLine = 'import { isProtected, isEditProtected } from "./block_protection.js";'
$spawnSetupImportLine = 'import { registerSpawnSetup } from "./spawn_setup.js";'
$deathHandlerImportLine = 'import { registerDeathHandler } from "./death_handler.js";'
$lavaBehaviorImportLine = 'import { createLavaBehavior } from "./action_escape.js";'
$commandImportLine = 'import { registerCommands } from "./command.js";'
$inventoryDropImportLine = 'import { createInventoryDropper } from "./inventory_drop.js";'
$fallBehaviorImportLine = 'import { createFallBehavior } from "./action_fall_behavior.js";'
$cqcAttackActionImportLine = 'import { createCqcAttackAction } from "./action_attack_cqc.js";'
$playerAttackActionImportLine = 'import { createPlayerAttackAction } from "./action_attack.js";'
$botDamageActionImportLine = 'import { createBotDamageAction } from "./action_damage.js";'
$strafeActionImportLine = 'import { createStrafeAction } from "./action_strafe.js";'
$criticalActionImportLine = 'import { createCriticalAction } from "./action_critical.js";'
$actionImportLine = 'import { createActionController } from "./action.js";'
$headPoseImportLine = 'import { updateHeadPose } from "./head_pose.js";'
$botStatusImportLine = 'import { createBotStatus, getBotLevelName } from "./bot_status.js";'

$source = [System.IO.File]::ReadAllText($sourcePath, [System.Text.Encoding]::UTF8)
$messageContent = [System.IO.File]::ReadAllText($messagePath, [System.Text.Encoding]::UTF8)
$messageResource = [System.IO.File]::ReadAllText($messageResourcePath, [System.Text.Encoding]::UTF8)
$config = [System.IO.File]::ReadAllText($configPath, [System.Text.Encoding]::UTF8)
$waterBucket = [System.IO.File]::ReadAllText($waterBucketPath, [System.Text.Encoding]::UTF8)
$blockProtection = [System.IO.File]::ReadAllText($blockProtectionPath, [System.Text.Encoding]::UTF8)
$spawnSetup = [System.IO.File]::ReadAllText($spawnSetupPath, [System.Text.Encoding]::UTF8)
$deathHandler = [System.IO.File]::ReadAllText($deathHandlerPath, [System.Text.Encoding]::UTF8)
$lavaBehavior = [System.IO.File]::ReadAllText($lavaBehaviorPath, [System.Text.Encoding]::UTF8)
$lavaEscape = [System.IO.File]::ReadAllText($lavaEscapePath, [System.Text.Encoding]::UTF8)
$bridgeAction = [System.IO.File]::ReadAllText($bridgeActionPath, [System.Text.Encoding]::UTF8)
$inventoryDrop = [System.IO.File]::ReadAllText($inventoryDropPath, [System.Text.Encoding]::UTF8)
$fallBehavior = [System.IO.File]::ReadAllText($fallBehaviorPath, [System.Text.Encoding]::UTF8)
$cqcAttackAction = [System.IO.File]::ReadAllText($cqcAttackActionPath, [System.Text.Encoding]::UTF8)
$playerAttackAction = [System.IO.File]::ReadAllText($playerAttackActionPath, [System.Text.Encoding]::UTF8)
$botDamageAction = [System.IO.File]::ReadAllText($botDamageActionPath, [System.Text.Encoding]::UTF8)
$strafeAction = [System.IO.File]::ReadAllText($strafeActionPath, [System.Text.Encoding]::UTF8)
$criticalAction = [System.IO.File]::ReadAllText($criticalActionPath, [System.Text.Encoding]::UTF8)
$actionModule = [System.IO.File]::ReadAllText($actionPath, [System.Text.Encoding]::UTF8)
$searchTarget = [System.IO.File]::ReadAllText($searchTargetPath, [System.Text.Encoding]::UTF8)
$knockback = [System.IO.File]::ReadAllText($knockbackPath, [System.Text.Encoding]::UTF8)
$blockBreak = [System.IO.File]::ReadAllText($blockBreakPath, [System.Text.Encoding]::UTF8)
$jump = [System.IO.File]::ReadAllText($jumpPath, [System.Text.Encoding]::UTF8)
$putBlock = [System.IO.File]::ReadAllText($putBlockPath, [System.Text.Encoding]::UTF8)
$headPose = [System.IO.File]::ReadAllText($headPosePath, [System.Text.Encoding]::UTF8)
$botStatus = [System.IO.File]::ReadAllText($botStatusPath, [System.Text.Encoding]::UTF8)
$healing = [System.IO.File]::ReadAllText($healingPath, [System.Text.Encoding]::UTF8)
$pillar = [System.IO.File]::ReadAllText($pillarPath, [System.Text.Encoding]::UTF8)
$mainhand = [System.IO.File]::ReadAllText($mainhandPath, [System.Text.Encoding]::UTF8)
$offhand = [System.IO.File]::ReadAllText($offhandPath, [System.Text.Encoding]::UTF8)
$inventory = [System.IO.File]::ReadAllText($inventoryPath, [System.Text.Encoding]::UTF8)
$inventorySetup = [System.IO.File]::ReadAllText($inventorySetupPath, [System.Text.Encoding]::UTF8)
$inventoryArmor = [System.IO.File]::ReadAllText($inventoryArmorPath, [System.Text.Encoding]::UTF8)
$command = [System.IO.File]::ReadAllText($commandPath, [System.Text.Encoding]::UTF8)

if (-not $source.Contains($messageImportLine)) {
  throw "Expected message import was not found in $sourcePath"
}
if (-not $source.Contains($importLine)) {
  throw "Expected config import was not found in $sourcePath"
}
if (-not $source.Contains($waterImportLine)) {
  throw "Expected water bucket import was not found in $sourcePath"
}
if (-not $source.Contains($blockProtectionImportLine)) {
  throw "Expected block protection import was not found in $sourcePath"
}
if (-not $source.Contains($spawnSetupImportLine)) {
  throw "Expected spawn setup import was not found in $sourcePath"
}
if (-not $source.Contains($deathHandlerImportLine)) {
  throw "Expected death handler import was not found in $sourcePath"
}
if (-not $source.Contains($lavaBehaviorImportLine)) {
  throw "Expected lava behavior import was not found in $sourcePath"
}
if (-not $source.Contains($inventoryDropImportLine)) {
  throw "Expected inventory drop import was not found in $sourcePath"
}
if (-not $source.Contains($fallBehaviorImportLine)) {
  throw "Expected fall behavior import was not found in $sourcePath"
}
if (-not $source.Contains($cqcAttackActionImportLine)) {
  throw "Expected close combat action import was not found in $sourcePath"
}
if (-not $source.Contains($playerAttackActionImportLine)) {
  throw "Expected player attack action import was not found in $sourcePath"
}
if (-not $source.Contains($botDamageActionImportLine)) {
  throw "Expected bot damage action import was not found in $sourcePath"
}
if (-not $source.Contains($strafeActionImportLine)) {
  throw "Expected strafe action import was not found in $sourcePath"
}
if (-not $source.Contains($criticalActionImportLine)) {
  throw "Expected critical action import was not found in $sourcePath"
}
if (-not $source.Contains($actionImportLine)) {
  throw "Expected action controller import was not found in $sourcePath"
}
if (-not $source.Contains('import { createTargetSearcher } from "./search_target.js";')) {
  throw "Expected target search import was not found in $sourcePath"
}
if (-not $source.Contains($headPoseImportLine)) {
  throw "Expected head pose import was not found in $sourcePath"
}
if (-not $source.Contains($botStatusImportLine)) {
  throw "Expected bot status import was not found in $sourcePath"
}
if (-not $source.Contains($healingImportLine)) {
  throw "Expected healing import was not found in $sourcePath"
}
if (-not $source.Contains($pillarImportLine)) {
  throw "Expected pillar import was not found in $sourcePath"
}
if (-not $source.Contains($mainhandImportLine)) {
  throw "Expected mainhand import was not found in $sourcePath"
}
if (-not $source.Contains($offhandImportLine)) {
  throw "Expected offhand import was not found in $sourcePath"
}
if (-not $source.Contains($inventorySetupImportLine)) {
  throw "Expected inventory setup import was not found in $sourcePath"
}
if (-not $source.Contains($inventoryImportLine)) {
  throw "Expected inventory helper import was not found in $sourcePath"
}
if (-not $source.Contains($inventoryArmorImportLine)) {
  throw "Expected inventory armor import was not found in $sourcePath"
}
if (-not $source.Contains($commandImportLine)) {
  throw "Expected command import was not found in $sourcePath"
}
if (-not $messageContent.StartsWith('import { world } from "@minecraft/server";')) {
  throw "Unexpected message module format in $messagePath"
}
if (-not $config.StartsWith("export const INVENTORY_CONFIG =")) {
  throw "Unexpected inventory config format in $configPath"
}
if (-not $waterBucket.StartsWith('import { ItemStack, world } from "@minecraft/server";')) {
  throw "Unexpected water bucket module format in $waterBucketPath"
}
if (-not $waterBucket.Contains('import { INVENTORY_CONFIG } from "./inventory_config.js";')) {
  throw "Expected inventory config import was not found in $waterBucketPath"
}
if (-not $blockProtection.Contains("export function isProtected(typeId) {")) {
  throw "Unexpected block protection module format in $blockProtectionPath"
}
if (-not $blockProtection.Contains("export function isEditProtected(")) {
  throw "Expected edit protection export was not found in $blockProtectionPath"
}
if (-not $spawnSetup.StartsWith('import { world, system } from "@minecraft/server";')) {
  throw "Unexpected spawn setup module format in $spawnSetupPath"
}
if (-not $spawnSetup.Contains("export function registerSpawnSetup(")) {
  throw "Expected spawn setup export was not found in $spawnSetupPath"
}
if (-not $deathHandler.StartsWith('import { world } from "@minecraft/server";')) {
  throw "Unexpected death handler module format in $deathHandlerPath"
}
if (-not $deathHandler.Contains("export function registerDeathHandler(")) {
  throw "Expected death handler export was not found in $deathHandlerPath"
}
if (-not $lavaBehavior.StartsWith('import { createLavaEscapeBehavior } from "./action_escape_lava.js";')) {
  throw "Unexpected lava behavior module format in $lavaBehaviorPath"
}
if (-not $lavaBehavior.Contains("export function createLavaBehavior(")) {
  throw "Expected lava behavior factory export was not found in $lavaBehaviorPath"
}
if (-not $lavaBehavior.Contains('import { createLavaEscapeBehavior } from "./action_escape_lava.js";')) {
  throw "Expected lava escape import was not found in $lavaBehaviorPath"
}
if (-not $lavaBehavior.Contains('import { createBridgeAction } from "./action_bridge.js";')) {
  throw "Expected bridge action import was not found in $lavaBehaviorPath"
}
if (-not $lavaEscape.Contains("export function createLavaEscapeBehavior(")) {
  throw "Expected lava escape behavior factory was not found in $lavaEscapePath"
}
if (-not $bridgeAction.Contains("export function createBridgeAction(")) {
  throw "Expected bridge action factory was not found in $bridgeActionPath"
}
if (-not $inventoryDrop.StartsWith('import { system } from "@minecraft/server";')) {
  throw "Unexpected inventory drop module format in $inventoryDropPath"
}
if (-not $inventoryDrop.Contains("export function createInventoryDropper(")) {
  throw "Expected inventory drop factory export was not found in $inventoryDropPath"
}
if (-not $fallBehavior.Contains("export function createFallBehavior(")) {
  throw "Expected fall behavior factory export was not found in $fallBehaviorPath"
}
if (-not $knockback.Contains("export function knockback(")) {
  throw "Expected knockback export was not found in $knockbackPath"
}
if (-not $headPose.Contains("export function updateHeadPose(")) {
  throw "Expected head pose export was not found in $headPosePath"
}
if (-not $botStatus.Contains("export function createBotStatus(")) {
  throw "Expected bot status factory was not found in $botStatusPath"
}
if (-not $botStatus.Contains("export function getBotLevelName(")) {
  throw "Expected bot level name lookup was not found in $botStatusPath"
}
if (-not $healing.Contains("export function createHealingHandler(")) {
  throw "Expected healing handler export was not found in $healingPath"
}
if (-not $pillar.Contains('export const PILLAR_BLOCK = "minecraft:cobblestone";')) {
  throw "Unexpected pillar block definition in $pillarPath"
}
if (-not $pillar.StartsWith('import { isProtected, isEditProtected } from "./block_protection.js";')) {
  throw "Unexpected pillar protection import in $pillarPath"
}
if (-not $pillar.Contains('import { putBlock } from "./block_put.js";')) {
  throw "Expected block placement import was not found in $pillarPath"
}
if (-not $pillar.Contains("export const pillarBehavior = createPillarBehavior(")) {
  throw "Expected initialized pillar behavior export was not found in $pillarPath"
}
if (-not $putBlock.Contains("export function putBlock(")) {
  throw "Expected block placement function was not found in $putBlockPath"
}
if (-not $pillar.Contains('import { preparePillarJump } from "./action_jump.js";')) {
  throw "Expected jump behavior import was not found in $pillarPath"
}
if (-not $jump.Contains('import { breakBlock } from "./block_break.js";')) {
  throw "Expected block breaking import was not found in $jumpPath"
}
if (-not $jump.Contains("export function preparePillarJump(")) {
  throw "Expected jump behavior function was not found in $jumpPath"
}
if (-not $mainhand.StartsWith('import { EquipmentSlot, ItemStack, world } from "@minecraft/server";')) {
  throw "Unexpected mainhand module format in $mainhandPath"
}
if (-not $mainhand.Contains("export function createMainhandController(")) {
  throw "Expected mainhand controller export was not found in $mainhandPath"
}
if (-not $mainhand.Contains("export function getHeldItemId(")) {
  throw "Expected held item lookup was not found in $mainhandPath"
}
if (-not $offhand.Contains("export function createOffhandController(")) {
  throw "Expected offhand controller export was not found in $offhandPath"
}
if (-not $inventorySetup.StartsWith('import { ItemStack } from "@minecraft/server";')) {
  throw "Unexpected inventory setup module format in $inventorySetupPath"
}
if (-not $inventorySetup.Contains("export function createInventorySetup(")) {
  throw "Expected inventory setup export was not found in $inventorySetupPath"
}
if (-not $inventory.Contains("export function getBotInventory(")) {
  throw "Expected bot inventory helper was not found in $inventoryPath"
}
if (-not $inventoryArmor.StartsWith('import { EquipmentSlot, ItemStack } from "@minecraft/server";')) {
  throw "Unexpected inventory armor module format in $inventoryArmorPath"
}
if (-not $inventoryArmor.Contains("export function createArmorEquipper(")) {
  throw "Expected armor equipper factory was not found in $inventoryArmorPath"
}
if (-not $blockBreak.Contains("export function breakBlock(")) {
  throw "Expected block breaking function was not found in $blockBreakPath"
}
if (-not $blockBreak.Contains("export function createBlockBreaker(")) {
  throw "Expected block breaker factory was not found in $blockBreakPath"
}
if (-not $searchTarget.Contains("export function createTargetSearcher(")) {
  throw "Expected target search factory was not found in $searchTargetPath"
}
if (-not $cqcAttackAction.Contains("export function createCqcAttackAction(")) {
  throw "Expected close combat action factory was not found in $cqcAttackActionPath"
}
if (-not $playerAttackAction.Contains("export function createPlayerAttackAction(")) {
  throw "Expected player attack action factory was not found in $playerAttackActionPath"
}
if (-not $botDamageAction.StartsWith('import { system } from "@minecraft/server";')) {
  throw "Unexpected bot damage action module format in $botDamageActionPath"
}
if (-not $botDamageAction.Contains("export function createBotDamageAction(")) {
  throw "Expected bot damage action factory was not found in $botDamageActionPath"
}
if (-not $strafeAction.Contains("export function createStrafeAction(")) {
  throw "Expected strafe action factory was not found in $strafeActionPath"
}
if (-not $criticalAction.Contains("export function createCriticalAction(")) {
  throw "Expected critical action factory was not found in $criticalActionPath"
}
if (-not $actionModule.Contains("export function createActionController(")) {
  throw "Expected action controller factory was not found in $actionPath"
}
if (-not $command.StartsWith('import { world, system, ItemStack } from "@minecraft/server";')) {
  throw "Unexpected command module format in $commandPath"
}
if (-not $command.Contains("export function registerCommands(")) {
  throw "Expected command registration export was not found in $commandPath"
}
if (-not $messageContent.Contains($messageResourceImportLine)) {
  throw "Expected message resource import was not found in $messagePath"
}
if (-not $messageResource.StartsWith("export const MSG_DATA =")) {
  throw "Unexpected message resource format in $messageResourcePath"
}
if (-not $deathHandler.Contains($deathCauseImportLine)) {
  throw "Expected death cause import was not found in $deathHandlerPath"
}
if (-not $messageResource.Contains("export const MSG_DEATH_CAUSE =")) {
  throw "Unexpected message resource format in $messageResourcePath"
}
$messageResource = $messageResource.Replace("export const MSG_DATA =", "const MSG_DATA =")
$messageResource = $messageResource.Replace("export const MSG_DEATH_CAUSE =", "const MSG_DEATH_CAUSE =")
$messageContent = $messageContent.Replace($messageResourceImportLine, $messageResource)
$messageContent = $messageContent.Replace($deathCauseImportLine, $messageResource)
$messageContent = $messageContent.Replace('import { world } from "@minecraft/server";', "")
$messageContent = $messageContent.Replace("export const ", "const ")
$messageContent = $messageContent.Replace("export function ", "function ")
$config = $config.Replace("export const INVENTORY_CONFIG =", "const INVENTORY_CONFIG =")
$waterBucket = $waterBucket.Replace('import { ItemStack, world } from "@minecraft/server";', "")
$waterBucket = $waterBucket.Replace('import { INVENTORY_CONFIG } from "./inventory_config.js";', "")
$waterBucket = $waterBucket.Replace("export function ", "function ")
$blockProtection = $blockProtection.Replace("export function ", "function ")
$spawnSetup = $spawnSetup.Replace('import { world, system } from "@minecraft/server";', "")
$spawnSetup = $spawnSetup.Replace("export function ", "function ")
$deathHandler = $deathHandler.Replace('import { world } from "@minecraft/server";', "")
$deathHandler = $deathHandler.Replace("export function ", "function ")
$lavaEscape = $lavaEscape.Replace("export function ", "function ") + [Environment]::NewLine
$bridgeAction = $bridgeAction.Replace("export function ", "function ") + [Environment]::NewLine
$lavaBehavior = $lavaBehavior.Replace('import { createBridgeAction } from "./action_bridge.js";', $bridgeAction)
$lavaBehavior = $lavaBehavior.Replace('import { createLavaEscapeBehavior } from "./action_escape_lava.js";', $lavaEscape)
$lavaBehavior = $lavaBehavior.Replace('import { world, system } from "@minecraft/server";', "")
$lavaBehavior = $lavaBehavior.Replace("export function ", "function ")
$inventoryDrop = $inventoryDrop.Replace('import { system } from "@minecraft/server";', "")
$inventoryDrop = $inventoryDrop.Replace("export function ", "function ")
$fallBehavior = $fallBehavior.Replace("export function ", "function ")
$cqcAttackAction = [Environment]::NewLine + $cqcAttackAction.Replace("export function ", "function ") + [Environment]::NewLine
$playerAttackAction = [Environment]::NewLine + $playerAttackAction.Replace("export function ", "function ") + [Environment]::NewLine
$botDamageAction = $botDamageAction.Replace('import { system } from "@minecraft/server";', "")
$botDamageAction = [Environment]::NewLine + $botDamageAction.Replace("export function ", "function ") + [Environment]::NewLine
$strafeAction = [Environment]::NewLine + $strafeAction.Replace("export function ", "function ") + [Environment]::NewLine
$criticalAction = [Environment]::NewLine + $criticalAction.Replace("export function ", "function ") + [Environment]::NewLine
$actionModule = [Environment]::NewLine + $actionModule.Replace("export function ", "function ") + [Environment]::NewLine
$searchTarget = [Environment]::NewLine + $searchTarget.Replace("export function ", "function ") + [Environment]::NewLine
$knockback = $knockback.Replace("export function ", "function ") + [Environment]::NewLine
$headPose = $headPose.Replace("export function ", "function ")
$botStatus = [Environment]::NewLine + $botStatus.Replace("export function ", "function ") + [Environment]::NewLine
$healing = $healing.Replace('import { system } from "@minecraft/server";', "")
$healing = $healing.Replace("export function ", "function ") + [Environment]::NewLine
$putBlock = $putBlock.Replace("export function ", "function ") + [Environment]::NewLine
$pillar = $pillar.Replace('import { putBlock } from "./block_put.js";', $putBlock)
$jump = $jump.Replace('import { breakBlock } from "./block_break.js";', "")
$jump = $jump.Replace("export function ", "function ") + [Environment]::NewLine
$pillar = $pillar.Replace('import { preparePillarJump } from "./action_jump.js";', $jump)
$blockBreak = $blockBreak.Replace("export function ", "function ") + [Environment]::NewLine
$pillar = $pillar.Replace('import { breakBlock } from "./block_break.js";', "")
$pillar = $pillar.Replace('import { isProtected, isEditProtected } from "./block_protection.js";', "")
$pillar = $pillar.Replace('export const PILLAR_BLOCK =', 'const PILLAR_BLOCK =')
$pillar = $pillar.Replace('export const pillarBehavior =', 'const pillarBehavior =')
$pillar = $pillar.Replace("export function ", "function ") + [Environment]::NewLine
$mainhand = $mainhand.Replace('import { EquipmentSlot, ItemStack, world } from "@minecraft/server";', "")
$mainhand = $mainhand.Replace("export function ", "function ") + [Environment]::NewLine
$offhand = $offhand.Replace("export function ", "function ") + [Environment]::NewLine
$inventory = [Environment]::NewLine + $inventory.Replace("export function ", "function ") + [Environment]::NewLine
$inventorySetup = $inventorySetup.Replace('import { ItemStack } from "@minecraft/server";', "")
$inventorySetup = $inventorySetup.Replace("export function ", "function ") + [Environment]::NewLine
$inventoryArmor = $inventoryArmor.Replace('import { EquipmentSlot, ItemStack } from "@minecraft/server";', "")
$inventoryArmor = $inventoryArmor.Replace("export function ", "function ") + [Environment]::NewLine
$command = $command.Replace('import { world, system, ItemStack } from "@minecraft/server";', "")
$command = $command.Replace("export function ", "function ") + [Environment]::NewLine
$bundle = $source
# 各子ファイルのクレンジング（ここを徹底強化）
# 子ファイル（message.jsやdeath_handler.jsなど）の中に残っている、message_resource 関連のインポート行を
# スペースの数や改行コードに関係なく、正規表現で「根こそぎ完全に消去」します。
$messageContent = $messageContent -replace 'import\s*\{\s*MSG_DATA.*?\}\s*from\s*"\./message_resource\.js";\r?\n?', ""
$deathHandler   = $deathHandler   -replace 'import\s*\{\s*MSG_DEATH_CAUSE.*?\}\s*from\s*"\./message_resource\.js";\r?\n?', ""

# 本体（main.source.js）へ各ファイルをガッチャンコしていく
# message.js の中身（MSG_DATAが埋め込まれた状態）を結合
$bundle = $bundle -replace 'import\s*\{\s*MSG.*?\}\s*from\s*"\./message\.js";\r?\n?', $messageContent

# inventory_config.js を結合
$bundle = $bundle -replace 'import\s*\{\s*INVENTORY_CONFIG.*?\}\s*from\s*"\./inventory_config\.js";\r?\n?', $config

# message_resource.js の生データ（MSG_DATA と MSG_DEATH_CAUSE）を main の中に安全にインライン展開
$bundle = $bundle -replace 'import\s*\{\s*MSG_DATA.*?\}\s*from\s*"\./message_resource\.js";\r?\n?', $messageResource
$bundle = $bundle -replace 'import\s*\{\s*MSG_DEATH_CAUSE.*?\}\s*from\s*"\./message_resource\.js";\r?\n?', ""

$bundle = $bundle -replace 'import\s*\{\s*INVENTORY_CONFIG.*?\}\s*from\s*"\./inventory_config\.js";\r?\n?', $config
$bundle = $bundle -replace 'import\s*\{\s*ensureWaterBucketInventory.*?\}\s*from\s*"\./action_water_bucket\.js";\r?\n?', $waterBucket
$bundle = $bundle -replace 'import\s*\{\s*isProtected.*?\}\s*from\s*"\./block_protection\.js";\r?\n?', $blockProtection
$bundle = $bundle -replace 'import\s*\{\s*registerSpawnSetup.*?\}\s*from\s*"\./spawn_setup\.js";\r?\n?', $spawnSetup
$bundle = $bundle -replace 'import\s*\{\s*registerDeathHandler.*?\}\s*from\s*"\./death_handler\.js";\r?\n?', $deathHandler
$bundle = $bundle -replace 'import\s*\{\s*createLavaBehavior.*?\}\s*from\s*"\./action_escape\.js";\r?\n?', $lavaBehavior
$bundle = $bundle -replace 'import\s*\{\s*createInventoryDropper.*?\}\s*from\s*"\./inventory_drop\.js";\r?\n?', $inventoryDrop
$bundle = $bundle -replace 'import\s*\{\s*createFallBehavior.*?\}\s*from\s*"\./action_fall_behavior\.js";\r?\n?', $fallBehavior
$bundle = $bundle -replace 'import\s*\{\s*createCqcAttackAction.*?\}\s*from\s*"\./action_attack_cqc\.js";\r?\n?', $cqcAttackAction
$bundle = $bundle -replace 'import\s*\{\s*createPlayerAttackAction.*?\}\s*from\s*"\./action_attack\.js";\r?\n?', $playerAttackAction
$bundle = $bundle -replace 'import\s*\{\s*createBotDamageAction.*?\}\s*from\s*"\./action_damage\.js";\r?\n?', $botDamageAction
$bundle = $bundle -replace 'import\s*\{\s*createStrafeAction.*?\}\s*from\s*"\./action_strafe\.js";\r?\n?', $strafeAction
$bundle = $bundle -replace 'import\s*\{\s*createCriticalAction.*?\}\s*from\s*"\./action_critical\.js";\r?\n?', $criticalAction
$bundle = $bundle -replace 'import\s*\{\s*createActionController.*?\}\s*from\s*"\./action\.js";\r?\n?', $actionModule
$bundle = $bundle -replace 'import\s*\{\s*createTargetSearcher.*?\}\s*from\s*"\./search_target\.js";\r?\n?', $searchTarget
$bundle = $bundle -replace 'import\s*\{\s*knockback.*?\}\s*from\s*"\./action_knockback\.js";\r?\n?', $knockback
$bundle = $bundle -replace 'import\s*\{\s*updateHeadPose.*?\}\s*from\s*"\./head_pose\.js";\r?\n?', $headPose
$bundle = $bundle -replace 'import\s*\{\s*createBotStatus.*?\}\s*from\s*"\./bot_status\.js";\r?\n?', $botStatus
$bundle = $bundle -replace 'import\s*\{\s*createHealingHandler.*?\}\s*from\s*"\./action_healing\.js";\r?\n?', $healing
$bundle = $bundle -replace 'import\s*\{\s*PILLAR_BLOCK.*?\}\s*from\s*"\./action_pillar\.js";\r?\n?', $pillar
$bundle = $bundle -replace 'import\s*\{\s*createMainhandController.*?\}\s*from\s*"\./inventory_mainhand\.js";\r?\n?', $mainhand
$bundle = $bundle -replace 'import\s*\{\s*createOffhandController.*?\}\s*from\s*"\./inventory_offhand\.js";\r?\n?', $offhand
$bundle = $bundle -replace 'import\s*\{\s*getBotInventory.*?\}\s*from\s*"\./inventory\.js";\r?\n?', $inventory
$bundle = $bundle -replace 'import\s*\{\s*createInventorySetup.*?\}\s*from\s*"\./inventory_setup\.js";\r?\n?', $inventorySetup
$bundle = $bundle -replace 'import\s*\{\s*createArmorEquipper.*?\}\s*from\s*"\./inventory_armor\.js";\r?\n?', $inventoryArmor
$bundle = $bundle -replace 'import\s*\{\s*createBlockBreaker.*?\}\s*from\s*"\./block_break\.js";\r?\n?', $blockBreak
$bundle = $bundle -replace 'import\s*\{\s*registerCommands.*?\}\s*from\s*"\./command\.js";\r?\n?', $command
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, $bundle, $utf8WithoutBom)
Write-Output "Generated $outputPath"
