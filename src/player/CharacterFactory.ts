/**
 * §9 — High-Fidelity Canonical CROSS! Chicken & 20 World Skins Engine.
 *
 * Implements ONE CANONICAL CHICKEN mascot with 20 modular world-themed skins:
 * 01. Classic Chicken (City)
 * 02. Sailor Duck Chicken (River)
 * 03. Beach Vacation Chicken (Beach)
 * 04. Forest Archer Chicken (Forest)
 * 05. Desert Explorer Chicken (Desert)
 * 06. Winter Snow Chicken (Snow)
 * 07. Farmer Chicken (Farm)
 * 08. Jungle Safari Chicken (Jungle)
 * 09. Cyberpunk DJ Chicken (Night City)
 * 10. Magma Fire Chicken (Volcano)
 * 11. Airline Pilot Chicken (Airport)
 * 12. Navy Captain Chicken (Harbor)
 * 13. Biker Racer Chicken (Highway)
 * 14. Candy Princess Chicken (Candy Land)
 * 15. Pharaoh Chicken (Ancient Ruins)
 * 16. Astronaut Chicken (Space)
 * 17. Samurai Chicken (Tokyo)
 * 18. Wildlife Guide Chicken (Wildlife)
 * 19. Scuba Diver Chicken (Underwater)
 * 20. Aviator Chicken (Sky Island)
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import { characterById } from '../config/characters.config';
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

    // Build the canonical Chicken with active world skin
    this.buildChickenWithSkin(g, spec.skinType, spec);

    return g;
  }

  idleOf(group: THREE.Group): IdleKind {
    return (group.userData.idle as IdleKind) ?? 'bob';
  }

  /**
   * Constructs the canonical CROSS! Chicken:
   * Plump rounded body, head, big expressive cartoon eyes, rounded orange beak,
   * 3-lobed puffy red comb, red wattle, flappable side wings, tail puff, 3-toed feet,
   * plus the selected world skin accessories!
   */
  private buildChickenWithSkin(
    g: THREE.Group,
    skin: string,
    spec: import('../config/characters.config').CharacterConfig,
  ): void {
    const isVolcano = skin === 'volcano';
    const isSailorDuck = skin === 'sailor_duck';

    const bodyColor = spec.body ?? (isSailorDuck ? 0xfff275 : isVolcano ? 0x241410 : 0xffffff);
    const beakColor = spec.beak ?? 0xff9f1a;
    const combColor = spec.comb ?? 0xff2e44;
    const feetColor = spec.feet ?? 0xff9f1a;

    const bodyMat = isVolcano
      ? this.smat(bodyColor, 0.4, 0.4, 0x331005)
      : this.pmat(bodyColor, 0, 45);

    // 1. PLUMP ROUNDED CHICKEN BODY
    const bodyGeo = this.assets.sphere('chk-body-sphere', 8.5 * ZOOM, 14, 12);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0, 11 * ZOOM);
    body.scale.set(1.0, 1.08, 0.96);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    g.userData.body = body;

    // 2. CHICKEN HEAD
    const headGeo = this.assets.sphere('chk-head-sphere', 7.2 * ZOOM, 14, 12);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 2.2 * ZOOM, 17.5 * ZOOM);
    head.scale.set(1.0, 0.98, 0.95);
    head.castShadow = true;
    head.receiveShadow = true;
    g.add(head);
    head.userData.base = { p: head.position.clone(), r: head.rotation.clone() };
    g.userData.head = head;

    // 3. EXPRESSIVE CARTOON EYES (Obsidian black with white specular shine dot)
    const eyeMat = this.pmat(0x11141a, 0, 90);
    const shineMat = this.pmat(0xffffff, 0x888888, 100);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        this.assets.sphere('chk-eye', 1.65 * ZOOM, 10, 8),
        eyeMat,
      );
      eye.position.set(side * 3.6 * ZOOM, 5.8 * ZOOM, 18.2 * ZOOM);
      eye.scale.set(1.0, 0.7, 1.15);
      g.add(eye);

      // Specular shine dot
      const shine = new THREE.Mesh(
        this.assets.sphere('chk-eye-shine', 0.55 * ZOOM, 8, 6),
        shineMat,
      );
      shine.position.set(side * 3.8 * ZOOM + 0.3 * ZOOM, 6.4 * ZOOM, 18.8 * ZOOM);
      g.add(shine);
    }

    // 4. CUTE ROUNDED BEAK
    const beakMat = this.pmat(beakColor, 0, 50);
    const beak = new THREE.Mesh(
      this.assets.cylinder('chk-beak', 0.2 * ZOOM, 2.2 * ZOOM, 3.6 * ZOOM, 8),
      beakMat,
    );
    beak.rotation.x = Math.PI / 2 + 0.15;
    beak.position.set(0, 7.8 * ZOOM, 16.8 * ZOOM);
    beak.castShadow = true;
    g.add(beak);

    // 5. SIGNATURE RED PUFFY COMB (3 rounded lobes atop head)
    const combMat = isVolcano
      ? this.pmat(0xff3838, 0xaa2200, 70)
      : this.pmat(combColor, 0, 50);

    const combGroup = new THREE.Group();
    // Central lobe
    const c1 = new THREE.Mesh(this.assets.sphere('chk-comb-1', 2.2 * ZOOM, 10, 8), combMat);
    c1.position.set(0, 1.2 * ZOOM, 23.6 * ZOOM);
    c1.scale.set(0.65, 1.0, 1.25);
    combGroup.add(c1);

    // Front lobe
    const c2 = new THREE.Mesh(this.assets.sphere('chk-comb-2', 1.8 * ZOOM, 9, 7), combMat);
    c2.position.set(0, 3.4 * ZOOM, 22.8 * ZOOM);
    c2.scale.set(0.6, 0.9, 1.1);
    combGroup.add(c2);

    // Back lobe
    const c3 = new THREE.Mesh(this.assets.sphere('chk-comb-3', 1.7 * ZOOM, 9, 7), combMat);
    c3.position.set(0, -1.0 * ZOOM, 22.9 * ZOOM);
    c3.scale.set(0.6, 0.9, 1.1);
    combGroup.add(c3);

    combGroup.userData.base = { p: combGroup.position.clone(), r: combGroup.rotation.clone() };
    g.add(combGroup);
    g.userData.comb = combGroup;

    // 6. RED WATTLE (Under the beak)
    const wattle = new THREE.Mesh(
      this.assets.sphere('chk-wattle', 1.2 * ZOOM, 8, 6),
      combMat,
    );
    wattle.position.set(0, 6.2 * ZOOM, 14.8 * ZOOM);
    wattle.scale.set(0.7, 0.8, 1.3);
    g.add(wattle);

    // 7. FLAPPABLE ROUNDED WINGS (Left & Right)
    const wingMat = isVolcano
      ? this.smat(0x1a0d0a, 0.4, 0.4, 0x220800)
      : this.pmat(bodyColor, 0, 40);

    const wingGeo = this.assets.sphere('chk-wing', 4.5 * ZOOM, 10, 8);
    const wings: THREE.Mesh[] = [];

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * 8.2 * ZOOM, 0, 12 * ZOOM);
      wing.scale.set(0.45, 1.25, 0.85);
      wing.rotation.y = side * 0.15;
      wing.castShadow = true;
      wing.userData.base = { p: wing.position.clone(), r: wing.rotation.clone() };
      g.add(wing);
      wings.push(wing);
    }
    g.userData.wings = wings;

    // 8. ADORABLE TAIL FEATHERS (Behind)
    const tail = new THREE.Mesh(
      this.assets.cylinder('chk-tail', 1.0 * ZOOM, 3.2 * ZOOM, 4.0 * ZOOM, 7),
      wingMat,
    );
    tail.rotation.x = -Math.PI / 3;
    tail.position.set(0, -7.5 * ZOOM, 13 * ZOOM);
    tail.scale.set(1.4, 0.8, 1.0);
    tail.castShadow = true;
    tail.userData.base = { p: tail.position.clone(), r: tail.rotation.clone() };
    g.add(tail);
    g.userData.tail = tail;

    // 9. CUTE 3-TOED ORANGE FEET & ANKLES
    const feetMat = this.pmat(feetColor, 0, 40);
    for (const side of [-1, 1]) {
      // Leg post
      const leg = new THREE.Mesh(
        this.assets.cylinder('chk-leg', 1.1 * ZOOM, 1.1 * ZOOM, 4.5 * ZOOM, 7),
        feetMat,
      );
      leg.position.set(side * 3.8 * ZOOM, 0, 3.2 * ZOOM);
      leg.castShadow = true;
      g.add(leg);

      // Foot pad
      const foot = new THREE.Mesh(
        this.assets.roundedBox(3.4 * ZOOM, 5.2 * ZOOM, 1.2 * ZOOM, 0.6 * ZOOM, 2),
        feetMat,
      );
      foot.position.set(side * 3.8 * ZOOM, 1.2 * ZOOM, 0.6 * ZOOM);
      foot.castShadow = true;
      foot.receiveShadow = true;
      g.add(foot);
    }

    // 10. MODULAR ACCESSORIES & OUTFITS PER SKIN
    this.addSkinAccessories(g, skin, spec);

    g.userData.idle = 'bob';
  }

  /**
   * Attaches thematic accessories directly derived from the character reference boards:
   */
  private addSkinAccessories(
    g: THREE.Group,
    skin: string,
    spec: import('../config/characters.config').CharacterConfig,
  ): void {
    const acc = new THREE.Group();
    acc.name = 'skin-accessories';

    switch (skin) {
      case 'sailor_duck': {
        // 02 RIVER: Sailor / Captain Chicken (Yellow body, life-ring, white captain cap with anchor)
        const blueMat = this.pmat(0x2e86de, 0, 50);
        const whiteMat = this.pmat(0xffffff, 0, 60);
        const goldMat = this.pmat(0xffd700, 0, 80);

        // Sailor life-ring / collar around waist
        const ring = new THREE.Mesh(
          this.assets.torus('chk-sailor-ring', 7.2 * ZOOM, 1.6 * ZOOM, 10, 24),
          blueMat,
        );
        ring.position.set(0, 0.5 * ZOOM, 11.5 * ZOOM);
        ring.rotation.x = Math.PI / 12;
        ring.castShadow = true;
        acc.add(ring);

        // White stripes on ring (4 accents)
        for (let i = 0; i < 4; i++) {
          const stripe = new THREE.Mesh(
            this.assets.cylinder(`chk-ring-str-${i}`, 1.7 * ZOOM, 1.7 * ZOOM, 0.8 * ZOOM, 8),
            whiteMat,
          );
          const angle = (i * Math.PI) / 2;
          stripe.position.set(Math.cos(angle) * 7.2 * ZOOM, Math.sin(angle) * 7.2 * ZOOM + 0.5 * ZOOM, 11.5 * ZOOM);
          stripe.rotation.z = angle + Math.PI / 2;
          acc.add(stripe);
        }

        // Sailor neckerchief knot with anchor pendant
        const knot = new THREE.Mesh(
          this.assets.sphere('chk-sailor-knot', 1.2 * ZOOM, 8, 6),
          blueMat,
        );
        knot.position.set(0, 6.8 * ZOOM, 13.8 * ZOOM);
        acc.add(knot);

        const anchor = new THREE.Mesh(
          this.assets.box('chk-anchor-pendant', 1.8 * ZOOM, 0.5 * ZOOM, 2.0 * ZOOM),
          goldMat,
        );
        anchor.position.set(0, 7.2 * ZOOM, 12.5 * ZOOM);
        acc.add(anchor);

        // White captain sailor cap
        const cap = new THREE.Mesh(
          this.assets.cylinder('chk-sailor-cap', 5.0 * ZOOM, 4.4 * ZOOM, 2.5 * ZOOM, 16),
          whiteMat,
        );
        cap.position.set(0, 1.6 * ZOOM, 23.6 * ZOOM);
        cap.rotation.x = 0.08;
        cap.castShadow = true;
        acc.add(cap);

        // Blue brim ring
        const brim = new THREE.Mesh(
          this.assets.torus('chk-sailor-brim', 5.0 * ZOOM, 0.7 * ZOOM, 8, 20),
          blueMat,
        );
        brim.position.set(0, 1.6 * ZOOM, 22.4 * ZOOM);
        brim.rotation.x = 0.08;
        acc.add(brim);

        // Gold anchor badge on cap front
        const capAnchor = new THREE.Mesh(
          this.assets.sphere('chk-cap-anchor', 0.9 * ZOOM, 8, 6),
          goldMat,
        );
        capAnchor.position.set(0, 5.4 * ZOOM, 23.6 * ZOOM);
        acc.add(capAnchor);
        break;
      }

      case 'beach': {
        // 03 BEACH: Tropical Vacation Chicken (Sunglasses, flower on head, floral lei, tropical dress)
        const pinkMat = this.pmat(0xff6b81, 0, 60);
        const yellowMat = this.pmat(0xfeca57, 0, 60);
        const redLensMat = this.pmat(0xee5253, 0, 80);
        const darkFrame = this.pmat(0x222222, 0, 70);

        // Heart-shaped red sunglasses over eyes
        for (const s of [-1, 1]) {
          const frame = new THREE.Mesh(
            this.assets.torus('chk-sun-frame', 2.3 * ZOOM, 0.45 * ZOOM, 8, 16),
            darkFrame,
          );
          frame.position.set(s * 3.6 * ZOOM, 6.4 * ZOOM, 18.2 * ZOOM);
          frame.rotation.x = Math.PI / 8;
          acc.add(frame);

          const lens = new THREE.Mesh(
            this.assets.cylinder('chk-sun-lens', 1.9 * ZOOM, 1.9 * ZOOM, 0.2 * ZOOM, 12),
            redLensMat,
          );
          lens.position.set(s * 3.6 * ZOOM, 6.4 * ZOOM, 18.2 * ZOOM);
          lens.rotation.x = Math.PI / 2 + 0.15;
          acc.add(lens);
        }

        // Bridge connecting sunglasses
        const bridge = new THREE.Mesh(
          this.assets.box('chk-sun-bridge', 2.0 * ZOOM, 0.4 * ZOOM, 0.4 * ZOOM),
          darkFrame,
        );
        bridge.position.set(0, 6.5 * ZOOM, 18.6 * ZOOM);
        acc.add(bridge);

        // Hibiscus flower blossom on side of head
        const flowerGroup = new THREE.Group();
        flowerGroup.position.set(3.8 * ZOOM, 1.8 * ZOOM, 22.6 * ZOOM);
        flowerGroup.rotation.z = -0.4;

        for (let p = 0; p < 5; p++) {
          const petal = new THREE.Mesh(
            this.assets.sphere(`chk-petal-${p}`, 1.3 * ZOOM, 8, 6),
            pinkMat,
          );
          const a = (p * Math.PI * 2) / 5;
          petal.position.set(Math.cos(a) * 1.5 * ZOOM, Math.sin(a) * 1.5 * ZOOM, 0);
          petal.scale.set(0.9, 0.9, 0.5);
          flowerGroup.add(petal);
        }
        const center = new THREE.Mesh(
          this.assets.sphere('chk-flower-center', 0.9 * ZOOM, 8, 6),
          yellowMat,
        );
        flowerGroup.add(center);
        acc.add(flowerGroup);

        // Floral lei garland around neck
        const lei = new THREE.Mesh(
          this.assets.torus('chk-beach-lei', 6.8 * ZOOM, 1.3 * ZOOM, 8, 20),
          pinkMat,
        );
        lei.position.set(0, 1.2 * ZOOM, 13.5 * ZOOM);
        lei.castShadow = true;
        acc.add(lei);

        // Floral sarong waistband
        const skirt = new THREE.Mesh(
          this.assets.torus('chk-beach-skirt', 7.8 * ZOOM, 1.0 * ZOOM, 8, 20),
          yellowMat,
        );
        skirt.position.set(0, 0, 9.0 * ZOOM);
        acc.add(skirt);
        break;
      }

      case 'forest': {
        // 04 FOREST: Forest Ranger / Nature Archer (Green hooded cowl with leaf petals, poncho, leather belt)
        const greenMat = this.pmat(0x2ed573, 0, 30);
        const darkGreenMat = this.pmat(0x20bf6b, 0, 30);
        const brownMat = this.pmat(0x745125, 0, 30);
        const goldMat = this.pmat(0xffd700, 0, 80);
        const pinkFlowerMat = this.pmat(0xff6b81, 0, 60);

        // Leaf hooded cowl framing head
        const hood = new THREE.Mesh(
          this.assets.sphere('chk-hood', 8.2 * ZOOM, 14, 12),
          greenMat,
        );
        hood.position.set(0, 0.6 * ZOOM, 18.2 * ZOOM);
        hood.scale.set(1.06, 1.08, 1.02);
        hood.castShadow = true;
        acc.add(hood);

        // Hood leaf crest / peak atop head
        const peak = new THREE.Mesh(
          this.assets.cylinder('chk-hood-peak', 0.2 * ZOOM, 2.5 * ZOOM, 4.2 * ZOOM, 8),
          darkGreenMat,
        );
        peak.position.set(0, 0, 25.8 * ZOOM);
        peak.rotation.x = -0.3;
        acc.add(peak);

        // Small blossom on hood
        const hoodFlower = new THREE.Mesh(
          this.assets.sphere('chk-hood-flower', 1.2 * ZOOM, 8, 6),
          pinkFlowerMat,
        );
        hoodFlower.position.set(2.8 * ZOOM, 2.0 * ZOOM, 23.5 * ZOOM);
        acc.add(hoodFlower);

        // Green nature cape / poncho over body
        const poncho = new THREE.Mesh(
          this.assets.torus('chk-poncho', 7.5 * ZOOM, 1.5 * ZOOM, 8, 20),
          darkGreenMat,
        );
        poncho.position.set(0, 0.8 * ZOOM, 13.5 * ZOOM);
        acc.add(poncho);

        // Leather belt with gold buckle around waist
        const belt = new THREE.Mesh(
          this.assets.torus('chk-belt', 7.8 * ZOOM, 0.9 * ZOOM, 8, 20),
          brownMat,
        );
        belt.position.set(0, 0, 9.5 * ZOOM);
        acc.add(belt);

        const buckle = new THREE.Mesh(
          this.assets.box('chk-buckle', 2.2 * ZOOM, 1.0 * ZOOM, 1.8 * ZOOM),
          goldMat,
        );
        buckle.position.set(0, 7.8 * ZOOM, 9.5 * ZOOM);
        acc.add(buckle);
        break;
      }

      case 'desert': {
        // 05 DESERT: Desert Explorer (Aviator cap with ear flaps, goggles, khaki jacket, desert scarf, backpack)
        const leatherMat = this.pmat(0xb87333, 0, 30);
        const brassMat = this.pmat(0xd4af37, 0, 70);
        const khakiMat = this.pmat(0xeccc68, 0, 30);
        const darkKhakiMat = this.pmat(0xb08b52, 0, 30);
        const lensMat = this.pmat(0x74b9ff, 0, 90);

        // Aviator leather helmet
        const cap = new THREE.Mesh(
          this.assets.sphere('chk-aviator-cap', 7.8 * ZOOM, 14, 12),
          leatherMat,
        );
        cap.position.set(0, 1.0 * ZOOM, 18.2 * ZOOM);
        cap.scale.set(1.04, 1.04, 0.96);
        cap.castShadow = true;
        acc.add(cap);

        // Side ear flaps
        for (const s of [-1, 1]) {
          const flap = new THREE.Mesh(
            this.assets.roundedBox(1.5 * ZOOM, 4.0 * ZOOM, 4.5 * ZOOM, 0.6 * ZOOM, 2),
            leatherMat,
          );
          flap.position.set(s * 7.4 * ZOOM, 1.0 * ZOOM, 16.5 * ZOOM);
          acc.add(flap);
        }

        // Brass goggles perched on forehead
        for (const s of [-1, 1]) {
          const goggle = new THREE.Mesh(
            this.assets.torus('chk-goggle-ring', 1.8 * ZOOM, 0.5 * ZOOM, 8, 14),
            brassMat,
          );
          goggle.position.set(s * 2.8 * ZOOM, 5.0 * ZOOM, 21.2 * ZOOM);
          goggle.rotation.x = Math.PI / 5;
          acc.add(goggle);

          const lens = new THREE.Mesh(
            this.assets.cylinder('chk-goggle-lens', 1.4 * ZOOM, 1.4 * ZOOM, 0.2 * ZOOM, 10),
            lensMat,
          );
          lens.position.set(s * 2.8 * ZOOM, 5.0 * ZOOM, 21.2 * ZOOM);
          lens.rotation.x = Math.PI / 2 + 0.3;
          acc.add(lens);
        }

        // Khaki desert explorer scarf/cravat
        const scarf = new THREE.Mesh(
          this.assets.torus('chk-desert-scarf', 7.0 * ZOOM, 1.4 * ZOOM, 8, 18),
          khakiMat,
        );
        scarf.position.set(0, 1.2 * ZOOM, 13.8 * ZOOM);
        acc.add(scarf);

        // Explorer vest
        const vest = new THREE.Mesh(
          this.assets.cylinder('chk-desert-vest', 8.2 * ZOOM, 8.4 * ZOOM, 4.5 * ZOOM, 14),
          khakiMat,
        );
        vest.position.set(0, 0, 10.5 * ZOOM);
        acc.add(vest);

        // Explorer backpack on back
        const backpack = new THREE.Mesh(
          this.assets.roundedBox(6.5 * ZOOM, 3.2 * ZOOM, 6.0 * ZOOM, 0.8 * ZOOM, 2),
          darkKhakiMat,
        );
        backpack.position.set(0, -7.5 * ZOOM, 11.5 * ZOOM);
        backpack.castShadow = true;
        acc.add(backpack);
        break;
      }

      case 'snow': {
        // 06 SNOW: Winter Snow Chicken (Blue knitted beanie with pompom, winter sweater with snowflake, scarf)
        const blueMat = this.pmat(0x3867d6, 0, 35);
        const lightBlueMat = this.pmat(0x70a1ff, 0, 40);
        const whiteMat = this.pmat(0xffffff, 0, 60);

        // Beanie dome
        const beanie = new THREE.Mesh(
          this.assets.sphere('chk-beanie', 7.6 * ZOOM, 14, 12),
          blueMat,
        );
        beanie.position.set(0, 1.0 * ZOOM, 19.8 * ZOOM);
        beanie.scale.set(1.02, 1.02, 0.92);
        beanie.castShadow = true;
        acc.add(beanie);

        // Beanie ribbed rim
        const beanieRim = new THREE.Mesh(
          this.assets.torus('chk-beanie-rim', 7.0 * ZOOM, 1.0 * ZOOM, 8, 20),
          lightBlueMat,
        );
        beanieRim.position.set(0, 1.0 * ZOOM, 18.2 * ZOOM);
        acc.add(beanieRim);

        // Fluffy white pompom
        const pompom = new THREE.Mesh(
          this.assets.sphere('chk-pompom', 2.4 * ZOOM, 10, 8),
          whiteMat,
        );
        pompom.position.set(0, -0.4 * ZOOM, 26.2 * ZOOM);
        acc.add(pompom);

        // Knit winter scarf
        const scarf = new THREE.Mesh(
          this.assets.torus('chk-scarf', 7.0 * ZOOM, 1.6 * ZOOM, 8, 20),
          blueMat,
        );
        scarf.position.set(0, 1.2 * ZOOM, 13.8 * ZOOM);
        acc.add(scarf);

        // Scarf trailing tail down the back/side
        const scarfTail = new THREE.Mesh(
          this.assets.roundedBox(2.2 * ZOOM, 1.2 * ZOOM, 5.0 * ZOOM, 0.5 * ZOOM, 2),
          lightBlueMat,
        );
        scarfTail.position.set(3.5 * ZOOM, -4.5 * ZOOM, 10.5 * ZOOM);
        scarfTail.rotation.z = 0.2;
        acc.add(scarfTail);

        // Snowflake badge on chest
        const snowflake = new THREE.Mesh(
          this.assets.sphere('chk-snowflake-badge', 1.4 * ZOOM, 8, 6),
          whiteMat,
        );
        snowflake.position.set(0, 7.8 * ZOOM, 11.2 * ZOOM);
        acc.add(snowflake);
        break;
      }

      case 'farm': {
        // 07 FARM: Farmer Chicken (Woven straw sunhat, red polka bandana neckerchief, denim overalls)
        const strawMat = this.pmat(0xf5cd79, 0, 20);
        const strawBandMat = this.pmat(0x2ed573, 0, 40);
        const redMat = this.pmat(0xff4757, 0, 45);
        const denimMat = this.pmat(0x3867d6, 0, 30);
        const brassMat = this.pmat(0xffd700, 0, 80);

        // Straw hat brim
        const brim = new THREE.Mesh(
          this.assets.cylinder('chk-straw-brim', 11.0 * ZOOM, 11.0 * ZOOM, 0.8 * ZOOM, 18),
          strawMat,
        );
        brim.position.set(0, 1.2 * ZOOM, 22.2 * ZOOM);
        brim.rotation.x = 0.1;
        brim.castShadow = true;
        acc.add(brim);

        // Straw hat crown
        const crown = new THREE.Mesh(
          this.assets.cylinder('chk-straw-crown', 5.5 * ZOOM, 4.5 * ZOOM, 3.4 * ZOOM, 14),
          strawMat,
        );
        crown.position.set(0, 1.2 * ZOOM, 23.8 * ZOOM);
        crown.rotation.x = 0.1;
        crown.castShadow = true;
        acc.add(crown);

        // Hat ribbon band
        const hatBand = new THREE.Mesh(
          this.assets.torus('chk-straw-band', 4.8 * ZOOM, 0.5 * ZOOM, 8, 16),
          strawBandMat,
        );
        hatBand.position.set(0, 1.2 * ZOOM, 22.8 * ZOOM);
        hatBand.rotation.x = 0.1;
        acc.add(hatBand);

        // Red neck bandana
        const bandana = new THREE.Mesh(
          this.assets.torus('chk-bandana', 6.8 * ZOOM, 1.3 * ZOOM, 8, 18),
          redMat,
        );
        bandana.position.set(0, 1.2 * ZOOM, 13.5 * ZOOM);
        acc.add(bandana);

        // Denim overalls (bottom half & bib)
        const overalls = new THREE.Mesh(
          this.assets.cylinder('chk-overalls-body', 8.2 * ZOOM, 8.4 * ZOOM, 4.5 * ZOOM, 14),
          denimMat,
        );
        overalls.position.set(0, 0, 8.5 * ZOOM);
        acc.add(overalls);

        // Overalls straps & brass buttons
        for (const s of [-1, 1]) {
          const strap = new THREE.Mesh(
            this.assets.box('chk-strap', 1.4 * ZOOM, 7.5 * ZOOM, 0.4 * ZOOM),
            denimMat,
          );
          strap.position.set(s * 3.5 * ZOOM, 0.8 * ZOOM, 11.2 * ZOOM);
          strap.rotation.x = 0.1;
          acc.add(strap);

          const button = new THREE.Mesh(
            this.assets.sphere(`chk-ov-btn-${s}`, 0.6 * ZOOM, 6, 6),
            brassMat,
          );
          button.position.set(s * 3.5 * ZOOM, 5.5 * ZOOM, 11.5 * ZOOM);
          acc.add(button);
        }
        break;
      }

      case 'jungle': {
        // 08 JUNGLE: Jungle Explorer (Dark olive campaign hat, cross straps, adventure backpack)
        const oliveMat = this.pmat(0x2e7d32, 0, 30);
        const leatherMat = this.pmat(0x745125, 0, 30);
        const brassMat = this.pmat(0xffd700, 0, 70);

        // Campaign hat brim
        const brim = new THREE.Mesh(
          this.assets.cylinder('chk-safari-brim', 10.0 * ZOOM, 10.0 * ZOOM, 0.8 * ZOOM, 18),
          oliveMat,
        );
        brim.position.set(0, 1.2 * ZOOM, 22.2 * ZOOM);
        brim.rotation.x = 0.08;
        brim.castShadow = true;
        acc.add(brim);

        // Campaign hat crown
        const crown = new THREE.Mesh(
          this.assets.cylinder('chk-safari-crown', 5.6 * ZOOM, 4.8 * ZOOM, 3.2 * ZOOM, 14),
          oliveMat,
        );
        crown.position.set(0, 1.2 * ZOOM, 23.8 * ZOOM);
        crown.rotation.x = 0.08;
        crown.castShadow = true;
        acc.add(crown);

        // Gold badge on hat front
        const badge = new THREE.Mesh(
          this.assets.box('chk-jungle-badge', 1.8 * ZOOM, 0.5 * ZOOM, 1.8 * ZOOM),
          brassMat,
        );
        badge.position.set(0, 5.6 * ZOOM, 23.8 * ZOOM);
        acc.add(badge);

        // Cross utility straps across chest
        const strap1 = new THREE.Mesh(
          this.assets.box('chk-j-strap-1', 1.2 * ZOOM, 11.0 * ZOOM, 0.4 * ZOOM),
          leatherMat,
        );
        strap1.position.set(0, 1.5 * ZOOM, 11.5 * ZOOM);
        strap1.rotation.z = 0.45;
        acc.add(strap1);

        // Adventure backpack with rolled bedroll on back
        const pack = new THREE.Mesh(
          this.assets.roundedBox(6.5 * ZOOM, 3.2 * ZOOM, 5.5 * ZOOM, 0.8 * ZOOM, 2),
          oliveMat,
        );
        pack.position.set(0, -7.5 * ZOOM, 11.0 * ZOOM);
        acc.add(pack);

        const bedroll = new THREE.Mesh(
          this.assets.cylinder('chk-bedroll', 1.5 * ZOOM, 1.5 * ZOOM, 6.0 * ZOOM, 8),
          leatherMat,
        );
        bedroll.position.set(0, -8.5 * ZOOM, 14.5 * ZOOM);
        bedroll.rotation.z = Math.PI / 2;
        acc.add(bedroll);
        break;
      }

      case 'night_city': {
        // 09 NIGHT CITY: Cyberpunk DJ Chicken (Illuminated cyber jacket, cyber visor, DJ headphones)
        const cyberPink = this.pmat(0xff3fb4, 0xff0066, 80);
        const cyberCyan = this.pmat(0x38e1ff, 0x0088ff, 80);
        const cyberYellow = this.pmat(0xfffa65, 0xffbb00, 90);
        const darkMat = this.pmat(0x181a24, 0, 50);

        // Cyber visor sunglasses across eyes
        const visor = new THREE.Mesh(
          this.assets.roundedBox(9.5 * ZOOM, 2.4 * ZOOM, 2.6 * ZOOM, 0.6 * ZOOM, 2),
          cyberYellow,
        );
        visor.position.set(0, 5.8 * ZOOM, 18.2 * ZOOM);
        visor.castShadow = true;
        acc.add(visor);

        // Headphone headband
        const band = new THREE.Mesh(
          this.assets.torus('chk-hp-band', 7.5 * ZOOM, 0.9 * ZOOM, 8, 20),
          darkMat,
        );
        band.position.set(0, 1.0 * ZOOM, 18.6 * ZOOM);
        acc.add(band);

        // Glowing DJ earcups
        for (const s of [-1, 1]) {
          const cup = new THREE.Mesh(
            this.assets.cylinder('chk-hp-cup', 2.6 * ZOOM, 2.6 * ZOOM, 1.4 * ZOOM, 14),
            cyberPink,
          );
          cup.position.set(s * 7.5 * ZOOM, 1.0 * ZOOM, 18.2 * ZOOM);
          cup.rotation.z = Math.PI / 2;
          acc.add(cup);

          const neonRing = new THREE.Mesh(
            this.assets.torus(`chk-hp-neon-${s}`, 2.2 * ZOOM, 0.4 * ZOOM, 8, 14),
            cyberCyan,
          );
          neonRing.position.set(s * 8.2 * ZOOM, 1.0 * ZOOM, 18.2 * ZOOM);
          neonRing.rotation.y = Math.PI / 2;
          acc.add(neonRing);
        }

        // Cyber jacket collar with neon trims
        const cyberCollar = new THREE.Mesh(
          this.assets.torus('chk-cyber-collar', 7.2 * ZOOM, 1.4 * ZOOM, 8, 20),
          cyberPink,
        );
        cyberCollar.position.set(0, 0.8 * ZOOM, 13.2 * ZOOM);
        acc.add(cyberCollar);
        break;
      }

      case 'volcano': {
        // 10 VOLCANO: Magma Fire Chicken (Obsidian rock armor, glowing flame comb, lava veins)
        const magmaMat = this.pmat(0xff4757, 0xff2200, 95);
        const lavaOrange = this.pmat(0xff793f, 0xff5500, 95);
        const obsidianMat = this.smat(0x1a0d0a, 0.5, 0.3, 0x110400);

        // Molten lava belt ring
        const lavaRing = new THREE.Mesh(
          this.assets.torus('chk-lava-ring', 8.2 * ZOOM, 1.1 * ZOOM, 8, 20),
          magmaMat,
        );
        lavaRing.position.set(0, 0, 10.5 * ZOOM);
        acc.add(lavaRing);

        // Obsidian shoulder pauldrons
        for (const s of [-1, 1]) {
          const pauldron = new THREE.Mesh(
            this.assets.sphere(`chk-pauldron-${s}`, 3.5 * ZOOM, 8, 6),
            obsidianMat,
          );
          pauldron.position.set(s * 7.8 * ZOOM, 0.5 * ZOOM, 13.8 * ZOOM);
          pauldron.scale.set(0.8, 1.2, 0.8);
          acc.add(pauldron);

          const flameAccent = new THREE.Mesh(
            this.assets.sphere(`chk-flame-${s}`, 1.8 * ZOOM, 6, 6),
            lavaOrange,
          );
          flameAccent.position.set(s * 8.2 * ZOOM, 0.5 * ZOOM, 15.2 * ZOOM);
          acc.add(flameAccent);
        }
        break;
      }

      case 'airport': {
        // 11 AIRPORT: Airline Pilot Chicken (Navy captain peaked cap with gold wings, pilot tie & epaulets)
        const navyMat = this.pmat(0x1e272e, 0, 50);
        const goldMat = this.pmat(0xffd700, 0, 90);
        const whiteMat = this.pmat(0xffffff, 0, 60);
        const darkVisorMat = this.pmat(0x0a0c10, 0, 90);

        // Pilot peaked cap
        const cap = new THREE.Mesh(
          this.assets.cylinder('chk-pilot-cap', 5.6 * ZOOM, 4.8 * ZOOM, 2.6 * ZOOM, 16),
          navyMat,
        );
        cap.position.set(0, 1.2 * ZOOM, 22.8 * ZOOM);
        cap.rotation.x = 0.08;
        cap.castShadow = true;
        acc.add(cap);

        // Black gloss visor
        const visor = new THREE.Mesh(
          this.assets.box('chk-pilot-visor', 5.4 * ZOOM, 2.4 * ZOOM, 0.6 * ZOOM),
          darkVisorMat,
        );
        visor.position.set(0, 4.6 * ZOOM, 21.8 * ZOOM);
        visor.rotation.x = Math.PI / 7;
        acc.add(visor);

        // Gold pilot wings emblem on cap
        const wingsBadge = new THREE.Mesh(
          this.assets.box('chk-pilot-badge', 3.2 * ZOOM, 0.8 * ZOOM, 0.8 * ZOOM),
          goldMat,
        );
        wingsBadge.position.set(0, 4.8 * ZOOM, 23.4 * ZOOM);
        acc.add(wingsBadge);

        // White pilot shirt collar & navy necktie
        const collar = new THREE.Mesh(
          this.assets.torus('chk-pilot-collar', 6.8 * ZOOM, 1.2 * ZOOM, 8, 18),
          whiteMat,
        );
        collar.position.set(0, 1.0 * ZOOM, 13.5 * ZOOM);
        acc.add(collar);

        const tie = new THREE.Mesh(
          this.assets.box('chk-pilot-tie', 1.4 * ZOOM, 0.5 * ZOOM, 4.5 * ZOOM),
          navyMat,
        );
        tie.position.set(0, 6.8 * ZOOM, 11.0 * ZOOM);
        acc.add(tie);

        // Gold shoulder epaulets
        for (const s of [-1, 1]) {
          const epaulet = new THREE.Mesh(
            this.assets.box(`chk-epaulet-${s}`, 2.5 * ZOOM, 3.5 * ZOOM, 0.6 * ZOOM),
            goldMat,
          );
          epaulet.position.set(s * 6.5 * ZOOM, 0.5 * ZOOM, 13.5 * ZOOM);
          acc.add(epaulet);
        }
        break;
      }

      case 'harbor': {
        // 12 HARBOR: Navy Captain / Sailor (White captain cap with blue band & anchor, sailor neckerchief)
        const whiteCapMat = this.pmat(0xffffff, 0, 50);
        const blueMat = this.pmat(0x1e3799, 0, 50);
        const goldMat = this.pmat(0xffd700, 0, 90);

        // White naval cap
        const cap = new THREE.Mesh(
          this.assets.cylinder('chk-naval-cap', 5.6 * ZOOM, 4.8 * ZOOM, 2.5 * ZOOM, 16),
          whiteCapMat,
        );
        cap.position.set(0, 1.2 * ZOOM, 22.8 * ZOOM);
        cap.rotation.x = 0.08;
        cap.castShadow = true;
        acc.add(cap);

        // Dark blue cap brim band
        const capBand = new THREE.Mesh(
          this.assets.torus('chk-naval-band', 5.0 * ZOOM, 0.6 * ZOOM, 8, 18),
          blueMat,
        );
        capBand.position.set(0, 1.2 * ZOOM, 21.8 * ZOOM);
        capBand.rotation.x = 0.08;
        acc.add(capBand);

        // Gold anchor crest on cap
        const anchor = new THREE.Mesh(
          this.assets.sphere('chk-naval-anchor', 1.1 * ZOOM, 8, 6),
          goldMat,
        );
        anchor.position.set(0, 4.8 * ZOOM, 23.0 * ZOOM);
        acc.add(anchor);

        // Sailor blue collar & tie
        const collar = new THREE.Mesh(
          this.assets.torus('chk-harbor-collar', 6.8 * ZOOM, 1.3 * ZOOM, 8, 18),
          blueMat,
        );
        collar.position.set(0, 1.0 * ZOOM, 13.5 * ZOOM);
        acc.add(collar);

        const tie = new THREE.Mesh(
          this.assets.box('chk-harbor-tie', 1.8 * ZOOM, 0.6 * ZOOM, 3.8 * ZOOM),
          blueMat,
        );
        tie.position.set(0, 6.8 * ZOOM, 11.2 * ZOOM);
        acc.add(tie);
        break;
      }

      case 'highway': {
        // 13 HIGHWAY: Racing Chicken (Sleek red aerodynamic racing helmet, visor, racing scarf)
        const redMat = this.pmat(0xff4757, 0, 70);
        const darkVisor = this.pmat(0x11141a, 0, 90);
        const whiteStripeMat = this.pmat(0xffffff, 0, 60);

        // Full racing helmet
        const helmet = new THREE.Mesh(
          this.assets.sphere('chk-racer-helmet', 8.4 * ZOOM, 16, 14),
          redMat,
        );
        helmet.position.set(0, 1.0 * ZOOM, 18.5 * ZOOM);
        helmet.scale.set(1.05, 1.05, 0.95);
        helmet.castShadow = true;
        acc.add(helmet);

        // Aerodynamic dark visor
        const hVisor = new THREE.Mesh(
          this.assets.roundedBox(8.4 * ZOOM, 2.8 * ZOOM, 3.2 * ZOOM, 0.8 * ZOOM, 2),
          darkVisor,
        );
        hVisor.position.set(0, 5.8 * ZOOM, 18.2 * ZOOM);
        acc.add(hVisor);

        // Racing center white stripe over helmet top
        const stripe = new THREE.Mesh(
          this.assets.box('chk-race-stripe', 2.0 * ZOOM, 10.0 * ZOOM, 0.5 * ZOOM),
          whiteStripeMat,
        );
        stripe.position.set(0, 1.0 * ZOOM, 24.5 * ZOOM);
        acc.add(stripe);

        // Red silk racing scarf
        const scarf = new THREE.Mesh(
          this.assets.torus('chk-race-scarf', 7.0 * ZOOM, 1.4 * ZOOM, 8, 18),
          redMat,
        );
        scarf.position.set(0, 1.0 * ZOOM, 13.5 * ZOOM);
        acc.add(scarf);
        break;
      }

      case 'candy': {
        // 14 CANDY LAND: Candy Princess (Giant pink confectionery ribbon bow, pastel sweets dress)
        const pinkMat = this.pmat(0xff9ff3, 0, 60);
        const yellowMat = this.pmat(0xfeca57, 0, 60);
        const whiteMat = this.pmat(0xffffff, 0, 70);

        // Giant confection hair bow atop head
        const bowGroup = new THREE.Group();
        bowGroup.position.set(0, 0.8 * ZOOM, 24.5 * ZOOM);

        for (const s of [-1, 1]) {
          const bowLoop = new THREE.Mesh(
            this.assets.sphere(`chk-bow-loop-${s}`, 3.2 * ZOOM, 10, 8),
            pinkMat,
          );
          bowLoop.position.set(s * 3.4 * ZOOM, 0, 0);
          bowLoop.scale.set(0.6, 1.2, 0.9);
          bowGroup.add(bowLoop);
        }
        const bowKnot = new THREE.Mesh(
          this.assets.sphere('chk-bow-knot', 1.8 * ZOOM, 8, 6),
          yellowMat,
        );
        bowGroup.add(bowKnot);
        acc.add(bowGroup);

        // Pastel candy frosting collar
        const collar = new THREE.Mesh(
          this.assets.torus('chk-candy-collar', 6.8 * ZOOM, 1.4 * ZOOM, 8, 18),
          pinkMat,
        );
        collar.position.set(0, 1.0 * ZOOM, 13.5 * ZOOM);
        acc.add(collar);

        // Candy sprinkles on front
        for (let i = 0; i < 3; i++) {
          const sweet = new THREE.Mesh(
            this.assets.sphere(`chk-sweet-${i}`, 0.9 * ZOOM, 6, 6),
            i % 2 === 0 ? yellowMat : whiteMat,
          );
          sweet.position.set(0, 7.5 * ZOOM, (11.5 - i * 1.8) * ZOOM);
          acc.add(sweet);
        }
        break;
      }

      case 'ruins': {
        // 15 ANCIENT RUINS: Pharaoh Chicken (Blue & gold striped Nemes headdress, golden cobra, broad wesekh collar)
        const goldMat = this.pmat(0xf1c40f, 0, 80);
        const royalBlue = this.pmat(0x3867d6, 0, 60);
        const turquoiseMat = this.pmat(0x0abde3, 0, 70);

        // Nemes headdress framing head
        const nemes = new THREE.Mesh(
          this.assets.cylinder('chk-nemes', 7.8 * ZOOM, 8.8 * ZOOM, 4.6 * ZOOM, 16),
          royalBlue,
        );
        nemes.position.set(0, 0.5 * ZOOM, 21.5 * ZOOM);
        nemes.castShadow = true;
        acc.add(nemes);

        // Gold crown band
        const nemesBand = new THREE.Mesh(
          this.assets.torus('chk-nemes-band', 7.5 * ZOOM, 0.9 * ZOOM, 8, 18),
          goldMat,
        );
        nemesBand.position.set(0, 0.8 * ZOOM, 20.2 * ZOOM);
        acc.add(nemesBand);

        // Royal golden Uraeus cobra on forehead
        const uraeus = new THREE.Mesh(
          this.assets.sphere('chk-uraeus', 1.4 * ZOOM, 8, 6),
          goldMat,
        );
        uraeus.position.set(0, 6.8 * ZOOM, 23.0 * ZOOM);
        acc.add(uraeus);

        // Wesekh broad gold pectoral collar with turquoise jewel
        const wesekh = new THREE.Mesh(
          this.assets.torus('chk-wesekh', 7.2 * ZOOM, 1.6 * ZOOM, 8, 20),
          goldMat,
        );
        wesekh.position.set(0, 1.0 * ZOOM, 13.5 * ZOOM);
        acc.add(wesekh);

        const jewel = new THREE.Mesh(
          this.assets.box('chk-pharaoh-jewel', 2.0 * ZOOM, 0.8 * ZOOM, 2.0 * ZOOM),
          turquoiseMat,
        );
        jewel.position.set(0, 7.2 * ZOOM, 12.8 * ZOOM);
        acc.add(jewel);
        break;
      }

      case 'space': {
        // 16 SPACE: Astronaut Chicken (Pressurized spacesuit, gold reflective bubble helmet, chest module, oxygen backpack)
        const whiteMat = this.pmat(0xffffff, 0, 60);
        const goldVisorMat = this.smat(0xffd700, 0.95, 0.08, 0x443300);
        const cyanMat = this.pmat(0x38e1ff, 0, 80);
        const darkMat = this.pmat(0x222222, 0, 60);

        // Gold reflective bubble space helmet dome
        const dome = new THREE.Mesh(
          this.assets.sphere('chk-space-dome', 8.8 * ZOOM, 18, 16),
          goldVisorMat,
        );
        dome.position.set(0, 1.8 * ZOOM, 18.0 * ZOOM);
        dome.castShadow = true;
        acc.add(dome);

        // Suit neck collar ring
        const suitCollar = new THREE.Mesh(
          this.assets.torus('chk-suit-collar', 7.8 * ZOOM, 1.4 * ZOOM, 8, 20),
          whiteMat,
        );
        suitCollar.position.set(0, 1.0 * ZOOM, 13.0 * ZOOM);
        acc.add(suitCollar);

        // Chest control module
        const chestPack = new THREE.Mesh(
          this.assets.roundedBox(4.5 * ZOOM, 1.5 * ZOOM, 3.8 * ZOOM, 0.4 * ZOOM, 2),
          whiteMat,
        );
        chestPack.position.set(0, 7.5 * ZOOM, 10.5 * ZOOM);
        acc.add(chestPack);

        // Small cyan meter on chest pack
        const meter = new THREE.Mesh(
          this.assets.box('chk-space-meter', 1.6 * ZOOM, 0.4 * ZOOM, 1.2 * ZOOM),
          cyanMat,
        );
        meter.position.set(0, 8.2 * ZOOM, 10.5 * ZOOM);
        acc.add(meter);

        // Oxygen Life-Support Backpack on rear
        const backpack = new THREE.Mesh(
          this.assets.roundedBox(7.2 * ZOOM, 3.8 * ZOOM, 6.8 * ZOOM, 0.8 * ZOOM, 2),
          whiteMat,
        );
        backpack.position.set(0, -7.5 * ZOOM, 12.0 * ZOOM);
        backpack.castShadow = true;
        acc.add(backpack);

        // Dual oxygen tanks atop backpack
        for (const s of [-1, 1]) {
          const tank = new THREE.Mesh(
            this.assets.cylinder(`chk-space-tank-${s}`, 1.2 * ZOOM, 1.2 * ZOOM, 4.5 * ZOOM, 8),
            darkMat,
          );
          tank.position.set(s * 2.2 * ZOOM, -8.0 * ZOOM, 14.5 * ZOOM);
          acc.add(tank);
        }
        break;
      }

      case 'tokyo': {
        // 17 TOKYO: Samurai Chicken (Red Kabuto helmet with golden crescent horn, neck guard shikoro, samurai armor)
        const redArmor = this.pmat(0xe74c3c, 0, 50);
        const goldHorn = this.pmat(0xffd700, 0, 80);
        const blackLacquer = this.pmat(0x1e272e, 0, 70);

        // Kabuto helmet dome
        const kabuto = new THREE.Mesh(
          this.assets.sphere('chk-kabuto', 8.2 * ZOOM, 14, 12),
          redArmor,
        );
        kabuto.position.set(0, 0.8 * ZOOM, 19.5 * ZOOM);
        kabuto.scale.set(1.06, 1.06, 0.88);
        kabuto.castShadow = true;
        acc.add(kabuto);

        // Golden crescent moon horn maedate on front of helmet
        const horn = new THREE.Mesh(
          this.assets.torus('chk-crescent-horn', 4.2 * ZOOM, 0.85 * ZOOM, 8, 18),
          goldHorn,
        );
        horn.position.set(0, 5.8 * ZOOM, 23.8 * ZOOM);
        horn.rotation.x = Math.PI / 4;
        acc.add(horn);

        // Samurai neck guard plates (shikoro)
        const shikoro = new THREE.Mesh(
          this.assets.torus('chk-shikoro', 7.5 * ZOOM, 1.2 * ZOOM, 8, 16),
          blackLacquer,
        );
        shikoro.position.set(0, -1.5 * ZOOM, 17.0 * ZOOM);
        shikoro.rotation.x = -Math.PI / 8;
        acc.add(shikoro);

        // Samurai chest armor (do)
        const chestArmor = new THREE.Mesh(
          this.assets.cylinder('chk-samurai-do', 8.0 * ZOOM, 8.2 * ZOOM, 4.5 * ZOOM, 14),
          redArmor,
        );
        chestArmor.position.set(0, 0, 9.5 * ZOOM);
        acc.add(chestArmor);

        // Gold cherry blossom crest on chest
        const crest = new THREE.Mesh(
          this.assets.sphere('chk-samurai-crest', 1.2 * ZOOM, 8, 6),
          goldHorn,
        );
        crest.position.set(0, 7.5 * ZOOM, 10.8 * ZOOM);
        acc.add(crest);
        break;
      }

      case 'wildlife': {
        // 18 WILDLIFE: Safari Guide Chicken (Khaki pith helmet, vintage camera with strap, bush jacket)
        const khakiMat = this.pmat(0xd2b48c, 0, 30);
        const brownMat = this.pmat(0x745125, 0, 30);
        const darkMat = this.pmat(0x222222, 0, 70);
        const lensGlass = this.pmat(0x38e1ff, 0, 90);

        // Pith helmet
        const pith = new THREE.Mesh(
          this.assets.sphere('chk-pith', 8.0 * ZOOM, 14, 12),
          khakiMat,
        );
        pith.position.set(0, 1.0 * ZOOM, 21.0 * ZOOM);
        pith.scale.set(1.06, 1.06, 0.85);
        pith.castShadow = true;
        acc.add(pith);

        // Pith helmet brim ring
        const pithBrim = new THREE.Mesh(
          this.assets.torus('chk-pith-brim', 7.5 * ZOOM, 0.8 * ZOOM, 8, 18),
          khakiMat,
        );
        pithBrim.position.set(0, 1.0 * ZOOM, 19.5 * ZOOM);
        acc.add(pithBrim);

        // Vintage camera body around neck
        const camera = new THREE.Mesh(
          this.assets.roundedBox(4.0 * ZOOM, 2.0 * ZOOM, 2.8 * ZOOM, 0.4 * ZOOM, 2),
          darkMat,
        );
        camera.position.set(0, 7.2 * ZOOM, 10.8 * ZOOM);
        acc.add(camera);

        // Camera lens barrel
        const lens = new THREE.Mesh(
          this.assets.cylinder('chk-cam-lens', 1.2 * ZOOM, 1.2 * ZOOM, 1.0 * ZOOM, 10),
          lensGlass,
        );
        lens.position.set(0, 8.4 * ZOOM, 10.8 * ZOOM);
        lens.rotation.x = Math.PI / 2;
        acc.add(lens);

        // Leather neck strap
        const strap = new THREE.Mesh(
          this.assets.torus('chk-cam-strap', 6.8 * ZOOM, 0.5 * ZOOM, 8, 18),
          brownMat,
        );
        strap.position.set(0, 1.2 * ZOOM, 13.5 * ZOOM);
        acc.add(strap);
        break;
      }

      case 'underwater': {
        // 19 UNDERWATER: Scuba Diver Chicken (Neoprene wetsuit, diving mask, yellow snorkel, oxygen tanks)
        const cyanMat = this.pmat(0x0abde3, 0, 70);
        const yellowMat = this.pmat(0xfeca57, 0, 60);
        const maskGlassMat = this.pmat(0x48dbfb, 0, 90);
        const darkSuitMat = this.pmat(0x006296, 0, 50);

        // Scuba diving mask frame over eyes
        const mask = new THREE.Mesh(
          this.assets.roundedBox(8.6 * ZOOM, 2.8 * ZOOM, 3.2 * ZOOM, 0.8 * ZOOM, 2),
          cyanMat,
        );
        mask.position.set(0, 6.0 * ZOOM, 18.2 * ZOOM);
        mask.castShadow = true;
        acc.add(mask);

        // Mask glass lens
        const lens = new THREE.Mesh(
          this.assets.box('chk-scuba-lens', 7.4 * ZOOM, 0.3 * ZOOM, 2.4 * ZOOM),
          maskGlassMat,
        );
        lens.position.set(0, 6.8 * ZOOM, 18.2 * ZOOM);
        acc.add(lens);

        // Breathing snorkel tube curving up the side
        const snorkel = new THREE.Mesh(
          this.assets.cylinder('chk-snorkel', 0.8 * ZOOM, 0.8 * ZOOM, 9.5 * ZOOM, 8),
          yellowMat,
        );
        snorkel.position.set(5.5 * ZOOM, 3.8 * ZOOM, 21.5 * ZOOM);
        snorkel.rotation.x = -0.25;
        acc.add(snorkel);

        // Neoprene scuba suit belt
        const suitBelt = new THREE.Mesh(
          this.assets.torus('chk-scuba-belt', 7.8 * ZOOM, 1.2 * ZOOM, 8, 20),
          darkSuitMat,
        );
        suitBelt.position.set(0, 0, 9.5 * ZOOM);
        acc.add(suitBelt);

        // Yellow twin scuba oxygen tanks on back
        for (const s of [-1, 1]) {
          const tank = new THREE.Mesh(
            this.assets.cylinder(`chk-scuba-tank-${s}`, 1.8 * ZOOM, 1.8 * ZOOM, 7.5 * ZOOM, 10),
            yellowMat,
          );
          tank.position.set(s * 2.6 * ZOOM, -7.5 * ZOOM, 11.5 * ZOOM);
          tank.castShadow = true;
          acc.add(tank);
        }
        break;
      }

      case 'sky_island': {
        // 20 SKY ISLAND: Aviator Sky Explorer (Leather flight helmet, polished brass goggles, wind-blown scarf)
        const leatherMat = this.pmat(0x8a5f36, 0, 30);
        const brassMat = this.pmat(0xffd700, 0, 80);
        const scarfMat = this.pmat(0xe74c3c, 0, 50);
        const glassMat = this.pmat(0x74b9ff, 0, 90);

        // Aviator flight cap
        const flightCap = new THREE.Mesh(
          this.assets.sphere('chk-flight-cap', 7.8 * ZOOM, 14, 12),
          leatherMat,
        );
        flightCap.position.set(0, 1.0 * ZOOM, 18.6 * ZOOM);
        flightCap.scale.set(1.04, 1.04, 0.94);
        flightCap.castShadow = true;
        acc.add(flightCap);

        // Aviator brass goggles with glass lenses
        for (const s of [-1, 1]) {
          const goggle = new THREE.Mesh(
            this.assets.torus('chk-avi-goggle', 1.9 * ZOOM, 0.5 * ZOOM, 8, 14),
            brassMat,
          );
          goggle.position.set(s * 2.8 * ZOOM, 4.8 * ZOOM, 21.6 * ZOOM);
          goggle.rotation.x = Math.PI / 5;
          acc.add(goggle);

          const lens = new THREE.Mesh(
            this.assets.cylinder('chk-avi-lens', 1.5 * ZOOM, 1.5 * ZOOM, 0.2 * ZOOM, 10),
            glassMat,
          );
          lens.position.set(s * 2.8 * ZOOM, 4.8 * ZOOM, 21.6 * ZOOM);
          lens.rotation.x = Math.PI / 2 + 0.3;
          acc.add(lens);
        }

        // Wind-blown flight scarf wrapped around neck
        const scarf = new THREE.Mesh(
          this.assets.torus('chk-avi-scarf', 7.0 * ZOOM, 1.5 * ZOOM, 8, 18),
          scarfMat,
        );
        scarf.position.set(0, 1.0 * ZOOM, 13.5 * ZOOM);
        acc.add(scarf);

        // Scarf trailing wing end
        const scarfTail = new THREE.Mesh(
          this.assets.roundedBox(2.2 * ZOOM, 1.2 * ZOOM, 5.5 * ZOOM, 0.5 * ZOOM, 2),
          scarfMat,
        );
        scarfTail.position.set(4.0 * ZOOM, -4.8 * ZOOM, 10.5 * ZOOM);
        scarfTail.rotation.z = 0.3;
        acc.add(scarfTail);
        break;
      }

      default:
        // Classic city chicken — pristine, iconic, beloved!
        break;
    }

    g.add(acc);
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
    const comb = u.comb as THREE.Object3D | undefined;

    // Subtle gentle breathing head nod
    if (head && head.userData.base) {
      const bp = head.userData.base.p as THREE.Vector3;
      head.position.z = bp.z + Math.sin(s * 3.2) * 0.7 * ZOOM;
      head.rotation.x = Math.sin(s * 1.8) * 0.04;
    }

    if (comb && comb.userData.base) {
      const bp = comb.userData.base.p as THREE.Vector3;
      comb.position.z = bp.z + Math.sin(s * 3.2) * 0.7 * ZOOM;
      comb.rotation.z = Math.sin(s * 2.4) * 0.05;
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
