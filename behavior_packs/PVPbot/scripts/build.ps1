$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourcePath = Join-Path $scriptDirectory "main.source.js"
$configPath = Join-Path $scriptDirectory "inventory_config.js"
$waterBucketPath = Join-Path $scriptDirectory "water_bucket.js"
$blockProtectionPath = Join-Path $scriptDirectory "block_protection.js"
$spawnSetupPath = Join-Path $scriptDirectory "spawn_setup.js"
$deathHandlerPath = Join-Path $scriptDirectory "death_handler.js"
$lavaBehaviorPath = Join-Path $scriptDirectory "lava_behavior.js"
$inventoryDropPath = Join-Path $scriptDirectory "inventory_drop.js"
$fallBehaviorPath = Join-Path $scriptDirectory "fall_behavior.js"
$editProtectionPath = Join-Path $scriptDirectory "edit_protection.js"
$headPosePath = Join-Path $scriptDirectory "head_pose.js"
$outputPath = Join-Path $scriptDirectory "main.js"
$importLine = 'import { INVENTORY_CONFIG } from "./inventory_config.js";'
$waterImportLine = 'import { ensureWaterBucketInventory, tickWaterBucket } from "./water_bucket.js";'
$blockProtectionImportLine = 'import { isProtected } from "./block_protection.js";'
$spawnSetupImportLine = 'import { registerSpawnSetup } from "./spawn_setup.js";'
$deathHandlerImportLine = 'import { registerDeathHandler } from "./death_handler.js";'
$lavaBehaviorImportLine = 'import { createLavaBehavior, registerLavaCommand } from "./lava_behavior.js";'
$inventoryDropImportLine = 'import { createInventoryDropper } from "./inventory_drop.js";'
$fallBehaviorImportLine = 'import { createFallBehavior } from "./fall_behavior.js";'
$editProtectionImportLine = 'import { isEditProtected } from "./edit_protection.js";'
$headPoseImportLine = 'import { updateHeadPose } from "./head_pose.js";'

$source = [System.IO.File]::ReadAllText($sourcePath, [System.Text.Encoding]::UTF8)
$config = [System.IO.File]::ReadAllText($configPath, [System.Text.Encoding]::UTF8)
$waterBucket = [System.IO.File]::ReadAllText($waterBucketPath, [System.Text.Encoding]::UTF8)
$blockProtection = [System.IO.File]::ReadAllText($blockProtectionPath, [System.Text.Encoding]::UTF8)
$spawnSetup = [System.IO.File]::ReadAllText($spawnSetupPath, [System.Text.Encoding]::UTF8)
$deathHandler = [System.IO.File]::ReadAllText($deathHandlerPath, [System.Text.Encoding]::UTF8)
$lavaBehavior = [System.IO.File]::ReadAllText($lavaBehaviorPath, [System.Text.Encoding]::UTF8)
$inventoryDrop = [System.IO.File]::ReadAllText($inventoryDropPath, [System.Text.Encoding]::UTF8)
$fallBehavior = [System.IO.File]::ReadAllText($fallBehaviorPath, [System.Text.Encoding]::UTF8)
$editProtection = [System.IO.File]::ReadAllText($editProtectionPath, [System.Text.Encoding]::UTF8)
$headPose = [System.IO.File]::ReadAllText($headPosePath, [System.Text.Encoding]::UTF8)

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
if (-not $lavaBehavior.Contains("export function registerLavaCommand(")) {
  throw "Expected lava command export was not found in $lavaBehaviorPath"
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
if (-not $editProtection.Contains("export function isEditProtected(")) {
  throw "Expected edit protection export was not found in $editProtectionPath"
}
if (-not $headPose.Contains("export function updateHeadPose(")) {
  throw "Expected head pose export was not found in $headPosePath"
}

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
$editProtection = $editProtection.Replace("export function ", "function ")
$headPose = $headPose.Replace("export function ", "function ")
$bundle = $source.Replace($importLine, $config)
$bundle = $bundle.Replace($waterImportLine, $waterBucket)
$bundle = $bundle.Replace($blockProtectionImportLine, $blockProtection)
$bundle = $bundle.Replace($spawnSetupImportLine, $spawnSetup)
$bundle = $bundle.Replace($deathHandlerImportLine, $deathHandler)
$bundle = $bundle.Replace($lavaBehaviorImportLine, $lavaBehavior)
$bundle = $bundle.Replace($inventoryDropImportLine, $inventoryDrop)
$bundle = $bundle.Replace($fallBehaviorImportLine, $fallBehavior)
$bundle = $bundle.Replace($editProtectionImportLine, $editProtection)
$bundle = $bundle.Replace($headPoseImportLine, $headPose)
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, $bundle, $utf8WithoutBom)
Write-Output "Generated $outputPath"
