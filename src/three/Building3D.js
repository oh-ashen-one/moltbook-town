import * as THREE from 'three';
import { pixelTo3D } from './utils/coordinates.js';

// Building colors matching the 2D theme
const BUILDING_COLORS = {
  posting: 0xffd700,       // Gold
  commenting: 0x4a90d9,    // Blue
  doomscrolling: 0x9370db, // Purple
  vibecoding: 0x32cd32,    // Green
  fountain: 0x87ceeb,      // Light blue
  gpu: 0x00ff00,           // Neon green
  nvidia: 0x76b900,        // NVIDIA green
  openclaw: 0xff6b6b,      // Coral red
  servers: 0x4488ff,       // Blue
  lighthouse: 0xffffff,    // White
  lobstertank: 0x4488bb,   // Ocean blue
  trading: 0xffd700,       // Gold
  clocktower: 0xb22222     // Brick red
};

// Building data - original + new buildings
const BUILDINGS = [
  // Original buildings (inner ring)
  { key: 'posting', x: 240, y: 160, label: 'Posting' },
  { key: 'commenting', x: 720, y: 160, label: 'Commenting' },
  { key: 'doomscrolling', x: 240, y: 440, label: 'Doomscrolling' },
  { key: 'vibecoding', x: 740, y: 440, label: 'Vibecoding' },
  { key: 'fountain', x: 480, y: 320, label: 'Fountain' },
  // New buildings (outer ring)
  { key: 'gpu', x: 80, y: 320, label: 'GPU Mining' },
  { key: 'nvidia', x: 880, y: 320, label: 'NVIDIA HQ' },
  { key: 'openclaw', x: 480, y: 60, label: 'OpenClaw Labs' },
  { key: 'servers', x: 480, y: 580, label: 'Server Farm' },
  { key: 'lighthouse', x: 80, y: 60, label: 'Lighthouse' },
  { key: 'lobstertank', x: 880, y: 60, label: 'Lobster Tank' },
  { key: 'trading', x: 80, y: 580, label: 'Trading Post' },
  { key: 'clocktower', x: 880, y: 580, label: 'Clock Tower' }
];

export class Building3D {
  constructor(scene, buildingData) {
    this.scene = scene;
    this.data = buildingData;
    this.group = new THREE.Group();

    this.create();
  }

  create() {
    const pos = pixelTo3D(this.data.x, this.data.y);
    const color = BUILDING_COLORS[this.data.key] || 0x888888;

    // Route to specialized builder based on building type
    switch (this.data.key) {
      case 'fountain':
        this.createFountain(pos, color);
        break;
      case 'gpu':
        this.createGPU(pos, color);
        break;
      case 'nvidia':
        this.createNvidia(pos, color);
        break;
      case 'openclaw':
        this.createOpenClaw(pos, color);
        break;
      case 'servers':
        this.createServers(pos, color);
        break;
      case 'lighthouse':
        this.createLighthouse(pos, color);
        break;
      case 'lobstertank':
        this.createLobsterTank(pos, color);
        break;
      case 'trading':
        this.createTrading(pos, color);
        break;
      case 'clocktower':
        this.createClockTower(pos, color);
        break;
      default:
        this.createBuilding(pos, color);
    }

    this.group.position.set(pos.x, 0, pos.z);
    this.group.userData = { type: 'building', data: this.data };
    this.scene.add(this.group);
  }

  createBuilding(pos, color) {
    // Base building
    const buildingGeo = new THREE.BoxGeometry(6, 5, 6);
    const buildingMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1
    });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = 2.5;
    building.castShadow = true;
    building.receiveShadow = true;
    this.group.add(building);

    // Roof (pyramid)
    const roofGeo = new THREE.ConeGeometry(5, 3, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.8
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 6.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.group.add(roof);

    // Door
    const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.25, 3.1);
    this.group.add(door);

    // Windows
    const windowGeo = new THREE.BoxGeometry(1, 1, 0.2);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.3
    });

    [-1.5, 1.5].forEach(xOffset => {
      const window = new THREE.Mesh(windowGeo, windowMat);
      window.position.set(xOffset, 3, 3.1);
      this.group.add(window);
    });
  }

  createFountain(pos, color) {
    // Base pool
    const poolGeo = new THREE.CylinderGeometry(4, 4.5, 1, 16);
    const poolMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.y = 0.5;
    pool.receiveShadow = true;
    this.group.add(pool);

    // Water
    const waterGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.8, 16);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x4488bb,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.6;
    this.group.add(water);

    // Center pillar
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.7, 3, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 2;
    pillar.castShadow = true;
    this.group.add(pillar);

    // Top bowl
    const bowlGeo = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const bowl = new THREE.Mesh(bowlGeo, poolMat);
    bowl.position.y = 3.5;
    bowl.rotation.x = Math.PI;
    this.group.add(bowl);
  }

  createGPU(pos, color) {
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.8 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8
    });

    // Stack of 3 GPUs
    for (let i = 0; i < 3; i++) {
      // GPU body
      const gpuGeo = new THREE.BoxGeometry(5, 1.5, 8);
      const gpu = new THREE.Mesh(gpuGeo, blackMat);
      gpu.position.y = 1 + i * 2;
      gpu.castShadow = true;
      this.group.add(gpu);

      // Glowing strips (fans)
      const stripGeo = new THREE.BoxGeometry(1, 0.3, 6);
      [-1.5, 0, 1.5].forEach(xOffset => {
        const strip = new THREE.Mesh(stripGeo, glowMat);
        strip.position.set(xOffset, 1.8 + i * 2, 0);
        this.group.add(strip);
      });
    }

    // Base platform
    const baseGeo = new THREE.BoxGeometry(7, 0.5, 10);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.25;
    base.receiveShadow = true;
    this.group.add(base);
  }

  createNvidia(pos, color) {
    // Tall glass tower
    const towerGeo = new THREE.BoxGeometry(5, 12, 5);
    const towerMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.9
    });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 6;
    tower.castShadow = true;
    this.group.add(tower);

    // Glowing logo area (top section)
    const logoGeo = new THREE.BoxGeometry(5.2, 3, 5.2);
    const logoMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5
    });
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.position.y = 10;
    this.group.add(logo);

    // Base
    const baseGeo = new THREE.BoxGeometry(7, 1, 7);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.5;
    base.receiveShadow = true;
    this.group.add(base);
  }

  createOpenClaw(pos, color) {
    // Base building
    const buildingGeo = new THREE.BoxGeometry(8, 4, 6);
    const buildingMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = 2;
    building.castShadow = true;
    this.group.add(building);

    // Two large claws on top
    const clawMat = new THREE.MeshStandardMaterial({
      color: 0xcc4444,
      roughness: 0.4,
      metalness: 0.3
    });

    [-2.5, 2.5].forEach(xOffset => {
      // Claw arm
      const armGeo = new THREE.CylinderGeometry(0.4, 0.6, 3, 8);
      const arm = new THREE.Mesh(armGeo, clawMat);
      arm.position.set(xOffset, 5.5, 0);
      arm.rotation.z = xOffset > 0 ? -0.4 : 0.4;
      arm.castShadow = true;
      this.group.add(arm);

      // Pincer top
      const pincerGeo = new THREE.ConeGeometry(0.5, 2, 4);
      const pincer1 = new THREE.Mesh(pincerGeo, clawMat);
      pincer1.position.set(xOffset * 1.3, 7.5, -0.3);
      pincer1.rotation.x = -0.4;
      pincer1.rotation.z = xOffset > 0 ? -0.2 : 0.2;
      this.group.add(pincer1);

      // Pincer bottom
      const pincer2 = new THREE.Mesh(pincerGeo, clawMat);
      pincer2.position.set(xOffset * 1.3, 7, 0.3);
      pincer2.rotation.x = 0.4;
      pincer2.rotation.z = xOffset > 0 ? -0.2 : 0.2;
      this.group.add(pincer2);
    });

    // Door
    const doorGeo = new THREE.BoxGeometry(2, 3, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.5, 3.1);
    this.group.add(door);
  }

  createServers(pos, color) {
    // Long flat building
    const buildingGeo = new THREE.BoxGeometry(12, 3, 5);
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5 });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = 1.5;
    building.castShadow = true;
    building.receiveShadow = true;
    this.group.add(building);

    // Server lights (row of blinking dots)
    const lightMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1
    });

    for (let i = 0; i < 8; i++) {
      const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(-5 + i * 1.4, 2.5, 2.6);
      this.group.add(light);
    }

    // Roof vents
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    for (let i = 0; i < 3; i++) {
      const ventGeo = new THREE.BoxGeometry(2, 1, 2);
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.set(-4 + i * 4, 3.5, 0);
      vent.castShadow = true;
      this.group.add(vent);
    }
  }

  createLighthouse(pos, color) {
    // Tower (cylinder with stripes)
    const towerGeo = new THREE.CylinderGeometry(1.5, 2.5, 10, 16);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 5;
    tower.castShadow = true;
    this.group.add(tower);

    // Red stripes
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
    for (let i = 0; i < 3; i++) {
      const stripeGeo = new THREE.CylinderGeometry(1.6 - i * 0.15, 2.4 - i * 0.15, 1.5, 16);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = 2 + i * 3;
      this.group.add(stripe);
    }

    // Light room at top
    const lightRoomGeo = new THREE.CylinderGeometry(2, 1.5, 2, 8);
    const lightRoomMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffffaa,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9
    });
    const lightRoom = new THREE.Mesh(lightRoomGeo, lightRoomMat);
    lightRoom.position.y = 11;
    this.group.add(lightRoom);

    // Roof cap
    const capGeo = new THREE.ConeGeometry(2.2, 1.5, 8);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 12.5;
    cap.castShadow = true;
    this.group.add(cap);

    // Base
    const baseGeo = new THREE.CylinderGeometry(3.5, 4, 1, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.5;
    base.receiveShadow = true;
    this.group.add(base);
  }

  createLobsterTank(pos, color) {
    // Glass tank walls
    const glassMat = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1
    });

    // Tank frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

    // Tank base
    const baseGeo = new THREE.BoxGeometry(8, 0.5, 6);
    const base = new THREE.Mesh(baseGeo, frameMat);
    base.position.y = 0.25;
    base.receiveShadow = true;
    this.group.add(base);

    // Glass walls
    const wallGeo = new THREE.BoxGeometry(8, 5, 0.2);
    const frontWall = new THREE.Mesh(wallGeo, glassMat);
    frontWall.position.set(0, 3, 3);
    this.group.add(frontWall);

    const backWall = new THREE.Mesh(wallGeo, glassMat);
    backWall.position.set(0, 3, -3);
    this.group.add(backWall);

    const sideGeo = new THREE.BoxGeometry(0.2, 5, 6);
    const leftWall = new THREE.Mesh(sideGeo, glassMat);
    leftWall.position.set(-4, 3, 0);
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(sideGeo, glassMat);
    rightWall.position.set(4, 3, 0);
    this.group.add(rightWall);

    // Water inside
    const waterGeo = new THREE.BoxGeometry(7.5, 4, 5.5);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x4488bb,
      transparent: true,
      opacity: 0.5
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 2.5;
    this.group.add(water);

    // Bubbles (small spheres)
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    for (let i = 0; i < 8; i++) {
      const bubbleGeo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 8, 8);
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
      bubble.position.set(
        -3 + Math.random() * 6,
        1 + Math.random() * 3,
        -2 + Math.random() * 4
      );
      this.group.add(bubble);
    }
  }

  createTrading(pos, color) {
    // Building base
    const buildingGeo = new THREE.BoxGeometry(6, 5, 6);
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = 2.5;
    building.castShadow = true;
    this.group.add(building);

    // Gold trim
    const trimMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.8
    });

    // Ticker board (front)
    const tickerGeo = new THREE.BoxGeometry(5, 1.5, 0.3);
    const ticker = new THREE.Mesh(tickerGeo, trimMat);
    ticker.position.set(0, 4, 3.2);
    this.group.add(ticker);

    // "Numbers" on ticker (small rectangles)
    const numMat = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.8
    });
    for (let i = 0; i < 4; i++) {
      const numGeo = new THREE.BoxGeometry(0.8, 0.8, 0.1);
      const num = new THREE.Mesh(numGeo, numMat);
      num.position.set(-1.5 + i * 1, 4, 3.4);
      this.group.add(num);
    }

    // Roof with gold dome
    const domeGeo = new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, trimMat);
    dome.position.y = 5;
    dome.castShadow = true;
    this.group.add(dome);

    // Door
    const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.5 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.25, 3.1);
    this.group.add(door);
  }

  createClockTower(pos, color) {
    // Tower base
    const baseGeo = new THREE.BoxGeometry(5, 8, 5);
    const baseMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 4;
    base.castShadow = true;
    this.group.add(base);

    // Clock section
    const clockSectionGeo = new THREE.BoxGeometry(4, 3, 4);
    const clockSection = new THREE.Mesh(clockSectionGeo, baseMat);
    clockSection.position.y = 9.5;
    clockSection.castShadow = true;
    this.group.add(clockSection);

    // Clock faces (4 sides)
    const clockFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.3
    });
    const clockFaceGeo = new THREE.CircleGeometry(1.2, 16);

    // Front and back
    const clockFront = new THREE.Mesh(clockFaceGeo, clockFaceMat);
    clockFront.position.set(0, 9.5, 2.1);
    this.group.add(clockFront);

    const clockBack = new THREE.Mesh(clockFaceGeo, clockFaceMat);
    clockBack.position.set(0, 9.5, -2.1);
    clockBack.rotation.y = Math.PI;
    this.group.add(clockBack);

    // Left and right
    const clockLeft = new THREE.Mesh(clockFaceGeo, clockFaceMat);
    clockLeft.position.set(-2.1, 9.5, 0);
    clockLeft.rotation.y = -Math.PI / 2;
    this.group.add(clockLeft);

    const clockRight = new THREE.Mesh(clockFaceGeo, clockFaceMat);
    clockRight.position.set(2.1, 9.5, 0);
    clockRight.rotation.y = Math.PI / 2;
    this.group.add(clockRight);

    // Spire on top
    const spireGeo = new THREE.ConeGeometry(1.5, 4, 4);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.y = 13;
    spire.rotation.y = Math.PI / 4;
    spire.castShadow = true;
    this.group.add(spire);

    // Door
    const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.25, 2.6);
    this.group.add(door);
  }
}

export function createAllBuildings(scene) {
  return BUILDINGS.map(data => new Building3D(scene, data));
}
