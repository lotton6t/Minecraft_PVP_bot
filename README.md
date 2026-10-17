# PVPbot

Minecraft Bedrock Edition PVP bot add-on.

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

In `tag` target mode, add the `pvp_target` tag to players that the bot should attack:

```text
/tag <player> add pvp_target
```

Summon the default level 3 bot with `/summon pvp:master`.
