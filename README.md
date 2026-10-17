# PVPbot

Minecraft Bedrock Edition PVP bot add-on.

## Commands

Run these with `/scriptevent` in-game:

```text
/scriptevent pvpbot:level <1-5>
/scriptevent pvpbot:weapon <item_id>
/scriptevent pvpbot:target <all|tag>
/scriptevent pvpbot:lava <on|off>
```

In `tag` target mode, add the `pvp_target` tag to players that the bot should attack:

```text
/tag <player> add pvp_target
```

Summon the bot with `/summon pvp:master`.
