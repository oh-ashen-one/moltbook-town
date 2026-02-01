import * as THREE from 'three';
import { WORLD_WIDTH, WORLD_HEIGHT } from './utils/coordinates.js';

export class Ground {
  constructor(scene) {
    this.scene = scene;
    this.create();
  }

  create() {
    const expandedWidth = WORLD_WIDTH + 40;
    const expandedHeight = WORLD_HEIGHT + 40;

    const groundGeo = new THREE.PlaneGeometry(expandedWidth, expandedHeight);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.9 });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.createPaths();
    this.createTrees();
    this.createBushes();
    this.createRocks();
    this.createLampPosts();
    this.createBenches();
    this.createTrashCans();
    this.createSigns();
    this.createVendorCarts();
    this.createTechProps();
    this.createCryptoProps();
    this.createStatues();
    this.createFlowerBeds();
    this.createPonds();
    this.createMushrooms();
    this.createEasterEggs();
    this.createCityProps();
  }

  createPaths() {
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.95 });

    // Main cross paths
    const hPath = new THREE.Mesh(new THREE.PlaneGeometry(120, 4), pathMat);
    hPath.rotation.x = -Math.PI/2; hPath.position.y = 0.01;
    this.scene.add(hPath);

    const vPath = new THREE.Mesh(new THREE.PlaneGeometry(4, 80), pathMat);
    vPath.rotation.x = -Math.PI/2; vPath.position.y = 0.01;
    this.scene.add(vPath);

    // Outer ring
    [[-26, 100, 3], [26, 100, 3]].forEach(([z, w, h]) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pathMat);
      p.rotation.x = -Math.PI/2; p.position.set(0, 0.01, z);
      this.scene.add(p);
    });
    [[-40, 3, 60], [40, 3, 60]].forEach(([x, w, h]) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pathMat);
      p.rotation.x = -Math.PI/2; p.position.set(x, 0.01, 0);
      this.scene.add(p);
    });
  }

  createTrees() {
    const positions = [
      [-55,-40],[-55,40],[55,-40],[55,40],[-55,-15],[-55,15],[55,-15],[55,15],
      [-25,-40],[25,-40],[-25,40],[25,40],[-50,-30],[50,-30],[-50,30],[50,30],
      [-45,-45],[45,-45],[-45,45],[45,45],[-60,0],[60,0],[0,-45],[0,45],
      [-58,-25],[58,-25],[-58,25],[58,25],[-35,-42],[35,-42],[-35,42],[35,42]
    ];
    positions.forEach(([x,z]) => {
      const g = new THREE.Group();
      const s = 0.7 + Math.random() * 0.6;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3*s,0.4*s,2*s,8), new THREE.MeshStandardMaterial({color:0x4a3728}));
      trunk.position.y = s; trunk.castShadow = true; g.add(trunk);
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(2*s,4*s,8), new THREE.MeshStandardMaterial({color:0x2d5a27}));
      foliage.position.y = 4*s; foliage.castShadow = true; g.add(foliage);
      g.position.set(x,0,z);
      this.scene.add(g);
    });
  }

  createBushes() {
    const positions = [
      [-12,-8],[12,-8],[-12,8],[12,8],[-32,-13],[32,-13],[-32,13],[32,13],
      [-8,-20],[8,-20],[-8,20],[8,20],[-35,-35],[35,-35],[-35,35],[35,35],
      [-18,-3],[18,-3],[-3,-18],[3,18],[-28,-20],[28,20],[-20,28],[20,-28],
      [-45,-8],[45,8],[-8,45],[8,-45],[-52,-5],[52,5]
    ];
    const mat = new THREE.MeshStandardMaterial({color:0x3d7a3d,roughness:0.9});
    positions.forEach(([x,z]) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.8+Math.random()*0.4,8,8), mat);
      b.position.set(x,0.4,z); b.scale.y = 0.7; b.castShadow = true;
      this.scene.add(b);
    });
  }

  createRocks() {
    const mat = new THREE.MeshStandardMaterial({color:0x666666,roughness:0.9});
    const positions = [
      [-48,-20,0.8],[48,-20,0.6],[-48,20,0.7],[48,20,0.9],[0,-38,0.5],[0,38,0.6],
      [-30,-30,0.4],[30,30,0.5],[-15,35,0.3],[15,-35,0.4],[-55,10,0.6],[55,-10,0.5],
      [-42,-35,0.4],[42,35,0.5],[-20,-42,0.3],[20,42,0.4]
    ];
    positions.forEach(([x,z,s]) => {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s,0), mat);
      r.position.set(x,s*0.5,z); r.rotation.set(Math.random(),Math.random(),Math.random());
      r.castShadow = true; this.scene.add(r);
    });
  }

  createLampPosts() {
    const positions = [
      [-15,0],[15,0],[-30,0],[30,0],[0,-12],[0,12],[0,-22],[0,22],
      [-40,-15],[-40,15],[40,-15],[40,15],[-20,-26],[20,-26],[-20,26],[20,26],
      [-50,0],[50,0],[0,-35],[0,35],[-10,-26],[10,-26],[-10,26],[10,26],
      [-30,-26],[30,-26],[-30,26],[30,26],[-40,-26],[40,-26],[-40,26],[40,26]
    ];
    const metalMat = new THREE.MeshStandardMaterial({color:0x222222,metalness:0.7});
    const lightMat = new THREE.MeshStandardMaterial({color:0xffffaa,emissive:0xffffaa,emissiveIntensity:0.8});
    positions.forEach(([x,z]) => {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.12,4,8), metalMat);
      post.position.y = 2; post.castShadow = true; g.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8), lightMat);
      lamp.position.y = 4.2; g.add(lamp);
      g.position.set(x,0,z);
      this.scene.add(g);
    });
  }

  createBenches() {
    const positions = [[6,0,1.57],[-6,0,-1.57],[0,6,0],[0,-6,3.14],[20,0,1.57],[-20,0,-1.57],[0,18,0],[0,-18,3.14],
      [-24,-10,0],[24,-10,0],[-24,10,3.14],[24,10,3.14],[35,0,1.57],[-35,0,-1.57],[-12,-20,0],[12,20,3.14]];
    const wood = new THREE.MeshStandardMaterial({color:0x8b4513});
    const metal = new THREE.MeshStandardMaterial({color:0x333333,metalness:0.5});
    positions.forEach(([x,z,r]) => {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2,0.15,0.8), wood);
      seat.position.y = 0.6; seat.castShadow = true; g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2,0.6,0.1), wood);
      back.position.set(0,1,-0.35); back.castShadow = true; g.add(back);
      [-0.8,0.8].forEach(xOff => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.6,0.6), metal);
        leg.position.set(xOff,0.3,0); g.add(leg);
      });
      g.position.set(x,0,z); g.rotation.y = r;
      this.scene.add(g);
    });
  }

  createTrashCans() {
    const positions = [[-22,-12],[22,-12],[-22,20],[22,20],[-38,-2],[38,-2],[-38,20],[38,20],[-12,0],[12,0],
      [-40,-20],[40,-20],[-40,20],[40,20],[0,-30],[0,30]];
    const mat = new THREE.MeshStandardMaterial({color:0x2a5a2a});
    positions.forEach(([x,z]) => {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.25,0.8,8), mat);
      can.position.set(x,0.4,z); can.castShadow = true; this.scene.add(can);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.1,8), mat);
      lid.position.set(x,0.85,z); this.scene.add(lid);
    });
  }

  createSigns() {
    const signs = [
      [-10,-10,'MOLTBOOK',0xffd700],[10,10,'LOBSTER',0xff6b6b],[-30,5,'TO THE MOON',0x00ff00],
      [30,-5,'WAGMI',0x00ffff],[-10,30,'HODL',0xff8800],[10,-30,'GM',0xffff00],
      [-45,0,'GPU ZONE',0x00ff00],[45,0,'AI HUB',0x9900ff],[-25,-35,'CRYPTO',0xf7931a],[25,35,'WEB3',0x627eea]
    ];
    const postMat = new THREE.MeshStandardMaterial({color:0x4a3728});
    signs.forEach(([x,z,text,color]) => {
      const g = new THREE.Group();
      const signMat = new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.3});
      [-0.8,0.8].forEach(xOff => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,3,6), postMat);
        post.position.set(xOff,1.5,0); post.castShadow = true; g.add(post);
      });
      const board = new THREE.Mesh(new THREE.BoxGeometry(2,1,0.1), signMat);
      board.position.y = 2.5; board.castShadow = true; g.add(board);
      g.position.set(x,0,z);
      this.scene.add(g);
    });
  }

  createVendorCarts() {
    const carts = [[15,-5,0xff6600],[-15,5,0x6b4423],[25,15,0xff0000],[-25,-15,0x00aa00],
      [35,25,0xffff00],[-35,-25,0xff00ff],[5,25,0x00ffff],[-5,-25,0xaa00aa]];
    carts.forEach(([x,z,color]) => {
      const g = new THREE.Group();
      const cartMat = new THREE.MeshStandardMaterial({color});
      const metalMat = new THREE.MeshStandardMaterial({color:0x888888,metalness:0.5});
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5,1,1), cartMat);
      body.position.y = 1; body.castShadow = true; g.add(body);
      [-0.5,0.5].forEach(xOff => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.1,12), metalMat);
        wheel.position.set(xOff,0.25,0.5); wheel.rotation.x = Math.PI/2; g.add(wheel);
      });
      const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.2,0.5,8), new THREE.MeshStandardMaterial({color:0xffff00}));
      umbrella.position.y = 2.5; umbrella.castShadow = true; g.add(umbrella);
      g.position.set(x,0,z);
      this.scene.add(g);
    });
  }

  createTechProps() {
    // Satellite dishes
    const dishes = [[-8,32],[8,-32],[45,25],[-45,-25]];
    dishes.forEach(([x,z]) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({color:0xcccccc,metalness:0.7});
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.5,16,8,0,Math.PI*2,0,Math.PI/3), mat);
      dish.position.y = 2; dish.rotation.x = Math.PI/4; dish.castShadow = true; g.add(dish);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.2,2,8), mat);
      post.position.y = 1; post.castShadow = true; g.add(post);
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Server racks
    const racks = [[-5,28],[5,-28],[-45,10],[45,-10]];
    const rackMat = new THREE.MeshStandardMaterial({color:0x1a1a1a});
    const lightMat = new THREE.MeshStandardMaterial({color:0x00ff00,emissive:0x00ff00,emissiveIntensity:0.8});
    racks.forEach(([x,z]) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1,2.5,0.8), rackMat);
      body.position.y = 1.25; body.castShadow = true; g.add(body);
      for(let i=0;i<8;i++) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.1), lightMat);
        light.position.set(0.3,0.5+i*0.25,0.45); g.add(light);
      }
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Antenna towers
    const towers = [[-55,-35],[55,35]];
    towers.forEach(([x,z]) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({color:0x888888,metalness:0.6});
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.3,8,6), mat);
      tower.position.y = 4; tower.castShadow = true; g.add(tower);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8), new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:0.5}));
      top.position.y = 8.2; g.add(top);
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Robot statues
    const robots = [[15,22],[-15,-22]];
    robots.forEach(([x,z]) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({color:0x4488ff,metalness:0.8});
      const body = new THREE.Mesh(new THREE.BoxGeometry(1,1.5,0.8), mat);
      body.position.y = 1.5; body.castShadow = true; g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8), mat);
      head.position.y = 2.7; head.castShadow = true; g.add(head);
      const eyeMat = new THREE.MeshStandardMaterial({color:0xffff00,emissive:0xffff00,emissiveIntensity:0.8});
      [-0.2,0.2].forEach(xOff => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8), eyeMat);
        eye.position.set(xOff,2.8,0.45); g.add(eye);
      });
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Hologram displays
    const holos = [[0,-15],[0,15],[-30,-15],[30,15]];
    holos.forEach(([x,z]) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,0.3,8), new THREE.MeshStandardMaterial({color:0x333333}));
      base.position.y = 0.15; g.add(base);
      const holo = new THREE.Mesh(new THREE.ConeGeometry(0.8,2,6), new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x00ffff,emissiveIntensity:0.5,transparent:true,opacity:0.5}));
      holo.position.y = 1.3; g.add(holo);
      g.position.set(x,0,z);
      this.scene.add(g);
    });
  }

  createCryptoProps() {
    // Bitcoin ATMs
    const atms = [[-35,22],[35,-22],[-25,35],[25,-35]];
    atms.forEach(([x,z]) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1,1.8,0.6), new THREE.MeshStandardMaterial({color:0x333333}));
      body.position.y = 0.9; body.castShadow = true; g.add(body);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.05), new THREE.MeshStandardMaterial({color:0xf7931a,emissive:0xf7931a,emissiveIntensity:0.5}));
      screen.position.set(0,1.3,0.33); g.add(screen);
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Mining rigs
    const rigs = [[-42,5],[42,-5]];
    rigs.forEach(([x,z]) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:0.8});
      for(let i=0;i<3;i++) {
        const gpu = new THREE.Mesh(new THREE.BoxGeometry(2,0.8,1.5), mat);
        gpu.position.set(0,0.5+i*1,0); gpu.castShadow = true; g.add(gpu);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.1,1), new THREE.MeshStandardMaterial({color:0x00ff00,emissive:0x00ff00,emissiveIntensity:0.8}));
        glow.position.set(0,1+i*1,0); g.add(glow);
      }
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Moon statue
    const moonPos = [50,0];
    const moonG = new THREE.Group();
    const moonMat = new THREE.MeshStandardMaterial({color:0xffffcc,emissive:0xffffcc,emissiveIntensity:0.2});
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1.5,16,16), moonMat);
    moon.position.y = 3; moon.castShadow = true; moonG.add(moon);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.8,1,2,8), new THREE.MeshStandardMaterial({color:0x555555}));
    pedestal.position.y = 1; pedestal.castShadow = true; moonG.add(pedestal);
    moonG.position.set(moonPos[0],0,moonPos[1]);
    this.scene.add(moonG);

    // Diamond hands statue
    const diamondG = new THREE.Group();
    const diamondMat = new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x00ffff,emissiveIntensity:0.3,metalness:0.9});
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1,0), diamondMat);
    diamond.position.y = 3.5; diamond.castShadow = true; diamondG.add(diamond);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1,1.2,1.5,8), new THREE.MeshStandardMaterial({color:0x444444}));
    base.position.y = 0.75; base.castShadow = true; diamondG.add(base);
    diamondG.position.set(-50,0,0);
    this.scene.add(diamondG);
  }

  createStatues() {
    // Giant lobster statue
    const lobsterG = new THREE.Group();
    const bronzeMat = new THREE.MeshStandardMaterial({color:0xcd7f32,metalness:0.6,roughness:0.4});
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.8,1,8), new THREE.MeshStandardMaterial({color:0x555555}));
    pedestal.position.y = 0.5; pedestal.castShadow = true; lobsterG.add(pedestal);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.8,1.5,8,16), bronzeMat);
    body.position.y = 2.5; body.rotation.x = Math.PI/2; body.castShadow = true; lobsterG.add(body);
    [-1,1].forEach(xOff => {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.4,1,4), bronzeMat);
      claw.position.set(xOff,2.8,-1); claw.rotation.x = -0.5; claw.rotation.z = xOff*0.3; claw.castShadow = true; lobsterG.add(claw);
    });
    lobsterG.position.set(0,0,10);
    this.scene.add(lobsterG);

    // Founder statue
    const founderG = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({color:0x888888});
    const fBase = new THREE.Mesh(new THREE.BoxGeometry(2,1,2), stoneMat);
    fBase.position.y = 0.5; fBase.castShadow = true; founderG.add(fBase);
    const fBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,2.5,8), stoneMat);
    fBody.position.y = 2.25; fBody.castShadow = true; founderG.add(fBody);
    const fHead = new THREE.Mesh(new THREE.SphereGeometry(0.5,12,12), stoneMat);
    fHead.position.y = 4; fHead.castShadow = true; founderG.add(fHead);
    founderG.position.set(-15,0,-30);
    this.scene.add(founderG);

    // Abstract AI brain
    const brainG = new THREE.Group();
    const brainMat = new THREE.MeshStandardMaterial({color:0xff00ff,emissive:0xff00ff,emissiveIntensity:0.3,metalness:0.5});
    const brain = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2,1), brainMat);
    brain.position.y = 2.5; brain.castShadow = true; brainG.add(brain);
    const brainBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8,1,1,6), new THREE.MeshStandardMaterial({color:0x333333}));
    brainBase.position.y = 0.5; brainBase.castShadow = true; brainG.add(brainBase);
    brainG.position.set(15,0,30);
    this.scene.add(brainG);
  }

  createFlowerBeds() {
    const colors = [0xff6b6b,0xffeb3b,0xe91e63,0x9c27b0,0x2196f3,0x4caf50,0xff9800];
    const positions = [[-5,-5],[5,-5],[-5,5],[5,5],[-18,-18],[18,18],[-18,18],[18,-18],
      [-33,-8],[33,8],[-8,33],[8,-33],[-28,28],[28,-28]];
    positions.forEach(([x,z],i) => {
      const g = new THREE.Group();
      const dirt = new THREE.Mesh(new THREE.CircleGeometry(1.2,8), new THREE.MeshStandardMaterial({color:0x5d4037}));
      dirt.rotation.x = -Math.PI/2; dirt.position.y = 0.02; g.add(dirt);
      const flowerMat = new THREE.MeshStandardMaterial({color:colors[i%colors.length]});
      for(let j=0;j<6;j++) {
        const angle = (j/6)*Math.PI*2;
        const r = 0.4+Math.random()*0.5;
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.12+Math.random()*0.08,6,6), flowerMat);
        flower.position.set(Math.cos(angle)*r,0.25+Math.random()*0.15,Math.sin(angle)*r); g.add(flower);
      }
      g.position.set(x,0,z);
      this.scene.add(g);
    });
  }

  createPonds() {
    const ponds = [[-28,0],[28,0]];
    ponds.forEach(([x,z]) => {
      const g = new THREE.Group();
      const water = new THREE.Mesh(new THREE.CircleGeometry(2.5,16), new THREE.MeshStandardMaterial({color:0x4488bb,transparent:true,opacity:0.7,roughness:0.1}));
      water.rotation.x = -Math.PI/2; water.position.y = 0.05; g.add(water);
      for(let i=0;i<10;i++) {
        const angle = (i/10)*Math.PI*2;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25+Math.random()*0.15,0), new THREE.MeshStandardMaterial({color:0x666666}));
        rock.position.set(Math.cos(angle)*2.5,0.15,Math.sin(angle)*2.5);
        rock.rotation.set(Math.random(),Math.random(),Math.random());
        rock.castShadow = true; g.add(rock);
      }
      for(let i=0;i<3;i++) {
        const lily = new THREE.Mesh(new THREE.CircleGeometry(0.3,8), new THREE.MeshStandardMaterial({color:0x228b22}));
        lily.rotation.x = -Math.PI/2; lily.position.set(-1+Math.random()*2,0.07,-1+Math.random()*2); g.add(lily);
      }
      g.position.set(x,0,z);
      this.scene.add(g);
    });
  }

  createMushrooms() {
    const clusters = [[-42,-10],[42,10],[-10,-38],[10,38],[-52,20],[52,-20],[-20,42],[20,-42]];
    clusters.forEach(([x,z]) => {
      const g = new THREE.Group();
      const capColors = [0xff0000,0xffa500,0x8b4513,0xffff00];
      for(let i=0;i<4;i++) {
        const s = 0.3+Math.random()*0.4;
        const px = (Math.random()-0.5)*1.5;
        const pz = (Math.random()-0.5)*1.5;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1*s,0.15*s,0.4*s,8), new THREE.MeshStandardMaterial({color:0xf5f5dc}));
        stem.position.set(px,0.2*s,pz); stem.castShadow = true; g.add(stem);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25*s,8,4,0,Math.PI*2,0,Math.PI/2), new THREE.MeshStandardMaterial({color:capColors[i%capColors.length]}));
        cap.position.set(px,0.4*s,pz); cap.castShadow = true; g.add(cap);
      }
      g.position.set(x,0,z);
      this.scene.add(g);
    });
  }

  createEasterEggs() {
    // Rocket
    const rocketG = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({color:0xffffff});
    const redMat = new THREE.MeshStandardMaterial({color:0xff0000});
    const rBody = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,3,12), whiteMat);
    rBody.position.y = 1.5; rBody.castShadow = true; rocketG.add(rBody);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5,1,12), redMat);
    nose.position.y = 3.5; nose.castShadow = true; rocketG.add(nose);
    for(let i=0;i<3;i++) {
      const angle = (i/3)*Math.PI*2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1,1,0.6), redMat);
      fin.position.set(Math.sin(angle)*0.6,0.5,Math.cos(angle)*0.6);
      fin.rotation.y = -angle; fin.castShadow = true; rocketG.add(fin);
    }
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,0.2,16), new THREE.MeshStandardMaterial({color:0x444444}));
    pad.position.y = 0.1; pad.receiveShadow = true; rocketG.add(pad);
    rocketG.position.set(52,-38,0);
    this.scene.add(rocketG);

    // UFO
    const ufoG = new THREE.Group();
    const silverMat = new THREE.MeshStandardMaterial({color:0xc0c0c0,metalness:0.8});
    const glowMat = new THREE.MeshStandardMaterial({color:0x00ff00,emissive:0x00ff00,emissiveIntensity:0.8});
    const saucer = new THREE.Mesh(new THREE.SphereGeometry(1.5,16,8), silverMat);
    saucer.scale.y = 0.3; saucer.position.y = 6; saucer.castShadow = true; ufoG.add(saucer);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.6,12,6,0,Math.PI*2,0,Math.PI/2), new THREE.MeshStandardMaterial({color:0x88ccff,transparent:true,opacity:0.6}));
    dome.position.y = 6.3; ufoG.add(dome);
    for(let i=0;i<6;i++) {
      const angle = (i/6)*Math.PI*2;
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8), glowMat);
      light.position.set(Math.cos(angle)*1.2,6,Math.sin(angle)*1.2); ufoG.add(light);
    }
    ufoG.position.set(-52,0,38);
    this.scene.add(ufoG);

    // Treasure chest
    const chestG = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({color:0x8b4513});
    const goldMat = new THREE.MeshStandardMaterial({color:0xffd700,emissive:0xffd700,emissiveIntensity:0.3,metalness:0.8});
    const cBody = new THREE.Mesh(new THREE.BoxGeometry(1,0.6,0.7), woodMat);
    cBody.position.y = 0.3; cBody.castShadow = true; chestG.add(cBody);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1,0.15,0.7), woodMat);
    lid.position.set(0,0.7,-0.2); lid.rotation.x = -0.3; lid.castShadow = true; chestG.add(lid);
    for(let i=0;i<6;i++) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.03,12), goldMat);
      coin.position.set(-0.3+Math.random()*0.6,0.65,0.4+Math.random()*0.3);
      coin.rotation.x = Math.PI/2+(Math.random()-0.5)*0.5; chestG.add(coin);
    }
    chestG.position.set(55,0,42);
    this.scene.add(chestG);

    // Rubber duck
    const duckG = new THREE.Group();
    const yellowMat = new THREE.MeshStandardMaterial({color:0xffff00});
    const dBody = new THREE.Mesh(new THREE.SphereGeometry(0.3,12,12), yellowMat);
    dBody.scale.set(1,0.8,1.2); dBody.position.y = 0.15; duckG.add(dBody);
    const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.2,12,12), yellowMat);
    dHead.position.set(0,0.35,-0.2); duckG.add(dHead);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08,0.15,6), new THREE.MeshStandardMaterial({color:0xff8800}));
    beak.position.set(0,0.32,-0.4); beak.rotation.x = Math.PI/2; duckG.add(beak);
    duckG.position.set(-27,0,1);
    this.scene.add(duckG);
  }

  createCityProps() {
    // Fire hydrants
    const hydrants = [[-20,-5],[20,5],[-35,-18],[35,18],[-12,25],[12,-25]];
    const hydrantMat = new THREE.MeshStandardMaterial({color:0xff0000});
    hydrants.forEach(([x,z]) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,0.8,8), hydrantMat);
      body.position.y = 0.4; body.castShadow = true; g.add(body);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.22,8,8), hydrantMat);
      top.position.y = 0.85; g.add(top);
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Parking meters
    const meters = [[-18,-12],[18,12],[-32,5],[32,-5]];
    meters.forEach(([x,z]) => {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.2,6), new THREE.MeshStandardMaterial({color:0x444444}));
      post.position.y = 0.6; g.add(post);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.4,0.2), new THREE.MeshStandardMaterial({color:0x666666}));
      head.position.y = 1.4; head.castShadow = true; g.add(head);
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Phone booths
    const booths = [[-38,-22],[38,22]];
    booths.forEach(([x,z]) => {
      const g = new THREE.Group();
      const redMat = new THREE.MeshStandardMaterial({color:0xcc0000});
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2,2.5,1.2), redMat);
      frame.position.y = 1.25; frame.castShadow = true; g.add(frame);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.2,1.3), redMat);
      top.position.y = 2.6; top.castShadow = true; g.add(top);
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Mailboxes
    const mailboxes = [[38,15],[-38,-15],[15,38],[-15,-38]];
    const blueMat = new THREE.MeshStandardMaterial({color:0x0055aa});
    mailboxes.forEach(([x,z]) => {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.6,1,0.5), blueMat);
      box.position.y = 1.1; box.castShadow = true; g.add(box);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.6,8), new THREE.MeshStandardMaterial({color:0x333333}));
      post.position.y = 0.3; g.add(post);
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Vending machines
    const vending = [[-30,8],[30,-8],[-8,30],[8,-30]];
    vending.forEach(([x,z],i) => {
      const g = new THREE.Group();
      const color = [0xff0000,0x0066ff,0x00aa00,0xffaa00][i];
      const body = new THREE.Mesh(new THREE.BoxGeometry(1,2,0.8), new THREE.MeshStandardMaterial({color}));
      body.position.y = 1; body.castShadow = true; g.add(body);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.7,1.2,0.05), new THREE.MeshStandardMaterial({color:0xaaddff,emissive:0xaaddff,emissiveIntensity:0.2,transparent:true,opacity:0.7}));
      glass.position.set(0,1.2,0.43); g.add(glass);
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Picnic tables
    const tables = [[-32,-30],[32,30],[-15,35],[15,-35]];
    const woodMat = new THREE.MeshStandardMaterial({color:0x8b4513});
    tables.forEach(([x,z]) => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.5,0.15,1.2), woodMat);
      top.position.y = 0.9; top.castShadow = true; g.add(top);
      [-0.8,0.8].forEach(zOff => {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(2.5,0.1,0.4), woodMat);
        bench.position.set(0,0.5,zOff); bench.castShadow = true; g.add(bench);
      });
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Bus stops
    const busStops = [[-48,12],[48,-12]];
    busStops.forEach(([x,z]) => {
      const g = new THREE.Group();
      const metalMat = new THREE.MeshStandardMaterial({color:0x444444,metalness:0.5});
      const glassMat = new THREE.MeshStandardMaterial({color:0x88ccff,transparent:true,opacity:0.4});
      // Posts
      [-1,1].forEach(xOff => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,3,6), metalMat);
        post.position.set(xOff,1.5,0); post.castShadow = true; g.add(post);
      });
      // Roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.5,0.15,1.5), metalMat);
      roof.position.y = 3; roof.castShadow = true; g.add(roof);
      // Back panel
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.2,2,0.1), glassMat);
      back.position.set(0,1.5,-0.7); g.add(back);
      // Bench
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.1,0.5), metalMat);
      bench.position.set(0,0.6,0); g.add(bench);
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Newspaper stands
    const stands = [[-15,-2],[15,2]];
    stands.forEach(([x,z]) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.2,0.5), new THREE.MeshStandardMaterial({color:0x0066cc}));
      body.position.y = 0.6; body.castShadow = true; g.add(body);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.05), new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:0.6}));
      glass.position.set(0,0.8,0.28); g.add(glass);
      g.position.set(x,0,z);
      this.scene.add(g);
    });

    // Street art / murals (colored walls)
    const murals = [[-55,0,0],[55,0,Math.PI],[0,-48,Math.PI/2],[0,48,-Math.PI/2]];
    murals.forEach(([x,z,r],i) => {
      const colors = [0xff6b6b,0x4ecdc4,0xffe66d,0x95e1d3];
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(8,4,0.3), new THREE.MeshStandardMaterial({color:colors[i]}));
      wall.position.y = 2; wall.castShadow = true; g.add(wall);
      // Add some "art" rectangles
      for(let j=0;j<5;j++) {
        const art = new THREE.Mesh(new THREE.BoxGeometry(0.8+Math.random(),0.8+Math.random(),0.1), new THREE.MeshStandardMaterial({color:Math.random()*0xffffff}));
        art.position.set(-3+Math.random()*6,1+Math.random()*2,0.2); g.add(art);
      }
      g.position.set(x,0,z); g.rotation.y = r;
      this.scene.add(g);
    });
  }
}