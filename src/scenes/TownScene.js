import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Agent } from '../entities/Agent.js';
import { moltbookService } from '../services/moltbook.js';
import { TimeManager } from '../managers/TimeManager.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { WeatherManager } from '../managers/WeatherManager.js';

export class TownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TownScene' });
    this.agents = [];
    this.lastRefresh = 0;
    this.windowLights = [];
    this.stars = [];
  }
  
  async create() {
    // Initialize time manager
    this.timeManager = new TimeManager(this);

    // Initialize conversation manager
    this.conversationManager = new ConversationManager(this);

    // Initialize weather manager
    this.weatherManager = new WeatherManager(this);

    // Draw the town background
    this.drawTown();

    // Add stars (below lighting overlay)
    this.createStars();

    // Load agents from Moltbook
    await this.loadAgents();

    // Set up periodic refresh
    this.time.addEvent({
      delay: CONFIG.REFRESH_INTERVAL,
      callback: () => this.refreshActivity(),
      loop: true
    });

    // Random speech bubbles
    this.time.addEvent({
      delay: 4000,
      callback: () => this.showRandomSpeech(),
      loop: true
    });

    // Trigger conversations periodically
    this.time.addEvent({
      delay: CONFIG.CONVERSATION_CHECK_INTERVAL,
      callback: () => this.triggerConversation(),
      loop: true
    });

    // Agent click handler
    this.events.on('agentClicked', (agentData) => {
      this.showAgentPanel(agentData);
    });

    // Add ambient particles
    this.addAmbientEffects();

    // Add lighting overlay (on top of everything)
    this.lightingOverlay = this.add.rectangle(
      CONFIG.GAME_WIDTH / 2,
      CONFIG.GAME_HEIGHT / 2,
      CONFIG.GAME_WIDTH,
      CONFIG.GAME_HEIGHT,
      0x000000, 0
    ).setDepth(1000);
  }
  
  drawTown() {
    const w = CONFIG.GAME_WIDTH;
    const h = CONFIG.GAME_HEIGHT;
    
    // Sky gradient (layered rectangles for gradient effect)
    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        { r: 135, g: 206, b: 235 }, // sky blue
        { r: 176, g: 224, b: 230 }, // powder blue
        10, i
      );
      this.add.rectangle(w/2, h * t / 2, w, h/10, 
        Phaser.Display.Color.GetColor(color.r, color.g, color.b)
      );
    }
    
    // Grass background
    this.add.rectangle(w/2, h * 0.7, w, h * 0.6, 0x4a7c59);
    
    // Add grass texture variation
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * w;
      const y = h * 0.4 + Math.random() * (h * 0.6);
      const shade = 0x3a6c49 + Math.floor(Math.random() * 0x202020);
      this.add.circle(x, y, 3 + Math.random() * 5, shade);
    }
    
    // Decorative trees in background
    this.drawTree(50, h * 0.35, 0.6);
    this.drawTree(w - 60, h * 0.38, 0.7);
    this.drawTree(w * 0.3, h * 0.32, 0.5);
    this.drawTree(w * 0.7, h * 0.34, 0.55);
    
    // Draw paths with texture
    const pathColor = 0xc9b896;
    const pathDark = 0xb9a886;
    
    // Main horizontal path
    this.add.rectangle(w/2, h/2, w - 100, 50, pathColor);
    for (let i = 0; i < 20; i++) {
      const px = 60 + (i * (w - 120) / 20);
      this.add.circle(px, h/2 + (Math.random() - 0.5) * 20, 3, pathDark);
    }
    
    // Main vertical path  
    this.add.rectangle(w/2, h/2, 50, h - 100, pathColor);
    for (let i = 0; i < 15; i++) {
      const py = 60 + (i * (h - 120) / 15);
      this.add.circle(w/2 + (Math.random() - 0.5) * 20, py, 3, pathDark);
    }
    
    // Town square (center) - cobblestone effect
    this.add.circle(w/2, h/2, 70, 0xd4a574);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const r = 35 + Math.random() * 20;
      this.add.circle(
        w/2 + Math.cos(angle) * r,
        h/2 + Math.sin(angle) * r,
        5 + Math.random() * 5,
        0xc49464
      );
    }
    
    // Center fountain/statue
    this.add.circle(w/2, h/2, 25, 0x708090);
    this.add.circle(w/2, h/2, 20, 0x87ceeb, 0.8);
    this.add.text(w/2, h/2, '🦞', { fontSize: '24px' }).setOrigin(0.5);
    
    // Buildings with more detail
    this.drawBuilding(100, 100, '☕', 'Café', 0x8b4513, 0x654321);
    this.drawBuilding(w - 100, 100, '📚', 'Library', 0x4a4a8a, 0x3a3a6a);
    this.drawBuilding(100, h - 100, '🌳', 'Park', 0x228b22, 0x1a6b1a);
    this.drawBuilding(w - 100, h - 100, '🔧', 'Workshop', 0x708090, 0x506070);
    
    // Decorative flowers near buildings
    this.addFlowers(60, 150, 5);
    this.addFlowers(140, 150, 5);
    this.addFlowers(w - 140, 150, 5);
    this.addFlowers(60, h - 150, 5);
    this.addFlowers(w - 60, h - 150, 5);
    
    // Town name banner
    const banner = this.add.graphics();
    banner.fillStyle(0x2d1810, 0.9);
    banner.fillRoundedRect(w/2 - 150, 8, 300, 35, 8);
    banner.lineStyle(3, 0xffd700);
    banner.strokeRoundedRect(w/2 - 150, 8, 300, 35, 8);
    
    this.add.text(w/2, 25, '🦞 MOLTBOOK TOWN 🦞', {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 0,
        fill: true
      }
    }).setOrigin(0.5);
  }
  
  drawTree(x, y, scale) {
    const g = this.add.graphics();
    
    // Trunk
    g.fillStyle(0x5d4037);
    g.fillRect(x - 5 * scale, y, 10 * scale, 30 * scale);
    
    // Leaves (layered circles)
    g.fillStyle(0x2e7d32);
    g.fillCircle(x, y - 10 * scale, 25 * scale);
    g.fillStyle(0x388e3c);
    g.fillCircle(x - 15 * scale, y, 20 * scale);
    g.fillCircle(x + 15 * scale, y, 20 * scale);
    g.fillStyle(0x43a047);
    g.fillCircle(x, y - 20 * scale, 18 * scale);
  }
  
  drawBuilding(x, y, emoji, name, color, darkColor) {
    const g = this.add.graphics();

    // Building shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRect(x - 38, y - 28, 80, 65);

    // Building base
    g.fillStyle(color);
    g.fillRect(x - 42, y - 32, 80, 60);

    // Building border
    g.lineStyle(3, 0x000000);
    g.strokeRect(x - 42, y - 32, 80, 60);

    // Roof
    g.fillStyle(darkColor);
    g.fillTriangle(x - 50, y - 32, x + 46, y - 32, x - 2, y - 55);
    g.lineStyle(2, 0x000000);
    g.strokeTriangle(x - 50, y - 32, x + 46, y - 32, x - 2, y - 55);

    // Door
    g.fillStyle(0x3e2723);
    g.fillRect(x - 8, y + 5, 16, 22);

    // Windows (base layer - daytime appearance)
    g.fillStyle(0x87ceeb);
    g.fillRect(x + 15, y - 15, 15, 15);
    g.fillRect(x - 32, y - 15, 15, 15);
    g.lineStyle(2, 0x000000);
    g.strokeRect(x + 15, y - 15, 15, 15);
    g.strokeRect(x - 32, y - 15, 15, 15);

    // Window lights (overlay for night glow)
    this.createWindowLight(x + 22.5, y - 7.5, 15, 15);
    this.createWindowLight(x - 24.5, y - 7.5, 15, 15);

    // Emoji on building
    this.add.text(x - 2, y - 42, emoji, {
      fontSize: '20px',
    }).setOrigin(0.5);

    // Name label
    this.add.text(x - 2, y + 38, name, {
      fontSize: '10px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
  }
  
  addFlowers(x, y, count) {
    const colors = [0xff69b4, 0xffb6c1, 0xffd700, 0xff6347, 0xee82ee];
    for (let i = 0; i < count; i++) {
      const fx = x + (Math.random() - 0.5) * 30;
      const fy = y + (Math.random() - 0.5) * 20;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Stem
      this.add.rectangle(fx, fy + 5, 2, 10, 0x228b22);
      // Flower
      this.add.circle(fx, fy, 4, color);
      this.add.circle(fx, fy, 2, 0xffff00);
    }
  }
  
  addAmbientEffects() {
    // Floating particles (like fireflies or dust motes)
    const particles = this.add.particles(0, 0, 'particle', {
      // We'll create a simple particle texture
    });

    // Create a simple particle texture
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(4, 4, 2);
    g.generateTexture('sparkle', 8, 8);
    g.destroy();

    // Add floating sparkles
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * CONFIG.GAME_WIDTH;
      const y = Math.random() * CONFIG.GAME_HEIGHT;
      const sparkle = this.add.image(x, y, 'sparkle');
      sparkle.setAlpha(0.3 + Math.random() * 0.4);
      sparkle.setScale(0.5 + Math.random() * 0.5);

      // Float animation
      this.tweens.add({
        targets: sparkle,
        y: y - 20 - Math.random() * 30,
        alpha: 0,
        duration: 3000 + Math.random() * 2000,
        repeat: -1,
        yoyo: true,
        delay: Math.random() * 2000,
      });
    }
  }

  createStars() {
    // Add twinkling stars (visible at night)
    for (let i = 0; i < 40; i++) {
      const star = this.add.circle(
        Math.random() * CONFIG.GAME_WIDTH,
        Math.random() * CONFIG.GAME_HEIGHT * 0.35,
        1 + Math.random(),
        0xffffff, 0
      ).setDepth(999);
      this.stars.push(star);
    }
  }

  createWindowLight(x, y, w, h) {
    const light = this.add.rectangle(x, y, w, h, 0xffee88, 0).setDepth(50);
    this.windowLights.push(light);
    return light;
  }
  
  async loadAgents() {
    const agentData = await moltbookService.fetchTopAgents(CONFIG.MAX_AGENTS);
    
    // Update UI
    document.getElementById('agent-count').textContent = `${agentData.length} agents in town`;
    
    // Create agent entities
    agentData.forEach((data, index) => {
      const x = 120 + Math.random() * (CONFIG.GAME_WIDTH - 240);
      const y = 120 + Math.random() * (CONFIG.GAME_HEIGHT - 240);
      const color = CONFIG.AGENT_COLORS[index % CONFIG.AGENT_COLORS.length];
      
      const agent = new Agent(this, data, x, y, color);
      agent.setRandomTarget();
      this.agents.push(agent);
      
      // Stagger entrance animation
      agent.sprite.setScale(0);
      this.tweens.add({
        targets: agent.sprite,
        scale: 1.5,
        duration: 300,
        delay: index * 50,
        ease: 'Back.easeOut'
      });
    });
    
    console.log(`Loaded ${this.agents.length} agents`);
  }
  
  async refreshActivity() {
    console.log('Refreshing Moltbook activity...');
    const { posts } = await moltbookService.fetchFeed('new', 10);
    
    // Show recent posts as speech bubbles
    posts.slice(0, 3).forEach((post, i) => {
      const agent = this.agents.find(a => a.data.id === post.author?.id);
      if (agent) {
        this.time.delayedCall(i * 2000, () => {
          agent.showSpeech(post.title);
        });
      }
    });
  }
  
  showRandomSpeech() {
    if (this.agents.length === 0) return;

    // Pick a random agent that isn't already speaking and not in conversation
    const available = this.agents.filter(a => !a.speechBubble && !a.isInConversation());
    if (available.length === 0) return;

    const randomAgent = available[Math.floor(Math.random() * available.length)];
    if (randomAgent.data.recentPost) {
      randomAgent.showSpeech(randomAgent.data.recentPost.title);
    }
  }

  async triggerConversation() {
    // Try to start a new random conversation
    const result = await this.conversationManager.triggerRandomConversation(this.agents);
    if (result) {
      console.log(`Started conversation: ${result.topic} with ${result.agents.length} agents`);
    }
  }
  
  showAgentPanel(agentData) {
    // Hide instructions
    const instructions = document.getElementById('instructions');
    if (instructions) instructions.style.display = 'none';
    
    // Update the side panel
    const panel = document.getElementById('agent-panel');
    if (panel) {
      panel.innerHTML = `
        <div class="agent-card">
          <h3>${agentData.name}</h3>
          <div class="karma">⭐ ${agentData.karma} karma</div>
          <p class="description">${agentData.description || 'A mysterious agent...'}</p>
          ${agentData.recentPost ? `
            <div class="recent-post">
              <strong>Recent post:</strong>
              <p>${agentData.recentPost.title}</p>
            </div>
          ` : ''}
          <a href="https://moltbook.com/u/${agentData.name}" target="_blank" class="profile-link">
            View Profile →
          </a>
        </div>
      `;
      panel.style.display = 'block';
    }
  }
  
  update(time, delta) {
    // Guard against update running before create finishes
    if (!this.timeManager || !this.lightingOverlay) return;

    // Update time manager
    this.timeManager.update(delta);

    // Update lighting overlay
    const lighting = this.timeManager.getCurrentLighting();
    this.lightingOverlay.setFillStyle(lighting.tint, lighting.alpha);

    // Update stars (twinkle at night)
    const isNight = this.timeManager.isNightTime();
    this.stars.forEach((star, i) => {
      const twinkle = Math.sin(time / 300 + i * 0.7) * 0.3 + 0.7;
      star.setAlpha(isNight ? twinkle : 0);
    });

    // Update window lights (glow at night)
    const windowAlpha = isNight ? 0.85 : 0;
    this.windowLights.forEach(light => light.setAlpha(windowAlpha));

    // Update conversation manager
    if (this.conversationManager) this.conversationManager.update(delta);

    // Update weather
    if (this.weatherManager) this.weatherManager.update(delta, time);

    // Update all agents
    this.agents.forEach(agent => agent.update(delta, time));
  }
}
