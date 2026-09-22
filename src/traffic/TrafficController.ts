/**
 * §13 — TrafficController: iterates road lanes, delegates movement to
 * LaneTraffic. Keeps the centralized rule in one place.
 */
import type { Lane } from '../world/World';
import { LaneTraffic } from './LaneTraffic';

export class TrafficController {
  private readonly laneTraffic = new LaneTraffic();
  brakingVehicles = 0;

  update(lanes: Lane[], dtMs: number): void {
    const d = Math.max(dtMs, 0);
    let braking = 0;
    for (const lane of lanes) {
      if (lane.type !== 'car' && lane.type !== 'truck') continue;
      braking += this.laneTraffic.update(lane, d);
    }
    this.brakingVehicles = braking;
  }
}
