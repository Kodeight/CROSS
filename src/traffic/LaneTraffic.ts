/**
 * §13 — per-lane traffic movement: smooth braking/acceleration plus a hard
 * movement clamp so a vehicle can never enter the ahead vehicle's space.
 */
import { GAME_CONFIG } from '../config/game.config';
import { TRAFFIC_CONFIG } from '../config/traffic.config';
import type { Lane } from '../world/World';
import { findAhead, targetSpeed, vehicleHalf } from './TrafficCollision';
import { getVehicleState, setVehicleSpeed } from './TrafficVehicle';

const BOARD_HALF = (GAME_CONFIG.positionWidth * GAME_CONFIG.columns * GAME_CONFIG.zoom) / 2;

export class LaneTraffic {
  /** Advances one lane's vehicles. Returns braking count for debug audit. */
  update(lane: Lane, dtMs: number): number {
    let braking = 0;
    const sgn = lane.direction ? -1 : 1;
    const margin = GAME_CONFIG.positionWidth * TRAFFIC_CONFIG.recycleMarginLanes * GAME_CONFIG.zoom;
    const minX = -BOARD_HALF - margin;
    const maxX = BOARD_HALF + margin;
    for (const v of lane.vehicles) {
      const st = getVehicleState(v);
      const ahead = findAhead(lane, v, sgn);
      let bumper = Infinity;
      let target = st.cruise;
      if (ahead) {
        bumper = ahead.rel - vehicleHalf(v) - vehicleHalf(ahead.veh);
        target = targetSpeed(st.cruise, st.cur, bumper);
      }
      const rate = target < st.cur ? TRAFFIC_CONFIG.brakeRate : TRAFFIC_CONFIG.accelRate;
      let cur = st.cur + (target - st.cur) * Math.min(1, dtMs * rate);
      if (Math.abs(target - cur) < 0.0005) cur = target;
      if (cur < 0) cur = 0;
      setVehicleSpeed(v, cur);
      if (target < st.cruise * 0.999) braking++;
      let move = cur * dtMs;
      if (ahead) move = Math.min(move, Math.max(0, bumper - TRAFFIC_CONFIG.hardGap));
      v.position.x += sgn * move;
      if ((sgn < 0 && v.position.x < minX) || (sgn > 0 && v.position.x > maxX)) {
        this.recycle(lane, v, sgn, minX, maxX);
      }
    }
    return braking;
  }

  /** Recycle to the far end with a spawn buffer — never lands on traffic. */
  private recycle(lane: Lane, v: (typeof lane.vehicles)[number], sgn: number, minX: number, maxX: number): void {
    let cand = sgn < 0 ? maxX : minX;
    for (let t = 0; t < 3; t++) {
      let clear = true;
      for (const o of lane.vehicles) {
        if (o === (v as unknown)) continue;
        if (Math.abs(cand - o.position.x) < vehicleHalf(v) + vehicleHalf(o) + TRAFFIC_CONFIG.spawnBuffer) {
          clear = false;
          break;
        }
      }
      if (clear) break;
      cand -= sgn * (vehicleHalf(v) + 120);
    }
    v.position.x = cand;
    v.userData.prevDx = null; // fresh lifecycle, no stale follow state
  }
}
