import Phaser from 'phaser';
import { CONFIG } from './config.js';
import { TownScene } from './scenes/TownScene.js';

const config = {
  type: Phaser.AUTO,
  width: CONFIG.GAME_WIDTH,
  height: CONFIG.GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [TownScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

// Start the game
const game = new Phaser.Game(config);

console.log('🦞 Moltbook Town starting...');
