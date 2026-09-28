/**
 * §9 — High-Fidelity Stylized Character Construction & Animation Engine.
 * Builds all 20 distinct playable characters:
 * 1. Classic Chicken
 * 2. Fire Chicken (flame crest & fiery wings)
 * 3. Ice Chicken (crystalline plumage & icy crown)
 * 4. Jungle Chicken (tropical plumage & floral crest)
 * 5. Desert Chicken (sand plumage & nomad headband)
 * 6. Neon Chicken (luminescent cyber visor & photon wings)
 * 7. Pirate Chicken (tricorn hat, eye patch & gold earring)
 * 8. Astronaut Chicken (bubble space helmet & oxygen pack)
 * 9. Wizard Chicken (pointed star wizard hat & mystic beard)
 * 10. Robot Chicken (antenna beacon & mechanical chassis)
 * 11. Duck (orange bill, flippers & buoyant posture)
 * 12. Frog (curved legs, big bulging eyes & throat sac)
 * 13. Cat (pointed ears, whiskers & animated 3-segment tail)
 * 14. Fox (bushy multi-joint tail, white muzzle & dark paws)
 * 15. Penguin (black/white tuxedo body, flippers & bright feet)
 * 16. Rabbit (long floppy animated ears, buck teeth & fluffy puff tail)
 * 17. Robot (articulated arms, chest console & pulsing scanner head)
 * 18. Turtle (domed patterned carapace shell, rounded snout & stubby legs)
 * 19. Alien (sleek neon dome head, large obsidian eyes & psychic antenna)
 * 20. Dragon (swept horns, dorsal ridges & broad flapping wings)
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import { characterById } from '../config/characters.config';
import type { AssetManager } from '../assets/AssetManager';
import type { IdleKind } from './Character';

const ZOOM = GAME_CONFIG.zoom;

export class MeshBuilder {
  constructor(private readonly assets: AssetManager) {}

  cmat(color: number, emissive = 0, shininess = 30): THREE.MeshPhongMaterial {
    return this.assets.phong(`char:${color}:${emissive}:${shininess}`, color, {
      emissive,
      shininess,
      flat: true,
    });
  }

  part(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    emissive = 0,
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.box(`char:${w}x${h}x${d}`, w * ZOOM, h * ZOOM, d * ZOOM),
      this.cmat(color, emissive),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  rpart(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    radius = 1.5,
    emissive = 0,
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.roundedBox(w * ZOOM, h * ZOOM, d * ZOOM, radius * ZOOM, 2),
      this.cmat(color, emissive),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  ball(
    parent: THREE.Group,
    r: number,
    color: number,
    x: number,
    y: number,
    z: number,
    emissive = 0,
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.sphere(`char-ball:${r}`, r * ZOOM, 10, 8),
      this.cmat(color, emissive),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  spike(
    parent: THREE.Group,
    r: number,
    h: number,
    color: number,
    x: number,
    y: number,
    z: number,
    emissive = 0,
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.cylinder(`char-spike:${r}x${h}`, 0.01, r * ZOOM, h * ZOOM, 6),
      this.cmat(color, emissive),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.rotation.y = Math.PI / 4;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  saveBase<T extends THREE.Object3D>(m: T): T {
    try {
      m.userData.base = { p: m.position.clone(), r: m.rotation.clone() };
    } catch { /* ignore */ }
    return m;
  }

  addEyes(parent: THREE.Group, x: number, y: number, z: number, s = 1): void {
    // Sclera
    this.part(parent, 2.6 * s, 2 * s, 4 * s, 0xffffff, -x, y, z);
    this.part(parent, 2.6 * s, 2 * s, 4 * s, 0xffffff, x, y, z);
    // Pupils
    this.part(parent, 1.4 * s, 1 * s, 2 * s, 0x111622, -x, y + 1 * s, z);
    this.part(parent, 1.4 * s, 1 * s, 2 * s, 0x111622, x, y + 1 * s, z);
  }

  addLegsFeet(parent: THREE.Group, legColor: number, footColor: number, legSpread: number, footSize: number): void {
    this.part(parent, 2.2, 2.2, 6, legColor, -legSpread, 0, 3);
    this.part(parent, 2.2, 2.2, 6, legColor, legSpread, 0, 3);
    this.part(parent, footSize, footSize + 1.8, 2, footColor, -legSpread, 0.6, 1);
    this.part(parent, footSize, footSize + 1.8, 2, footColor, legSpread, 0.6, 1);
  }
}

export class CharacterFactory {
  private readonly mb: MeshBuilder;

  constructor(assets: AssetManager) {
    this.mb = new MeshBuilder(assets);
  }

  create(id: string): THREE.Group {
    const spec = characterById(id);
    const g = new THREE.Group();
    const mb = this.mb;

    switch (spec.id) {
      // 1-10: Chickens
      case 'chicken': this.buildChicken(g, spec.body, spec.beak, spec.accent); break;
      case 'fire_chicken': this.buildFireChicken(g, spec.body, spec.beak, spec.accent); break;
      case 'ice_chicken': this.buildIceChicken(g, spec.body, spec.beak, spec.accent); break;
      case 'jungle_chicken': this.buildJungleChicken(g, spec.body, spec.beak, spec.accent); break;
      case 'desert_chicken': this.buildDesertChicken(g, spec.body, spec.beak, spec.accent); break;
      case 'neon_chicken': this.buildNeonChicken(g, spec.body, spec.beak, spec.accent); break;
      case 'pirate_chicken': this.buildPirateChicken(g, spec.body, spec.beak, spec.accent); break;
      case 'astro_chicken': this.buildAstroChicken(g, spec.body, spec.beak, spec.accent); break;
      case 'wizard_chicken': this.buildWizardChicken(g, spec.body, spec.beak, spec.accent); break;
      case 'robot_chicken': this.buildRobotChicken(g, spec.body, spec.beak, spec.accent); break;

      // 11-20: Unique Animal & Hero Roster
      case 'duck': this.buildDuck(g, spec.body, spec.beak); break;
      case 'frog': this.buildFrog(g, spec.body, spec.accent); break;
      case 'cat': this.buildCat(g, spec.body, spec.accent); break;
      case 'fox': this.buildFox(g, spec.body); break;
      case 'penguin': this.buildPenguin(g, spec.body, spec.beak); break;
      case 'rabbit': this.buildRabbit(g, spec.body, spec.accent); break;
      case 'robot': this.buildRobot(g, spec.body); break;
      case 'turtle': this.buildTurtle(g, spec.body, spec.accent); break;
      case 'alien': this.buildAlien(g, spec.body, spec.accent); break;
      case 'dragon': this.buildDragon(g, spec.body, spec.accent); break;
      default: this.buildChicken(g, spec.body, spec.beak, spec.accent); break;
    }

    g.userData.charId = spec.id;
    return g;
  }

  idleOf(group: THREE.Group): IdleKind {
    return (group.userData.idle as IdleKind) ?? 'bob';
  }

  // 1. CLASSIC CHICKEN
  private buildChicken(g: THREE.Group, white: number, beak: number, accent: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0xe08a00, 0xff9f1c, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, white, 0, 0, 12);
    g.userData.body = body;
    mb.part(g, 10, 6, 12, 0xf4f4f4, 0, 5, 13);
    const wl = mb.part(g, 3, 10, 9, 0xe4e4e4, -9, -0.5, 13);
    const wr = mb.part(g, 3, 10, 9, 0xe4e4e4, 9, -0.5, 13);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const tail = mb.part(g, 6, 3, 7, white, 0, -8, 17);
    tail.rotation.x = -0.5;
    const head = mb.part(g, 12, 11, 10, white, 0, 1, 25);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 5, 4, 4, beak, 0, 7.5, 23);
    mb.part(g, 2.5, 2.5, 3.5, accent, 0, -1, 31);
    mb.part(g, 2.5, 2.5, 4.2, accent, 0, 1.6, 31.2);
    mb.part(g, 2.5, 2.5, 3.5, accent, 0, 4.2, 31);
    mb.addEyes(g, 4, 6, 26, 1);
    g.userData.idle = 'bob';
  }

  // 2. FIRE CHICKEN
  private buildFireChicken(g: THREE.Group, red: number, beak: number, gold: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0xb82601, 0xd4380d, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, red, 0, 0, 12);
    g.userData.body = body;
    mb.part(g, 10, 6, 12, 0xff7875, 0, 5, 13);
    const wl = mb.part(g, 3.2, 10, 9, gold, -9, -0.5, 13, 0x664400);
    const wr = mb.part(g, 3.2, 10, 9, gold, 9, -0.5, 13, 0x664400);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    // Flame Crest
    const head = mb.part(g, 12, 11, 10, red, 0, 1, 25);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 5, 4, 4, beak, 0, 7.5, 23);
    mb.spike(g, 2.5, 7, gold, 0, 1.5, 33, 0xffa000);
    mb.spike(g, 2.0, 5, 0xff4d4f, 0, 4.5, 32, 0xff2200);
    mb.addEyes(g, 4, 6, 26, 1);
    g.userData.idle = 'bob';
  }

  // 3. ICE CHICKEN
  private buildIceChicken(g: THREE.Group, ice: number, beak: number, cyan: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x13c2c2, 0x08979c, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, ice, 0, 0, 12, 0x003344);
    g.userData.body = body;
    const wl = mb.part(g, 3, 10, 9, cyan, -9, -0.5, 13, 0x005577);
    const wr = mb.part(g, 3, 10, 9, cyan, 9, -0.5, 13, 0x005577);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const head = mb.part(g, 12, 11, 10, ice, 0, 1, 25, 0x002233);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 5, 4, 4, beak, 0, 7.5, 23);
    mb.spike(g, 2.2, 6, cyan, 0, 1.5, 32.5, 0x0099cc);
    mb.addEyes(g, 4, 6, 26, 1);
    g.userData.idle = 'bob';
  }

  // 4. JUNGLE CHICKEN
  private buildJungleChicken(g: THREE.Group, green: number, beak: number, yellow: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x5b8c00, 0x7cb305, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, green, 0, 0, 12);
    g.userData.body = body;
    mb.part(g, 10, 6, 12, 0x95de64, 0, 5, 13);
    const wl = mb.part(g, 3, 10, 9, yellow, -9, -0.5, 13);
    const wr = mb.part(g, 3, 10, 9, yellow, 9, -0.5, 13);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const head = mb.part(g, 12, 11, 10, green, 0, 1, 25);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 5, 4, 4, beak, 0, 7.5, 23);
    mb.part(g, 3, 3, 4, 0xff4d4f, 0, 1.5, 31.5);
    mb.addEyes(g, 4, 6, 26, 1);
    g.userData.idle = 'bob';
  }

  // 5. DESERT CHICKEN
  private buildDesertChicken(g: THREE.Group, sand: number, beak: number, orange: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0xd46b08, 0xd46b08, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, sand, 0, 0, 12);
    g.userData.body = body;
    const wl = mb.part(g, 3, 10, 9, orange, -9, -0.5, 13);
    const wr = mb.part(g, 3, 10, 9, orange, 9, -0.5, 13);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const head = mb.part(g, 12, 11, 10, sand, 0, 1, 25);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 5, 4, 4, beak, 0, 7.5, 23);
    // Headband
    mb.part(g, 13, 12, 2.5, 0x1890ff, 0, 1, 28);
    mb.addEyes(g, 4, 6, 26, 1);
    g.userData.idle = 'bob';
  }

  // 6. NEON CHICKEN
  private buildNeonChicken(g: THREE.Group, dark: number, cyan: number, magenta: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x111622, cyan, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, dark, 0, 0, 12);
    g.userData.body = body;
    const wl = mb.part(g, 3, 10, 9, magenta, -9, -0.5, 13, 0x660044);
    const wr = mb.part(g, 3, 10, 9, magenta, 9, -0.5, 13, 0x660044);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const head = mb.part(g, 12, 11, 10, dark, 0, 1, 25);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 5, 4, 4, cyan, 0, 7.5, 23, 0x004466);
    // Neon Cyber Visor
    mb.part(g, 13, 4, 3, cyan, 0, 6.2, 26, 0x00ffff);
    g.userData.idle = 'bob';
  }

  // 7. PIRATE CHICKEN
  private buildPirateChicken(g: THREE.Group, dark: number, beak: number, red: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x222222, 0x111111, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, dark, 0, 0, 12);
    g.userData.body = body;
    const wl = mb.part(g, 3, 10, 9, 0x434343, -9, -0.5, 13);
    const wr = mb.part(g, 3, 10, 9, 0x434343, 9, -0.5, 13);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const head = mb.part(g, 12, 11, 10, 0xffffff, 0, 1, 25);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 5, 4, 4, beak, 0, 7.5, 23);
    // Eye Patch on right eye
    mb.part(g, 3.5, 2.5, 4, 0x111111, 4, 6.2, 26);
    // Single normal eye on left
    mb.part(g, 2.6, 2, 4, 0xffffff, -4, 6, 26);
    mb.part(g, 1.4, 1, 2, 0x111622, -4, 7, 26);
    // Pirate Tricorn Hat
    mb.part(g, 18, 16, 3, 0x111111, 0, 1, 31);
    mb.part(g, 12, 10, 4, red, 0, 1, 34);
    // Gold Earring
    mb.ball(g, 1.2, 0xffd700, -6.5, 1, 24, 0x664400);
    g.userData.idle = 'bob';
  }

  // 8. ASTRONAUT CHICKEN
  private buildAstroChicken(g: THREE.Group, white: number, dark: number, blue: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x8c8c8c, 0x595959, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, white, 0, 0, 12);
    g.userData.body = body;
    // Oxygen backpack
    mb.part(g, 10, 6, 12, 0xd9d9d9, 0, -8, 13);
    const wl = mb.part(g, 3, 10, 9, white, -9, -0.5, 13);
    const wr = mb.part(g, 3, 10, 9, white, 9, -0.5, 13);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const head = mb.part(g, 12, 11, 10, white, 0, 1, 25);
    g.userData.head = mb.saveBase(head);
    // Gold reflective bubble visor
    mb.part(g, 11, 5, 6, 0xffc53d, 0, 6, 25, 0x997700);
    mb.part(g, 4, 3, 3, dark, 0, 7.8, 23);
    g.userData.idle = 'bob';
  }

  // 9. WIZARD CHICKEN
  private buildWizardChicken(g: THREE.Group, purple: number, beak: number, gold: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x531dab, 0x391085, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, purple, 0, 0, 12);
    g.userData.body = body;
    const wl = mb.part(g, 3, 10, 9, purple, -9, -0.5, 13);
    const wr = mb.part(g, 3, 10, 9, purple, 9, -0.5, 13);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const head = mb.part(g, 12, 11, 10, 0xffffff, 0, 1, 25);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 5, 4, 4, beak, 0, 7.5, 23);
    mb.addEyes(g, 4, 6, 26, 1);
    // Wizard Beard
    mb.part(g, 8, 4, 6, 0xffffff, 0, 6, 20);
    // Pointed Wizard Hat
    mb.part(g, 18, 16, 2.5, purple, 0, 1, 31);
    mb.spike(g, 5, 14, purple, 0, 1, 40);
    mb.ball(g, 1.6, gold, 0, 1, 48, 0x886600);
    g.userData.idle = 'bob';
  }

  // 10. ROBOT CHICKEN
  private buildRobotChicken(g: THREE.Group, steel: number, dark: number, cyan: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x434343, 0x262626, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, steel, 0, 0, 12);
    g.userData.body = body;
    const wl = mb.part(g, 3, 10, 9, 0x595959, -9, -0.5, 13);
    const wr = mb.part(g, 3, 10, 9, 0x595959, 9, -0.5, 13);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const head = mb.part(g, 12, 11, 10, steel, 0, 1, 25);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 5, 4, 4, dark, 0, 7.5, 23);
    // Glowing cyan optical strip
    mb.part(g, 10, 2, 2.5, cyan, 0, 6.2, 26, 0x00ffff);
    // Antenna
    mb.part(g, 1.5, 1.5, 6, 0x595959, 0, 1, 33);
    mb.ball(g, 1.8, cyan, 0, 1, 37, 0x00ffff);
    g.userData.idle = 'mech';
  }

  // 11. DUCK
  private buildDuck(g: THREE.Group, yellow: number, beak: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0xe08a00, 0xff7b1c, 4, 5.5);
    const body = mb.part(g, 19, 15, 11, yellow, 0, 0, 10);
    g.userData.body = body;
    const wl = mb.part(g, 3, 11, 7, 0xe8b62a, -10.5, -0.5, 10);
    const wr = mb.part(g, 3, 11, 7, 0xe8b62a, 10.5, -0.5, 10);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const tail = mb.part(g, 5, 4, 5, 0xe8b62a, 0, -8.5, 13);
    tail.rotation.x = -0.7;
    const head = mb.part(g, 12, 12, 9, yellow, 0, 1, 21);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 10, 6, 3, beak, 0, 7.5, 19.5);
    mb.addEyes(g, 4, 6.5, 22, 1);
    g.userData.idle = 'bob';
  }

  // 12. FROG
  private buildFrog(g: THREE.Group, green: number, dark: number): void {
    const mb = this.mb;
    const bl = mb.part(g, 5, 10, 6, dark, -9.5, -1, 6);
    bl.rotation.z = 0.35;
    const br = mb.part(g, 5, 10, 6, dark, 9.5, -1, 6);
    br.rotation.z = -0.35;
    mb.part(g, 4, 5, 2.5, dark, -5, 5, 1.2);
    mb.part(g, 4, 5, 2.5, dark, 5, 5, 1.2);
    const body = mb.ball(g, 9, green, 0, 0, 9);
    body.scale.set(1, 1.15, 0.95);
    g.userData.body = body;
    mb.ball(g, 6.5, 0xcde8b0, 0, 3.5, 7);
    const head = mb.ball(g, 7, green, 0, 1, 18);
    g.userData.head = mb.saveBase(head);
    mb.ball(g, 2.8, 0xffffff, -4.2, 1, 24.5);
    mb.ball(g, 2.8, 0xffffff, 4.2, 1, 24.5);
    mb.ball(g, 1.3, 0x1a1a1a, -4.2, 3, 24.8);
    mb.ball(g, 1.3, 0x1a1a1a, 4.2, 3, 24.8);
    mb.part(g, 11, 1, 1.6, dark, 0, 7, 15.5);
    g.userData.idle = 'breathe';
  }

  // 13. CAT
  private buildCat(g: THREE.Group, gray: number, accent: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x5b6570, 0x5b6570, 4, 4);
    const body = mb.part(g, 14, 13, 13, gray, 0, 0, 11);
    g.userData.body = body;
    mb.part(g, 9, 5, 10, 0xc3cad2, 0, 4.5, 10);
    const head = mb.part(g, 12, 11, 10, gray, 0, 1, 23);
    g.userData.head = mb.saveBase(head);
    mb.spike(g, 3.6, 7, gray, -4.5, 0.5, 30.5);
    mb.spike(g, 3.6, 7, gray, 4.5, 0.5, 30.5);
    mb.spike(g, 1.8, 3.5, 0xffb3c1, -4.5, 1, 30);
    mb.spike(g, 1.8, 3.5, 0xffb3c1, 4.5, 1, 30);
    mb.part(g, 2.4, 1.6, 1.6, 0xffb3c1, 0, 6.2, 22);
    mb.part(g, 6, 0.6, 0.6, 0xffffff, -7, 5.5, 22);
    mb.part(g, 6, 0.6, 0.6, 0xffffff, 7, 5.5, 22);
    mb.addEyes(g, 4, 6, 24, 1);
    const s1 = mb.part(g, 3.2, 3.2, 7, accent, 0, -8, 9);
    s1.rotation.x = -0.9;
    const s2 = mb.part(g, 3, 3, 6.5, accent, 0, -11.5, 13.5);
    s2.rotation.x = -0.5;
    const s3 = mb.part(g, 2.8, 2.8, 6, 0xc3cad2, 0, -13.5, 19);
    s3.rotation.x = -0.1;
    g.userData.tailSegs = [mb.saveBase(s1), mb.saveBase(s2), mb.saveBase(s3)];
    g.userData.idle = 'tail';
  }

  // 14. FOX
  private buildFox(g: THREE.Group, orange: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x5a2d12, 0x3c1e0c, 4, 4);
    const body = mb.part(g, 14, 13, 12, orange, 0, 0, 11);
    g.userData.body = body;
    mb.part(g, 8, 5, 10, 0xfff3e0, 0, 4.5, 10);
    const head = mb.part(g, 11, 10, 9, orange, 0, 1, 22);
    g.userData.head = mb.saveBase(head);
    mb.spike(g, 3.2, 9, orange, -4, 0.5, 29.5);
    mb.spike(g, 3.2, 9, orange, 4, 0.5, 29.5);
    mb.part(g, 6, 5, 4.5, 0xfff3e0, 0, 6.5, 20);
    mb.part(g, 2.2, 1.5, 1.5, 0x1a1a1a, 0, 9.2, 20.5);
    mb.addEyes(g, 3.6, 5.5, 23.5, 0.95);
    const s1 = mb.part(g, 5, 5, 9, orange, 0, -8.5, 8);
    s1.rotation.x = -1.0;
    const s2 = mb.part(g, 4.6, 4.6, 8.5, orange, 0, -12.5, 13);
    s2.rotation.x = -0.55;
    const s3 = mb.part(g, 4.2, 4.2, 8, 0xfff3e0, 0, -14, 19.5);
    s3.rotation.x = -0.15;
    g.userData.tailSegs = [mb.saveBase(s1), mb.saveBase(s2), mb.saveBase(s3)];
    g.userData.idle = 'tail';
  }

  // 15. PENGUIN
  private buildPenguin(g: THREE.Group, dark: number, beak: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0xff9f1c, 0xff7b1c, 4, 5.5);
    // Penguin Body (tuxedo)
    const body = mb.part(g, 16, 14, 16, dark, 0, 0, 13);
    g.userData.body = body;
    // White Belly
    mb.part(g, 11, 4, 13, 0xffffff, 0, 5.5, 12);
    // Flippers
    const wl = mb.part(g, 2.5, 8, 12, dark, -9.5, 0, 13);
    const wr = mb.part(g, 2.5, 8, 12, dark, 9.5, 0, 13);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const head = mb.part(g, 13, 11, 10, dark, 0, 0.5, 26);
    g.userData.head = mb.saveBase(head);
    // Beak
    mb.part(g, 5, 5, 3.5, beak, 0, 6.8, 24);
    mb.addEyes(g, 4, 5.5, 26, 0.95);
    g.userData.idle = 'bob';
  }

  // 16. RABBIT
  private buildRabbit(g: THREE.Group, white: number, pink: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0xf0f0f0, 0xffb8b8, 4, 5);
    const body = mb.part(g, 15, 14, 13, white, 0, 0, 11);
    g.userData.body = body;
    // Fluffy tail
    mb.ball(g, 3, white, 0, -8, 10);
    const head = mb.part(g, 12, 11, 10, white, 0, 1, 23);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 2.5, 2, 2, pink, 0, 6.5, 21.5);
    mb.addEyes(g, 4, 6, 24, 1);
    // Long ears
    const eL = mb.part(g, 3, 3, 14, white, -4, 0.5, 34);
    const eR = mb.part(g, 3, 3, 14, white, 4, 0.5, 34);
    mb.part(g, 1.8, 1.8, 10, pink, -4, 1.2, 34);
    mb.part(g, 1.8, 1.8, 10, pink, 4, 1.2, 34);
    g.userData.ears = [mb.saveBase(eL), mb.saveBase(eR)];
    g.userData.idle = 'ears';
  }

  // 17. ROBOT
  private buildRobot(g: THREE.Group, slate: number): void {
    const mb = this.mb;
    mb.part(g, 6, 8, 3, 0x39424f, -4, 0, 1.5);
    mb.part(g, 6, 8, 3, 0x39424f, 4, 0, 1.5);
    mb.part(g, 4, 4, 9, 0x4a5563, -4, 0, 7);
    mb.part(g, 4, 4, 9, 0x4a5563, 4, 0, 7);
    const body = mb.part(g, 16, 12, 16, slate, 0, 0, 14);
    g.userData.body = body;
    mb.part(g, 10, 1, 8, 0x39424f, 0, 6.2, 13);
    mb.part(g, 6, 1.5, 4, slate, 0, 6.5, 17, 0x0a5566);
    const aL = mb.part(g, 3.5, 3.5, 12, 0x4a5563, -10, 0, 14);
    const aR = mb.part(g, 3.5, 3.5, 12, 0x4a5563, 10, 0, 14);
    mb.part(g, 4, 4, 3, 0x39424f, -10, 0, 7.5);
    mb.part(g, 4, 4, 3, 0x39424f, 10, 0, 7.5);
    g.userData.arms = [mb.saveBase(aL), mb.saveBase(aR)];
    const head = mb.part(g, 12, 10, 9, 0x4a5563, 0, 0.5, 27.5);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 9, 1.5, 4.5, slate, 0, 5.2, 28, 0x0a5566);
    mb.part(g, 1.5, 1.5, 7, slate, 0, 0, 34);
    const tipMat = new THREE.MeshPhongMaterial({ color: 0x38e1ff, emissive: 0x14424d, flatShading: true });
    const tip = new THREE.Mesh(new THREE.SphereGeometry(2 * ZOOM, 7, 6), tipMat);
    tip.position.set(0, 0, 38 * ZOOM);
    g.add(tip);
    g.userData.tipMat = tipMat;
    g.userData.idle = 'mech';
  }

  // 18. TURTLE
  private buildTurtle(g: THREE.Group, green: number, purple: number): void {
    const mb = this.mb;
    // 4 stubby flipper legs
    mb.part(g, 5, 5, 3, green, -7, 5, 2);
    mb.part(g, 5, 5, 3, green, 7, 5, 2);
    mb.part(g, 5, 5, 3, green, -7, -5, 2);
    mb.part(g, 5, 5, 3, green, 7, -5, 2);
    // Domed Carapace Shell
    const shell = mb.ball(g, 9, purple, 0, 0, 8);
    shell.scale.set(1.1, 1.25, 0.7);
    g.userData.body = shell;
    // Head & Neck
    const head = mb.part(g, 8, 9, 6, green, 0, 8.5, 10);
    g.userData.head = mb.saveBase(head);
    mb.addEyes(g, 3, 11.5, 11, 0.85);
    g.userData.idle = 'bob';
  }

  // 19. ALIEN
  private buildAlien(g: THREE.Group, purple: number, cyan: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x4a148c, 0x311b92, 3.5, 4);
    const body = mb.part(g, 13, 11, 14, purple, 0, 0, 11);
    g.userData.body = body;
    // Large domed alien head
    const head = mb.ball(g, 8, purple, 0, 1, 23);
    head.scale.set(1.15, 1.2, 1);
    g.userData.head = mb.saveBase(head);
    // Large slanted black eyes
    mb.ball(g, 2.8, 0x111111, -4.5, 5.5, 23, 0x002233);
    mb.ball(g, 2.8, 0x111111, 4.5, 5.5, 23, 0x002233);
    // Glowing forehead psychic core
    mb.ball(g, 1.8, cyan, 0, 6, 27, 0x00ffff);
    g.userData.idle = 'breathe';
  }

  // 20. DRAGON
  private buildDragon(g: THREE.Group, red: number, yellow: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x8a1c1c, 0xf1c40f, 4, 4.5);
    const body = mb.part(g, 16, 14, 14, red, 0, 0, 12);
    g.userData.body = body;
    mb.part(g, 10, 6, 10, yellow, 0, 5, 12);
    const head = mb.part(g, 12, 11, 10, red, 0, 1, 24);
    g.userData.head = mb.saveBase(head);
    mb.spike(g, 2.5, 6, yellow, -4, 0, 31);
    mb.spike(g, 2.5, 6, yellow, 4, 0, 31);
    mb.addEyes(g, 4, 6, 25, 1);
    // Wings
    const wL = mb.part(g, 10, 2, 8, yellow, -11, -2, 16);
    wL.rotation.z = 0.4;
    const wR = mb.part(g, 10, 2, 8, yellow, 11, -2, 16);
    wR.rotation.z = -0.4;
    g.userData.wings = [mb.saveBase(wL), mb.saveBase(wR)];
    g.userData.idle = 'bob';
  }

  /** Idle animation shared by gameplay + menu previews. */
  animate(group: THREE.Group, tMs: number): void {
    const u = group.userData as Record<string, any>;
    if (!u) return;
    const s = tMs / 1000;
    const idle = (u.idle as IdleKind) ?? 'bob';
    const head = u.head as (THREE.Object3D & { userData: { base?: { p: THREE.Vector3; r: THREE.Euler } } }) | undefined;

    if (idle === 'tail' && Array.isArray(u.tailSegs)) {
      (u.tailSegs as THREE.Object3D[]).forEach((m, i) => {
        const base = (m.userData.base as { r: THREE.Euler } | undefined)?.r;
        if (base) m.rotation.x = base.x + Math.sin(s * 2.2 + i * 0.7) * 0.16;
      });
      const bp = head?.userData.base?.p;
      if (head && bp) head.position.z = bp.z + Math.sin(s * 1.6) * 0.7 * ZOOM;
    } else if (idle === 'ears' && Array.isArray(u.ears)) {
      (u.ears as THREE.Object3D[]).forEach((m, i) => {
        const base = (m.userData.base as { r: THREE.Euler } | undefined)?.r;
        if (base) m.rotation.x = base.x + Math.sin(s * 2.8 + i * 1.2) * 0.14;
      });
      const bp = head?.userData.base?.p;
      if (head && bp) head.position.z = bp.z + Math.sin(s * 2.5) * 0.8 * ZOOM;
    } else if (idle === 'breathe') {
      const bp = head?.userData.base?.p;
      if (head && bp) head.position.z = bp.z + Math.sin(s * 2.2) * 0.9 * ZOOM;
    } else if (idle === 'mech') {
      const br = head?.userData.base?.r;
      if (head && br) head.rotation.y = Math.sin(s * 1.1) * 0.16;
      if (Array.isArray(u.arms)) {
        (u.arms as THREE.Object3D[]).forEach((m, i) => {
          const base = (m.userData.base as { r: THREE.Euler } | undefined)?.r;
          if (base) m.rotation.x = Math.sin(s * 1.4 + i * 2.1) * 0.1;
        });
      }
      const tipMat = u.tipMat as THREE.MeshPhongMaterial | undefined;
      if (tipMat?.emissive) {
        try {
          tipMat.emissive.setHex((Math.floor(tMs / 450) % 2) ? 0x38e1ff : 0x14424d);
        } catch { /* ignore */ }
      }
    } else {
      const bp = head?.userData.base?.p;
      if (head && bp) head.position.z = bp.z + Math.sin(s * 3.1) * 0.8 * ZOOM;
      if (Array.isArray(u.wings)) {
        (u.wings as THREE.Object3D[]).forEach((m, i) => {
          const base = (m.userData.base as { r: THREE.Euler } | undefined)?.r;
          if (base) m.rotation.x = Math.sin(s * 3.1 + i * Math.PI) * 0.08;
        });
      }
    }
  }
}
