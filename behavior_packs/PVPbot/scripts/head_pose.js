export function updateHeadPose(master, state) {
  try {
    const fallingLook = state.waterMlgLookDown;
    const target = state.cachedTarget && state.cachedTarget.player;
    let targetPitch = fallingLook ? 90 : 0;
    let targetYaw = 0;
    if (!fallingLook && target && target.isValid) {
      const source = master.location;
      const destination = target.location;
      const dx = destination.x - source.x;
      const dy = destination.y - source.y;
      const dz = destination.z - source.z;
      const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
      const bodyYaw = master.getRotation().y;
      const targetDirectionYaw = Math.atan2(-dx, dz) * 180 / Math.PI;
      targetPitch = Math.max(-60, Math.min(60,
        -Math.atan2(dy, horizontalDistance) * 180 / Math.PI));
      targetYaw = targetDirectionYaw - bodyYaw;
      targetYaw = ((targetYaw + 180) % 360 + 360) % 360 - 180;
      targetYaw = Math.max(-90, Math.min(90, targetYaw));
    }

    if (!Number.isFinite(state.headPitch)) {
      const currentPitch = master.getProperty("pvp:head_pitch");
      state.headPitch = Number.isFinite(currentPitch) ? currentPitch : 0;
    }
    if (!Number.isFinite(state.headYaw)) {
      const currentYaw = master.getProperty("pvp:head_yaw");
      state.headYaw = Number.isFinite(currentYaw) ? currentYaw : 0;
    }

    const pitchDelta = targetPitch - state.headPitch;
    const yawDelta = targetYaw - state.headYaw;
    const pitch = Math.abs(pitchDelta) < 0.5
      ? targetPitch
      : state.headPitch + pitchDelta * 0.2;
    const yaw = Math.abs(yawDelta) < 0.5
      ? targetYaw
      : state.headYaw + yawDelta * 0.2;

    if (state.headPitch !== pitch) {
      master.setProperty("pvp:head_pitch", pitch);
      state.headPitch = pitch;
    }
    if (state.headYaw !== yaw) {
      master.setProperty("pvp:head_yaw", yaw);
      state.headYaw = yaw;
    }
  } catch (error) {
    if (!state.headPoseErrorLogged) {
      console.warn(`[PVPbot] 頭部角度を更新できませんでした: ${error}`);
      state.headPoseErrorLogged = true;
    }
  }
}