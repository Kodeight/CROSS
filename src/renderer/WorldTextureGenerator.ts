/**
 * High-performance procedural PBR texture and canvas generator for CROSS!
 * Generates crisp, stylized PBR textures (diffuse, normal, roughness, emissive)
 * on dedicated HTML5 Canvas elements once at startup, creating reusable THREE.CanvasTexture
 * instances with optimal filtering, mipmaps, and anisotropy.
 */
import * as THREE from 'three';

export class WorldTextureGenerator {
  private static instance: WorldTextureGenerator | null = null;
  private textures = new Map<string, THREE.CanvasTexture>();

  static get(): WorldTextureGenerator {
    if (!WorldTextureGenerator.instance) {
      WorldTextureGenerator.instance = new WorldTextureGenerator();
    }
    return WorldTextureGenerator.instance;
  }

  getTexture(key: string): THREE.CanvasTexture {
    let tex = this.textures.get(key);
    if (!tex) {
      tex = this.generateTexture(key);
      this.textures.set(key, tex);
    }
    return tex;
  }

  private generateTexture(key: string): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    switch (key) {
      // -------------------------------------------------------------
      // CITY: Lush Park Grass
      // -------------------------------------------------------------
      case 'city_grass_diffuse': {
        // Multi-layered lush emerald grass with subtle tonal patches & blade noise
        ctx.fillStyle = '#68b838';
        ctx.fillRect(0, 0, size, size);

        // Soft tonal cloud patches
        for (let i = 0; i < 40; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const r = 30 + Math.random() * 80;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
          const isDarker = Math.random() > 0.45;
          grad.addColorStop(0, isDarker ? 'rgba(78, 142, 40, 0.4)' : 'rgba(138, 206, 68, 0.35)');
          grad.addColorStop(1, 'rgba(104, 184, 56, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Micro grass blade specks and clover sprigs
        for (let i = 0; i < 3500; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const c = Math.random();
          ctx.fillStyle = c < 0.33 ? '#5ca030' : c < 0.66 ? '#78c644' : '#90da54';
          ctx.fillRect(x, y, 2, 3);
        }
        break;
      }

      case 'city_grass_roughness': {
        ctx.fillStyle = '#b8b8b8'; // Organic matte roughness
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 1500; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.fillStyle = Math.random() > 0.5 ? '#d0d0d0' : '#a0a0a0';
          ctx.fillRect(x, y, 3, 3);
        }
        break;
      }

      // -------------------------------------------------------------
      // CITY / ROAD: Dark Asphalt with Aggregate Grain & Lane Edges
      // -------------------------------------------------------------
      case 'city_asphalt_diffuse': {
        // Deep charcoal asphalt with fine aggregate stone speckles & subtle tire path sheen
        ctx.fillStyle = '#262a33';
        ctx.fillRect(0, 0, size, size);

        // Subtle gradient for crown of the road / traffic wear
        const roadGrad = ctx.createLinearGradient(0, 0, 0, size);
        roadGrad.addColorStop(0, '#22252e');
        roadGrad.addColorStop(0.5, '#2a2f3b');
        roadGrad.addColorStop(1, '#22252e');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(0, 0, size, size);

        // Aggregate quartz / mineral granules in asphalt mix
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 22;
          data[i] = Math.min(255, Math.max(0, data[i] + noise));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise + 2));
        }
        ctx.putImageData(imgData, 0, 0);

        // Subtle micro pebble flecks
        for (let i = 0; i < 1200; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(180, 190, 205, 0.25)' : 'rgba(15, 18, 24, 0.4)';
          ctx.fillRect(x, y, 1.5, 1.5);
        }
        break;
      }

      case 'city_asphalt_roughness': {
        ctx.fillStyle = '#656565';
        ctx.fillRect(0, 0, size, size);
        // Polished wheel wear tracks (smoother/shinier)
        const trackGrad = ctx.createLinearGradient(0, 0, 0, size);
        trackGrad.addColorStop(0, '#757575');
        trackGrad.addColorStop(0.25, '#4e4e4e');
        trackGrad.addColorStop(0.5, '#686868');
        trackGrad.addColorStop(0.75, '#4e4e4e');
        trackGrad.addColorStop(1, '#757575');
        ctx.fillStyle = trackGrad;
        ctx.fillRect(0, 0, size, size);
        break;
      }

      // -------------------------------------------------------------
      // TOKYO: Wet Cyberpunk Asphalt with Puddle Reflections & Neon Sheen
      // -------------------------------------------------------------
      case 'tokyo_asphalt_diffuse': {
        ctx.fillStyle = '#181524';
        ctx.fillRect(0, 0, size, size);

        // Wet puddle reflections with slight purple/cyan neon tinting
        for (let i = 0; i < 16; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const rx = 40 + Math.random() * 90;
          const ry = 15 + Math.random() * 35;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, rx);
          const isNeonCyan = Math.random() > 0.5;
          grad.addColorStop(0, isNeonCyan ? 'rgba(0, 229, 255, 0.12)' : 'rgba(235, 77, 255, 0.1)');
          grad.addColorStop(0.6, 'rgba(25, 20, 38, 0.6)');
          grad.addColorStop(1, 'rgba(24, 21, 36, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Granular wet asphalt noise
        for (let i = 0; i < 1800; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(120, 100, 160, 0.2)' : 'rgba(5, 5, 12, 0.5)';
          ctx.fillRect(x, y, 2, 2);
        }
        break;
      }

      case 'tokyo_asphalt_roughness': {
        // High sheen wet road surface
        ctx.fillStyle = '#3a344a';
        ctx.fillRect(0, 0, size, size);
        // Glossy wet puddles (very low roughness for crisp reflections)
        for (let i = 0; i < 16; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const rx = 40 + Math.random() * 90;
          const ry = 15 + Math.random() * 35;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, rx);
          grad.addColorStop(0, 'rgba(15, 15, 25, 0.95)');
          grad.addColorStop(0.7, 'rgba(35, 30, 48, 0.5)');
          grad.addColorStop(1, 'rgba(58, 52, 74, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      // -------------------------------------------------------------
      // RIVER: Translucent Flowing Water Surface & Foam
      // -------------------------------------------------------------
      case 'river_water_diffuse': {
        const waterGrad = ctx.createLinearGradient(0, 0, 0, size);
        waterGrad.addColorStop(0, '#1d6f9b');
        waterGrad.addColorStop(0.5, '#1e88bb');
        waterGrad.addColorStop(1, '#195c82');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, 0, size, size);

        // Caustic ripple highlights
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.25)';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 28; i++) {
          const y = (i / 28) * size;
          ctx.beginPath();
          for (let x = 0; x <= size; x += 20) {
            const wave = Math.sin(x * 0.04 + i * 1.5) * 8;
            if (x === 0) ctx.moveTo(x, y + wave);
            else ctx.lineTo(x, y + wave);
          }
          ctx.stroke();
        }

        // Riverfoam bubbles
        for (let i = 0; i < 300; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(x, y, 1 + Math.random() * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'river_bank_diffuse': {
        // Wet silt, pebbles, and moss along the river bank
        ctx.fillStyle = '#4a7536';
        ctx.fillRect(0, 0, size, size);
        // Silt mud gradient
        const silt = ctx.createLinearGradient(0, 0, 0, size);
        silt.addColorStop(0, 'rgba(85, 65, 45, 0.6)');
        silt.addColorStop(1, 'rgba(50, 80, 40, 0.1)');
        ctx.fillStyle = silt;
        ctx.fillRect(0, 0, size, size);
        // River stones
        for (let i = 0; i < 150; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const r = 2 + Math.random() * 5;
          ctx.fillStyle = Math.random() > 0.5 ? '#6d6860' : '#4d4842';
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      // -------------------------------------------------------------
      // BEACH: Warm Sunlit Sand & Wet Shoreline
      // -------------------------------------------------------------
      case 'beach_sand_diffuse': {
        ctx.fillStyle = '#eed698';
        ctx.fillRect(0, 0, size, size);

        // Wind ripple wave patterns across dunes
        ctx.strokeStyle = 'rgba(215, 185, 120, 0.35)';
        ctx.lineWidth = 4;
        for (let y = 10; y < size; y += 32) {
          ctx.beginPath();
          for (let x = 0; x <= size; x += 30) {
            const wave = Math.sin(x * 0.03 + y * 0.1) * 6;
            if (x === 0) ctx.moveTo(x, y + wave);
            else ctx.lineTo(x, y + wave);
          }
          ctx.stroke();
        }

        // Fine mineral sand granules & tiny shell specks
        for (let i = 0; i < 2500; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const c = Math.random();
          ctx.fillStyle = c < 0.4 ? '#f6e4b4' : c < 0.8 ? '#d8bd78' : '#fff5dc';
          ctx.fillRect(x, y, 2, 2);
        }
        break;
      }

      case 'beach_wet_sand_diffuse': {
        // Saturated, reflective wet shoreline sand
        ctx.fillStyle = '#c8a86a';
        ctx.fillRect(0, 0, size, size);
        const wetGrad = ctx.createLinearGradient(0, 0, 0, size);
        wetGrad.addColorStop(0, 'rgba(170, 140, 85, 0.8)');
        wetGrad.addColorStop(0.6, 'rgba(210, 180, 120, 0.3)');
        wetGrad.addColorStop(1, 'rgba(160, 130, 75, 0.9)');
        ctx.fillStyle = wetGrad;
        ctx.fillRect(0, 0, size, size);
        break;
      }

      // -------------------------------------------------------------
      // VOLCANO: Obsidian Rock Crust & Glowing Magma Fissures
      // -------------------------------------------------------------
      case 'volcano_rock_diffuse': {
        ctx.fillStyle = '#221e22';
        ctx.fillRect(0, 0, size, size);

        // Basalt crags & charcoal stone slabs
        for (let i = 0; i < 60; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const r = 20 + Math.random() * 60;
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(45, 38, 42, 0.7)' : 'rgba(20, 16, 20, 0.8)';
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Fine ash speckles & cooling crust cracks
        for (let i = 0; i < 1800; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.fillStyle = Math.random() > 0.6 ? '#3a3236' : '#141014';
          ctx.fillRect(x, y, 2, 2);
        }
        break;
      }

      case 'volcano_lava_diffuse': {
        // Molten lava core with burning orange/yellow magma currents
        const lavaGrad = ctx.createLinearGradient(0, 0, size, size);
        lavaGrad.addColorStop(0, '#ff3b00');
        lavaGrad.addColorStop(0.35, '#ff8000');
        lavaGrad.addColorStop(0.65, '#ffb703');
        lavaGrad.addColorStop(1, '#ff2200');
        ctx.fillStyle = lavaGrad;
        ctx.fillRect(0, 0, size, size);

        // Dark cooling obsidian crust plates floating on top
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const rx = 25 + Math.random() * 50;
          const ry = 15 + Math.random() * 35;
          ctx.fillStyle = 'rgba(30, 20, 22, 0.85)';
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'volcano_lava_emissive': {
        // Thermal glow map for lava rivers
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const r = 15 + Math.random() * 45;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
          grad.addColorStop(0, 'rgba(255, 230, 100, 1.0)');
          grad.addColorStop(0.5, 'rgba(255, 90, 0, 0.8)');
          grad.addColorStop(1, 'rgba(180, 20, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      // -------------------------------------------------------------
      // CURBS & SIDEWALKS: Granite Beveled Texture & Paving
      // -------------------------------------------------------------
      case 'granite_curb_diffuse': {
        ctx.fillStyle = '#d0ccc0';
        ctx.fillRect(0, 0, size, size);
        // Stone aggregate grain
        for (let i = 0; i < 1600; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.fillStyle = Math.random() > 0.5 ? '#9e998c' : '#eae7dd';
          ctx.fillRect(x, y, 2, 2);
        }
        break;
      }

      case 'city_sidewalk_diffuse': {
        // Concrete paving slabs with expansion joints
        ctx.fillStyle = '#c5c2b6';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = '#8c887c';
        ctx.lineWidth = 3;
        // Tile grid
        const step = size / 4;
        for (let x = 0; x <= size; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, size);
          ctx.stroke();
        }
        for (let y = 0; y <= size; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size, y);
          ctx.stroke();
        }
        // Micro noise
        for (let i = 0; i < 1200; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)';
          ctx.fillRect(x, y, 2, 2);
        }
        break;
      }

      default: {
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 0, size, size);
        break;
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }
}
