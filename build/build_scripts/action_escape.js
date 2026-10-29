import { createLavaEscapeBehavior } from "./action_escape_lava.js";
import { createBridgeAction } from "./action_bridge.js";

export function createLavaBehavior({ knockback, isEditProtected, pillarBlock }) {
  const lavaEscapeTick = createLavaEscapeBehavior({ knockback });
  const tryLavaBridge = createBridgeAction({
    knockback,
    isEditProtected,
    bridgeBlock: pillarBlock,
  });

  return { lavaEscapeTick, tryLavaBridge };
}
