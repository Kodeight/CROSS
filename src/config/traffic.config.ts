/** Traffic tuning — lane-aware spacing system constants. */

export const TRAFFIC_CONFIG = {
  minGap: 30, // bumper-to-bumper minimum, world units
  stopGap: 12, // at/below this: full stop
  reactMs: 900, // reaction-time component of safe distance
  brakeRate: 0.01, // smoothing per ms when slowing
  accelRate: 0.004, // smoothing per ms when speeding up
  hardGap: 8, // inviolable bumper clearance after movement
  spawnBuffer: 60, // extra clearance required around spawn candidates
  recycleMarginLanes: 3, // off-board margin (in lane-widths) before recycling
} as const;

/** Vehicle body catalogue: approximate length/width drive spacing math. */
export interface VehicleSpec {
  kind: string;
  length: number;
  width: number;
  height: number;
  baseSpeed: number; // world-units per 16ms tick at 1x
  color: number;
}

const CAR: VehicleSpec = { kind: 'car', length: 34, width: 18, height: 12, baseSpeed: 2.0, color: 0x4a90d9 };
const TAXI: VehicleSpec = { kind: 'taxi', length: 34, width: 18, height: 12, baseSpeed: 2.4, color: 0xffc93c };
const HATCH: VehicleSpec = { kind: 'hatch', length: 30, width: 17, height: 11, baseSpeed: 2.2, color: 0x7ac74f };
const VAN: VehicleSpec = { kind: 'van', length: 42, width: 19, height: 16, baseSpeed: 1.8, color: 0x9aa5b1 };
const MOTO: VehicleSpec = { kind: 'moto', length: 20, width: 9, height: 10, baseSpeed: 2.8, color: 0xff5252 };
const BUS: VehicleSpec = { kind: 'bus', length: 56, width: 20, height: 18, baseSpeed: 1.5, color: 0xff9f1c };
const TRUCK: VehicleSpec = { kind: 'truck', length: 54, width: 20, height: 18, baseSpeed: 1.4, color: 0x8a6b3f };
const JEEP: VehicleSpec = { kind: 'jeep', length: 36, width: 19, height: 14, baseSpeed: 1.9, color: 0x5da53a };
const BUGGY: VehicleSpec = { kind: 'buggy', length: 30, width: 18, height: 10, baseSpeed: 2.1, color: 0xff6b35 };
const SNOWMOBILE: VehicleSpec = { kind: 'snowmobile', length: 28, width: 14, height: 10, baseSpeed: 2.3, color: 0xcfe4ff };
const HOVER: VehicleSpec = { kind: 'hover', length: 36, width: 19, height: 9, baseSpeed: 2.6, color: 0x38e1ff };
const NEOCAR: VehicleSpec = { kind: 'neocar', length: 34, width: 18, height: 10, baseSpeed: 2.7, color: 0xff3fb4 };

export const VEHICLE_SPECS: Record<string, VehicleSpec> = {
  car: CAR, taxi: TAXI, hatch: HATCH, van: VAN, moto: MOTO,
  bus: BUS, truck: TRUCK, jeep: JEEP, buggy: BUGGY,
  snowmobile: SNOWMOBILE, hover: HOVER, neocar: NEOCAR,
};

export function vehicleSpec(kind: string): VehicleSpec {
  return VEHICLE_SPECS[kind] ?? CAR;
}
