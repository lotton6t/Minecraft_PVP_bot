# PVPbot

Minecraft Bedrock Edition PVP bot add-on.

The current behavior pack is `PVPbot [BP] 1.25.24` with resource pack `PVPbot [RP] 1.1.2`. After installing them, enable both packs in the world's pack settings; the startup message is sent to a player when they first join the world.

## Commands

Run these with `/scriptevent` in-game:

```text
/scriptevent pvpbot:weapon <item_id>
/scriptevent pvpbot:target <all|tag>
/scriptevent pvpbot:lava <on|off>
```

Summon a selected level with its entity spawn event:

```text
/summon pvp:master ~ ~ ~ 0 0 pvp:set_level_1
```

Replace `1` with `2` through `5` to choose another level. Alternatively, use one of the five PVPbot level spawn eggs from the Creative inventory.
Armor depends on the level: level 1 wears iron, levels 2 and 3 wear diamond, and levels 4 and 5 wear netherite.
The sword follows the same tiers: level 1 uses iron, levels 2 and 3 use diamond, and levels 4 and 5 use netherite. An explicit `/scriptevent pvpbot:weapon <item_id>` setting overrides the level-based sword for all bots.
When defeated, a PVPbot drops every item in its inventory along with its equipped helmet, chestplate, leggings, boots, main-hand weapon, and offhand shield. It no longer drops diamonds.
PVPbots also carry a shield in their offhand; the shield drops when they are defeated.
Per-level swords, armor, offhand shield, and healing item types/counts are managed in `behavior_packs/PVPbot/scripts/inventory_config.js`. Before importing after a code or inventory-config change, build the single-file runtime script in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
Set-Location -LiteralPath "behavior_packs\PVPbot\scripts"
.\build.ps1
```

Healing items depend on the bot's level: level 1 carries 16 steaks, level 2 carries 64 golden carrots, and levels 3 through 5 each carry 64 golden apples. Every level also carries a water bucket in its inventory. The custom head animation follows the target during normal movement and points down during the water-bucket MLG, easing between angles every tick rather than snapping. The bot's main hand follows its action mode: when falling at a vertical velocity below -0.55 with a landing surface within 20 blocks, it equips a water bucket; within 3.5 blocks of the ground it places water and switches to an empty bucket. It looks down until the water source is collected 0.3 seconds later, switches back to a water bucket for 0.3 seconds, then exits falling mode. Falling takes priority over healing; outside falling mode it holds its healing item while healing and its configured weapon otherwise. One healing item is consumed per healing. Golden apples also grant regeneration for 5 seconds and absorption for 30 seconds with their effect particles; steak and golden carrot healing does not grant these effects or particles. Any healing items left in its inventory drop when it is defeated.

PVPbots take normal Minecraft fire and lava damage. Their equipped armor reduces that damage using Minecraft's standard armor calculation. `/scriptevent pvpbot:lava <on|off>` only enables or disables lava escape and bridging behavior; it does not disable fire or lava damage.

In `tag` target mode, add the `pvp_target` tag to players that the bot should attack:

```text
/tag <player> add pvp_target
```

Summon the default level 3 bot with `/summon pvp:master`.

`/summon pvp:master ~ ~ ~ 0 0 pvp:set_level_5`
