# Moltbook Town: Day/Night Cycle

## Goal
Add a visual day/night cycle that affects the town's lighting and atmosphere.

## Current State
- Phaser 3 game with 960x640 canvas
- Town background drawn in `src/scenes/TownScene.js` via `drawTown()` method
- No time system exists
- No lighting/tint layer

## Implementation

### 1. Add Time System (`src/config.js`)

```javascript
// Day/night cycle settings
DAY_CYCLE_DURATION: 120000,  // 2 minutes = full day
TIME_PHASES: {
  DAWN: { start: 0.0, end: 0.15, tint: 0xffccaa, alpha: 0.2 },
  DAY: { start: 0.15, end: 0.5, tint: 0xffffff, alpha: 0.0 },
  DUSK: { start: 0.5, end: 0.65, tint: 0xff8866, alpha: 0.25 },
  NIGHT: { start: 0.65, end: 1.0, tint: 0x3344aa, alpha: 0.4 },
}
```

### 2. Create TimeManager (`src/managers/TimeManager.js`)

```javascript
export class TimeManager {
  constructor(scene, cycleDuration = 120000) {
    this.scene = scene;
    this.cycleDuration = cycleDuration;
    this.currentTime = 0; // 0.0 - 1.0 (normalized)
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

  // Get interpolated tint/alpha for smooth transitions
  getCurrentLighting() {
    const phase = CONFIG.TIME_PHASES[this.phase];
    // Lerp between phases for smooth transition
    return { tint: phase.tint, alpha: phase.alpha };
  }
}
```

### 3. Add Lighting Overlay (`src/scenes/TownScene.js`)

```javascript
// In create():
this.timeManager = new TimeManager(this);
this.lightingOverlay = this.add.rectangle(
  CONFIG.GAME_WIDTH / 2,
  CONFIG.GAME_HEIGHT / 2,
  CONFIG.GAME_WIDTH,
  CONFIG.GAME_HEIGHT,
  0x000000, 0
).setDepth(1000); // Above everything

// In update():
this.timeManager.update(delta);
const lighting = this.timeManager.getCurrentLighting();
this.lightingOverlay.setFillStyle(lighting.tint, lighting.alpha);
```

### 4. Add Window Lights for Buildings

Buildings should glow at night:

```javascript
// In drawTown() or separate method:
this.windowLights = [];

// For each building, add window rectangles
const windows = [
  { x: 100, y: 80, w: 8, h: 8 },  // Cafe windows
  { x: 112, y: 80, w: 8, h: 8 },
  // ... more windows
];

windows.forEach(w => {
  const light = this.add.rectangle(w.x, w.y, w.w, w.h, 0xffee88, 0);
  this.windowLights.push(light);
});

// In update, toggle based on time:
const isNight = this.timeManager.phase === 'NIGHT' || this.timeManager.phase === 'DUSK';
this.windowLights.forEach(w => w.setAlpha(isNight ? 0.8 : 0));
```

### 5. Optional: Agent Behavior Changes

Agents could have different behaviors at night:
- Slower movement
- Move toward buildings
- Sleep animations (eyes closed)

```javascript
// In Agent.update():
if (scene.timeManager.phase === 'NIGHT') {
  this.speed = CONFIG.AGENT_SPEED * 0.5; // Slower at night
}
```

### 6. Optional: Stars at Night

Add twinkling stars during night phase:

```javascript
// In create():
this.stars = [];
for (let i = 0; i < 30; i++) {
  const star = this.add.circle(
    Math.random() * CONFIG.GAME_WIDTH,
    Math.random() * CONFIG.GAME_HEIGHT * 0.3,
    1, 0xffffff, 0
  ).setDepth(999);
  this.stars.push(star);
}

// In update():
const isNight = this.timeManager.phase === 'NIGHT';
this.stars.forEach((star, i) => {
  const twinkle = Math.sin(time / 300 + i) * 0.3 + 0.7;
  star.setAlpha(isNight ? twinkle : 0);
});
```

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/config.js` | Add DAY_CYCLE_DURATION, TIME_PHASES |
| `src/managers/TimeManager.js` | **NEW** - Time tracking + phase logic |
| `src/scenes/TownScene.js` | Add lighting overlay, window lights, stars |
| `src/entities/Agent.js` | Optional: night behavior changes |

## Verification

1. Run `npm run dev`
2. Watch for 2 minutes - should see full cycle: dawn → day → dusk → night → dawn
3. Check:
   - Screen tint changes smoothly
   - Building windows glow at night
   - Stars appear and twinkle at night (if implemented)

## Configuration Tweaks

Adjust these values as needed:
- `DAY_CYCLE_DURATION`: 120000 (2 min) for testing, 300000 (5 min) for production
- `alpha` values in TIME_PHASES: Lower = more subtle, higher = more dramatic
- Tint colors: Adjust hex values for different atmosphere

## Notes

- Keep lighting overlay depth high (1000+) so it's above all game elements
- Use alpha blending, not multiply, to maintain sprite visibility
- Stars should be depth 999 (below overlay) so they get tinted too
