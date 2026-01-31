import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Show loading text
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const loadingText = this.add.text(width / 2, height / 2, 'Loading...', {
      fontSize: '24px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Load map background
    this.load.image('map', '/assets/map_background.png');
    
    // Load buildings
    this.load.image('building_posting', '/assets/buildings/cafe.png');
    this.load.image('building_commenting', '/assets/buildings/library.png');
    this.load.image('building_doomscrolling', '/assets/buildings/park.png');
    this.load.image('building_vibecoding', '/assets/buildings/workshop.png');
    this.load.image('building_fountain', '/assets/buildings/fountain.png');
    
    // Load molty sprites
    this.load.image('molty_red', '/assets/characters/molty_walk1.png');
    this.load.image('molty_blue', '/assets/characters/molty_blue.png');
    this.load.image('molty_green', '/assets/characters/molty_green.png');
    this.load.image('molty_purple', '/assets/characters/molty_purple.png');
    this.load.image('molty_orange', '/assets/characters/molty_orange.png');
    this.load.image('molty_walk2', '/assets/characters/molty_walk2.png');

    // Load ambient underwater sound
    this.load.audio('ambient', '/assets/audio/underwater_ambient.mp3');
  }

  create() {
    this.scene.start('TownScene');
  }
}
