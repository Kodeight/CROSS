/**
 * §9 — High-Fidelity Canonical CROSS! Chicken & 6 Reference-Matched 3D Heroes.
 *
 * Implements:
 * 1. CLASSIC — Canonical CROSS! chicken mascot (completely untouched).
 * 2. ROCKET — Aviator flight goggles, red flight suit, rocket booster backpack.
 * 3. SHADOW — Jet-black plumage, gold-rimmed sunglasses, black biker leather jacket.
 * 4. GOLDIE — All-metallic gold chicken, royal jeweled crown, dark sunglasses, gold chain.
 * 5. NINJA — Black shinobi stealth suit, red headband with flowing ribbons, cowl, red sash.
 * 6. COWBOY — Brown 10-gallon cowboy hat, red neck bandana, brown leather sheriff vest & star.
 * 7. SAMURAI — Red lacquered kabuto helmet with golden horns/crest, tiered sode shoulder armor.
 *
 * Strict hierarchical bone structure:
 * ChickenRoot
 *  ├── legsRoot (feet & leg posts)
 *  ├── body (body sphere, wings, tail, vests/backpacks/armor/belts)
 *  └── head (head sphere, eyes, beak, wattle, comb, helmets/hats/glasses/goggles)
 *
 * All accessories are children of their respective parent nodes, ensuring 100%
 * lockstep translation, rotation, breathing bob, squashing, and hopping!
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import { characterById, type CharacterConfig } from '../config/characters.config';
import type { AssetManager } from '../assets/AssetManager';
import type { IdleKind } from './Character';

const ZOOM = GAME_CONFIG.zoom;

export class CharacterFactory {
  constructor(private readonly assets: AssetManager) {}

  private pmat(color: number, emissive = 0, shininess = 40): THREE.MeshPhongMaterial {
    return this.assets.phong(`chk:${color}:${emissive}:${shininess}`, color, {
      emissive,
      shininess,
    });
  }

  private smat(color: number, metalness = 0.2, roughness = 0.35, emissive = 0): THREE.MeshStandardMaterial {
    return this.assets.standard(`chk-std:${color}:${metalness}:${roughness}:${emissive}`, color, {
      metalness,
      roughness,
      emissive,
    });
  }

  create(id: string): THREE.Group {
    const spec = characterById(id);
    const g = new THREE.Group();
    g.userData.charId = spec.id;

    // Build canonical Chicken with active skin
    this.buildChickenWithSkin(g, spec.skinType, spec);

    return g;
  }

  idleOf(group: THREE.Group): IdleKind {
    return (group.userData.idle as IdleKind) ?? 'bob';
  }

  /**
   * Constructs the canonical CROSS! Chicken with strict hierarchical parenting.
   * CLASSIC remains 100% untouched.
   */
  private buildChickenWithSkin(
    g: THREE.Group,
    skin: string,
    spec: CharacterConfig,
  ): void {
    const isGoldie = skin === 'goldie';
    const isShadow = skin === 'shadow';
    const isNinja = skin === 'ninja';
    const isRocket = skin === 'rocket';

    const bodyColor = spec.body ?? 0xffffff;
    const beakColor = spec.beak ?? 0xff9f1a;
    const combColor = spec.comb ?? 0xff2e44;
    const feetColor = spec.feet ?? 0xff9f1a;

    // Dedicated material assignment
    let bodyMat: THREE.Material;
    if (isGoldie) {
      bodyMat = this.smat(0xfbbf24, 0.88, 0.22, 0x452200);
    } else if (isShadow || isNinja) {
      bodyMat = this.pmat(bodyColor, 0x050608, 30);
    } else if (isRocket) {
      bodyMat = this.pmat(bodyColor, 0, 40);
    } else {
      // Classic & white plumage characters
      bodyMat = this.pmat(bodyColor, 0, 45);
    }

    // ==========================================
    // 1. LEGS & FEET (Child of Root)
    // ==========================================
    const legsRoot = new THREE.Group();
    legsRoot.name = 'chk-legs';
    const feetMat = isGoldie
      ? this.smat(feetColor, 0.85, 0.25)
      : this.pmat(feetColor, 0, 40);

    for (const side of [-1, 1]) {
      // Leg post
      const leg = new THREE.Mesh(
        this.assets.cylinder('chk-leg', 1.1 * ZOOM, 1.1 * ZOOM, 4.5 * ZOOM, 8),
        feetMat,
      );
      leg.position.set(side * 3.8 * ZOOM, 0, 3.2 * ZOOM);
      leg.castShadow = true;
      legsRoot.add(leg);

      // Foot pad
      const foot = new THREE.Mesh(
        this.assets.roundedBox(3.4 * ZOOM, 5.2 * ZOOM, 1.2 * ZOOM, 0.6 * ZOOM, 2),
        feetMat,
      );
      foot.position.set(side * 3.8 * ZOOM, 1.2 * ZOOM, 0.6 * ZOOM);
      foot.castShadow = true;
      foot.receiveShadow = true;
      legsRoot.add(foot);
    }
    g.add(legsRoot);
    g.userData.legs = legsRoot;

    // ==========================================
    // 2. BODY NODE (Child of Root)
    // ==========================================
    const body = new THREE.Group();
    body.name = 'chk-body';
    body.position.set(0, 0, 11 * ZOOM);

    const bodyGeo = this.assets.sphere('chk-body-sphere', 8.5 * ZOOM, 16, 14);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.scale.set(1.0, 1.08, 0.96);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    body.add(bodyMesh);

    // Flappable rounded side wings
    const wingMat = isGoldie
      ? this.smat(0xfbbf24, 0.88, 0.22, 0x452200)
      : this.pmat(bodyColor, 0, 40);

    const wingGeo = this.assets.sphere('chk-wing', 4.5 * ZOOM, 10, 8);
    const wings: THREE.Mesh[] = [];

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * 8.2 * ZOOM, 0, 1.0 * ZOOM);
      wing.scale.set(0.45, 1.25, 0.85);
      wing.rotation.y = side * 0.15;
      wing.castShadow = true;
      wing.userData.base = { p: wing.position.clone(), r: wing.rotation.clone() };
      body.add(wing);
      wings.push(wing);
    }
    g.userData.wings = wings;

    // Tail puff
    const tail = new THREE.Mesh(
      this.assets.cylinder('chk-tail', 1.0 * ZOOM, 3.2 * ZOOM, 4.0 * ZOOM, 8),
      wingMat,
    );
    tail.rotation.x = -Math.PI / 3;
    tail.position.set(0, -7.5 * ZOOM, 2.0 * ZOOM);
    tail.scale.set(1.4, 0.8, 1.0);
    tail.castShadow = true;
    tail.userData.base = { p: tail.position.clone(), r: tail.rotation.clone() };
    body.add(tail);
    g.userData.tail = tail;

    g.add(body);
    g.userData.body = body;

    // ==========================================
    // 3. HEAD NODE (Child of Root)
    // ==========================================
    const head = new THREE.Group();
    head.name = 'chk-head';
    head.position.set(0, 2.2 * ZOOM, 17.5 * ZOOM);
    head.userData.base = { p: head.position.clone(), r: head.rotation.clone() };

    const headGeo = this.assets.sphere('chk-head-sphere', 7.2 * ZOOM, 16, 14);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.scale.set(1.0, 0.98, 0.95);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    head.add(headMesh);

    // Expressive cartoon eyes
    const eyeMat = this.pmat(0x11141a, 0, 90);
    const shineMat = this.pmat(0xffffff, 0x888888, 100);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        this.assets.sphere('chk-eye', 1.65 * ZOOM, 10, 8),
        eyeMat,
      );
      eye.position.set(side * 3.6 * ZOOM, 3.6 * ZOOM, 0.7 * ZOOM);
      eye.scale.set(1.0, 0.7, 1.15);
      head.add(eye);

      // Specular shine dot
      const shine = new THREE.Mesh(
        this.assets.sphere('chk-eye-shine', 0.55 * ZOOM, 8, 6),
        shineMat,
      );
      shine.position.set(side * 3.8 * ZOOM + 0.3 * ZOOM, 4.2 * ZOOM, 1.3 * ZOOM);
      head.add(shine);
    }

    // Cute rounded beak
    const beakMat = isGoldie
      ? this.smat(beakColor, 0.85, 0.25)
      : this.pmat(beakColor, 0, 50);
    const beak = new THREE.Mesh(
      this.assets.cylinder('chk-beak', 0.2 * ZOOM, 2.2 * ZOOM, 3.6 * ZOOM, 8),
      beakMat,
    );
    beak.rotation.x = Math.PI / 2 + 0.15;
    beak.position.set(0, 5.6 * ZOOM, -0.7 * ZOOM);
    beak.castShadow = true;
    head.add(beak);

    // Red wattle (only if not covered by a ninja mask or heavy neckwear)
    if (skin !== 'ninja') {
      const combMat = isGoldie
        ? this.smat(0xfbbf24, 0.88, 0.22, 0x452200)
        : this.pmat(combColor, 0, 50);

      const wattle = new THREE.Mesh(
        this.assets.sphere('chk-wattle', 1.2 * ZOOM, 8, 6),
        combMat,
      );
      wattle.position.set(0, 4.0 * ZOOM, -2.7 * ZOOM);
      wattle.scale.set(0.7, 0.8, 1.3);
      head.add(wattle);
    }

    // Signature 3-lobed puffy red comb (omitted if covered by full helmet/hat)
    if (skin === 'classic' || skin === 'rocket' || skin === 'shadow') {
      const combMat = isShadow
        ? this.pmat(0x111317, 0, 30)
        : this.pmat(combColor, 0, 50);

      const combGroup = new THREE.Group();
      combGroup.name = 'chk-comb';

      // Central lobe
      const c1 = new THREE.Mesh(this.assets.sphere('chk-comb-1', 2.2 * ZOOM, 10, 8), combMat);
      c1.position.set(0, -1.0 * ZOOM, 6.1 * ZOOM);
      c1.scale.set(0.65, 1.0, 1.25);
      combGroup.add(c1);

      // Front lobe
      const c2 = new THREE.Mesh(this.assets.sphere('chk-comb-2', 1.8 * ZOOM, 9, 7), combMat);
      c2.position.set(0, 1.2 * ZOOM, 5.3 * ZOOM);
      c2.scale.set(0.6, 0.9, 1.1);
      combGroup.add(c2);

      // Back lobe
      const c3 = new THREE.Mesh(this.assets.sphere('chk-comb-3', 1.7 * ZOOM, 9, 7), combMat);
      c3.position.set(0, -3.2 * ZOOM, 5.4 * ZOOM);
      c3.scale.set(0.6, 0.9, 1.1);
      combGroup.add(c3);

      head.add(combGroup);
      g.userData.comb = combGroup;
    }

    g.add(head);
    g.userData.head = head;

    // ==========================================
    // 4. ATTACH THEMATIC 3D HERO ACCESSORIES
    // ==========================================
    this.addSkinAccessories(body, head, skin);

    g.userData.idle = 'bob';
  }

  /**
   * Reference-matched 3D accessories attached directly to parent bones.
   */
  private addSkinAccessories(
    body: THREE.Group,
    head: THREE.Group,
    skin: string,
  ): void {
    switch (skin) {
      // ========================================================
      // 1. ROCKET (Aviator goggles, white cheeks, rocket backpack)
      // ========================================================
      case 'rocket': {
        // Goggles strap around head
        const strapMat = this.pmat(0x3e1f0b, 0, 30);
        const strap = new THREE.Mesh(
          this.assets.torus('chk-rkt-strap', 7.2 * ZOOM, 0.7 * ZOOM, 8, 20),
          strapMat,
        );
        strap.position.set(0, 0.6 * ZOOM, 1.2 * ZOOM);
        strap.rotation.x = 0.2;
        head.add(strap);

        // Circular metallic goggles frames & cyan reflective lenses
        const frameMat = this.smat(0x334155, 0.85, 0.2);
        const lensMat = this.smat(0x38bdf8, 0.5, 0.1, 0x0284c7);
        const cheekMat = this.pmat(0xffffff, 0, 50);

        for (const side of [-1, 1]) {
          // Goggle frame
          const frame = new THREE.Mesh(
            this.assets.torus('chk-rkt-frame', 2.2 * ZOOM, 0.55 * ZOOM, 8, 16),
            frameMat,
          );
          frame.position.set(side * 3.6 * ZOOM, 4.1 * ZOOM, 1.3 * ZOOM);
          frame.rotation.x = Math.PI / 2 + 0.1;
          frame.rotation.y = -side * 0.15;
          head.add(frame);

          // Goggle cyan lens
          const lens = new THREE.Mesh(
            this.assets.cylinder('chk-rkt-lens', 1.8 * ZOOM, 1.8 * ZOOM, 0.35 * ZOOM, 12),
            lensMat,
          );
          lens.position.set(side * 3.6 * ZOOM, 4.3 * ZOOM, 1.3 * ZOOM);
          lens.rotation.x = Math.PI / 2 + 0.1;
          lens.rotation.y = -side * 0.15;
          head.add(lens);

          // White cute cheek patch
          const cheek = new THREE.Mesh(
            this.assets.sphere('chk-rkt-chk', 2.2 * ZOOM, 8, 6),
            cheekMat,
          );
          cheek.position.set(side * 3.6 * ZOOM, 3.8 * ZOOM, -1.2 * ZOOM);
          cheek.scale.set(0.9, 0.4, 0.7);
          head.add(cheek);
        }

        // Flight suit neck collar
        const collarMat = this.pmat(0x991b1b, 0, 40);
        const collar = new THREE.Mesh(
          this.assets.torus('chk-rkt-col', 7.8 * ZOOM, 1.1 * ZOOM, 8, 16),
          collarMat,
        );
        collar.position.set(0, 1.0 * ZOOM, 4.2 * ZOOM);
        body.add(collar);

        // Rocket booster backpack on the chicken's back
        const packMat = this.smat(0x475569, 0.7, 0.3);
        const mount = new THREE.Mesh(
          this.assets.roundedBox(8.5 * ZOOM, 3.5 * ZOOM, 5.5 * ZOOM, 0.8 * ZOOM, 2),
          packMat,
        );
        mount.position.set(0, -7.2 * ZOOM, 0.5 * ZOOM);
        body.add(mount);

        const tankMat = this.smat(0x94a3b8, 0.85, 0.25);
        const capMat = this.pmat(0xde2b35, 0, 45);
        const nozMat = this.smat(0x1e293b, 0.9, 0.3, 0x1e1005);
        const flameMat = this.pmat(0xf97316, 0xea580c, 90);

        for (const side of [-1, 1]) {
          // Titanium cylinder tank
          const tank = new THREE.Mesh(
            this.assets.cylinder('chk-rkt-tnk', 2.0 * ZOOM, 2.0 * ZOOM, 8.5 * ZOOM, 12),
            tankMat,
          );
          tank.position.set(side * 3.6 * ZOOM, -8.4 * ZOOM, 0.6 * ZOOM);
          tank.rotation.x = 0.15;
          body.add(tank);

          // Red rounded nose cone
          const cap = new THREE.Mesh(
            this.assets.sphere('chk-rkt-cp', 2.0 * ZOOM, 10, 8),
            capMat,
          );
          cap.position.set(side * 3.6 * ZOOM, -9.0 * ZOOM, 4.8 * ZOOM);
          cap.scale.set(1.0, 1.0, 1.3);
          body.add(cap);

          // Exhaust nozzle
          const nozzle = new THREE.Mesh(
            this.assets.cylinder('chk-rkt-nz', 1.6 * ZOOM, 2.4 * ZOOM, 2.0 * ZOOM, 10),
            nozMat,
          );
          nozzle.position.set(side * 3.6 * ZOOM, -7.8 * ZOOM, -3.8 * ZOOM);
          nozzle.rotation.x = 0.15;
          body.add(nozzle);

          // Subtle orange flame core
          const flame = new THREE.Mesh(
            this.assets.cylinder('chk-rkt-fl', 0.2 * ZOOM, 1.4 * ZOOM, 1.6 * ZOOM, 8),
            flameMat,
          );
          flame.position.set(side * 3.6 * ZOOM, -7.6 * ZOOM, -4.8 * ZOOM);
          flame.rotation.x = 0.15;
          body.add(flame);

          // Red stabilizer fin
          const fin = new THREE.Mesh(
            this.assets.box('chk-rkt-fn', 0.4 * ZOOM, 2.2 * ZOOM, 3.5 * ZOOM),
            capMat,
          );
          fin.position.set(side * 5.6 * ZOOM, -8.4 * ZOOM, -0.8 * ZOOM);
          fin.rotation.y = side * 0.25;
          body.add(fin);
        }
        break;
      }

      // ========================================================
      // 2. SHADOW (Gold-framed sunglasses, biker leather jacket)
      // ========================================================
      case 'shadow': {
        const goldMat = this.smat(0xf59e0b, 0.9, 0.2);
        const darkLensMat = this.smat(0x09090b, 0.7, 0.1, 0x050508);

        // Gold frame sunglasses bridge
        const bridge = new THREE.Mesh(
          this.assets.box('chk-shd-brg', 3.0 * ZOOM, 0.7 * ZOOM, 0.6 * ZOOM),
          goldMat,
        );
        bridge.position.set(0, 4.4 * ZOOM, 1.5 * ZOOM);
        head.add(bridge);

        for (const side of [-1, 1]) {
          // Gold wireframe rim
          const rim = new THREE.Mesh(
            this.assets.roundedBox(4.4 * ZOOM, 0.8 * ZOOM, 3.2 * ZOOM, 0.4 * ZOOM, 2),
            goldMat,
          );
          rim.position.set(side * 3.5 * ZOOM, 4.4 * ZOOM, 1.0 * ZOOM);
          rim.rotation.y = -side * 0.12;
          head.add(rim);

          // Black polarized lens
          const lens = new THREE.Mesh(
            this.assets.box('chk-shd-lens', 3.8 * ZOOM, 0.5 * ZOOM, 2.6 * ZOOM),
            darkLensMat,
          );
          lens.position.set(side * 3.5 * ZOOM, 4.5 * ZOOM, 1.0 * ZOOM);
          lens.rotation.y = -side * 0.12;
          head.add(lens);

          // Gold frame temple arm
          const arm = new THREE.Mesh(
            this.assets.cylinder('chk-shd-arm', 0.25 * ZOOM, 0.25 * ZOOM, 5.0 * ZOOM, 6),
            goldMat,
          );
          arm.position.set(side * 5.6 * ZOOM, 1.5 * ZOOM, 1.2 * ZOOM);
          arm.rotation.x = Math.PI / 2;
          arm.rotation.z = side * 0.25;
          head.add(arm);
        }

        // Black leather biker jacket
        const ltrMat = this.smat(0x111318, 0.35, 0.35);
        const collarBack = new THREE.Mesh(
          this.assets.roundedBox(12.0 * ZOOM, 3.2 * ZOOM, 3.5 * ZOOM, 0.6 * ZOOM, 2),
          ltrMat,
        );
        collarBack.position.set(0, -3.5 * ZOOM, 4.5 * ZOOM);
        collarBack.rotation.x = -0.3;
        body.add(collarBack);

        const zipMat = this.smat(0xe2e8f0, 0.9, 0.2);
        for (const side of [-1, 1]) {
          const lapel = new THREE.Mesh(
            this.assets.box('chk-shd-lpl', 3.2 * ZOOM, 1.0 * ZOOM, 4.5 * ZOOM),
            ltrMat,
          );
          lapel.position.set(side * 4.2 * ZOOM, 4.0 * ZOOM, 1.8 * ZOOM);
          lapel.rotation.set(0.2, side * 0.3, -side * 0.2);
          body.add(lapel);

          // Silver shoulder stud
          const stud = new THREE.Mesh(
            this.assets.sphere('chk-shd-std', 0.6 * ZOOM, 6, 6),
            zipMat,
          );
          stud.position.set(side * 6.5 * ZOOM, 1.5 * ZOOM, 3.8 * ZOOM);
          body.add(stud);
        }

        // Silver diagonal zipper
        const zip = new THREE.Mesh(
          this.assets.box('chk-shd-zip', 0.6 * ZOOM, 0.4 * ZOOM, 6.0 * ZOOM),
          zipMat,
        );
        zip.position.set(0.6 * ZOOM, 5.8 * ZOOM, -0.5 * ZOOM);
        zip.rotation.y = 0.15;
        body.add(zip);

        // Gold neck chain
        const chain = new THREE.Mesh(
          this.assets.torus('chk-shd-chn', 4.5 * ZOOM, 0.5 * ZOOM, 8, 16),
          goldMat,
        );
        chain.position.set(0, 3.2 * ZOOM, 3.6 * ZOOM);
        chain.rotation.x = 0.5;
        body.add(chain);
        break;
      }

      // ========================================================
      // 3. GOLDIE (Royal golden crown, black sunglasses, Cuban chain)
      // ========================================================
      case 'goldie': {
        const crownGoldMat = this.smat(0xf59e0b, 0.92, 0.18);
        const rubyMat = this.smat(0xef4444, 0.5, 0.2, 0x7f1d1d);
        const blackGlassMat = this.smat(0x0a0a0c, 0.5, 0.15);

        // Royal golden crown base
        const crownBase = new THREE.Mesh(
          this.assets.cylinder('chk-gld-crnb', 4.4 * ZOOM, 4.0 * ZOOM, 1.8 * ZOOM, 16),
          crownGoldMat,
        );
        crownBase.position.set(0, 0, 6.5 * ZOOM);
        crownBase.rotation.x = -0.15;
        head.add(crownBase);

        // Velvet crown interior dome
        const cushionMat = this.pmat(0x991b1b, 0, 20);
        const cushion = new THREE.Mesh(
          this.assets.sphere('chk-gld-cush', 3.6 * ZOOM, 10, 8),
          cushionMat,
        );
        cushion.position.set(0, 0, 6.8 * ZOOM);
        cushion.scale.set(1.0, 1.0, 0.7);
        head.add(cushion);

        // 5 regal crown spikes with jewel cabochons
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const spike = new THREE.Mesh(
            this.assets.cylinder('chk-gld-spk', 0.2 * ZOOM, 1.0 * ZOOM, 2.5 * ZOOM, 6),
            crownGoldMat,
          );
          spike.position.set(Math.sin(angle) * 3.8 * ZOOM, Math.cos(angle) * 3.8 * ZOOM, 8.2 * ZOOM);
          spike.rotation.x = -0.15;
          head.add(spike);

          const gem = new THREE.Mesh(
            this.assets.sphere('chk-gld-gem', 0.65 * ZOOM, 6, 6),
            rubyMat,
          );
          gem.position.set(Math.sin(angle) * 3.8 * ZOOM, Math.cos(angle) * 3.8 * ZOOM, 9.6 * ZOOM);
          head.add(gem);
        }

        // Cool black sunglasses
        for (const side of [-1, 1]) {
          const gldLens = new THREE.Mesh(
            this.assets.roundedBox(4.4 * ZOOM, 0.8 * ZOOM, 3.0 * ZOOM, 0.5 * ZOOM, 2),
            blackGlassMat,
          );
          gldLens.position.set(side * 3.5 * ZOOM, 4.4 * ZOOM, 1.0 * ZOOM);
          gldLens.rotation.y = -side * 0.12;
          head.add(gldLens);
        }
        const gldBridge = new THREE.Mesh(
          this.assets.box('chk-gld-brg', 3.0 * ZOOM, 0.7 * ZOOM, 0.5 * ZOOM),
          blackGlassMat,
        );
        gldBridge.position.set(0, 4.4 * ZOOM, 1.6 * ZOOM);
        head.add(gldBridge);

        // Chunky Cuban gold chain around neck
        const chain = new THREE.Mesh(
          this.assets.torus('chk-gld-chain', 6.2 * ZOOM, 1.0 * ZOOM, 8, 18),
          crownGoldMat,
        );
        chain.position.set(0, 2.0 * ZOOM, 3.2 * ZOOM);
        chain.rotation.x = 0.4;
        body.add(chain);

        // Gold coin medallion
        const medal = new THREE.Mesh(
          this.assets.cylinder('chk-gld-mdl', 2.0 * ZOOM, 2.0 * ZOOM, 0.5 * ZOOM, 16),
          crownGoldMat,
        );
        medal.position.set(0, 6.2 * ZOOM, 0.4 * ZOOM);
        medal.rotation.x = Math.PI / 2 - 0.2;
        body.add(medal);
        break;
      }

      // ========================================================
      // 4. NINJA (Red headband with flowing ribbons, cowl, red sash)
      // ========================================================
      case 'ninja': {
        const redMat = this.pmat(0xef4444, 0, 40);
        const silverPlateMat = this.smat(0xe2e8f0, 0.9, 0.2);

        // Red ninja headband (Hachimaki)
        const band = new THREE.Mesh(
          this.assets.cylinder('chk-nin-bnd', 7.4 * ZOOM, 7.4 * ZOOM, 2.0 * ZOOM, 16),
          redMat,
        );
        band.position.set(0, 1.5 * ZOOM, 3.4 * ZOOM);
        band.rotation.x = 0.2;
        head.add(band);

        // Silver ninja forehead protector
        const plate = new THREE.Mesh(
          this.assets.roundedBox(4.5 * ZOOM, 0.5 * ZOOM, 1.6 * ZOOM, 0.3 * ZOOM, 2),
          silverPlateMat,
        );
        plate.position.set(0, 7.3 * ZOOM, 3.5 * ZOOM);
        plate.rotation.x = 0.2;
        head.add(plate);

        // Two flowing red ribbon tails blowing back from the head
        const tail1 = new THREE.Mesh(
          this.assets.box('chk-nin-tl1', 1.0 * ZOOM, 7.5 * ZOOM, 0.4 * ZOOM),
          redMat,
        );
        tail1.position.set(-1.0 * ZOOM, -6.5 * ZOOM, 2.8 * ZOOM);
        tail1.rotation.set(-0.35, 0.15, -0.2);
        head.add(tail1);

        const tail2 = new THREE.Mesh(
          this.assets.box('chk-nin-tl2', 1.0 * ZOOM, 9.0 * ZOOM, 0.4 * ZOOM),
          redMat,
        );
        tail2.position.set(0.8 * ZOOM, -7.2 * ZOOM, 2.2 * ZOOM);
        tail2.rotation.set(-0.45, -0.2, 0.25);
        head.add(tail2);

        // Ninja stealth mouth cowl
        const cowlMat = this.pmat(0x111827, 0, 30);
        const cowl = new THREE.Mesh(
          this.assets.sphere('chk-nin-cwl', 6.8 * ZOOM, 12, 10),
          cowlMat,
        );
        cowl.position.set(0, 3.2 * ZOOM, -1.8 * ZOOM);
        cowl.scale.set(0.9, 0.8, 0.7);
        head.add(cowl);

        // Red cloth sash belt around waist
        const sash = new THREE.Mesh(
          this.assets.torus('chk-nin-ssh', 8.2 * ZOOM, 1.2 * ZOOM, 8, 18),
          redMat,
        );
        sash.position.set(0, 0, 0);
        body.add(sash);

        // Hanging belt knot
        const knot = new THREE.Mesh(
          this.assets.box('chk-nin-knt', 1.6 * ZOOM, 1.2 * ZOOM, 4.0 * ZOOM),
          redMat,
        );
        knot.position.set(1.2 * ZOOM, 7.8 * ZOOM, -1.6 * ZOOM);
        knot.rotation.z = -0.2;
        body.add(knot);

        // Red arm wraps on wings
        for (const side of [-1, 1]) {
          const wrap = new THREE.Mesh(
            this.assets.cylinder('chk-nin-wrp', 1.8 * ZOOM, 1.8 * ZOOM, 1.8 * ZOOM, 8),
            redMat,
          );
          wrap.position.set(side * 8.2 * ZOOM, 0, 0.5 * ZOOM);
          body.add(wrap);
        }
        break;
      }

      // ========================================================
      // 5. COWBOY (10-gallon hat, red neck bandana, sheriff vest & star)
      // ========================================================
      case 'cowboy': {
        const hatMat = this.pmat(0x78350f, 0, 35);
        const bandMat = this.pmat(0x3e1f0b, 0, 20);
        const redMat = this.pmat(0xdc2626, 0, 45);
        const vestMat = this.pmat(0x6b3e11, 0, 30);
        const starMat = this.smat(0xfbbf24, 0.9, 0.2);

        // Wide curved brim
        const brim = new THREE.Mesh(
          this.assets.cylinder('chk-cb-brm', 12.0 * ZOOM, 12.0 * ZOOM, 0.8 * ZOOM, 20),
          hatMat,
        );
        brim.position.set(0, 0.5 * ZOOM, 5.8 * ZOOM);
        brim.rotation.x = -0.15;
        brim.scale.set(1.15, 1.35, 1.0);
        head.add(brim);

        // Pinched cowboy hat crown
        const crown = new THREE.Mesh(
          this.assets.cylinder('chk-cb-crn', 5.0 * ZOOM, 6.2 * ZOOM, 5.0 * ZOOM, 16),
          hatMat,
        );
        crown.position.set(0, -0.2 * ZOOM, 8.2 * ZOOM);
        crown.rotation.x = -0.15;
        crown.scale.set(0.9, 1.2, 1.0);
        head.add(crown);

        const pinch = new THREE.Mesh(
          this.assets.cylinder('chk-cb-pnch', 3.8 * ZOOM, 4.6 * ZOOM, 1.8 * ZOOM, 12),
          hatMat,
        );
        pinch.position.set(0, -0.2 * ZOOM, 10.6 * ZOOM);
        pinch.rotation.x = -0.15;
        pinch.scale.set(0.65, 1.2, 0.7);
        head.add(pinch);

        // Dark leather hatband
        const hatBand = new THREE.Mesh(
          this.assets.torus('chk-cb-bnd', 5.6 * ZOOM, 0.6 * ZOOM, 8, 18),
          bandMat,
        );
        hatBand.position.set(0, 0.2 * ZOOM, 6.4 * ZOOM);
        hatBand.rotation.x = -0.15;
        head.add(hatBand);

        // Red neck bandana & triangular fold
        const neckWrap = new THREE.Mesh(
          this.assets.torus('chk-cb-nck', 5.8 * ZOOM, 1.1 * ZOOM, 8, 16),
          redMat,
        );
        neckWrap.position.set(0, 2.2 * ZOOM, -4.5 * ZOOM);
        neckWrap.rotation.x = 0.35;
        head.add(neckWrap);

        const bandanaPoint = new THREE.Mesh(
          this.assets.cylinder('chk-cb-tri', 0.2 * ZOOM, 2.6 * ZOOM, 3.8 * ZOOM, 4),
          redMat,
        );
        bandanaPoint.position.set(0, 5.4 * ZOOM, -6.0 * ZOOM);
        bandanaPoint.rotation.set(0.4, 0, Math.PI / 4);
        head.add(bandanaPoint);

        // Brown leather open sheriff vest
        for (const side of [-1, 1]) {
          const vestPanel = new THREE.Mesh(
            this.assets.box('chk-cb-vst', 3.6 * ZOOM, 1.5 * ZOOM, 7.5 * ZOOM),
            vestMat,
          );
          vestPanel.position.set(side * 5.2 * ZOOM, 4.8 * ZOOM, 0.5 * ZOOM);
          vestPanel.rotation.y = -side * 0.25;
          body.add(vestPanel);
        }

        // Gold sheriff deputy star badge
        const star = new THREE.Mesh(
          this.assets.cylinder('chk-cb-str', 1.2 * ZOOM, 1.2 * ZOOM, 0.4 * ZOOM, 5),
          starMat,
        );
        star.position.set(-4.8 * ZOOM, 5.5 * ZOOM, 2.2 * ZOOM);
        star.rotation.x = Math.PI / 2;
        body.add(star);

        // Western belt & brass buckle
        const belt = new THREE.Mesh(
          this.assets.torus('chk-cb-blt', 8.2 * ZOOM, 0.9 * ZOOM, 8, 16),
          bandMat,
        );
        belt.position.set(0, 0, -2.5 * ZOOM);
        body.add(belt);

        const buckle = new THREE.Mesh(
          this.assets.roundedBox(2.8 * ZOOM, 0.6 * ZOOM, 2.0 * ZOOM, 0.4 * ZOOM, 2),
          starMat,
        );
        buckle.position.set(0, 8.2 * ZOOM, -2.5 * ZOOM);
        body.add(buckle);
        break;
      }

      // ========================================================
      // 6. SAMURAI (Lacquered kabuto helmet, golden crest horns, sode armor)
      // ========================================================
      case 'samurai': {
        const kabutoMat = this.pmat(0xb91c1c, 0, 65);
        const goldMat = this.smat(0xf59e0b, 0.85, 0.2);

        // Helmet bowl (Hachi)
        const hachi = new THREE.Mesh(
          this.assets.sphere('chk-sam-hch', 7.5 * ZOOM, 16, 12),
          kabutoMat,
        );
        hachi.position.set(0, -0.5 * ZOOM, 2.2 * ZOOM);
        hachi.scale.set(1.05, 1.05, 0.95);
        head.add(hachi);

        // Top gold ornamental socket (Tehen)
        const topSocket = new THREE.Mesh(
          this.assets.cylinder('chk-sam-tp', 1.8 * ZOOM, 2.2 * ZOOM, 1.2 * ZOOM, 12),
          goldMat,
        );
        topSocket.position.set(0, -0.5 * ZOOM, 9.2 * ZOOM);
        head.add(topSocket);

        // Golden Samurai Horns / Crescent Crest (Maedate)
        const crestBase = new THREE.Mesh(
          this.assets.box('chk-sam-cbs', 2.0 * ZOOM, 1.0 * ZOOM, 1.8 * ZOOM),
          goldMat,
        );
        crestBase.position.set(0, 7.2 * ZOOM, 4.8 * ZOOM);
        head.add(crestBase);

        for (const side of [-1, 1]) {
          const horn = new THREE.Mesh(
            this.assets.cylinder('chk-sam-hrn', 0.2 * ZOOM, 1.0 * ZOOM, 7.2 * ZOOM, 8),
            goldMat,
          );
          horn.position.set(side * 2.8 * ZOOM, 7.4 * ZOOM, 8.4 * ZOOM);
          horn.rotation.set(-0.25, 0, side * 0.45);
          head.add(horn);

          // Fukigaeshi side brow guards
          const fuki = new THREE.Mesh(
            this.assets.box('chk-sam-fk', 1.0 * ZOOM, 2.8 * ZOOM, 4.0 * ZOOM),
            kabutoMat,
          );
          fuki.position.set(side * 6.5 * ZOOM, 4.5 * ZOOM, 3.2 * ZOOM);
          fuki.rotation.set(0.1, -side * 0.45, side * 0.2);
          head.add(fuki);

          const fukiGold = new THREE.Mesh(
            this.assets.box('chk-sam-fkg', 0.4 * ZOOM, 0.5 * ZOOM, 4.2 * ZOOM),
            goldMat,
          );
          fukiGold.position.set(side * 7.0 * ZOOM, 4.5 * ZOOM, 3.2 * ZOOM);
          head.add(fukiGold);
        }

        // Shikoro tiered neck guard
        const shikoroGeo = this.assets.geometry('chk-sam-shk', () =>
          new THREE.CylinderGeometry(8.2 * ZOOM, 9.5 * ZOOM, 2.0 * ZOOM, 14, 1, true, -Math.PI * 0.8, Math.PI * 1.6)
        );
        const shikoro = new THREE.Mesh(shikoroGeo, kabutoMat);
        shikoro.position.set(0, -1.0 * ZOOM, -0.5 * ZOOM);
        shikoro.rotation.x = -0.3;
        head.add(shikoro);

        // Samurai breastplate (Dō)
        const doPlate = new THREE.Mesh(
          this.assets.roundedBox(10.5 * ZOOM, 3.2 * ZOOM, 7.8 * ZOOM, 0.8 * ZOOM, 2),
          kabutoMat,
        );
        doPlate.position.set(0, 4.8 * ZOOM, 0.5 * ZOOM);
        body.add(doPlate);

        // Gold chest cord
        const cord = new THREE.Mesh(
          this.assets.box('chk-sam-crd', 7.5 * ZOOM, 0.6 * ZOOM, 0.8 * ZOOM),
          goldMat,
        );
        cord.position.set(0, 6.4 * ZOOM, 2.2 * ZOOM);
        body.add(cord);

        // Large rectangular Sode shoulder armor guards
        for (const side of [-1, 1]) {
          const sode = new THREE.Mesh(
            this.assets.roundedBox(1.5 * ZOOM, 4.8 * ZOOM, 6.5 * ZOOM, 0.5 * ZOOM, 2),
            kabutoMat,
          );
          sode.position.set(side * 9.2 * ZOOM, 0, 2.2 * ZOOM);
          sode.rotation.set(0, 0, side * 0.2);
          body.add(sode);

          const sodeTrim = new THREE.Mesh(
            this.assets.box('chk-sam-sdt', 0.6 * ZOOM, 5.0 * ZOOM, 0.8 * ZOOM),
            goldMat,
          );
          sodeTrim.position.set(side * 9.9 * ZOOM, 0, 5.3 * ZOOM);
          body.add(sodeTrim);
        }

        // Black & gold obi waist sash
        const darkObiMat = this.pmat(0x1e293b, 0, 30);
        const obi = new THREE.Mesh(
          this.assets.torus('chk-sam-obi', 8.2 * ZOOM, 1.2 * ZOOM, 8, 16),
          darkObiMat,
        );
        obi.position.set(0, 0, -2.5 * ZOOM);
        body.add(obi);

        const obiGold = new THREE.Mesh(
          this.assets.torus('chk-sam-obg', 8.2 * ZOOM, 0.3 * ZOOM, 8, 16),
          goldMat,
        );
        obiGold.position.set(0, 0, -2.5 * ZOOM);
        body.add(obiGold);
        break;
      }

      default:
        // Classic city chicken — clean, cute, iconic, untouched!
        break;
    }
  }

  /**
   * Chicken Idle and Hop Animations.
   * Playful breathing bob, head nod, wing flutter, and tail wag.
   */
  animate(group: THREE.Group, tMs: number): void {
    const s = tMs / 1000;
    const u = group.userData;
    if (!u) return;

    const head = u.head as THREE.Object3D | undefined;
    const wings = u.wings as THREE.Object3D[] | undefined;
    const tail = u.tail as THREE.Object3D | undefined;

    // Gentle breathing head nod (all accessories attached to head follow in 100% lockstep)
    if (head && head.userData.base) {
      const bp = head.userData.base.p as THREE.Vector3;
      head.position.z = bp.z + Math.sin(s * 3.2) * 0.5 * ZOOM;
      head.rotation.x = Math.sin(s * 1.8) * 0.035;
    }

    // Playful wing flap and gentle idle breathing
    if (Array.isArray(wings)) {
      wings.forEach((w, i) => {
        if (w.userData.base) {
          const br = w.userData.base.r as THREE.Euler;
          const sign = i === 0 ? -1 : 1;
          w.rotation.x = br.x + Math.sin(s * 3.2 + i * Math.PI) * 0.08;
          w.rotation.z = br.z + sign * Math.sin(s * 2.8) * 0.06;
        }
      });
    }

    // Cheerful tail wag
    if (tail && tail.userData.base) {
      const br = tail.userData.base.r as THREE.Euler;
      tail.rotation.z = br.z + Math.sin(s * 4.2) * 0.12;
    }
  }
}
