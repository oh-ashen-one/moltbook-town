import { CONFIG } from '../config.js';

export class TimeManager {
  constructor(scene, cycleDuration = CONFIG.DAY_CYCLE_DURATION) {
    this.scene = scene;
    this.cycleDuration = cycleDuration;
    this.currentTime = 0.5; // Start at dusk (so user sees effect immediately)
    this.phase = 'DAY';
  }

  update(delta) {
    // Advance time
    this.currentTime += delta / this.cycleDuration;
    if (this.currentTime >= 1.0) this.currentTime = 0;

    // Determine phase
    this.phase = this.getPhase(this.currentTime);
  }

  getPhase(time) {
    for (const [name, config] of Object.entries(CONFIG.TIME_PHASES)) {
      if (time >= config.start && time < config.end) return name;
    }
    return 'DAY';
  }

  // Get interpolated lighting for smooth transitions
  getCurrentLighting() {
    const phases = CONFIG.TIME_PHASES;
    const current = phases[this.phase];

    // Find next phase for interpolation
    const phaseOrder = ['DAWN', 'DAY', 'DUSK', 'NIGHT'];
    const currentIndex = phaseOrder.indexOf(this.phase);
    const nextIndex = (currentIndex + 1) % phaseOrder.length;
    const nextPhase = phases[phaseOrder[nextIndex]];

    // Calculate progress within current phase
    const phaseLength = current.end - current.start;
    const progress = (this.currentTime - current.start) / phaseLength;

    // Lerp alpha for smooth transition
    const alpha = current.alpha + (nextPhase.alpha - current.alpha) * this.easeInOut(progress);

    // Lerp tint color
    const tint = this.lerpColor(current.tint, nextPhase.tint, this.easeInOut(progress));

    return { tint, alpha };
  }

  easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  lerpColor(color1, color2, t) {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  isNightTime() {
    return this.phase === 'NIGHT' || this.phase === 'DUSK';
  }
}
