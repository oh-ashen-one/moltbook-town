import * as THREE from 'three';

export class Edge3D {
  constructor(scene, sourceAgent, targetAgent, weight = 1) {
    this.scene = scene;
    this.sourceAgent = sourceAgent;
    this.targetAgent = targetAgent;
    this.weight = weight;
    this.group = new THREE.Group();

    // Pulse animation state
    this.isPulsing = false;
    this.pulseStart = 0;
    this.pulseDuration = 3000; // 3 seconds
    this.baseColor = null;

    this.create();
  }

  create() {
    // Line thickness and color based on weight
    const opacity = Math.min(0.3 + this.weight * 0.15, 0.8);
    const color = this.weight >= 3 ? 0xffd700 : this.weight >= 2 ? 0x88d8b0 : 0x4a90d9;

    // Create line geometry
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0)
    ];
    this.geometry = new THREE.BufferGeometry().setFromPoints(points);

    // Main line
    this.material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      linewidth: 1 // Note: linewidth only works in certain renderers
    });
    this.line = new THREE.Line(this.geometry, this.material);
    this.group.add(this.line);

    // Glow effect using a tube for thicker lines
    if (this.weight >= 2) {
      this.glowMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: opacity * 0.3
      });
    }

    this.scene.add(this.group);
    this.updatePositions();
  }

  updatePositions() {
    if (!this.sourceAgent || !this.targetAgent) return;

    const sourcePos = this.sourceAgent.group.position;
    const targetPos = this.targetAgent.group.position;

    // Update line geometry
    const positions = this.geometry.attributes.position.array;
    positions[0] = sourcePos.x;
    positions[1] = sourcePos.y + 0.8; // Slightly above ground
    positions[2] = sourcePos.z;
    positions[3] = targetPos.x;
    positions[4] = targetPos.y + 0.8;
    positions[5] = targetPos.z;
    this.geometry.attributes.position.needsUpdate = true;
  }

  update(time) {
    this.updatePositions();

    if (!this.material) return;

    const baseOpacity = Math.min(0.3 + this.weight * 0.15, 0.8);

    // Handle pulse animation
    if (this.isPulsing) {
      const elapsed = Date.now() - this.pulseStart;
      const progress = elapsed / this.pulseDuration;

      if (progress >= 1) {
        // Pulse finished
        this.isPulsing = false;
        this.material.color.setHex(this.baseColor);
        this.material.opacity = baseOpacity;
      } else {
        // Pulse in progress - bright gold that fades
        const intensity = 1 - progress; // 1 -> 0
        this.material.opacity = baseOpacity + intensity * 0.5;
        // Lerp color from gold (pulse) back to base
        const pulseColor = new THREE.Color(0xffd700);
        const originalColor = new THREE.Color(this.baseColor);
        this.material.color.copy(pulseColor).lerp(originalColor, progress);
      }
    } else {
      // Normal subtle animation
      this.material.opacity = baseOpacity + Math.sin(time * 0.002) * 0.1;
    }
  }

  // Trigger a pulse animation (called when new activity detected)
  pulse() {
    if (!this.baseColor) {
      this.baseColor = this.material.color.getHex();
    }
    this.isPulsing = true;
    this.pulseStart = Date.now();
    console.log(`Edge pulse: ${this.sourceAgent.agentData.name} ↔ ${this.targetAgent.agentData.name}`);
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  dispose() {
    this.scene.remove(this.group);
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.glowMaterial) this.glowMaterial.dispose();
  }
}
