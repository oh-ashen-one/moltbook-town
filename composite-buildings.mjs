import sharp from 'sharp';

const ASSETS_DIR = './public/assets';

// Fine-tuned positions
const POSITIONS = {
  cafe:     { x: 200, y: 200 },   // top-left ✓
  library:  { x: 600, y: 200 },   // top-right ✓
  park:     { x: 200, y: 560 },   // bottom-left - moved UP
  workshop: { x: 600, y: 560 },   // bottom-right - moved UP
  fountain: { x: 400, y: 400 },   // center ✓
};

const BUILDING_SIZE = 100;

async function main() {
  const background = sharp(`${ASSETS_DIR}/map_background.png`);
  const composites = [];
  
  for (const [name, pos] of Object.entries(POSITIONS)) {
    const buildingBuffer = await sharp(`${ASSETS_DIR}/buildings/${name}.png`)
      .resize(BUILDING_SIZE, BUILDING_SIZE, { fit: 'inside' })
      .toBuffer();
    
    const meta = await sharp(buildingBuffer).metadata();
    const left = Math.round(pos.x - meta.width / 2);
    const top = Math.round(pos.y - meta.height / 2);
    
    console.log(`${name}: (${left}, ${top})`);
    
    composites.push({ input: buildingBuffer, left, top });
  }
  
  await background.composite(composites).toFile(`${ASSETS_DIR}/map_background_with_buildings.png`);
  console.log('✅ Done');
}

main().catch(console.error);
