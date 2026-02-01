import { CONFIG } from '../../config.js';

// Convert 2D pixel coordinates to 3D world coordinates
// 2D canvas is 960x640, 3D world uses 1:10 ratio centered at origin
export function pixelTo3D(pixelX, pixelY) {
  const worldX = (pixelX - CONFIG.GAME_WIDTH / 2) / 10;
  const worldZ = (pixelY - CONFIG.GAME_HEIGHT / 2) / 10;
  return { x: worldX, y: 0, z: worldZ };
}

// Convert 3D world coordinates back to 2D pixels
export function threeDToPixel(worldX, worldZ) {
  const pixelX = worldX * 10 + CONFIG.GAME_WIDTH / 2;
  const pixelY = worldZ * 10 + CONFIG.GAME_HEIGHT / 2;
  return { x: pixelX, y: pixelY };
}

// Get world dimensions
export const WORLD_WIDTH = CONFIG.GAME_WIDTH / 10;   // 96 units
export const WORLD_HEIGHT = CONFIG.GAME_HEIGHT / 10; // 64 units
