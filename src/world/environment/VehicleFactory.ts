/**
 * VehicleFactory — Stylized premium 3D vehicles with rounded chassis,
 * glass cabins, realistic wheels (tires + metallic rims), bumpers,
 * headlights, taillights, roof details, and world-specific identities.
 *
 * Dimensions and speed parameters strictly match traffic spacing specifications.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/game.config';
import { vehicleSpec } from '../../config/traffic.config';
import type { AssetManager } from '../../assets/AssetManager';
import { pick } from '../../utils/Random';

const ZOOM = GAME_CONFIG.zoom;

const BODY_COLORS = [
  0xd64045, // Cherry red
  0xffc93c, // Golden yellow
  0x3f8efc, // Cobalt blue
  0x4a7c59, // Forest green
  0xe8e8e8, // Pearl white
  0x8a8f99, // Slate gray
  0xe07b2a, // Tangerine orange
  0x7d5fff, // Royal purple
  0x17c0eb, // Electric cyan
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
    shininess = 35,
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
    emissive = 0,
    shininess = 50,
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.roundedBox(w * ZOOM, h * ZOOM, d * ZOOM, radius * ZOOM, 2),
      this.mat(color, emissive, shininess),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** Detailed wheels: outer rubber tire + inner metallic alloy rim + center hub */
  private wheel(
    parent: THREE.Group,
    x: number,
    z = 7,
    tireR = 7,
    width = 12.5,
    rimColor = 0xd2d7e0,
  ): void {
    const g = new THREE.Group();

    // Tire tread
    const tire = new THREE.Mesh(
      this.assets.cylinder(`veh-tire:${tireR}x${width}`, tireR * ZOOM, tireR * ZOOM, width * ZOOM, 14),
      this.mat(0x1e2025, 0, 15),
    );
    tire.castShadow = true;
    g.add(tire);

    // Outer wheel rim
    const rim = new THREE.Mesh(
      this.assets.cylinder(`veh-rim:${tireR * 0.65}x${width + 0.6}`, tireR * 0.65 * ZOOM, tireR * 0.65 * ZOOM, (width + 0.6) * ZOOM, 12),
      this.mat(rimColor, 0, 80),
    );
    g.add(rim);

    // Center hub cap
    const cap = new THREE.Mesh(
      this.assets.cylinder(`veh-cap:${tireR * 0.3}x${width + 1.2}`, tireR * 0.3 * ZOOM, tireR * 0.3 * ZOOM, (width + 1.2) * ZOOM, 8),
      this.mat(0x57606f, 0, 90),
    );
    g.add(cap);

    g.position.set(x * ZOOM, 0, z * ZOOM);
    parent.add(g);
  }

  /** Front headlights with warm glow emissive + bezel trim */
  private headlights(parent: THREE.Group, len: number, spread: number, z: number, isDual = false): void {
    const frontX = -len / 2;
    for (const s of [-1, 1]) {
      // Chrome housing
      this.box(parent, 2.5, 5, 4, 0x57606f, frontX + 1.2, s * spread, z, 0, 80);
      // Glowing lens
      this.box(parent, 1.8, 4, 3.2, 0xfff6b0, frontX - 0.2, s * spread, z, 0xa08c10, 100);

      if (isDual) {
        // Inner high-beam
        this.box(parent, 1.6, 3, 2.8, 0xfffad0, frontX - 0.2, s * (spread - 4.5), z, 0xa08c10, 100);
      }
    }
  }

  /** Rear taillights with rich red emissive */
  private taillights(parent: THREE.Group, len: number, spread: number, z: number): void {
    const rearX = len / 2;
    for (const s of [-1, 1]) {
      // Housing
      this.box(parent, 2.2, 4.5, 3.5, 0x3d1214, rearX - 1.1, s * spread, z);
      // Red glow lens
      this.box(parent, 1.5, 3.8, 2.8, 0xff2222, rearX + 0.3, s * spread, z, 0x880000, 80);
    }
  }

  /** Stylized chrome or dark contact bumpers */
  private bumpers(parent: THREE.Group, len: number, width: number, frontZ = 6, rearZ = 6, color = 0x2b2f38): void {
    // Front bumper
    this.rbody(parent, 3.5, width + 1, 4.2, color, -len / 2 - 1.2, 0, frontZ, 1.2, 0, 70);
    // Rear bumper
    this.rbody(parent, 3.5, width + 1, 4.2, color, len / 2 + 1.2, 0, rearZ, 1.2, 0, 70);
  }

  /** Side mirrors */
  private sideMirrors(parent: THREE.Group, x: number, spread: number, z: number, color = 0x2b2f38): void {
    for (const s of [-1, 1]) {
      this.box(parent, 3.2, 1.5, 2.8, color, x, s * (spread + 1.2), z);
      // Mirror glass reflection
      this.box(parent, 2.4, 0.4, 2.2, 0xcfe8ff, x, s * (spread + 2.1), z, 0, 110);
    }
  }

  create(kind: string): BuiltVehicle {
    const spec = vehicleSpec(kind);
    const g = new THREE.Group() as BuiltVehicle;
    const len = Math.round(spec.length * 1.76);
    const bodyH = kind === 'truck' || kind === 'bus' ? 26 : kind === 'van' ? 20 : 15;
    const color = kind === 'taxi' ? 0xffc93c : pick(BODY_COLORS);
    const speed = spec.baseSpeed;

    switch (kind) {
      // -----------------------------------------------------------
      // 1. MOTORCYCLE / SCOOTER
      // -----------------------------------------------------------
      case 'moto': {
        const bikeColor = pick([0xff3b30, 0x007aff, 0xff9500, 0x34c759, 0x5856d6]);
        // Frame / engine block
        this.box(g, len * 0.7, 8, 10, 0x2f3542, 0, 0, 10);
        // Aerodynamic fuel tank
        this.rbody(g, 12, 10, 7, bikeColor, -len * 0.1, 0, 17, 2);
        // Seat
        this.box(g, 10, 8, 3.5, 0x1e2025, len * 0.15, 0, 15);
        // Front forks & handlebars
        this.box(g, 3, 2, 16, 0xdfe4ea, -len * 0.35, 0, 16);
        this.box(g, 2.5, 14, 2.5, 0x2f3542, -len * 0.35, 0, 23);
        // Handgrips
        this.box(g, 2, 2.5, 2.5, 0x1e2025, -len * 0.35, -6.5, 23);
        this.box(g, 2, 2.5, 2.5, 0x1e2025, -len * 0.35, 6.5, 23);
        // Chrome exhaust pipe
        this.box(g, 14, 2.5, 2.5, 0xdfe4ea, len * 0.1, 4.5, 7, 0, 90);
        // Front headlamp
        this.box(g, 3, 4.5, 4.5, 0xfff6b0, -len * 0.45, 0, 18, 0x998800);
        // Rear taillight
        this.box(g, 2, 3, 2.5, 0xff2222, len * 0.35, 0, 16, 0x660000);
        // Spoked wheels
        this.wheel(g, -len * 0.38, 7.5, 6.5, 5);
        this.wheel(g, len * 0.35, 7.5, 6.5, 5);
        break;
      }

      // -----------------------------------------------------------
      // 2. CITY TAXI
      // -----------------------------------------------------------
      case 'taxi': {
        const taxiYellow = 0xffc93c;
        // Main rounded chassis
        this.rbody(g, len, 28, 13, taxiYellow, 0, 0, 11, 2.5);
        // Black and white checkered taxi trim stripe
        for (let i = -len * 0.35; i <= len * 0.35; i += 7) {
          const checkCol = Math.round(i) % 2 === 0 ? 0x1e2430 : 0xffffff;
          this.box(g, 4, 28.6, 2.2, checkCol, i, 0, 12);
        }
        // Glass cabin with pillars
        const cab = new THREE.Mesh(
          this.assets.roundedBox(len * 0.52 * ZOOM, 23 * ZOOM, 12 * ZOOM, 2.2 * ZOOM, 2),
          this.mat(0xaee2ff, 0, 110),
        );
        cab.position.set(len * 0.04 * ZOOM, 0, 22.5 * ZOOM);
        cab.castShadow = true;
        g.add(cab);

        // Roof TAXI sign with amber glow
        const signHousing = this.box(g, 11, 9, 4.2, 0xfffdf5, len * 0.04, 0, 30.5, 0x664400, 80);
        this.box(g, 8, 0.4, 2.6, 0x1e2430, len * 0.04, 4.7, 30.5);
        this.box(g, 8, 0.4, 2.6, 0x1e2430, len * 0.04, -4.7, 30.5);

        // Front chrome radiator grille
        this.box(g, 2.5, 14, 7, 0xdfe4ea, -len / 2 - 0.2, 0, 10, 0, 90);
        this.bumpers(g, len, 27, 7, 7, 0x57606f);
        this.headlights(g, len, 10, 10, true);
        this.taillights(g, len, 10, 10);
        this.sideMirrors(g, -len * 0.15, 14, 18, 0x1e2430);

        // 4 wheels with chrome caps
        this.wheel(g, -len * 0.3, 7, 7, 12, 0xffffff);
        this.wheel(g, len * 0.3, 7, 7, 12, 0xffffff);
        break;
      }

      // -----------------------------------------------------------
      // 3. HEAVY TRUCK / FREIGHT HAULER
      // -----------------------------------------------------------
      case 'truck': {
        const cabColor = color;
        // Heavy chassis frame rails
        this.box(g, len, 24, 7, 0x2f3542, 0, 0, 9);

        // Front cab unit
        const cabLen = len * 0.36;
        const cabX = -len / 2 + cabLen / 2 + 1;
        this.rbody(g, cabLen, 28, 25, cabColor, cabX, 0, 20, 2.5);

        // Cab windshield & side windows
        this.box(g, 2.5, 24, 9, 0xaee2ff, cabX - cabLen / 2 - 0.2, 0, 23, 0, 110);
        this.box(g, cabLen * 0.5, 28.5, 8, 0xaee2ff, cabX + 1, 0, 23, 0, 110);

        // Heavy chrome front grille & heavy bumper
        this.box(g, 2.5, 20, 13, 0xdfe4ea, -len / 2 - 1.2, 0, 14, 0, 100);
        this.rbody(g, 4, 30, 6, 0x3d434d, -len / 2 - 2, 0, 8, 1.5, 0, 70);

        // Twin vertical chrome exhaust pipes behind cab
        for (const s of [-1, 1]) {
          const pipe = new THREE.Mesh(
            this.assets.cylinder('truck-exhaust', 1.8 * ZOOM, 1.8 * ZOOM, 24 * ZOOM, 8),
            this.mat(0xdfe4ea, 0, 110),
          );
          pipe.position.set((cabX + cabLen / 2 + 3) * ZOOM, s * 12.5 * ZOOM, 24 * ZOOM);
          pipe.castShadow = true;
          g.add(pipe);
        }

        // Rooftop triple amber marker lights
        for (const oy of [-6, 0, 6]) {
          this.box(g, 2, 2.5, 2, 0xffa502, cabX - cabLen * 0.2, oy, 33.5, 0x884400);
        }

        // Heavy cargo box / shipping freight container in back
        const cargoLen = len * 0.58;
        const cargoX = len / 2 - cargoLen / 2 - 1;
        const cargoCol = pick([0x3742fa, 0x2ed573, 0xff4757, 0xf1f2f6, 0x747d8c]);
        this.rbody(g, cargoLen, 30, 28, cargoCol, cargoX, 0, 23, 1.8);
        // Container ribbing texture details
        for (let rx = -cargoLen * 0.4; rx <= cargoLen * 0.4; rx += 5) {
          this.box(g, 1.6, 30.6, 26, 0x1e2430, cargoX + rx, 0, 23);
        }

        // Headlights & taillights
        this.headlights(g, len, 11, 10, true);
        this.taillights(g, len, 12, 10);

        // 6 Heavy-duty wheels (front steering axle + dual rear axle)
        this.wheel(g, cabX - 4, 7.5, 7.5, 12.5, 0x747d8c);
        this.wheel(g, cargoX - 8, 7.5, 7.5, 13, 0x747d8c);
        this.wheel(g, cargoX + 9, 7.5, 7.5, 13, 0x747d8c);
        break;
      }

      // -----------------------------------------------------------
      // 4. TRANSIT BUS
      // -----------------------------------------------------------
      case 'bus': {
        const busColor = pick([0xff9f1c, 0x2ed573, 0x1e90ff, 0xff4757]);
        // Long aerodynamic body
        this.rbody(g, len, 29, 29, busColor, 0, 0, 20, 2.8);

        // Lower contrast accent skirting
        this.box(g, len + 0.4, 29.4, 6, 0x2f3542, 0, 0, 8);

        // Curved panoramic front windshield
        this.box(g, 2.5, 25, 12, 0xaee2ff, -len / 2 - 0.2, 0, 24, 0, 110);

        // Continuous tinted side windows
        this.box(g, len * 0.78, 29.6, 11, 0x1e272e, 2, 0, 25, 0, 80);
        // Window pillar mullions
        for (let px = -len * 0.32; px <= len * 0.38; px += 10) {
          this.box(g, 1.8, 29.8, 11.4, busColor, px, 0, 25);
        }

        // Front route destination sign ("CROSS 01")
        this.box(g, 2, 16, 4, 0xffa502, -len / 2 - 0.3, 0, 31, 0x884400);

        // Rooftop air conditioning pods
        this.rbody(g, 14, 18, 4, 0xf1f2f6, -len * 0.15, 0, 36, 1.8);
        this.rbody(g, 14, 18, 4, 0xf1f2f6, len * 0.2, 0, 36, 1.8);

        // Bumpers, lights & wheels
        this.bumpers(g, len, 28, 7, 7, 0x1e2430);
        this.headlights(g, len, 11, 9, true);
        this.taillights(g, len, 11, 10);
        this.wheel(g, -len * 0.32, 7.5, 7.5, 12.5, 0xffffff);
        this.wheel(g, len * 0.18, 7.5, 7.5, 13, 0xffffff);
        this.wheel(g, len * 0.34, 7.5, 7.5, 13, 0xffffff);
        break;
      }

      // -----------------------------------------------------------
      // 5. DELIVERY VAN
      // -----------------------------------------------------------
      case 'van': {
        const vanColor = pick([0xffffff, 0xf1f2f6, 0x3742fa, 0xffc048, 0x2ed573]);
        // Main van chassis with high roof
        this.rbody(g, len, 29, 23, vanColor, 2, 0, 17, 2.5);

        // Front sloping hood
        this.rbody(g, len * 0.28, 28, 12, vanColor, -len / 2 + len * 0.14, 0, 11, 2.2);

        // Windshield and side door windows
        this.box(g, 2.5, 25, 9, 0xaee2ff, -len * 0.26, 0, 21, 0, 110);
        this.box(g, 12, 29.4, 8, 0xaee2ff, -len * 0.12, 0, 21, 0, 110);

        // Side company accent stripe
        this.box(g, len * 0.65, 29.4, 3, 0xff4757, len * 0.12, 0, 15);

        // Rear vertical taillight bars
        for (const s of [-1, 1]) {
          this.box(g, 1.5, 2.5, 9, 0xff2222, len / 2 + 1.2, s * 12, 18, 0x880000);
        }

        this.bumpers(g, len, 28, 7, 7, 0x2f3542);
        this.headlights(g, len, 11, 10, true);
        this.sideMirrors(g, -len * 0.22, 14.5, 17, 0x2f3542);
        this.wheel(g, -len * 0.28, 7, 7, 12, 0xdfe4ea);
        this.wheel(g, len * 0.26, 7, 7, 12, 0xdfe4ea);
        break;
      }

      // -----------------------------------------------------------
      // 6. RUGGED 4x4 JEEP
      // -----------------------------------------------------------
      case 'jeep': {
        const jeepColor = pick([0x2ed573, 0xff9f1c, 0xd64045, 0x3867d6, 0x57606f]);
        // Chunky lower chassis
        this.rbody(g, len * 0.95, 28, 14, jeepColor, 0, 0, 12, 2.2);

        // Aggressive wheel arch flares
        for (const wx of [-len * 0.3, len * 0.28]) {
          for (const s of [-1, 1]) {
            this.box(g, 11, 2, 4, 0x1e2025, wx, s * 14.5, 14);
          }
        }

        // Open cabin with exposed tubular roll cage
        const cageMat = 0x1e2025;
        // Uprights
        this.box(g, 2.5, 2.5, 15, cageMat, -len * 0.08, -12, 21);
        this.box(g, 2.5, 2.5, 15, cageMat, -len * 0.08, 12, 21);
        this.box(g, 2.5, 2.5, 15, cageMat, len * 0.34, -12, 21);
        this.box(g, 2.5, 2.5, 15, cageMat, len * 0.34, 12, 21);
        // Top crossbars
        this.box(g, len * 0.44, 2.5, 2.5, cageMat, len * 0.13, -12, 28.5);
        this.box(g, len * 0.44, 2.5, 2.5, cageMat, len * 0.13, 12, 28.5);
        this.box(g, 2.5, 24, 2.5, cageMat, len * 0.34, 0, 28.5);
        this.box(g, 2.5, 24, 2.5, cageMat, -len * 0.08, 0, 28.5);

        // Folding windshield
        this.box(g, 2.5, 23, 11, 0xaee2ff, -len * 0.1, 0, 22, 0, 110);

        // Full-size spare tire on tailgate
        const spare = new THREE.Mesh(
          this.assets.cylinder('jeep-spare', 7 * ZOOM, 7 * ZOOM, 6 * ZOOM, 12),
          this.mat(0x1e2025),
        );
        spare.rotation.y = Math.PI / 2;
        spare.position.set((len / 2 + 3) * ZOOM, 0, 14 * ZOOM);
        spare.castShadow = true;
        g.add(spare);

        // Front winch bumper & round retro headlights
        this.rbody(g, 5, 29, 6, 0x1e2025, -len / 2 - 2, 0, 9, 1.5);
        this.box(g, 4, 8, 4, 0x747d8c, -len / 2 - 3, 0, 9); // Winch drum
        this.headlights(g, len, 9, 12);
        this.taillights(g, len, 11, 11);

        // Oversized chunky off-road wheels
        this.wheel(g, -len * 0.3, 8, 8, 13, 0x2f3542);
        this.wheel(g, len * 0.28, 8, 8, 13, 0x2f3542);
        break;
      }

      // -----------------------------------------------------------
      // 7. SAND BUGGY / DUNE RACER
      // -----------------------------------------------------------
      case 'buggy': {
        const buggyColor = pick([0xff4757, 0xffa502, 0x2ed573, 0x1e90ff]);
        // Low cockpit frame
        this.rbody(g, len * 0.6, 22, 8, buggyColor, -len * 0.1, 0, 9, 2);
        // Steel tube roll cage
        this.box(g, len * 0.45, 18, 12, 0x2f3542, len * 0.05, 0, 16);

        // High aerodynamic rear wing
        this.box(g, 8, 24, 2, buggyColor, len * 0.38, 0, 22);
        this.box(g, 2, 2, 9, 0x2f3542, len * 0.36, -8, 16);
        this.box(g, 2, 2, 9, 0x2f3542, len * 0.36, 8, 16);

        // Rooftop quad spotlight bar
        for (const sy of [-6, -2, 2, 6]) {
          this.box(g, 2.5, 3, 3, 0xfff6b0, -len * 0.1, sy, 23, 0x998800);
        }

        // Exposed rear engine block with twin chrome upturned exhausts
        this.box(g, 7, 12, 8, 0x57606f, len * 0.25, 0, 10, 0, 80);
        this.box(g, 2, 2, 8, 0xdfe4ea, len * 0.28, -3, 16, 0, 100);
        this.box(g, 2, 2, 8, 0xdfe4ea, len * 0.28, 3, 16, 0, 100);

        this.headlights(g, len * 0.8, 7, 9);
        this.wheel(g, -len * 0.34, 7, 6.5, 11, 0xffc93c);
        // Giant paddle rear wheels
        this.wheel(g, len * 0.3, 8.5, 8.5, 14, 0xffc93c);
        break;
      }

      // -----------------------------------------------------------
      // 8. ALPINE SNOWMOBILE
      // -----------------------------------------------------------
      case 'snowmobile': {
        const snowColor = pick([0x00d2d3, 0x54a0ff, 0xff6b6b, 0xffffff]);
        // Aerodynamic hood
        this.rbody(g, len * 0.55, 20, 13, snowColor, -len * 0.2, 0, 11, 2.5);
        // Tinted windshield & handlebars
        this.box(g, 2, 14, 8, 0xaee2ff, -len * 0.15, 0, 20, 0, 110);
        this.box(g, 2, 12, 2, 0x1e2025, -len * 0.1, 0, 19);

        // Rider seat & rear luggage rack
        this.box(g, len * 0.45, 14, 6, 0x1e2025, len * 0.18, 0, 13);
        this.box(g, 10, 16, 3, 0x747d8c, len * 0.38, 0, 14);

        // Front dual steering skis with suspension coils
        for (const s of [-1, 1]) {
          const ski = this.box(g, 24, 3.5, 1.5, 0x2f3542, -len * 0.28, s * 9, 3);
          // Ski tip curve
          this.box(g, 4, 3.5, 3.5, 0x2f3542, -len * 0.28 - 11, s * 9, 4.5);
          // Strut
          this.box(g, 2.5, 2.5, 8, 0xdfe4ea, -len * 0.28, s * 9, 7);
        }

        // Rear track assembly
        this.box(g, len * 0.55, 12, 6, 0x1e2025, len * 0.18, 0, 4);

        // High beam headlight & rear red beacon
        this.box(g, 2.5, 6, 5, 0xfff6b0, -len * 0.48, 0, 12, 0x998800);
        this.box(g, 1.8, 4, 3, 0xff2222, len * 0.44, 0, 13, 0x880000);
        break;
      }

      // -----------------------------------------------------------
      // 9. CYBERPUNK HOVER SPEEDER
      // -----------------------------------------------------------
      case 'hover': {
        const hoverColor = pick([0x0abde3, 0x10ac84, 0xee5253, 0x5f27cd, 0x222f3e]);
        // Teardrop aerodynamic chassis
        this.rbody(g, len, 27, 13, hoverColor, 0, 0, 13, 3);

        // Cockpit glass bubble
        const canopy = new THREE.Mesh(
          this.assets.roundedBox(len * 0.45 * ZOOM, 18 * ZOOM, 8 * ZOOM, 2.5 * ZOOM, 2),
          this.mat(0x00f0ff, 0x004455, 120),
        );
        canopy.position.set(len * 0.05 * ZOOM, 0, 21 * ZOOM);
        canopy.castShadow = true;
        g.add(canopy);

        // 4 Anti-gravity repulsor emitter pods with bright cyan underglow
        for (const px of [-len * 0.3, len * 0.3]) {
          for (const s of [-1, 1]) {
            const pod = this.box(g, 9, 5, 5, 0x2f3542, px, s * 14, 8);
            // Glowing energy ring
            this.box(g, 7, 4, 1.8, 0x00f0ff, px, s * 14, 5, 0x00a8ff, 100);
          }
        }

        // Twin rear ion engines with plasma glow
        for (const s of [-1, 1]) {
          this.box(g, 6, 6, 6, 0x2f3542, len / 2 - 2, s * 7, 13);
          this.box(g, 2, 4.5, 4.5, 0x00f0ff, len / 2 + 1, s * 7, 13, 0x00f0ff, 120);
        }

        // Front cyber light strip
        this.box(g, 2, 22, 2.5, 0x00f0ff, -len / 2 - 0.2, 0, 12, 0x00f0ff, 100);
        break;
      }

      // -----------------------------------------------------------
      // 10. CYBERPUNK NEOCAR
      // -----------------------------------------------------------
      case 'neocar': {
        const neoColor = pick([0xff3fb4, 0x7d5fff, 0x17c0eb, 0x2c2c54]);
        // Ultra-low supercar wedge chassis
        this.rbody(g, len, 28, 12, neoColor, 0, 0, 11, 2.2);

        // Low dark tinted canopy
        this.box(g, len * 0.52, 23, 7, 0x0f141d, len * 0.02, 0, 19, 0, 110);

        // Front full-width horizontal neon strip (magenta/cyan)
        this.box(g, 2, 25, 2.2, 0xff3fb4, -len / 2 - 0.2, 0, 10, 0xff3fb4, 120);

        // Side rocker neon underglow strips
        this.box(g, len * 0.7, 1.5, 1.8, 0x38e1ff, 0, -14.2, 5, 0x38e1ff, 100);
        this.box(g, len * 0.7, 1.5, 1.8, 0x38e1ff, 0, 14.2, 5, 0x38e1ff, 100);

        // Rear aerodynamic diffuser & neon blade taillight
        this.box(g, 2, 25, 2.2, 0x38e1ff, len / 2 + 0.2, 0, 11, 0x38e1ff, 120);

        // Aero disc wheels with glowing center
        this.wheel(g, -len * 0.32, 6.5, 6.5, 12, 0xff3fb4);
        this.wheel(g, len * 0.3, 6.5, 6.5, 12, 0x38e1ff);
        break;
      }

      // -----------------------------------------------------------
      // 11. VOLCANO MINING HAULER
      // -----------------------------------------------------------
      case 'miner': {
        const mineYellow = 0xe67e22;
        // Heavy mining chassis
        this.box(g, len, 27, 8, 0x2f3542, 0, 0, 10);

        // Heavy front operator cab with protective roof overhang
        const cabX = -len * 0.26;
        this.rbody(g, len * 0.35, 28, 18, mineYellow, cabX, 0, 20, 2);
        this.box(g, 2.5, 22, 8, 0xaee2ff, cabX - len * 0.17 - 0.2, 0, 22, 0, 110);
        // Cab safety canopy
        this.box(g, len * 0.42, 30, 2.5, 0x2f3542, cabX - 2, 0, 30);
        // Roof amber hazard beacon
        this.box(g, 3, 3, 4, 0xffa502, cabX, 0, 33, 0xff6b00);

        // Heavy sloped dump bed in back
        const bedLen = len * 0.56;
        const bedX = len * 0.2;
        this.rbody(g, bedLen, 30, 18, 0x747d8c, bedX, 0, 21, 1.8);

        // GOWING MAGMA ORE CHUNKS in the dump bed!
        for (let ox = -bedLen * 0.3; ox <= bedLen * 0.3; ox += 6) {
          for (const oy of [-6, 6]) {
            this.box(g, 5, 5, 4, 0xff4757, bedX + ox, oy, 26, 0xaa1100, 70);
          }
        }

        // Heavy rock guard bumper & giant off-road mining wheels
        this.rbody(g, 4, 30, 7, 0x2f3542, -len / 2 - 1.5, 0, 9, 1.5);
        this.headlights(g, len, 11, 12, true);
        this.taillights(g, len, 12, 11);
        this.wheel(g, -len * 0.28, 8.5, 8.5, 14, 0xf6b93b);
        this.wheel(g, len * 0.08, 8.5, 8.5, 14, 0xf6b93b);
        this.wheel(g, len * 0.32, 8.5, 8.5, 14, 0xf6b93b);
        break;
      }

      // -----------------------------------------------------------
      // 12. SPEEDBOAT
      // -----------------------------------------------------------
      case 'boat': {
        // Deep-V hydrodynamic hull
        this.rbody(g, len, 26, 12, 0xffffff, 0, 0, 7, 3);
        // Crisp marine waterline stripe
        this.box(g, len + 0.2, 26.4, 2.5, 0x3fa8d8, 0, 0, 4.5);

        // Teak wood cockpit deck
        this.box(g, len * 0.65, 20, 2, 0xb08b52, len * 0.05, 0, 11);

        // Wraparound curved acrylic windscreen
        this.box(g, 2.5, 21, 6, 0xaee2ff, -len * 0.18, 0, 15, 0, 120);

        // White leather upholstered cockpit seats
        this.box(g, 8, 16, 4, 0xfffdf5, len * 0.02, 0, 13);

        // Twin chrome outboard marine engines on transom
        for (const s of [-1, 1]) {
          this.box(g, 7, 5, 10, 0x2f3542, len / 2 + 2, s * 6, 8, 0, 90);
          this.box(g, 2, 5, 2, 0xdfe4ea, len / 2 + 5.5, s * 6, 4, 0, 100);
        }

        // Red port / green starboard navigation lights
        this.box(g, 2, 2, 2, 0x2ed573, -len * 0.35, -12, 12, 0x00aa22);
        this.box(g, 2, 2, 2, 0xff4757, -len * 0.35, 12, 12, 0xaa0000);
        break;
      }

      // -----------------------------------------------------------
      // 13. STEAM LOCOMOTIVE
      // -----------------------------------------------------------
      case 'train': {
        const trainColor = 0xd64045;
        // Heavy locomotive chassis
        this.box(g, len, 28, 8, 0x2f3542, 0, 0, 10);

        // Boiler cylinder with polished brass bands
        const boiler = new THREE.Mesh(
          this.assets.cylinder('loco-boiler', 11 * ZOOM, 11 * ZOOM, len * 0.65 * ZOOM, 16),
          this.mat(trainColor, 0, 70),
        );
        boiler.rotation.z = Math.PI / 2;
        boiler.position.set(-len * 0.1 * ZOOM, 0, 22 * ZOOM);
        boiler.castShadow = true;
        g.add(boiler);

        // Brass boiler compression bands
        for (let bx = -len * 0.35; bx <= len * 0.15; bx += 9) {
          const band = new THREE.Mesh(
            this.assets.cylinder(`loco-band:${bx}`, 11.3 * ZOOM, 11.3 * ZOOM, 1.8 * ZOOM, 14),
            this.mat(0xffc93c, 0, 90),
          );
          band.rotation.z = Math.PI / 2;
          band.position.set(bx * ZOOM, 0, 22 * ZOOM);
          g.add(band);
        }

        // Smokestack chimney & steam dome
        this.box(g, 5, 5, 12, 0x1e2025, -len * 0.35, 0, 35);
        this.box(g, 6, 6, 7, 0xffc93c, -len * 0.12, 0, 34);

        // High-roofed engineer cab
        this.rbody(g, len * 0.32, 28, 22, 0x1e2025, len * 0.3, 0, 25, 2);
        this.box(g, 10, 28.5, 8, 0xaee2ff, len * 0.3, 0, 28, 0, 110);

        // Front cowcatcher wedge grill
        this.box(g, 6, 26, 7, 0x1e2025, -len / 2 - 2, 0, 8);

        // Glowing central lantern headlamp
        this.box(g, 4, 8, 8, 0xfff6b0, -len / 2 - 1.5, 0, 24, 0xffe9a3, 100);

        // 8 Flanged train wheels
        for (const wx of [-len * 0.35, -len * 0.12, len * 0.12, len * 0.35]) {
          this.wheel(g, wx, 8, 8, 13, 0xff4757);
        }
        break;
      }

      // -----------------------------------------------------------
      // 14. FARM TRACTOR
      // -----------------------------------------------------------
      case 'tractor': {
        const tractorGreen = 0x2ecc71;
        // Front engine hood with vents
        this.rbody(g, len * 0.52, 22, 16, tractorGreen, -len * 0.18, 0, 16, 2.2);

        // High vertical exhaust smokestack with rain flap
        this.box(g, 2, 2, 18, 0x2f3542, -len * 0.35, 8, 26);
        this.box(g, 3, 3, 1.5, 0x2f3542, -len * 0.35, 8, 35);

        // Driver open station with rollover protection arch (ROPS)
        this.box(g, 12, 14, 5, 0x1e2025, len * 0.18, 0, 17);
        this.box(g, 2.5, 2.5, 18, 0x2f3542, len * 0.16, -9, 26);
        this.box(g, 2.5, 2.5, 18, 0x2f3542, len * 0.16, 9, 26);
        this.box(g, 2.5, 20, 2.5, 0x2f3542, len * 0.16, 0, 35);

        // Smaller front steering wheels
        this.wheel(g, -len * 0.32, 7, 6.5, 10, 0xf1c40f);

        // GIANT ridged rear agricultural drive wheels with yellow wheel weights
        this.wheel(g, len * 0.22, 11, 11, 15, 0xf1c40f);
        this.headlights(g, len * 0.85, 8, 14);
        break;
      }

      // -----------------------------------------------------------
      // 15. PLANETARY ROVER
      // -----------------------------------------------------------
      case 'rover': {
        const roverCol = 0xced6e0;
        // Pressurized crew habitat capsule
        this.rbody(g, len * 0.8, 27, 16, roverCol, 0, 0, 16, 3);
        // Gold-tinted radiation shielding front visor
        this.box(g, 2.5, 21, 8, 0xffc93c, -len * 0.38, 0, 19, 0x664400, 120);

        // Rooftop satellite communications dish
        const dish = new THREE.Mesh(
          this.assets.cylinder('rover-dish', 6 * ZOOM, 1 * ZOOM, 3 * ZOOM, 10),
          this.mat(0xffffff, 0, 80),
        );
        dish.position.set(len * 0.15 * ZOOM, 0, 27 * ZOOM);
        dish.rotation.y = 0.4;
        g.add(dish);

        // 6 All-terrain rocker-bogie wheels
        for (const wx of [-len * 0.32, 0, len * 0.32]) {
          this.wheel(g, wx, 7.5, 7.5, 13, 0x2f3542);
        }
        this.headlights(g, len, 10, 14, true);
        this.taillights(g, len, 11, 14);
        break;
      }

      // -----------------------------------------------------------
      // 16. ALIEN FLYING SAUCER (UFO)
      // -----------------------------------------------------------
      case 'ufo': {
        // Metallic saucer disc hull
        const disc = new THREE.Mesh(
          this.assets.cylinder('ufo-disc', 17 * ZOOM, 9 * ZOOM, 5 * ZOOM, 18),
          this.mat(0x7158e2, 0x220044, 90),
        );
        disc.position.set(0, 0, 10 * ZOOM);
        disc.castShadow = true;
        g.add(disc);

        // Perimeter ring of pulsing energy lights
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const col = i % 2 === 0 ? 0x00f0ff : 0xff3fb4;
          this.box(g, 2.5, 2.5, 2, col, Math.cos(a) * 14, Math.sin(a) * 14, 10, col, 100);
        }

        // Translucent glowing cockpit bubble
        const dome = new THREE.Mesh(
          this.assets.sphere('ufo-bubble', 8 * ZOOM, 12, 10),
          this.mat(0x38e1ff, 0x003355, 110),
        );
        dome.position.set(0, 0, 15 * ZOOM);
        dome.castShadow = true;
        g.add(dome);

        // Underside energy propulsion emitter
        this.box(g, 8, 8, 2, 0x00f0ff, 0, 0, 6.5, 0x00f0ff);
        break;
      }

      // -----------------------------------------------------------
      // 17. RUSTIC WOODEN CART
      // -----------------------------------------------------------
      case 'cart': {
        const woodBrown = 0x8a5a2b;
        // Wood plank floor & side slats
        this.box(g, len * 0.78, 24, 3, woodBrown, 0, 0, 9);
        this.box(g, len * 0.78, 2, 8, 0x5a3818, 0, -11, 13);
        this.box(g, len * 0.78, 2, 8, 0x5a3818, 0, 11, 13);
        this.box(g, 2, 24, 8, 0x5a3818, len * 0.38, 0, 13);

        // Front hitch bar
        this.box(g, 12, 3, 3, 0x5a3818, -len * 0.44, 0, 7);

        // Cargo load: wooden barrels and burlap sacks
        this.box(g, 10, 10, 10, 0x6e4e2e, -len * 0.1, -4, 14);
        this.box(g, 8, 8, 8, 0xd2b48c, len * 0.15, 3, 13);

        // Spoke wheels with iron rims
        this.wheel(g, -len * 0.22, 7.5, 7.5, 12, 0x4a3219);
        this.wheel(g, len * 0.22, 7.5, 7.5, 12, 0x4a3219);
        break;
      }

      // -----------------------------------------------------------
      // DEFAULT: MODERN PASSENGER SEDAN / HATCHBACK
      // -----------------------------------------------------------
      default: {
        const carCol = color;
        // Sleek rounded main chassis
        this.rbody(g, len, 28, bodyH, carCol, 0, 0, 11, 2.5);

        // Streamlined greenhouse cabin with tinted windows
        const cab = new THREE.Mesh(
          this.assets.roundedBox(len * 0.54 * ZOOM, 23 * ZOOM, 12 * ZOOM, 2.2 * ZOOM, 2),
          this.mat(0xaee2ff, 0, 110),
        );
        cab.position.set(len * 0.04 * ZOOM, 0, (bodyH + 8) * ZOOM);
        cab.castShadow = true;
        g.add(cab);

        // Front radiator grille & chrome bumpers
        this.box(g, 2.5, 15, 6, 0x2f3542, -len / 2 - 0.2, 0, 9, 0, 80);
        this.bumpers(g, len, 27, 7, 7, 0x2f3542);
        this.headlights(g, len, 10, 10, true);
        this.taillights(g, len, 10, 10);
        this.sideMirrors(g, -len * 0.15, 14, 17, 0x1e2430);

        // Sporty alloy wheels with metallic rims
        this.wheel(g, -len * 0.3, 7, 7, 12, 0xdfe4ea);
        this.wheel(g, len * 0.3, 7, 7, 12, 0xdfe4ea);
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
