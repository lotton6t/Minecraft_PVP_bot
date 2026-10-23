$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourcePath = Join-Path $scriptDirectory "main.source.js"
$messagePath = Join-Path $scriptDirectory "message.js"
$messageResourcePath = Join-Path $scriptDirectory "message_resource.js"
$configPath = Join-Path $scriptDirectory "inventory_config.js"
$waterBucketPath = Join-Path $scriptDirectory "water_bucket.js"
$blockProtectionPath = Join-Path $scriptDirectory "block_protection.js"
$spawnSetupPath = Join-Path $scriptDirectory "spawn_setup.js"
$deathHandlerPath = Join-Path $scriptDirectory "death_handler.js"
$lavaBehaviorPath = Join-Path $scriptDirectory "lava_behavior.js"
$inventoryDropPath = Join-Path $scriptDirectory "inventory_drop.js"
$fallBehaviorPath = Join-Path $scriptDirectory "fall_behavior.js"
$knockbackPath = Join-Path $scriptDirectory "knocback.js"
$editProtectionPath = Join-Path $scriptDirectory "edit_protection.js"
$headPosePath = Join-Path $scriptDirectory "head_pose.js"
$healingPath = Join-Path $scriptDirectory "healing.js"
$pillarPath = Join-Path $scriptDirectory "pillar.js"
$mainhandPath = Join-Path $scriptDirectory "mainhand.js"
$offhandPath = Join-Path $scriptDirectory "offhand.js"
$inventorySetupPath = Join-Path $scriptDirectory "inventory_setup.js"
$blockBreakerPath = Join-Path $scriptDirectory "break_towareds.js"
$commandPath = Join-Path $scriptDirectory "command.js"
$outputPath = Join-Path $scriptDirectory "main.js"
$importLine = 'import { INVENTORY_CONFIG } from "./inventory_config.js";'
$messageImportLine = 'import { MSG, logWarn, logError, broadcastChat, broadcastMessage } from "./message.js";'
$healingImportLine = 'import { createHealingHandler } from "./healing.js";'
$pillarImportLine = 'import { PILLAR_BLOCK, pillarBehavior } from "./pillar.js";'
$mainhandImportLine = 'import { createMainhandController } from "./mainhand.js";'
$offhandImportLine = 'import { createOffhandController } from "./offhand.js";'
$inventorySetupImportLine = 'import { createInventorySetup } from "./inventory_setup.js";'
$blockBreakerImportLine = 'import { createBlockBreaker } from "./break_towareds.js";'
$messageResourceImportLine = 'import { MSG_DATA } from "./message_resource.js";'
$waterImportLine = 'import { ensureWaterBucketInventory, tickWaterBucket } from "./water_bucket.js";'
$blockProtectionImportLine = 'import { isProtected } from "./block_protection.js";'
$spawnSetupImportLine = 'import { registerSpawnSetup } from "./spawn_setup.js";'
$deathHandlerImportLine = 'import { registerDeathHandler } from "./death_handler.js";'
$lavaBehaviorImportLine = 'import { createLavaBehavior } from "./lava_behavior.js";'
$commandImportLine = 'import { registerCommands } from "./command.js";'
$inventoryDropImportLine = 'import { createInventoryDropper } from "./inventory_drop.js";'
$fallBehaviorImportLine = 'import { createFallBehavior } from "./fall_behavior.js";'
$editProtectionImportLine = 'import { isEditProtected } from "./edit_protection.js";'
$headPoseImportLine = 'import { updateHeadPose } from "./head_pose.js";'

$source = [System.IO.File]::ReadAllText($sourcePath, [System.Text.Encoding]::UTF8)
$messageContent = [System.IO.File]::ReadAllText($messagePath, [System.Text.Encoding]::UTF8)
$messageResource = [System.IO.File]::ReadAllText($messageResourcePath, [System.Text.Encoding]::UTF8)
$config = [System.IO.File]::ReadAllText($configPath, [System.Text.Encoding]::UTF8)
$waterBucket = [System.IO.File]::ReadAllText($waterBucketPath, [System.Text.Encoding]::UTF8)
$blockProtection = [System.IO.File]::ReadAllText($blockProtectionPath, [System.Text.Encoding]::UTF8)
$spawnSetup = [System.IO.File]::ReadAllText($spawnSetupPath, [System.Text.Encoding]::UTF8)
$deathHandler = [System.IO.File]::ReadAllText($deathHandlerPath, [System.Text.Encoding]::UTF8)
$lavaBehavior = [System.IO.File]::ReadAllText($lavaBehaviorPath, [System.Text.Encoding]::UTF8)
$inventoryDrop = [System.IO.File]::ReadAllText($inventoryDropPath, [System.Text.Encoding]::UTF8)
$fallBehavior = [System.IO.File]::ReadAllText($fallBehaviorPath, [System.Text.Encoding]::UTF8)
$knockback = [System.IO.File]::ReadAllText($knockbackPath, [System.Text.Encoding]::UTF8)
$editProtection = [System.IO.File]::ReadAllText($editProtectionPath, [System.Text.Encoding]::UTF8)
$headPose = [System.IO.File]::ReadAllText($headPosePath, [System.Text.Encoding]::UTF8)
$healing = [System.IO.File]::ReadAllText($healingPath, [System.Text.Encoding]::UTF8)
$pillar = [System.IO.File]::ReadAllText($pillarPath, [System.Text.Encoding]::UTF8)
$mainhand = [System.IO.File]::ReadAllText($mainhandPath, [System.Text.Encoding]::UTF8)
$offhand = [System.IO.File]::ReadAllText($offhandPath, [System.Text.Encoding]::UTF8)
$inventorySetup = [System.IO.File]::ReadAllText($inventorySetupPath, [System.Text.Encoding]::UTF8)
$blockBreaker = [System.IO.File]::ReadAllText($blockBreakerPath, [System.Text.Encoding]::UTF8)
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
if (-not $source.Contains($editProtectionImportLine)) {
  throw "Expected edit protection import was not found in $sourcePath"
}
if (-not $source.Contains($headPoseImportLine)) {
  throw "Expected head pose import was not found in $sourcePath"
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
if (-not $source.Contains($blockBreakerImportLine)) {
  throw "Expected block breaker import was not found in $sourcePath"
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
if (-not $lavaBehavior.StartsWith('import { world, system } from "@minecraft/server";')) {
  throw "Unexpected lava behavior module format in $lavaBehaviorPath"
}
if (-not $lavaBehavior.Contains("export function createLavaBehavior(")) {
  throw "Expected lava behavior factory export was not found in $lavaBehaviorPath"
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
if (-not $editProtection.Contains("export function isEditProtected(")) {
  throw "Expected edit protection export was not found in $editProtectionPath"
}
if (-not $headPose.Contains("export function updateHeadPose(")) {
  throw "Expected head pose export was not found in $headPosePath"
}
if (-not $healing.Contains("export function createHealingHandler(")) {
  throw "Expected healing handler export was not found in $healingPath"
}
if (-not $pillar.Contains('export const PILLAR_BLOCK = "minecraft:cobblestone";')) {
  throw "Unexpected pillar block definition in $pillarPath"
}
if (-not $pillar.StartsWith('import { isProtected } from "./block_protection.js";')) {
  throw "Unexpected pillar protection import in $pillarPath"
}
if (-not $pillar.Contains('import { isEditProtected } from "./edit_protection.js";')) {
  throw "Expected edit protection import was not found in $pillarPath"
}
if (-not $pillar.Contains("export const pillarBehavior = createPillarBehavior(")) {
  throw "Expected initialized pillar behavior export was not found in $pillarPath"
}
if (-not $mainhand.StartsWith('import { EquipmentSlot, ItemStack, world } from "@minecraft/server";')) {
  throw "Unexpected mainhand module format in $mainhandPath"
}
if (-not $mainhand.Contains("export function createMainhandController(")) {
  throw "Expected mainhand controller export was not found in $mainhandPath"
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
if (-not $blockBreaker.Contains("export function createBlockBreaker(")) {
  throw "Expected block breaker export was not found in $blockBreakerPath"
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
$messageResource = $messageResource.Replace("export const MSG_DATA =", "const MSG_DATA =")
$messageContent = $messageContent.Replace($messageResourceImportLine, $messageResource)
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
$lavaBehavior = $lavaBehavior.Replace('import { world, system } from "@minecraft/server";', "")
$lavaBehavior = $lavaBehavior.Replace("export function ", "function ")
$inventoryDrop = $inventoryDrop.Replace('import { system } from "@minecraft/server";', "")
$inventoryDrop = $inventoryDrop.Replace("export function ", "function ")
$fallBehavior = $fallBehavior.Replace("export function ", "function ")
$knockback = $knockback.Replace("export function ", "function ") + [Environment]::NewLine
$editProtection = $editProtection.Replace("export function ", "function ")
$headPose = $headPose.Replace("export function ", "function ")
$healing = $healing.Replace('import { system } from "@minecraft/server";', "")
$healing = $healing.Replace("export function ", "function ") + [Environment]::NewLine
$pillar = $pillar.Replace('import { isProtected } from "./block_protection.js";', "")
$pillar = $pillar.Replace('import { isEditProtected } from "./edit_protection.js";', "")
$pillar = $pillar.Replace('export const PILLAR_BLOCK =', 'const PILLAR_BLOCK =')
$pillar = $pillar.Replace('export const pillarBehavior =', 'const pillarBehavior =')
$pillar = $pillar.Replace("export function ", "function ") + [Environment]::NewLine
$mainhand = $mainhand.Replace('import { EquipmentSlot, ItemStack, world } from "@minecraft/server";', "")
$mainhand = $mainhand.Replace("export function ", "function ") + [Environment]::NewLine
$offhand = $offhand.Replace("export function ", "function ") + [Environment]::NewLine
$inventorySetup = $inventorySetup.Replace('import { ItemStack } from "@minecraft/server";', "")
$inventorySetup = $inventorySetup.Replace("export function ", "function ") + [Environment]::NewLine
$blockBreaker = $blockBreaker.Replace("export function ", "function ") + [Environment]::NewLine
$command = $command.Replace('import { world, system, ItemStack } from "@minecraft/server";', "")
$command = $command.Replace("export function ", "function ") + [Environment]::NewLine
$bundle = $source
$bundle = $bundle -replace 'import\s*\{\s*MSG.*?\}\s*from\s*"\./message\.js";\r?\n?', $messageContent
$bundle = $bundle -replace 'import\s*\{\s*INVENTORY_CONFIG.*?\}\s*from\s*"\./inventory_config\.js";\r?\n?', $config
$bundle = $bundle -replace 'import\s*\{\s*ensureWaterBucketInventory.*?\}\s*from\s*"\./water_bucket\.js";\r?\n?', $waterBucket
$bundle = $bundle -replace 'import\s*\{\s*isProtected.*?\}\s*from\s*"\./block_protection\.js";\r?\n?', $blockProtection
$bundle = $bundle -replace 'import\s*\{\s*registerSpawnSetup.*?\}\s*from\s*"\./spawn_setup\.js";\r?\n?', $spawnSetup
$bundle = $bundle -replace 'import\s*\{\s*registerDeathHandler.*?\}\s*from\s*"\./death_handler\.js";\r?\n?', $deathHandler
$bundle = $bundle -replace 'import\s*\{\s*createLavaBehavior.*?\}\s*from\s*"\./lava_behavior\.js";\r?\n?', $lavaBehavior
$bundle = $bundle -replace 'import\s*\{\s*createInventoryDropper.*?\}\s*from\s*"\./inventory_drop\.js";\r?\n?', $inventoryDrop
$bundle = $bundle -replace 'import\s*\{\s*createFallBehavior.*?\}\s*from\s*"\./fall_behavior\.js";\r?\n?', $fallBehavior
$bundle = $bundle -replace 'import\s*\{\s*knockback.*?\}\s*from\s*"\./knocback\.js";\r?\n?', $knockback
$bundle = $bundle -replace 'import\s*\{\s*isEditProtected.*?\}\s*from\s*"\./edit_protection\.js";\r?\n?', $editProtection
$bundle = $bundle -replace 'import\s*\{\s*updateHeadPose.*?\}\s*from\s*"\./head_pose\.js";\r?\n?', $headPose
$bundle = $bundle -replace 'import\s*\{\s*createHealingHandler.*?\}\s*from\s*"\./healing\.js";\r?\n?', $healing
$bundle = $bundle -replace 'import\s*\{\s*PILLAR_BLOCK.*?\}\s*from\s*"\./pillar\.js";\r?\n?', $pillar
$bundle = $bundle -replace 'import\s*\{\s*createMainhandController.*?\}\s*from\s*"\./mainhand\.js";\r?\n?', $mainhand
$bundle = $bundle -replace 'import\s*\{\s*createOffhandController.*?\}\s*from\s*"\./offhand\.js";\r?\n?', $offhand
$bundle = $bundle -replace 'import\s*\{\s*createInventorySetup.*?\}\s*from\s*"\./inventory_setup\.js";\r?\n?', $inventorySetup
$bundle = $bundle -replace 'import\s*\{\s*createBlockBreaker.*?\}\s*from\s*"\./break_towareds\.js";\r?\n?', $blockBreaker
$bundle = $bundle -replace 'import\s*\{\s*registerCommands.*?\}\s*from\s*"\./command\.js";\r?\n?', $command
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, $bundle, $utf8WithoutBom)
Write-Output "Generated $outputPath"
