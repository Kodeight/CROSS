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
const MOTO: VehicleSpec = { kind: 'moto', length: 20, width: 9, height: 10, baseSpeed: 2.2, color: 0xff5252 };
const BUS: VehicleSpec = { kind: 'bus', length: 56, width: 20, height: 18, baseSpeed: 1.5, color: 0xff9f1c };
const TRUCK: VehicleSpec = { kind: 'truck', length: 54, width: 20, height: 18, baseSpeed: 1.4, color: 0x8a6b3f };
const JEEP: VehicleSpec = { kind: 'jeep', length: 36, width: 19, height: 14, baseSpeed: 1.9, color: 0x5da53a };
const BUGGY: VehicleSpec = { kind: 'buggy', length: 30, width: 18, height: 10, baseSpeed: 2.1, color: 0xff6b35 };
const SNOWMOBILE: VehicleSpec = { kind: 'snowmobile', length: 28, width: 14, height: 10, baseSpeed: 2.3, color: 0xcfe4ff };
const HOVER: VehicleSpec = { kind: 'hover', length: 36, width: 19, height: 9, baseSpeed: 2.0, color: 0x38e1ff };
const NEOCAR: VehicleSpec = { kind: 'neocar', length: 34, width: 18, height: 10, baseSpeed: 2.1, color: 0xff3fb4 };
const TRAIN: VehicleSpec = { kind: 'train', length: 64, width: 22, height: 20, baseSpeed: 2.6, color: 0xd64045 };
const TRACTOR: VehicleSpec = { kind: 'tractor', length: 36, width: 22, height: 18, baseSpeed: 1.5, color: 0x2ecc71 };
const UFO: VehicleSpec = { kind: 'ufo', length: 34, width: 22, height: 12, baseSpeed: 2.2, color: 0xa55eea };
const CART: VehicleSpec = { kind: 'cart', length: 32, width: 18, height: 14, baseSpeed: 1.6, color: 0xb08b52 };
const BOAT: VehicleSpec = { kind: 'boat', length: 42, width: 19, height: 12, baseSpeed: 1.8, color: 0x3fa8d8 };
const MINER: VehicleSpec = { kind: 'miner', length: 38, width: 20, height: 16, baseSpeed: 1.7, color: 0xe67e22 };
const ROVER: VehicleSpec = { kind: 'rover', length: 36, width: 20, height: 15, baseSpeed: 1.8, color: 0xced6e0 };

/**
 * img2threejs generation — 15 reference-built 3D vehicles for the five active
 * worlds. Dimensions/speeds mirror the catalogue entries they replace so the
 * proven difficulty curve (spacing, spawn, fairness) is preserved exactly.
 */
const CITY_TAXI: VehicleSpec = { kind: 'city_taxi', length: 34, width: 18, height: 12, baseSpeed: 2.4, color: 0xffc107 };
const CITY_SUV: VehicleSpec = { kind: 'city_suv', length: 36, width: 19, height: 14, baseSpeed: 2.0, color: 0xd32f2f };
const CITY_BUS: VehicleSpec = { kind: 'city_bus', length: 56, width: 20, height: 18, baseSpeed: 1.5, color: 0x2456e6 };
const RIVER_FISHING_BOAT: VehicleSpec = { kind: 'river_fishing_boat', length: 42, width: 19, height: 12, baseSpeed: 1.7, color: 0x8b5a2b };
const RIVER_SPEED_BOAT: VehicleSpec = { kind: 'river_speed_boat', length: 44, width: 19, height: 11, baseSpeed: 2.0, color: 0x1e4fd8 };
const RIVER_CARGO_BOAT: VehicleSpec = { kind: 'river_cargo_boat', length: 52, width: 20, height: 14, baseSpeed: 1.4, color: 0x2e6e5e };
const BEACH_DUNE_BUGGY: VehicleSpec = { kind: 'beach_dune_buggy', length: 32, width: 19, height: 11, baseSpeed: 2.1, color: 0xf2b705 };
const BEACH_ATV: VehicleSpec = { kind: 'beach_atv', length: 28, width: 17, height: 11, baseSpeed: 2.2, color: 0xd32f2f };
const BEACH_JET_SKI: VehicleSpec = { kind: 'beach_jet_ski', length: 30, width: 15, height: 9, baseSpeed: 2.0, color: 0x1e4fd8 };
const VOLCANO_ARMORED_TRUCK: VehicleSpec = { kind: 'volcano_armored_truck', length: 40, width: 21, height: 17, baseSpeed: 1.7, color: 0x23262b };
const VOLCANO_DUMP_TRUCK: VehicleSpec = { kind: 'volcano_dump_truck', length: 54, width: 21, height: 19, baseSpeed: 1.4, color: 0xf2a007 };
const VOLCANO_DRILL_VEHICLE: VehicleSpec = { kind: 'volcano_drill_vehicle', length: 44, width: 21, height: 16, baseSpeed: 1.5, color: 0xc0392b };
const TOKYO_WHITE_TUNER: VehicleSpec = { kind: 'tokyo_white_tuner', length: 34, width: 18, height: 11, baseSpeed: 2.4, color: 0xf5f6fa };
const TOKYO_RED_TUNER: VehicleSpec = { kind: 'tokyo_red_tuner', length: 34, width: 18, height: 11, baseSpeed: 2.4, color: 0xe63046 };
const TOKYO_NEON_TRAM: VehicleSpec = { kind: 'tokyo_neon_tram', length: 58, width: 20, height: 18, baseSpeed: 1.6, color: 0x2456e6 };

export const VEHICLE_SPECS: Record<string, VehicleSpec> = {
  car: CAR, taxi: TAXI, hatch: HATCH, van: VAN, moto: MOTO,
  bus: BUS, truck: TRUCK, jeep: JEEP, buggy: BUGGY,
  snowmobile: SNOWMOBILE, hover: HOVER, neocar: NEOCAR,
  train: TRAIN, tractor: TRACTOR, ufo: UFO, cart: CART,
  boat: BOAT, miner: MINER, rover: ROVER,
  city_taxi: CITY_TAXI, city_suv: CITY_SUV, city_bus: CITY_BUS,
  river_fishing_boat: RIVER_FISHING_BOAT, river_speed_boat: RIVER_SPEED_BOAT, river_cargo_boat: RIVER_CARGO_BOAT,
  beach_dune_buggy: BEACH_DUNE_BUGGY, beach_atv: BEACH_ATV, beach_jet_ski: BEACH_JET_SKI,
  volcano_armored_truck: VOLCANO_ARMORED_TRUCK, volcano_dump_truck: VOLCANO_DUMP_TRUCK,
  volcano_drill_vehicle: VOLCANO_DRILL_VEHICLE,
  tokyo_white_tuner: TOKYO_WHITE_TUNER, tokyo_red_tuner: TOKYO_RED_TUNER, tokyo_neon_tram: TOKYO_NEON_TRAM,
};

export function vehicleSpec(kind: string): VehicleSpec {
  return VEHICLE_SPECS[kind] ?? CAR;
}
