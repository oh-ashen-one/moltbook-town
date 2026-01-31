import { CONFIG } from '../config.js';

export class WeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.currentWeather = 'clear';
    this.rainDrops = [];
    this.snowFlakes = [];
    this.clouds = [];
    this.transitioning = false;

    // Create particle textures
    this.createTextures();

    // Create weather elements
    this.createClouds();
    this.createRain();
    this.createSnow();

    // Start weather cycle
    this.scene.time.addEvent({
      delay: CONFIG.WEATHER.CHANGE_INTERVAL,
      callback: () => this.randomWeather(),
      loop: true
    });

    // Start with rain for demo
    this.scene.time.delayedCall(2000, () => this.setWeather('rain'));
  }

  createTextures() {
    // Rain drop texture (elongated)
    const rainG = this.scene.make.graphics({ add: false });
    rainG.fillStyle(0xaaccff, 0.6);
    rainG.fillRect(0, 0, 2, 8);
    rainG.generateTexture('raindrop', 2, 8);
    rainG.destroy();

    // Snowflake texture
    const snowG = this.scene.make.graphics({ add: false });
    snowG.fillStyle(0xffffff, 0.9);
    snowG.fillCircle(3, 3, 3);
    snowG.generateTexture('snowflake', 6, 6);
    snowG.destroy();
  }

  createClouds() {
    const w = CONFIG.GAME_WIDTH;
    for (let i = 0; i < CONFIG.WEATHER.CLOUD_COUNT; i++) {
      const cloud = this.scene.add.ellipse(
        Math.random() * w,
        30 + Math.random() * 60,
        80 + Math.random() * 60,
        30 + Math.random() * 20,
        0x888899,
        0
      ).setDepth(998);

      cloud.speed = 0.3 + Math.random() * 0.3;
      this.clouds.push(cloud);
    }
  }

  createRain() {
    const w = CONFIG.GAME_WIDTH;
    const h = CONFIG.GAME_HEIGHT;

    for (let i = 0; i < CONFIG.WEATHER.RAIN_INTENSITY; i++) {
      const drop = this.scene.add.image(
        Math.random() * w,
        Math.random() * h,
        'raindrop'
      ).setAlpha(0).setDepth(997);

      drop.baseX = drop.x;
      drop.speed = 400 + Math.random() * 200;
      drop.drift = 50 + Math.random() * 30;
      this.rainDrops.push(drop);
    }
  }

  createSnow() {
    const w = CONFIG.GAME_WIDTH;
    const h = CONFIG.GAME_HEIGHT;

    for (let i = 0; i < CONFIG.WEATHER.SNOW_INTENSITY; i++) {
      const flake = this.scene.add.image(
        Math.random() * w,
        Math.random() * h,
        'snowflake'
      ).setAlpha(0).setDepth(997).setScale(0.3 + Math.random() * 0.5);

      flake.speed = 30 + Math.random() * 40;
      flake.wobble = Math.random() * Math.PI * 2;
      flake.wobbleSpeed = 1 + Math.random();
      this.snowFlakes.push(flake);
    }
  }

  setWeather(type) {
    if (!CONFIG.WEATHER.TYPES.includes(type)) return;

    console.log(`Weather changing to: ${type}`);
    this.currentWeather = type;

    // Fade in/out elements based on weather
    const showClouds = type !== 'clear';
    const showRain = type === 'rain';
    const showSnow = type === 'snow';

    // Animate clouds
    this.clouds.forEach(cloud => {
      this.scene.tweens.add({
        targets: cloud,
        alpha: showClouds ? 0.6 : 0,
        duration: 1000
      });
    });

    // Animate rain
    this.rainDrops.forEach((drop, i) => {
      this.scene.tweens.add({
        targets: drop,
        alpha: showRain ? 0.5 + Math.random() * 0.3 : 0,
        duration: 500,
        delay: i * 5
      });
    });

    // Animate snow
    this.snowFlakes.forEach((flake, i) => {
      this.scene.tweens.add({
        targets: flake,
        alpha: showSnow ? 0.7 + Math.random() * 0.3 : 0,
        duration: 500,
        delay: i * 10
      });
    });
  }

  randomWeather() {
    const types = CONFIG.WEATHER.TYPES;
    // Weight towards clear weather
    const weights = [3, 2, 2, 1]; // clear, cloudy, rain, snow
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < types.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        this.setWeather(types[i]);
        return;
      }
    }
    this.setWeather('clear');
  }

  update(delta, time) {
    const w = CONFIG.GAME_WIDTH;
    const h = CONFIG.GAME_HEIGHT;
    const dt = delta / 1000;

    // Update clouds (always move, visibility controlled by alpha)
    this.clouds.forEach(cloud => {
      cloud.x += cloud.speed * dt * 20;
      if (cloud.x > w + 80) {
        cloud.x = -80;
        cloud.y = 30 + Math.random() * 60;
      }
    });

    // Update rain
    if (this.currentWeather === 'rain') {
      this.rainDrops.forEach(drop => {
        drop.y += drop.speed * dt;
        drop.x += drop.drift * dt;

        if (drop.y > h) {
          drop.y = -10;
          drop.x = Math.random() * w;
        }
      });
    }

    // Update snow
    if (this.currentWeather === 'snow') {
      this.snowFlakes.forEach(flake => {
        flake.wobble += flake.wobbleSpeed * dt;
        flake.y += flake.speed * dt;
        flake.x += Math.sin(flake.wobble) * 0.5;

        if (flake.y > h) {
          flake.y = -10;
          flake.x = Math.random() * w;
        }
      });
    }

    // Hide stars when cloudy/rainy/snowy
    if (this.scene.stars) {
      const hideStars = this.currentWeather !== 'clear';
      // Only hide if it's night and weather is bad
      if (hideStars && this.scene.timeManager?.isNightTime()) {
        this.scene.stars.forEach(star => star.setAlpha(0));
      }
    }
  }
}
