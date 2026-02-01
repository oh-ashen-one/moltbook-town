import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { pixelTo3D } from './utils/coordinates.js';

// Colors based on karma tiers (matching 2D)
const KARMA_COLORS = {
  high: 0xffd700,    // Gold (500+)
  medium: 0x87ceeb,  // Sky blue (200+)
  low: 0xff6b6b      // Coral (default)
};

// Molty sprite colors
const MOLTY_COLORS = [
  0xff6b6b, // red
  0x4a90d9, // blue
  0x88d8b0, // green
  0x9370db, // purple
  0xffa500  // orange
];

export class Agent3D {
  constructor(scene, agentData) {
    this.scene = scene;
    this.agentData = agentData;
    this.group = new THREE.Group();
    this.targetPosition = null;
    this.bobOffset = Math.random() * Math.PI * 2;

    this.create();
  }

  create() {
    const karma = this.agentData.karma || 0;
    const color = this.getColorFromKarma(karma);
    const scale = this.getScaleFromKarma(karma);

    // Body material (shared)
    this.bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.2
    });

    // Main body - horizontal capsule (lobster body)
    const bodyGeo = new THREE.CapsuleGeometry(0.3 * scale, 0.5 * scale, 8, 16);
    this.body = new THREE.Mesh(bodyGeo, this.bodyMat);
    this.body.rotation.x = Math.PI / 2; // Lay horizontal
    this.body.position.y = 0.5 * scale;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Tail segments (3 smaller capsules getting smaller)
    for (let i = 0; i < 3; i++) {
      const segSize = (3 - i) * 0.07 * scale;
      const tailSeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(segSize, segSize * 1.2, 4, 8),
        this.bodyMat
      );
      tailSeg.rotation.x = Math.PI / 2;
      tailSeg.position.set(0, 0.4 * scale, (0.45 + i * 0.18) * scale);
      this.group.add(tailSeg);
    }

    // Tail fan
    const fanGeo = new THREE.ConeGeometry(0.2 * scale, 0.25 * scale, 5, 1);
    const fan = new THREE.Mesh(fanGeo, this.bodyMat);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(0, 0.35 * scale, 1.0 * scale);
    this.group.add(fan);

    // Claws
    this.createClaw(scale, -0.35);
    this.createClaw(scale, 0.35);

    // Eyes on stalks
    this.createEyes(scale);

    // Antennae
    this.createAntennae(scale);

    // Glow for high karma
    if (karma >= 200) {
      const glowColor = karma >= 500 ? 0xffd700 : 0xaaddff;
      const glowGeo = new THREE.SphereGeometry(0.9 * scale, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.15
      });
      this.glow = new THREE.Mesh(glowGeo, glowMat);
      this.glow.position.y = 0.5 * scale;
      this.group.add(this.glow);
    }

    // Shadow on ground
    const shadowGeo = new THREE.CircleGeometry(0.6 * scale, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.01;
    this.group.add(this.shadow);

    // Set initial position
    if (this.agentData.position) {
      const pos = pixelTo3D(this.agentData.position.x, this.agentData.position.y);
      this.group.position.set(pos.x, 0, pos.z);
    }

    // Add floating name and karma labels
    this.createLabels();

    this.group.userData = { type: 'agent', data: this.agentData, agent3d: this };
    this.scene.add(this.group);
  }

  createClaw(scale, xOffset) {
    // Arm segment
    const armGeo = new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 0.35 * scale);
    const arm = new THREE.Mesh(armGeo, this.bodyMat);
    arm.position.set(xOffset * scale, 0.45 * scale, -0.15 * scale);
    arm.rotation.z = xOffset > 0 ? -0.6 : 0.6;
    this.group.add(arm);

    // Pincer top
    const pincerGeo = new THREE.ConeGeometry(0.07 * scale, 0.22 * scale, 4);
    const pincer1 = new THREE.Mesh(pincerGeo, this.bodyMat);
    const clawX = xOffset * 1.4 * scale;
    const clawZ = -0.38 * scale;
    pincer1.position.set(clawX, 0.52 * scale, clawZ);
    pincer1.rotation.x = -0.4;
    pincer1.rotation.z = xOffset > 0 ? -0.2 : 0.2;
    this.group.add(pincer1);

    // Pincer bottom
    const pincer2 = new THREE.Mesh(pincerGeo, this.bodyMat);
    pincer2.position.set(clawX, 0.38 * scale, clawZ);
    pincer2.rotation.x = 0.4;
    pincer2.rotation.z = xOffset > 0 ? -0.2 : 0.2;
    this.group.add(pincer2);
  }

  createEyes(scale) {
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

    [-0.1, 0.1].forEach(xOffset => {
      // Eye stalk
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025 * scale, 0.035 * scale, 0.18 * scale),
        this.bodyMat
      );
      stalk.position.set(xOffset * scale, 0.7 * scale, -0.2 * scale);
      this.group.add(stalk);

      // Eye ball
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 * scale, 8, 8),
        eyeMat
      );
      eye.position.set(xOffset * scale, 0.82 * scale, -0.2 * scale);
      this.group.add(eye);

      // Pupil
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.035 * scale, 6, 6),
        pupilMat
      );
      pupil.position.set(xOffset * scale, 0.82 * scale, -0.26 * scale);
      this.group.add(pupil);
    });
  }

  createAntennae(scale) {
    [-0.06, 0.06].forEach((xOffset, i) => {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012 * scale, 0.018 * scale, 0.45 * scale),
        this.bodyMat
      );
      antenna.position.set(xOffset * scale, 0.75 * scale, -0.35 * scale);
      antenna.rotation.x = -0.7;
      antenna.rotation.z = i === 0 ? 0.35 : -0.35;
      this.group.add(antenna);
    });
  }

  createLabels() {
    const karma = this.agentData.karma || 0;
    const scale = this.getScaleFromKarma(karma);

    // Name label (adjusted for lobster height)
    const nameDiv = document.createElement('div');
    nameDiv.className = 'agent-label';
    nameDiv.textContent = this.agentData.name;
    this.nameLabel = new CSS2DObject(nameDiv);
    this.nameLabel.position.set(0, 1.4 * scale, 0);
    this.group.add(this.nameLabel);

    // Karma badge (only show if karma > 0)
    if (karma > 0) {
      const karmaDiv = document.createElement('div');
      karmaDiv.className = 'karma-badge';
      let badge = karma >= 500 ? '👑' : karma >= 100 ? '⭐' : '✨';
      karmaDiv.textContent = `${badge} ${karma}`;
      this.karmaBadgeLabel = new CSS2DObject(karmaDiv);
      this.karmaBadgeLabel.position.set(0, 1.8 * scale, 0);
      this.group.add(this.karmaBadgeLabel);
    }
  }

  getColorFromKarma(karma) {
    return 0xff6b6b; // All lobsters are red
  }

  getScaleFromKarma(karma) {
    // Scale from 0.8 to 1.3 based on karma
    const minScale = 0.8;
    const maxScale = 1.3;
    const normalizedKarma = Math.min(karma / 500, 1);
    return minScale + normalizedKarma * (maxScale - minScale);
  }

  hashName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  setTarget(pixelX, pixelY) {
    const pos = pixelTo3D(pixelX, pixelY);
    this.targetPosition = { x: pos.x, z: pos.z };
  }

  updatePosition(pixelX, pixelY) {
    const pos = pixelTo3D(pixelX, pixelY);
    this.targetPosition = { x: pos.x, z: pos.z };
  }

  update(delta, time, graphMode = false) {
    // Move towards target (only in town mode)
    if (this.targetPosition && !graphMode) {
      const speed = 3 * delta;
      const dx = this.targetPosition.x - this.group.position.x;
      const dz = this.targetPosition.z - this.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.1) {
        this.group.position.x += (dx / dist) * Math.min(speed, dist);
        this.group.position.z += (dz / dist) * Math.min(speed, dist);

        // Face movement direction
        this.group.rotation.y = Math.atan2(dx, dz);
      }
    }

    // Bob animation (lobster body is at 0.5 * scale) - only in town mode
    if (!graphMode) {
      const bobAmount = Math.sin(time * 0.003 + this.bobOffset) * 0.08;
      this.body.position.y = 0.5 * this.getScaleFromKarma(this.agentData.karma || 0) + bobAmount;

      // Pulse glow (move with body)
      if (this.glow) {
        this.glow.material.opacity = 0.1 + Math.sin(time * 0.002 + this.bobOffset) * 0.05;
        this.glow.position.y = 0.5 * this.getScaleFromKarma(this.agentData.karma || 0) + bobAmount;
      }
    }
  }

  updateData(newData) {
    this.agentData = { ...this.agentData, ...newData };
    this.group.userData.data = this.agentData;
  }

  // Show speech bubble with content
  showSpeechBubble(content, duration = 6000) {
    // Remove existing bubble if any
    if (this.speechBubble) {
      this.speechBubble.element.remove();
      this.group.remove(this.speechBubble);
      this.speechBubble = null;
    }

    const scale = this.getScaleFromKarma(this.agentData.karma || 0);

    // Create bubble element
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'speech-bubble';
    bubbleDiv.innerHTML = `
      <div class="speech-bubble-title">💬 ${this.agentData.name}</div>
      <div>${content.substring(0, 100)}${content.length > 100 ? '...' : ''}</div>
    `;

    // Create CSS2D object
    this.speechBubble = new CSS2DObject(bubbleDiv);
    this.speechBubble.position.set(0, 3.5 * scale, 0);
    this.group.add(this.speechBubble);

    // Auto-hide after duration
    setTimeout(() => {
      if (this.speechBubble && bubbleDiv.parentElement) {
        bubbleDiv.classList.add('fading');
        setTimeout(() => {
          if (this.speechBubble) {
            bubbleDiv.remove();
            this.group.remove(this.speechBubble);
            this.speechBubble = null;
          }
        }, 500);
      }
    }, duration);
  }

  dispose() {
    // Remove label DOM elements
    if (this.nameLabel && this.nameLabel.element) {
      this.nameLabel.element.remove();
    }
    if (this.karmaBadgeLabel && this.karmaBadgeLabel.element) {
      this.karmaBadgeLabel.element.remove();
    }

    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
