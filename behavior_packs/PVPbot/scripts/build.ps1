$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourcePath = Join-Path $scriptDirectory "main.source.js"
$configPath = Join-Path $scriptDirectory "inventory_config.js"
$waterBucketPath = Join-Path $scriptDirectory "water_bucket.js"
$outputPath = Join-Path $scriptDirectory "main.js"
$importLine = 'import { INVENTORY_CONFIG } from "./inventory_config.js";'
$waterImportLine = 'import { ensureWaterBucketInventory, tickWaterBucket } from "./water_bucket.js";'

$source = [System.IO.File]::ReadAllText($sourcePath, [System.Text.Encoding]::UTF8)
$config = [System.IO.File]::ReadAllText($configPath, [System.Text.Encoding]::UTF8)
$waterBucket = [System.IO.File]::ReadAllText($waterBucketPath, [System.Text.Encoding]::UTF8)

if (-not $source.Contains($importLine)) {
  throw "Expected config import was not found in $sourcePath"
}
if (-not $source.Contains($waterImportLine)) {
  throw "Expected water bucket import was not found in $sourcePath"
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

$config = $config.Replace("export const INVENTORY_CONFIG =", "const INVENTORY_CONFIG =")
$waterBucket = $waterBucket.Replace('import { ItemStack, world } from "@minecraft/server";', "")
$waterBucket = $waterBucket.Replace('import { INVENTORY_CONFIG } from "./inventory_config.js";', "")
$waterBucket = $waterBucket.Replace("export function ", "function ")
$bundle = $source.Replace($importLine, $config)
$bundle = $bundle.Replace($waterImportLine, $waterBucket)
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, $bundle, $utf8WithoutBom)
Write-Output "Generated $outputPath"
