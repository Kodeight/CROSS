/**
 * §11/environment — High-fidelity stylized arcade vehicles.
 * Features:
 * - Proper chassis proportions with aerodynamic rounding
 * - Distinct transparent tinted glass cabins & windshields
 * - Detailed wheels with rubber tire treads & alloy hubcaps
 * - Emissive glowing headlights, taillights, indicators
 * - Iconic details: Taxi checkerboards & illuminated roof sign, Police sirens, Bus route boards, Truck containers
 * - World-specific variations (Cyber hover, Dune buggies, Snowmobiles, Neon sports cars)
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/game.config';
import { vehicleSpec } from '../../config/traffic.config';
import type { AssetManager } from '../../assets/AssetManager';
import { pick } from '../../utils/Random';

const ZOOM = GAME_CONFIG.zoom;

const BODY_COLORS = [
  0xd64045, // Crimson Red
  0x3f8efc, // Cobalt Blue
  0x4a7c59, // Forest Green
  0xe8e8e8, // Pearl White
  0x2b2d42, // Midnight Black
  0xe07b2a, // Tangerine Orange
  0x8e44ad, // Royal Purple
];

export interface BuiltVehicle extends THREE.Group {
  userData: THREE.Group['userData'] & {
    length: number;
    kind: string;
    speed: number;
    baseSpeed?: number;
    cruise?: number;
    cur?: number;
    prevDx?: number | null;
  };
}

export class VehicleFactory {
  constructor(private readonly assets: AssetManager) {}

  private mat(color: number, emissive = 0, shininess = 40): THREE.MeshPhongMaterial {
    return this.assets.phong(`veh:${color}:${emissive}:${shininess}`, color, { emissive, shininess });
  }

  private glassMat(tint = 0xd8edf8): THREE.MeshPhongMaterial {
    return this.assets.phong(`veh-glass:${tint}`, tint, {
      emissive: 0x051525,
      shininess: 90,
    });
  }

  private box(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    emissive = 0,
    shininess = 40,
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.box(`veh:${w}x${h}x${d}`, w * ZOOM, h * ZOOM, d * ZOOM),
      this.mat(color, emissive, shininess),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  private rbody(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    radius = 2.4,
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.roundedBox(w * ZOOM, h * ZOOM, d * ZOOM, radius * ZOOM, 2),
      this.mat(color, 0, 50),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /**
   * Stylized 4-piece wheel assembly: Rubber tire + Alloy rim + Hubcap + Brake disc.
   */
  private wheelPair(parent: THREE.Group, x: number, widthSpread = 26, radius = 6.5): void {
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      
      // Rubber tire
      const tire = new THREE.Mesh(
        this.assets.cylinder(`veh-tire-r${radius}`, radius * ZOOM, radius * ZOOM, 4.2 * ZOOM, 14),
        this.mat(0x181a1f, 0, 15),
      );
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;
      g.add(tire);

      // Alloy rim
      const rim = new THREE.Mesh(
        this.assets.cylinder(`veh-rim-r${radius}`, (radius * 0.58) * ZOOM, (radius * 0.58) * ZOOM, 4.4 * ZOOM, 10),
        this.mat(0xced4da, 0, 80),
      );
      rim.rotation.x = Math.PI / 2;
      g.add(rim);

      // Center lug nut / hubcap
      const hub = new THREE.Mesh(
        this.assets.cylinder('veh-hub', 1.6 * ZOOM, 1.6 * ZOOM, 4.6 * ZOOM, 6),
        this.mat(0x22242a, 0, 60),
      );
      hub.rotation.x = Math.PI / 2;
      g.add(hub);

      g.position.set(x * ZOOM, side * (widthSpread / 2) * ZOOM, radius * ZOOM);
      parent.add(g);
    }
  }

  /**
   * Dual headlights + Dual red taillights + Front/Rear chrome bumpers.
   */
  private addLightsAndBumpers(parent: THREE.Group, len: number, width: number, zCenter = 10): void {
    const halfLen = len / 2;
    const halfW = width / 2;

    // Headlights (glowing warm xenon lenses)
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(
        this.assets.box('veh-hl', 1.8 * ZOOM, 5 * ZOOM, 3.5 * ZOOM),
        this.assets.phong('veh-hl-mat', 0xfffae0, { emissive: 0xffe680, shininess: 100 }),
      );
      hl.position.set((-halfLen + 0.8) * ZOOM, side * (halfW - 5.5) * ZOOM, zCenter * ZOOM);
      parent.add(hl);
    }

    // Taillights (glowing ruby lenses)
    for (const side of [-1, 1]) {
      const tl = new THREE.Mesh(
        this.assets.box('veh-tl', 1.8 * ZOOM, 5 * ZOOM, 3.2 * ZOOM),
        this.assets.phong('veh-tl-mat', 0xff2a2a, { emissive: 0xcc0000, shininess: 80 }),
      );
      tl.position.set((halfLen - 0.8) * ZOOM, side * (halfW - 5.5) * ZOOM, zCenter * ZOOM);
      parent.add(tl);
    }

    // Front Bumper (anodized dark impact bar)
    const fBumper = new THREE.Mesh(
      this.assets.box('veh-f-bump', 3.5 * ZOOM, (width - 4) * ZOOM, 4 * ZOOM),
      this.mat(0x1a1c22, 0, 30),
    );
    fBumper.position.set((-halfLen - 1.2) * ZOOM, 0, (zCenter - 4) * ZOOM);
    parent.add(fBumper);

    // Rear Bumper
    const rBumper = new THREE.Mesh(
      this.assets.box('veh-r-bump', 3.5 * ZOOM, (width - 4) * ZOOM, 4 * ZOOM),
      this.mat(0x1a1c22, 0, 30),
    );
    rBumper.position.set((halfLen + 1.2) * ZOOM, 0, (zCenter - 4) * ZOOM);
    parent.add(rBumper);
  }

  create(kind: string): BuiltVehicle {
    const spec = vehicleSpec(kind);
    const g = new THREE.Group() as BuiltVehicle;
    const len = Math.round(spec.length * 1.76);
    const bodyW = 28;
    const color = kind === 'taxi' ? 0xffc107 : pick(BODY_COLORS);
    const speed = spec.baseSpeed;

    switch (kind) {
      // 1. ICONIC CITY TAXI (Redesigned with checkerboards, roof taxi light, aerodynamic cabin)
      case 'taxi': {
        // Lower chassis & fenders
        this.rbody(g, len, bodyW, 13, 0xffc107, 0, 0, 10, 2.5);

        // Black and white checkerboard side trim strips
        for (const side of [-1, 1]) {
          this.box(g, len * 0.7, 1.2, 3, 0x181a1f, 0, side * (bodyW / 2 + 0.4), 10.5);
          // Alternating white checkers
          for (let i = -3; i <= 3; i += 2) {
            this.box(g, 4.2, 1.4, 2.6, 0xffffff, i * 6.5, side * (bodyW / 2 + 0.5), 10.5);
          }
        }

        // Tapered Glass Cabin (Windshield, side windows, rear window)
        const cab = new THREE.Mesh(
          this.assets.roundedBox(len * 0.52 * ZOOM, (bodyW - 4) * ZOOM, 11 * ZOOM, 2.0 * ZOOM, 2),
          this.glassMat(0xd8e8f8),
        );
        cab.position.set(len * 0.04 * ZOOM, 0, 20.5 * ZOOM);
        cab.castShadow = true;
        g.add(cab);

        // Roof Top Panel
        this.box(g, len * 0.44, bodyW - 6, 2.2, 0xffc107, len * 0.04, 0, 26.5);

        // Illuminated TAXI Roof Sign
        const signBase = new THREE.Mesh(
          this.assets.box('taxi-sign-base', 4 * ZOOM, 10 * ZOOM, 1.5 * ZOOM),
          this.mat(0x181a1f, 0, 30),
        );
        signBase.position.set(len * 0.04 * ZOOM, 0, 28 * ZOOM);
        g.add(signBase);

        const signGlow = new THREE.Mesh(
          this.assets.box('taxi-sign-glow', 3.2 * ZOOM, 9 * ZOOM, 3.8 * ZOOM),
          this.assets.phong('taxi-sign-mat', 0xffeb3b, { emissive: 0xffa000, shininess: 100 }),
        );
        signGlow.position.set(len * 0.04 * ZOOM, 0, 30 * ZOOM);
        g.add(signGlow);

        this.wheelPair(g, -len * 0.28, bodyW);
        this.wheelPair(g, len * 0.28, bodyW);
        this.addLightsAndBumpers(g, len, bodyW, 10);
        break;
      }

      // 2. CITY SEDAN / HATCHBACK
      case 'car':
      case 'hatch': {
        this.rbody(g, len, bodyW, 12, color, 0, 0, 9.5, 2.5);

        // Aerodynamic Cabin
        const cab = new THREE.Mesh(
          this.assets.roundedBox(len * 0.55 * ZOOM, (bodyW - 4) * ZOOM, 10.5 * ZOOM, 2.0 * ZOOM, 2),
          this.glassMat(0xcbe2f2),
        );
        cab.position.set(len * 0.02 * ZOOM, 0, 19.5 * ZOOM);
        cab.castShadow = true;
        g.add(cab);

        // Colored roof cap
        this.box(g, len * 0.45, bodyW - 6, 2, color, len * 0.02, 0, 25.2);

        this.wheelPair(g, -len * 0.28, bodyW);
        this.wheelPair(g, len * 0.28, bodyW);
        this.addLightsAndBumpers(g, len, bodyW, 9.5);
        break;
      }

      // 3. URBAN BUS / TRANSIT
      case 'bus': {
        const busH = 34;
        const busW = 32;
        // Main Bus Body
        this.rbody(g, len, busW, busH, color, 0, 0, 22, 2.8);

        // Long Panoramic Tinted Side Windows
        for (const side of [-1, 1]) {
          this.box(g, len * 0.78, 1.2, 10, 0x112233, -len * 0.04, side * (busW / 2 + 0.4), 26);
        }
        // Front Windshield
        this.box(g, 1.4, busW - 6, 12, 0xd0e8fa, -len / 2 - 0.4, 0, 26);

        // Destination Board Header (Glowing amber LED dot matrix)
        const dest = new THREE.Mesh(
          this.assets.box('bus-dest', 1.8 * ZOOM, 18 * ZOOM, 4.5 * ZOOM),
          this.assets.phong('bus-dest-mat', 0x222222, { emissive: 0xffa500, shininess: 60 }),
        );
        dest.position.set((-len / 2 - 0.6) * ZOOM, 0, 35 * ZOOM);
        g.add(dest);

        // Triple Axle Wheels
        this.wheelPair(g, -len * 0.35, busW, 7.5);
        this.wheelPair(g, len * 0.22, busW, 7.5);
        this.wheelPair(g, len * 0.38, busW, 7.5);
        this.addLightsAndBumpers(g, len, busW, 10);
        break;
      }

      // 4. HEAVY FREIGHT TRUCK
      case 'truck': {
        const cabLen = 22;
        const truckW = 32;
        // Front Heavy Cab
        this.rbody(g, cabLen, truckW, 26, color, -len / 2 + cabLen / 2, 0, 18, 2.5);
        // Cab windshield
        this.box(g, 1.6, truckW - 6, 10, 0xd0e8fa, -len / 2 - 0.4, 0, 24);

        // Rear Shipping Cargo Container (Corrugated metal look)
        const cargoLen = len - cabLen - 4;
        const cargoBox = new THREE.Mesh(
          this.assets.roundedBox(cargoLen * ZOOM, (truckW + 2) * ZOOM, 32 * ZOOM, 1.5 * ZOOM, 2),
          this.assets.standard('veh-truck-container', 0xe0e6ed, { metalness: 0.7, roughness: 0.3 }),
        );
        cargoBox.position.set((len / 2 - cargoLen / 2) * ZOOM, 0, 21 * ZOOM);
        cargoBox.castShadow = true;
        g.add(cargoBox);

        // Steel side fuel tanks
        for (const side of [-1, 1]) {
          const tank = new THREE.Mesh(
            this.assets.cylinder('truck-tank', 4 * ZOOM, 4 * ZOOM, 14 * ZOOM, 12),
            this.mat(0x9aa0ab, 0, 80),
          );
          tank.rotation.z = Math.PI / 2;
          tank.position.set((-len * 0.05) * ZOOM, side * (truckW / 2 + 0.5) * ZOOM, 9 * ZOOM);
          g.add(tank);
        }

        this.wheelPair(g, -len / 2 + 10, truckW, 7.5);
        this.wheelPair(g, len / 2 - 22, truckW, 7.5);
        this.wheelPair(g, len / 2 - 8, truckW, 7.5);
        this.addLightsAndBumpers(g, len, truckW, 10);
        break;
      }

      // 5. DELIVERY VAN
      case 'van': {
        this.rbody(g, len, bodyW, 22, color, 0, 0, 15, 2.8);
        // Driver cabin windows
        this.box(g, 1.6, bodyW - 5, 8, 0xd0e8fa, -len / 2 - 0.4, 0, 19);
        for (const side of [-1, 1]) {
          this.box(g, 14, 1.2, 7, 0x112233, -len * 0.22, side * (bodyW / 2 + 0.4), 19);
        }
        this.wheelPair(g, -len * 0.28, bodyW, 7);
        this.wheelPair(g, len * 0.28, bodyW, 7);
        this.addLightsAndBumpers(g, len, bodyW, 10);
        break;
      }

      // 6. CYBER HOVERCRAFT
      case 'hover': {
        // Streamlined aerodynamic wedge hull
        this.rbody(g, len, bodyW + 4, 11, 0x1e2430, 0, 0, 12, 3.0);

        // Upper cockpit canopy
        const canopy = new THREE.Mesh(
          this.assets.roundedBox(len * 0.45 * ZOOM, 18 * ZOOM, 7.5 * ZOOM, 2.0 * ZOOM, 2),
          this.assets.phong('hover-canopy', 0x38e1ff, { emissive: 0x0954a3, shininess: 100 }),
        );
        canopy.position.set(len * 0.06 * ZOOM, 0, 19.5 * ZOOM);
        g.add(canopy);

        // Twin Repulsor Glow Rings underneath
        for (const xOff of [-len * 0.25, len * 0.25]) {
          const repulsor = new THREE.Mesh(
            this.assets.torus('hover-repulsor', 8 * ZOOM, 1.8 * ZOOM, 8, 20),
            this.assets.phong('hover-glow', 0x38e1ff, { emissive: 0x38e1ff, shininess: 100 }),
          );
          repulsor.position.set(xOff * ZOOM, 0, 4.5 * ZOOM);
          g.add(repulsor);
        }

        // Dual rear stabilizer wings
        for (const side of [-1, 1]) {
          const fin = new THREE.Mesh(
            this.assets.box('hover-fin', 12 * ZOOM, 2 * ZOOM, 8 * ZOOM),
            this.mat(0x38e1ff, 0x0954a3, 70),
          );
          fin.position.set((len * 0.38) * ZOOM, side * (bodyW / 2 + 1) * ZOOM, 16 * ZOOM);
          g.add(fin);
        }
        break;
      }

      // 7. NEON CYBER SPORTS CAR
      case 'neocar': {
        this.rbody(g, len, bodyW + 2, 10, 0x111622, 0, 0, 9.5, 2.2);

        // Neon Cockpit
        const cab = new THREE.Mesh(
          this.assets.roundedBox(len * 0.52 * ZOOM, 22 * ZOOM, 7 * ZOOM, 1.8 * ZOOM, 2),
          this.assets.phong('neocar-cockpit', 0xff007f, { emissive: 0x880044, shininess: 100 }),
        );
        cab.position.set(len * 0.04 * ZOOM, 0, 17 * ZOOM);
        g.add(cab);

        // Cyber Rear Wing Spoiler
        const wing = new THREE.Mesh(
          this.assets.box('neocar-wing', 6 * ZOOM, bodyW * ZOOM, 2.5 * ZOOM),
          this.assets.phong('neocar-wing-mat', 0x00f2fe, { emissive: 0x00a8b5, shininess: 90 }),
        );
        wing.position.set((len / 2 - 3) * ZOOM, 0, 17.5 * ZOOM);
        g.add(wing);

        // Neon Ground Underglow Strip
        const underglow = new THREE.Mesh(
          this.assets.box('neocar-underglow', len * 0.8 * ZOOM, (bodyW - 4) * ZOOM, 1.2 * ZOOM),
          this.assets.phong('neocar-glow-mat', 0x00f2fe, { emissive: 0x00f2fe }),
        );
        underglow.position.set(0, 0, 3.2 * ZOOM);
        g.add(underglow);

        this.wheelPair(g, -len * 0.28, bodyW, 6.2);
        this.wheelPair(g, len * 0.28, bodyW, 6.2);
        this.addLightsAndBumpers(g, len, bodyW, 9.5);
        break;
      }

      // 8. DUNE BUGGY & OFF-ROAD JEEP
      case 'buggy':
      case 'jeep': {
        const isJeep = kind === 'jeep';
        this.rbody(g, len, bodyW, 11, color, 0, 0, 10.5, 2.2);

        // Heavy Tubular Roll Cage
        for (const side of [-1, 1]) {
          const bar = new THREE.Mesh(
            this.assets.cylinder('jeep-roll-bar', 1.2 * ZOOM, 1.2 * ZOOM, 14 * ZOOM, 8),
            this.mat(0x111317, 0, 50),
          );
          bar.position.set(0, side * (bodyW / 2 - 2) * ZOOM, 19 * ZOOM);
          g.add(bar);
        }

        // Roof-mounted rally fog lights
        for (let i = -1; i <= 1; i++) {
          const fog = new THREE.Mesh(
            this.assets.sphere('jeep-fog', 2.6 * ZOOM, 8, 8),
            this.assets.phong('jeep-fog-mat', 0xfffae0, { emissive: 0xffc107, shininess: 100 }),
          );
          fog.position.set((-len * 0.05) * ZOOM, i * 6 * ZOOM, 25.5 * ZOOM);
          g.add(fog);
        }

        // Oversized All-Terrain Knobby Wheels
        this.wheelPair(g, -len * 0.28, bodyW + 4, 8);
        this.wheelPair(g, len * 0.28, bodyW + 4, 8);

        // Rear Tailgate Spare Wheel
        if (isJeep) {
          const spare = new THREE.Mesh(
            this.assets.cylinder('jeep-spare', 7 * ZOOM, 7 * ZOOM, 4 * ZOOM, 12),
            this.mat(0x181a1f, 0, 20),
          );
          spare.rotation.z = Math.PI / 2;
          spare.position.set((len / 2 + 3) * ZOOM, 0, 14 * ZOOM);
          g.add(spare);
        }

        this.addLightsAndBumpers(g, len, bodyW, 10);
        break;
      }

      // 9. MOTORBIKE / SCOOTER
      case 'moto': {
        const motoW = 12;
        this.box(g, len, motoW, 10, color, 0, 0, 10);
        this.box(g, 10, 8, 12, 0x181a1f, 2, 0, 19);

        // Single front & rear wheels
        const fWheel = new THREE.Mesh(
          this.assets.cylinder('moto-wheel', 6.5 * ZOOM, 6.5 * ZOOM, 3.5 * ZOOM, 14),
          this.mat(0x181a1f, 0, 20),
        );
        fWheel.rotation.x = Math.PI / 2;
        fWheel.position.set(-len * 0.35 * ZOOM, 0, 6.5 * ZOOM);
        g.add(fWheel);

        const rWheel = new THREE.Mesh(
          this.assets.cylinder('moto-wheel', 6.5 * ZOOM, 6.5 * ZOOM, 3.5 * ZOOM, 14),
          this.mat(0x181a1f, 0, 20),
        );
        rWheel.rotation.x = Math.PI / 2;
        rWheel.position.set(len * 0.35 * ZOOM, 0, 6.5 * ZOOM);
        g.add(rWheel);

        // Handlebars
        this.box(g, 2.5, 14, 2.5, 0xced4da, -len * 0.2, 0, 22);
        // Headlight
        this.box(g, 2.5, 4.5, 4.5, 0xfffae0, -len / 2, 0, 13, 0xffe680);
        break;
      }

      // 10. SNOWMOBILE
      case 'snowmobile': {
        this.box(g, len, 18, 11, color, 0, 0, 11);
        this.box(g, 12, 14, 8, 0xd0e8fa, -len * 0.15, 0, 19);

        // Front Dual Skis
        for (const side of [-1, 1]) {
          const ski = new THREE.Mesh(
            this.assets.box('snow-ski', 24 * ZOOM, 3.5 * ZOOM, 1.8 * ZOOM),
            this.mat(0x111317, 0, 40),
          );
          ski.position.set((-len * 0.28) * ZOOM, side * 8 * ZOOM, 2.5 * ZOOM);
          g.add(ski);
        }
        // Rear Traction Chassis
        const track = new THREE.Mesh(
          this.assets.box('snow-track', 26 * ZOOM, 12 * ZOOM, 6 * ZOOM),
          this.mat(0x181a1f, 0, 20),
        );
        track.position.set((len * 0.2) * ZOOM, 0, 5 * ZOOM);
        g.add(track);

        // Front light
        this.box(g, 2.5, 6, 5, 0xfffae0, -len / 2, 0, 14, 0xffe680);
        break;
      }

      // 11. FIRE TRUCK (EMERGENCY)
      case 'fire_truck': {
        const ftW = 32;
        const cabLen = 24;
        const ftRed = 0xd32f2f;
        // Front Emergency Cab
        this.rbody(g, cabLen, ftW, 26, ftRed, -len / 2 + cabLen / 2, 0, 18, 2.5);
        this.box(g, 1.8, ftW - 6, 11, 0xd0e8fa, -len / 2 - 0.4, 0, 24);

        // Emergency Lightbar on Cab Roof (Flashing Red / Amber)
        const lightbar = new THREE.Mesh(
          this.assets.box('ft-lightbar', 4 * ZOOM, 18 * ZOOM, 3 * ZOOM),
          this.assets.phong('ft-lightbar-mat', 0xff1744, { emissive: 0xff0044, shininess: 100 }),
        );
        lightbar.position.set((-len / 2 + cabLen / 2) * ZOOM, 0, 32.5 * ZOOM);
        g.add(lightbar);

        // Rear Equipment Body
        const rearLen = len - cabLen - 3;
        this.rbody(g, rearLen, ftW + 1, 28, ftRed, len / 2 - rearLen / 2, 0, 19, 2.2);

        // Side Shutter Equipment Doors (Silver aluminum)
        for (const side of [-1, 1]) {
          for (let p = -1; p <= 1; p++) {
            this.box(g, 10, 1.2, 16, 0xb0bec5, len * 0.12 + p * 12, side * (ftW / 2 + 0.6), 18);
          }
        }

        // Roof-Mounted Silver Extensible Ladder
        const ladderL = new THREE.Mesh(
          this.assets.box('ft-ladder-l', (rearLen - 4) * ZOOM, 2.2 * ZOOM, 2.5 * ZOOM),
          this.mat(0xdce775, 0, 60),
        );
        ladderL.position.set((len / 2 - rearLen / 2) * ZOOM, -4 * ZOOM, 34.5 * ZOOM);
        g.add(ladderL);

        const ladderR = new THREE.Mesh(
          this.assets.box('ft-ladder-r', (rearLen - 4) * ZOOM, 2.2 * ZOOM, 2.5 * ZOOM),
          this.mat(0xdce775, 0, 60),
        );
        ladderR.position.set((len / 2 - rearLen / 2) * ZOOM, 4 * ZOOM, 34.5 * ZOOM);
        g.add(ladderR);

        // Rungs
        for (let r = -2; r <= 2; r++) {
          this.box(g, 1.8, 8, 1.8, 0xdce775, len / 2 - rearLen / 2 + r * 8, 0, 34.5);
        }

        this.wheelPair(g, -len / 2 + 10, ftW, 7.5);
        this.wheelPair(g, len / 2 - 20, ftW, 7.5);
        this.wheelPair(g, len / 2 - 8, ftW, 7.5);
        this.addLightsAndBumpers(g, len, ftW, 10);
        break;
      }

      // 12. POLICE INTERCEPTOR CRUISER
      case 'police': {
        this.rbody(g, len, bodyW, 12, 0x1a1c23, 0, 0, 9.5, 2.5);

        // White side doors / roof panel
        for (const side of [-1, 1]) {
          this.box(g, len * 0.44, 1.2, 8, 0xf8f9fa, 0, side * (bodyW / 2 + 0.3), 10);
        }

        // Aerodynamic Tinted Cabin
        const cab = new THREE.Mesh(
          this.assets.roundedBox(len * 0.52 * ZOOM, (bodyW - 4) * ZOOM, 10.5 * ZOOM, 2.0 * ZOOM, 2),
          this.glassMat(0xd8e8f8),
        );
        cab.position.set(len * 0.02 * ZOOM, 0, 19.5 * ZOOM);
        g.add(cab);

        // Police Roof Lightbar (Split Blue / Red)
        const barRed = new THREE.Mesh(
          this.assets.box('police-bar-r', 3 * ZOOM, 6 * ZOOM, 3 * ZOOM),
          this.assets.phong('police-r-mat', 0xff1744, { emissive: 0xff002b }),
        );
        barRed.position.set(len * 0.02 * ZOOM, -4 * ZOOM, 26.5 * ZOOM);
        g.add(barRed);

        const barBlue = new THREE.Mesh(
          this.assets.box('police-bar-b', 3 * ZOOM, 6 * ZOOM, 3 * ZOOM),
          this.assets.phong('police-b-mat', 0x2979ff, { emissive: 0x0055ff }),
        );
        barBlue.position.set(len * 0.02 * ZOOM, 4 * ZOOM, 26.5 * ZOOM);
        g.add(barBlue);

        // Front heavy push-bar
        this.box(g, 2.2, bodyW - 8, 8, 0x212121, -len / 2 - 1.2, 0, 10);

        this.wheelPair(g, -len * 0.28, bodyW);
        this.wheelPair(g, len * 0.28, bodyW);
        this.addLightsAndBumpers(g, len, bodyW, 9.5);
        break;
      }

      // 13. AMBULANCE
      case 'ambulance': {
        const ambW = 30;
        this.rbody(g, len, ambW, 24, 0xf5f6fa, 0, 0, 16, 2.6);
        // Driver windshield
        this.box(g, 1.8, ambW - 6, 9, 0xd0e8fa, -len / 2 - 0.4, 0, 20);

        // Red medical side stripes & crosses
        for (const side of [-1, 1]) {
          this.box(g, len * 0.72, 1.2, 3.5, 0xd32f2f, len * 0.05, side * (ambW / 2 + 0.4), 16);
          // Red cross
          this.box(g, 6, 1.4, 2, 0xd32f2f, len * 0.1, side * (ambW / 2 + 0.5), 23);
          this.box(g, 2, 1.4, 6, 0xd32f2f, len * 0.1, side * (ambW / 2 + 0.5), 23);
        }

        // Roof Red / Blue beacons
        const rBeacon = new THREE.Mesh(
          this.assets.box('amb-beacon', 3.5 * ZOOM, 12 * ZOOM, 3 * ZOOM),
          this.assets.phong('amb-beacon-mat', 0xff1744, { emissive: 0xff1744 }),
        );
        rBeacon.position.set((-len * 0.3) * ZOOM, 0, 29.5 * ZOOM);
        g.add(rBeacon);

        this.wheelPair(g, -len * 0.28, ambW, 7.2);
        this.wheelPair(g, len * 0.28, ambW, 7.2);
        this.addLightsAndBumpers(g, len, ambW, 10);
        break;
      }

      // 14. FARM TRACTOR
      case 'tractor': {
        const trW = 28;
        // Engine Hood
        this.rbody(g, len * 0.55, trW * 0.65, 14, 0x43a047, -len * 0.2, 0, 12, 2.0);
        // Driver Open/Glass Cabin
        const cab = new THREE.Mesh(
          this.assets.roundedBox(len * 0.42 * ZOOM, (trW - 4) * ZOOM, 18 * ZOOM, 1.5 * ZOOM, 2),
          this.glassMat(0xd8e8f8),
        );
        cab.position.set((len * 0.22) * ZOOM, 0, 20 * ZOOM);
        g.add(cab);

        // Vertical Chrome Exhaust Pipe
        const exhaust = new THREE.Mesh(
          this.assets.cylinder('tr-exhaust', 1.2 * ZOOM, 1.2 * ZOOM, 14 * ZOOM, 8),
          this.mat(0xdce775, 0, 80),
        );
        exhaust.position.set((-len * 0.15) * ZOOM, (trW * 0.35) * ZOOM, 24 * ZOOM);
        g.add(exhaust);

        // Small Front Wheels
        this.wheelPair(g, -len * 0.35, trW * 0.75, 5.5);
        // Giant Oversized Rear Drive Wheels
        this.wheelPair(g, len * 0.22, trW + 4, 11);
        break;
      }

      // 15. INDUSTRIAL FORKLIFT
      case 'forklift': {
        const flW = 26;
        // Chassis in Safety Yellow
        this.rbody(g, len * 0.7, flW, 14, 0xfbc02d, len * 0.1, 0, 11, 2.2);

        // Roll Cage Overhead Guard
        for (const side of [-1, 1]) {
          const bar = new THREE.Mesh(
            this.assets.cylinder('fl-bar', 1.2 * ZOOM, 1.2 * ZOOM, 18 * ZOOM, 8),
            this.mat(0x212121, 0, 50),
          );
          bar.position.set((len * 0.1) * ZOOM, side * (flW / 2 - 2) * ZOOM, 21 * ZOOM);
          g.add(bar);
        }
        this.box(g, len * 0.5, flW - 4, 2, 0x212121, len * 0.1, 0, 30);

        // Front Lifting Mast and Steel Forks
        this.box(g, 2.5, flW * 0.65, 26, 0x37474f, -len * 0.32, 0, 16);
        for (const side of [-1, 1]) {
          const fork = new THREE.Mesh(
            this.assets.box('fl-fork', 16 * ZOOM, 2.8 * ZOOM, 1.5 * ZOOM),
            this.mat(0x90a4ae, 0, 70),
          );
          fork.position.set((-len * 0.32 - 8) * ZOOM, side * 5 * ZOOM, 2.5 * ZOOM);
          g.add(fork);
        }

        this.wheelPair(g, -len * 0.18, flW, 6);
        this.wheelPair(g, len * 0.35, flW, 6);
        break;
      }

      // 16. BOAT & SUBMARINE
      case 'boat':
      case 'submarine': {
        const isSub = kind === 'submarine';
        const boatW = 28;
        // Pointed Prow Nautical Hull
        this.rbody(g, len, boatW, 14, isSub ? 0x263238 : 0x0288d1, 0, 0, 10, 3.2);

        // Upper Wheelhouse / Bridge
        const bridge = new THREE.Mesh(
          this.assets.roundedBox(len * 0.45 * ZOOM, (boatW - 6) * ZOOM, 10 * ZOOM, 2.0 * ZOOM, 2),
          isSub ? this.mat(0x37474f) : this.glassMat(0xd8e8f8),
        );
        bridge.position.set(len * 0.05 * ZOOM, 0, 18 * ZOOM);
        g.add(bridge);

        if (isSub) {
          // Periscope Tower
          const peri = new THREE.Mesh(
            this.assets.cylinder('sub-peri', 1.8 * ZOOM, 1.8 * ZOOM, 12 * ZOOM, 8),
            this.mat(0x455a64, 0, 60),
          );
          peri.position.set((len * 0.05) * ZOOM, 0, 26 * ZOOM);
          g.add(peri);
        }

        // Stern Propeller Drive
        const prop = new THREE.Mesh(
          this.assets.cylinder('boat-prop', 3.5 * ZOOM, 3.5 * ZOOM, 2.5 * ZOOM, 6),
          this.mat(0xffb300, 0, 80),
        );
        prop.position.set((len / 2 + 2) * ZOOM, 0, 8 * ZOOM);
        g.add(prop);
        break;
      }

      // 17. AIRPLANE / SKY SHIP
      case 'plane':
      case 'sky_ship': {
        const fuseW = 22;
        // Fuselage
        this.rbody(g, len, fuseW, 15, 0xe0e6ed, 0, 0, 14, 3.0);
        // Cockpit canopy
        const canopy = new THREE.Mesh(
          this.assets.roundedBox(len * 0.35 * ZOOM, (fuseW - 4) * ZOOM, 8 * ZOOM, 1.8 * ZOOM, 2),
          this.glassMat(0x81d4fa),
        );
        canopy.position.set((-len * 0.15) * ZOOM, 0, 22 * ZOOM);
        g.add(canopy);

        // Broad Swept Wings
        const wings = new THREE.Mesh(
          this.assets.box('plane-wings', 16 * ZOOM, 58 * ZOOM, 2.2 * ZOOM),
          this.mat(0x1976d2, 0, 60),
        );
        wings.position.set((-len * 0.05) * ZOOM, 0, 14 * ZOOM);
        g.add(wings);

        // Wingtip Navigation Beacons (Red Port / Green Starboard)
        const redBeacon = new THREE.Mesh(
          this.assets.sphere('nav-red', 1.6 * ZOOM, 6, 6),
          this.assets.phong('nav-red-mat', 0xff1744, { emissive: 0xff1744 }),
        );
        redBeacon.position.set((-len * 0.05) * ZOOM, -29 * ZOOM, 14 * ZOOM);
        g.add(redBeacon);

        const grnBeacon = new THREE.Mesh(
          this.assets.sphere('nav-grn', 1.6 * ZOOM, 6, 6),
          this.assets.phong('nav-grn-mat', 0x00e676, { emissive: 0x00e676 }),
        );
        grnBeacon.position.set((-len * 0.05) * ZOOM, 29 * ZOOM, 14 * ZOOM);
        g.add(grnBeacon);

        // Vertical Tail Fin
        const tail = new THREE.Mesh(
          this.assets.box('plane-tail', 10 * ZOOM, 2.2 * ZOOM, 14 * ZOOM),
          this.mat(0x1976d2, 0, 60),
        );
        tail.position.set((len / 2 - 6) * ZOOM, 0, 24 * ZOOM);
        g.add(tail);
        break;
      }

      default: {
        this.rbody(g, len, bodyW, 12, color, 0, 0, 9.5, 2.5);
        const cab = new THREE.Mesh(
          this.assets.roundedBox(len * 0.55 * ZOOM, (bodyW - 4) * ZOOM, 10.5 * ZOOM, 2.0 * ZOOM, 2),
          this.glassMat(0xcbe2f2),
        );
        cab.position.set(len * 0.02 * ZOOM, 0, 19.5 * ZOOM);
        g.add(cab);
        this.wheelPair(g, -len * 0.28, bodyW);
        this.wheelPair(g, len * 0.28, bodyW);
        this.addLightsAndBumpers(g, len, bodyW, 9.5);
        break;
      }
    }

    g.userData.length = len;
    g.userData.kind = kind;
    g.userData.speed = speed;
    g.userData.prevDx = null;
    return g;
  }
}
