// Pixel art sprite generator for agents
// Creates cute robot/creature sprites programmatically

export function generateAgentSprite(scene, agentData) {
  const size = 32;
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

  // Get colors based on agent name hash
  const colors = getAgentColors(agentData.name);

  // Determine sprite type from description
  const desc = (agentData.description || '').toLowerCase();
  const isRobot = desc.includes('robot') || desc.includes('bot') || desc.includes('ai') || desc.includes('autonomous');

  if (isRobot) {
    drawRobotSprite(graphics, colors, agentData.karma);
  } else {
    drawCreatureSprite(graphics, colors, agentData.karma);
  }

  // Generate texture
  const key = `agent_${agentData.id}`;
  graphics.generateTexture(key, size, size);
  graphics.destroy();

  return key;
}

function drawCreatureSprite(g, colors, karma) {
  // Body (rounded blob shape)
  g.fillStyle(colors.body);
  g.fillRoundedRect(6, 10, 20, 18, 6);

  // Body highlight
  g.fillStyle(colors.highlight);
  g.fillRoundedRect(8, 12, 8, 6, 3);

  // Eyes (big cute eyes)
  g.fillStyle(0xffffff);
  g.fillCircle(12, 14, 5);
  g.fillCircle(20, 14, 5);

  // Pupils
  g.fillStyle(0x000000);
  g.fillCircle(13, 14, 2);
  g.fillCircle(21, 14, 2);

  // Eye shine
  g.fillStyle(0xffffff);
  g.fillCircle(12, 13, 1);
  g.fillCircle(20, 13, 1);

  // Feet
  g.fillStyle(colors.dark);
  g.fillRoundedRect(8, 26, 6, 4, 2);
  g.fillRoundedRect(18, 26, 6, 4, 2);

  // Crown for high karma
  if (karma > 500) {
    g.fillStyle(0xffd700);
    g.fillTriangle(16, 4, 11, 10, 21, 10);
    g.fillStyle(0xffec8b);
    g.fillCircle(16, 6, 2);
  } else if (karma > 100) {
    // Antenna
    g.lineStyle(2, colors.accent);
    g.lineBetween(16, 10, 16, 4);
    g.fillStyle(colors.accent);
    g.fillCircle(16, 3, 2);
  }
}

function drawRobotSprite(g, colors, karma) {
  // Robot body (boxy)
  g.fillStyle(colors.body);
  g.fillRect(8, 12, 16, 14);

  // Body border
  g.lineStyle(2, colors.dark);
  g.strokeRect(8, 12, 16, 14);

  // Screen/face
  g.fillStyle(0x111111);
  g.fillRect(10, 14, 12, 8);

  // Eyes (LED lights)
  g.fillStyle(0x00ff00);
  g.fillRect(11, 16, 3, 3);
  g.fillRect(18, 16, 3, 3);

  // Antenna
  g.fillStyle(colors.dark);
  g.fillRect(15, 6, 2, 6);
  g.fillStyle(0xff0000);
  g.fillCircle(16, 5, 3);

  // Legs
  g.fillStyle(colors.dark);
  g.fillRect(10, 26, 4, 4);
  g.fillRect(18, 26, 4, 4);

  // Arms
  g.fillRect(4, 16, 4, 8);
  g.fillRect(24, 16, 4, 8);

  // Crown for high karma
  if (karma > 500) {
    g.fillStyle(0xffd700);
    g.fillRect(12, 2, 8, 4);
    g.fillTriangle(12, 2, 16, -2, 20, 2);
  }
}

function getAgentColors(name) {
  // Generate consistent colors from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);

  return {
    body: hslToHex(hue, 70, 55),
    highlight: hslToHex(hue, 60, 70),
    dark: hslToHex(hue, 70, 35),
    accent: hslToHex((hue + 60) % 360, 80, 60),
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return parseInt(`${f(0)}${f(8)}${f(4)}`, 16);
}
