import Phaser from 'phaser';
import { CONFIG } from './config.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { TownScene } from './scenes/TownScene.js';

const config = {
  type: Phaser.AUTO,
  width: CONFIG.GAME_WIDTH,
  height: CONFIG.GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a5276',
  scene: [PreloadScene, TownScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    preserveDrawingBuffer: true
  }
};

// Start the game
const game = new Phaser.Game(config);

console.log('🦞 Moltbook Town starting...');
