/**
 * TrafficManager: centralized owner of all active vehicle movement.
 * VEHICLE+VEHICLE avoids here; PLAYER+VEHICLE collision stays in GameManager.
 */
import type { Lane } from '../world/World';
import { TrafficController } from './TrafficController';
import { vehicleHalf } from './TrafficCollision';

export interface TrafficAudit {
  worst: number;
  lane: number;
  braking: number;
}

export class TrafficManager {
  readonly controller = new TrafficController();
  audit: TrafficAudit | null = null;

  enableAudit(): void {
    this.audit = { worst: 0, lane: -1, braking: 0 };
  }

  update(lanes: Lane[], dtMs: number, debug: boolean, timeScale = 1.0): void {
    this.controller.update(lanes, dtMs, timeScale);
    if (debug && this.audit) {
      this.audit.braking = this.controller.brakingVehicles;
      for (const lane of lanes) {
        if (lane.type !== 'car' && lane.type !== 'truck') continue;
        const vs = lane.vehicles;
        for (let a = 0; a < vs.length; a++) {
          for (let b = a + 1; b < vs.length; b++) {
            const pen = vehicleHalf(vs[a]) + vehicleHalf(vs[b]) - Math.abs(vs[a].position.x - vs[b].position.x);
            if (pen > this.audit.worst) {
              this.audit.worst = pen;
              this.audit.lane = lane.index;
            }
          }
        }
      }
    }
  }
}
