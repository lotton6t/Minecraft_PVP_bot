export const INVENTORY_CONFIG = {
  defaultWeapon: "minecraft:netherite_sword",
  shield: "minecraft:shield",
  armorSlots: [
    { slot: "head", suffix: "helmet" },
    { slot: "chest", suffix: "chestplate" },
    { slot: "legs", suffix: "leggings" },
    { slot: "feet", suffix: "boots" },
  ],
  levels: {
    1: {
      weapon: "minecraft:iron_sword",
      armor: "iron",
      healingItem: { id: "minecraft:cooked_beef", amount: 16 },
    },
    2: {
      weapon: "minecraft:diamond_sword",
      armor: "diamond",
      healingItem: { id: "minecraft:golden_carrot", amount: 64 },
    },
    3: {
      weapon: "minecraft:diamond_sword",
      armor: "diamond",
      healingItem: { id: "minecraft:golden_apple", amount: 64 },
    },
    4: {
      weapon: "minecraft:netherite_sword",
      armor: "netherite",
      healingItem: { id: "minecraft:golden_apple", amount: 64 },
    },
    5: {
      weapon: "minecraft:netherite_sword",
      armor: "netherite",
      healingItem: { id: "minecraft:golden_apple", amount: 64 },
    },
  },
};
