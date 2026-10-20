const UNBREAKABLE = new Set([
  "minecraft:bedrock", "minecraft:barrier", "minecraft:deny", "minecraft:allow",
  "minecraft:border_block", "minecraft:light_block", "minecraft:moving_block",
  "minecraft:structure_block", "minecraft:structure_void", "minecraft:jigsaw",
  "minecraft:command_block", "minecraft:chain_command_block",
  "minecraft:repeating_command_block",
  "minecraft:end_portal", "minecraft:end_portal_frame", "minecraft:end_gateway",
  "minecraft:portal", "minecraft:reinforced_deepslate",
  "minecraft:chest", "minecraft:trapped_chest", "minecraft:ender_chest",
  "minecraft:barrel", "minecraft:shulker_box", "minecraft:undyed_shulker_box",
  "minecraft:hopper", "minecraft:dispenser", "minecraft:dropper",
  "minecraft:furnace", "minecraft:lit_furnace",
  "minecraft:blast_furnace", "minecraft:lit_blast_furnace",
  "minecraft:smoker", "minecraft:lit_smoker",
  "minecraft:brewing_stand", "minecraft:chiseled_bookshelf",
  "minecraft:decorated_pot", "minecraft:lectern", "minecraft:jukebox",
  "minecraft:beacon", "minecraft:conduit", "minecraft:enchanting_table",
  "minecraft:anvil", "minecraft:chipped_anvil", "minecraft:damaged_anvil",
  "minecraft:mob_spawner", "minecraft:trial_spawner", "minecraft:vault",
  "minecraft:respawn_anchor", "minecraft:lodestone",
  "minecraft:bed", "minecraft:sculk_catalyst", "minecraft:sculk_shrieker",
  "minecraft:tnt", "minecraft:water", "minecraft:lava",
  "minecraft:flowing_water", "minecraft:flowing_lava",
]);

export function isProtected(typeId) {
  if (UNBREAKABLE.has(typeId)) return true;
  if (typeId.endsWith("shulker_box")) return true;
  if (typeId.endsWith("_bed")) return true;
  if (typeId.endsWith("_command_block")) return true;
  return false;
}