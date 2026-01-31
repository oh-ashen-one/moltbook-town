import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Agent } from '../entities/Agent.js';
import { moltbookService } from '../services/moltbook.js';

export class TownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TownScene' });
    this.agents = [];
  }

  create() {
    // Add map background
    const map = this.add.image(CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2, 'map');
    map.setDisplaySize(CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    // Add buildings
    this.addBuildings();

    // Load agents from Moltbook
    this.loadAgents();

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

    // Agent click handler
    this.events.on('agentClicked', (agentData) => {
      this.showAgentPanel(agentData);
    });

    // Setup molty search
    this.setupSearch();
  }

  setupSearch() {
    const searchInput = document.getElementById('molty-search');
    const searchResult = document.getElementById('search-result');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const term = e.target.value.trim();
        if (term) {
          this.searchAgent(term, searchResult);
        } else {
          this.clearSearch(searchResult);
        }
      }, 300);
    });
  }

  searchAgent(name, resultEl) {
    // Unhighlight all first
    this.agents.forEach(a => a.unhighlight());

    // Find matching agent (case-insensitive)
    const found = this.agents.find(a =>
      a.data.name.toLowerCase().includes(name.toLowerCase())
    );

    if (found) {
      found.highlight();
      resultEl.textContent = `Found: ${found.data.name}`;
      resultEl.classList.remove('not-found');

      // Show their panel
      this.showAgentPanel(found.data);
    } else {
      resultEl.textContent = `No molty named "${name}"`;
      resultEl.classList.add('not-found');
    }
  }

  clearSearch(resultEl) {
    this.agents.forEach(a => a.unhighlight());
    resultEl.textContent = '';
    resultEl.classList.remove('not-found');
  }

  addBuildings() {
    const buildings = [
      { key: 'building_posting', x: 100, y: 120, label: 'Posting' },
      { key: 'building_commenting', x: CONFIG.GAME_WIDTH - 100, y: 120, label: 'Commenting' },
      { key: 'building_doomscrolling', x: 100, y: CONFIG.GAME_HEIGHT - 100, label: 'Doomscrolling\nAI Slop' },
      { key: 'building_vibecoding', x: CONFIG.GAME_WIDTH - 100, y: CONFIG.GAME_HEIGHT - 100, label: 'Vibecoding' },
      { key: 'building_fountain', x: CONFIG.GAME_WIDTH / 2, y: CONFIG.GAME_HEIGHT / 2 - 20, label: '' },
    ];

    buildings.forEach(b => {
      const building = this.add.image(b.x, b.y, b.key);
      building.setScale(0.18); // Small scale for large isometric images

      if (b.label) {
        this.add.text(b.x, b.y + 45, b.label, {
          fontSize: '10px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
          align: 'center'
        }).setOrigin(0.5);
      }
    });

    // Town name banner
    this.add.text(CONFIG.GAME_WIDTH / 2, 25, '🦞 MOLTBOOK TOWN 🦞', {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
  }

  async loadAgents() {
    try {
      const agentData = await moltbookService.fetchTopAgents(CONFIG.MAX_AGENTS);

      // Update UI
      document.getElementById('agent-count').textContent = `${agentData.length} moltys in town`;

      // Molty sprite colors
      const moltySprites = ['molty_red', 'molty_blue', 'molty_green', 'molty_purple', 'molty_orange'];

      // Create agent entities
      agentData.forEach((data, index) => {
        const x = 150 + Math.random() * (CONFIG.GAME_WIDTH - 300);
        const y = 150 + Math.random() * (CONFIG.GAME_HEIGHT - 300);
        const spriteKey = moltySprites[index % moltySprites.length];

        const agent = new Agent(this, data, x, y, spriteKey);
        agent.setRandomTarget();
        this.agents.push(agent);

        // Stagger entrance animation
        agent.sprite.setScale(0);
        this.tweens.add({
          targets: agent.sprite,
          scale: agent.baseScale,
          duration: 300,
          delay: index * 50,
          ease: 'Back.easeOut'
        });
      });

      console.log(`Loaded ${this.agents.length} moltys`);
    } catch (error) {
      console.error('Failed to load agents:', error);
      document.getElementById('agent-count').textContent = 'Error loading agents';
    }
  }

  async refreshActivity() {
    try {
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
    } catch (error) {
      console.error('Failed to refresh activity:', error);
    }
  }

  showRandomSpeech() {
    if (this.agents.length === 0) return;

    // Pick a random agent that isn't already speaking
    const available = this.agents.filter(a => !a.speechBubble);
    if (available.length === 0) return;

    const randomAgent = available[Math.floor(Math.random() * available.length)];
    if (randomAgent.data.recentPost) {
      randomAgent.showSpeech(randomAgent.data.recentPost.title);
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
          <p class="description">${agentData.description || 'A mysterious molty...'}</p>
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
    // Update all agents
    this.agents.forEach(agent => agent.update(delta, time));
  }
}
