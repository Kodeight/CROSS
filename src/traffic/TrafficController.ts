/**
 * TrafficController: iterates road lanes, delegates movement to
 * LaneTraffic. Respects active freeze and time warp scaling.
 */
import type { Lane } from '../world/World';
import { LaneTraffic } from './LaneTraffic';

export class TrafficController {
  private readonly laneTraffic = new LaneTraffic();
  brakingVehicles = 0;

  update(lanes: Lane[], dtMs: number, timeScale = 1.0): void {
    if (timeScale <= 0) {
      this.brakingVehicles = 0;
      return; // Freeze superpower: all traffic frozen solid!
    }
    const d = Math.max(dtMs * timeScale, 0);
    let braking = 0;
    for (const lane of lanes) {
      if (lane.type !== 'car' && lane.type !== 'truck') continue;
      braking += this.laneTraffic.update(lane, d);
    }
    this.brakingVehicles = braking;
  }
}
