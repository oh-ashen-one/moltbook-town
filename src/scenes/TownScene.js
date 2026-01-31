import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Agent } from '../entities/Agent.js';
import { moltbookService } from '../services/moltbook.js';

export class TownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TownScene' });
    this.agents = [];
    this.buildingPositions = {};
    this.nextRefreshTime = 0;
    this.refreshTimer = null;
    this.currentAgentData = null;
    this.currentOwner = null;
  }

  create() {
    // Expose for share button
    window.townScene = this;

    // Add map background
    const map = this.add.image(CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2, 'map');
    map.setDisplaySize(CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    // Add buildings
    this.addBuildings();

    // Setup ambient sound
    this.setupAmbientSound();

    // Load agents from Moltbook
    this.loadAgents();

    // Calculate time until next refresh based on last fetch (persists across page refreshes)
    const lastFetch = parseInt(localStorage.getItem('lastMoltbookFetch') || '0');
    const timeSinceLastFetch = Date.now() - lastFetch;
    const timeUntilNextRefresh = Math.max(1000, CONFIG.REFRESH_INTERVAL - timeSinceLastFetch);

    // Schedule first refresh
    this.scheduleNextRefresh(timeUntilNextRefresh);

    // Update countdown every second
    this.time.addEvent({
      delay: 1000,
      callback: () => this.updateCountdown(),
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

    // Periodic building visits
    this.time.addEvent({
      delay: 5000,
      callback: () => this.assignRandomActivity(),
      loop: true
    });
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

  async searchAgent(name, resultEl) {
    // Unhighlight all first
    this.agents.forEach(a => a.unhighlight());

    // Find matching agent in loaded agents (case-insensitive)
    const found = this.agents.find(a =>
      a.data.name.toLowerCase().includes(name.toLowerCase())
    );

    if (found) {
      found.highlight();
      resultEl.textContent = `Found: ${found.data.name}`;
      resultEl.classList.remove('not-found');
      this.showAgentPanel(found.data);
      return;
    }

    // Not in town - search API
    resultEl.textContent = `Searching...`;
    resultEl.classList.remove('not-found');

    try {
      const apiResult = await moltbookService.searchAgentByName(name);

      if (apiResult) {
        resultEl.innerHTML = `<span style="color:#ffd700">${apiResult.name}</span> hasn't posted recently!`;
        resultEl.classList.remove('not-found');
        this.showAgentPanel(apiResult, true); // true = inactive
      } else {
        resultEl.textContent = `No molty named "${name}" found`;
        resultEl.classList.add('not-found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      resultEl.textContent = `Search failed - try again`;
      resultEl.classList.add('not-found');
    }
  }

  clearSearch(resultEl) {
    this.agents.forEach(a => a.unhighlight());
    resultEl.textContent = '';
    resultEl.classList.remove('not-found');
  }

  populateRecentMoltys() {
    const container = document.getElementById('recent-moltys');
    const searchResult = document.getElementById('search-result');
    if (!container) return;

    // Use scene's loaded agents directly
    const recentNames = this.agents.slice(0, 8).map(a => a.data.name);
    container.innerHTML = '';

    recentNames.forEach(name => {
      const chip = document.createElement('span');
      chip.className = 'molty-chip';
      chip.textContent = name;
      chip.addEventListener('click', () => {
        document.getElementById('molty-search').value = name;
        this.searchAgent(name, searchResult);
      });
      container.appendChild(chip);
    });
  }

  updateLeaderboard() {
    const topKarmaEl = document.getElementById('top-karma');
    const mostActiveEl = document.getElementById('most-active');

    if (!topKarmaEl || !mostActiveEl) return;

    // Top Karma - already sorted by karma in service
    const topKarma = this.agents.slice(0, 5);
    if (topKarma.length > 0) {
      topKarmaEl.innerHTML = topKarma.map((a, i) => `
        <div class="entry">
          <span class="name">${i + 1}. ${a.data.name}</span>
          <span class="value">⭐${a.data.karma}</span>
        </div>
      `).join('');
    } else {
      topKarmaEl.innerHTML = '<div class="entry">No data yet</div>';
    }

    // Most Active - agents with recent posts (by upvotes as activity proxy)
    const mostActive = [...this.agents]
      .filter(a => a.data.recentPost)
      .sort((a, b) => (b.data.recentPost?.upvotes || 0) - (a.data.recentPost?.upvotes || 0))
      .slice(0, 5);

    if (mostActive.length > 0) {
      mostActiveEl.innerHTML = mostActive.map((a, i) => `
        <div class="entry">
          <span class="name">${i + 1}. ${a.data.name}</span>
          <span class="value">+${a.data.recentPost?.upvotes || 0}</span>
        </div>
      `).join('');
    } else {
      mostActiveEl.innerHTML = '<div class="entry">No data yet</div>';
    }
  }

  addBuildings() {
    // Buildings are now baked into map_background.png
    // Just define positions for agent navigation and labels
    const buildings = [
      { x: 200, y: 160, label: 'Posting', activity: 'posting' },
      { x: CONFIG.GAME_WIDTH - 200, y: 160, label: 'Commenting', activity: 'commenting' },
      { x: 200, y: CONFIG.GAME_HEIGHT - 160, label: 'Doomscrolling\nAI Slop', activity: 'doomscrolling' },
      { x: CONFIG.GAME_WIDTH - 200, y: CONFIG.GAME_HEIGHT - 160, label: 'Vibecoding', activity: 'vibecoding' },
      { x: CONFIG.GAME_WIDTH / 2, y: CONFIG.GAME_HEIGHT / 2, label: '', activity: 'fountain' },
    ];

    buildings.forEach(b => {
      // Store position for agent navigation
      this.buildingPositions[b.activity] = { x: b.x, y: b.y + 30 };

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
    this.showBanner('🔄 Loading moltys...', 'loading');

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

      // Populate recent moltys chips
      this.populateRecentMoltys();

      // Update leaderboard
      this.updateLeaderboard();

      // Update AI-readable context panel
      this.updateAgentContext();

      // Update ticker with posts
      this.updateTicker(moltbookService.posts);

      // Only store fetch time if there isn't a recent one (preserves countdown across refreshes)
      const lastFetch = parseInt(localStorage.getItem('lastMoltbookFetch') || '0');
      const timeSinceLastFetch = Date.now() - lastFetch;
      if (timeSinceLastFetch >= CONFIG.REFRESH_INTERVAL) {
        localStorage.setItem('lastMoltbookFetch', Date.now().toString());
      }
      this.updateCountdown();
    } catch (error) {
      console.error('Failed to load agents:', error);
      document.getElementById('agent-count').textContent = 'Error loading agents';
      this.showBanner('❌ Failed to load - retrying...', 'loading');
    }
  }

  scheduleNextRefresh(delay = CONFIG.REFRESH_INTERVAL) {
    // Cancel existing timer if any
    if (this.refreshTimer) {
      this.refreshTimer.remove();
    }

    // Set countdown target
    this.nextRefreshTime = Date.now() + delay;

    // Schedule next refresh
    this.refreshTimer = this.time.delayedCall(delay, () => {
      this.refreshActivity();
    });
  }

  async refreshActivity() {
    // Store fetch time (persists across page refreshes)
    localStorage.setItem('lastMoltbookFetch', Date.now().toString());

    this.showBanner('🔄 Refreshing feed...', 'loading');

    try {
      console.log('Refreshing Moltbook activity...');
      const { posts } = await moltbookService.fetchFeed('new', 10);

      // Update ticker
      this.updateTicker(posts);

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
      this.showBanner('❌ Refresh failed', 'loading');
    }

    // Schedule next refresh (always reschedule, even on error)
    this.scheduleNextRefresh();
    this.updateCountdown();
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

  async showAgentPanel(agentData, isInactive = false) {
    const panel = document.getElementById('agent-panel');
    if (!panel) return;

    // Store current agent for share functionality
    this.currentAgentData = agentData;
    this.currentOwner = null;

    const inactiveNotice = isInactive ? `
      <div class="inactive-notice">
        😴 This molty hasn't posted recently!<br>
        <small>Try searching for an active molty in town</small>
      </div>
    ` : '';

    // Show panel immediately with loading state for owner
    panel.innerHTML = `
      <div class="agent-card ${isInactive ? 'inactive' : ''}">
        <button class="close-btn" onclick="document.getElementById('agent-panel').style.display='none'; document.getElementById('molty-search').value=''; document.getElementById('search-result').textContent='';">✕</button>
        <h3>${agentData.name}</h3>
        ${inactiveNotice}
        <div class="karma">⭐ ${agentData.karma || 0} karma</div>
        <p class="description">${agentData.description || 'A mysterious molty...'}</p>
        <div id="owner-info" class="owner-info">
          <span class="loading-owner">🔍 Finding owner...</span>
        </div>
        ${agentData.recentPost ? `
          <div class="recent-post">
            <strong>Recent post:</strong>
            <p>${agentData.recentPost.title}</p>
          </div>
        ` : ''}
        ${agentData.name ? `<a href="https://moltbook.com/u/${agentData.name}" target="_blank" class="profile-link">View Profile →</a>` : ''}
        <button class="screenshot-btn" onclick="window.townScene.copyScreenshot(this)">
          📷 Take Screenshot
        </button>
        <button class="share-btn" onclick="window.townScene.shareToX()">
          🐦 Share to X
        </button>
      </div>
    `;
    panel.style.display = 'block';

    // Fetch owner Twitter info asynchronously
    try {
      const profile = await moltbookService.fetchAgentProfile(agentData.name);
      const ownerEl = document.getElementById('owner-info');
      
      if (ownerEl && profile && profile.owner) {
        const owner = profile.owner;
        this.currentOwner = owner; // Store for share
        ownerEl.innerHTML = `
          <div class="owner-card">
            ${owner.x_avatar ? `<img src="${owner.x_avatar}" alt="${owner.x_name}" class="owner-avatar">` : ''}
            <div class="owner-details">
              <a href="https://x.com/${owner.x_handle}" target="_blank" class="owner-twitter">
                <span class="twitter-icon">𝕏</span> @${owner.x_handle}
              </a>
              ${owner.x_follower_count ? `<span class="follower-count">${owner.x_follower_count.toLocaleString()} followers</span>` : ''}
            </div>
          </div>
        `;
      } else if (ownerEl) {
        ownerEl.innerHTML = `<span class="no-owner">Owner info unavailable</span>`;
      }
    } catch (error) {
      console.error('Failed to fetch owner:', error);
      const ownerEl = document.getElementById('owner-info');
      if (ownerEl) {
        ownerEl.innerHTML = `<span class="no-owner">Owner info unavailable</span>`;
      }
    }
  }

  async copyScreenshot(btn) {
    try {
      const canvas = this.game.canvas;

      // Convert canvas to blob and copy to clipboard
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);

          // Show feedback
          if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
              btn.textContent = originalText;
              btn.classList.remove('copied');
            }, 2000);
          }
        } catch (err) {
          console.error('Failed to copy:', err);
          // Fallback: download instead
          const link = document.createElement('a');
          link.download = 'moltbook-town.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      }, 'image/png');
    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  }

  shareToX() {
    // Build dynamic tweet based on current agent
    let text;

    if (this.currentAgentData) {
      const agentName = this.currentAgentData.name || 'an Openclaw';
      const ownerHandle = this.currentOwner?.x_handle ? `@${this.currentOwner.x_handle}'s` : "someone's";
      const postTitle = this.currentAgentData.recentPost?.title;

      if (postTitle) {
        const truncatedPost = postTitle.length > 50 ? postTitle.substring(0, 47) + '...' : postTitle;
        text = `I found ${ownerHandle} Openclaw "${agentName}" in Moltbook Town! 🦞\n\nThey just posted: "${truncatedPost}"\n\nFind yours: moltbook.town`;
      } else {
        text = `I found ${ownerHandle} Openclaw "${agentName}" hanging out in Moltbook Town! 🦞\n\nFind yours: moltbook.town`;
      }
    } else {
      text = `Exploring Moltbook Town! 🦞\n\nFind your Openclaw: moltbook.town`;
    }

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  }

  updateTicker(posts) {
    if (!posts || posts.length === 0) return;

    // Update HTML ticker rows
    for (let i = 0; i < 6; i++) {
      const rowEl = document.getElementById(`ticker-row-${i + 1}`);
      if (!rowEl) continue;

      const rowPosts = posts.slice(i * 3, i * 3 + 3);
      if (rowPosts.length > 0) {
        const content = rowPosts.map(p => {
          const title = (p.title || '...').substring(0, 30);
          const upvotes = p.upvotes || 0;
          const author = (p.author?.name || 'anon').substring(0, 12);
          return `+${upvotes} ${title} @${author}`;
        }).join('  ★  ');

        // Duplicate content for seamless CSS animation loop
        rowEl.textContent = content + '  ★  ' + content + '  ★  ' + content;
      }
    }
  }

  showBanner(text, type) {
    const banner = document.getElementById('loading-banner');
    if (!banner) return;

    banner.textContent = text;
    banner.className = type; // 'loading' or 'countdown'
  }

  updateCountdown() {
    const banner = document.getElementById('loading-banner');
    if (!banner) return;

    const remaining = Math.max(0, this.nextRefreshTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    banner.innerHTML = `⏱️ Next refresh in ${timeStr} <span class="refresh-link" onclick="window.townScene.refreshActivity()">(refresh now)</span>`;
    banner.className = 'countdown';
  }

  assignRandomActivity() {
    if (this.agents.length === 0) return;

    // Pick a random agent that isn't already visiting a building
    const available = this.agents.filter(a => !a.visitingBuilding);
    if (available.length === 0) return;

    const agent = available[Math.floor(Math.random() * available.length)];

    // Assign activity based on post content or random
    const activities = ['posting', 'commenting', 'doomscrolling', 'vibecoding', 'fountain'];
    let activity;

    // Check post content for keywords
    const postTitle = (agent.data.recentPost?.title || '').toLowerCase();
    if (postTitle.includes('code') || postTitle.includes('bug') || postTitle.includes('dev')) {
      activity = 'vibecoding';
    } else if (postTitle.includes('comment') || postTitle.includes('reply')) {
      activity = 'commenting';
    } else if (agent.data.recentPost) {
      activity = 'posting';
    } else {
      activity = activities[Math.floor(Math.random() * activities.length)];
    }

    const pos = this.buildingPositions[activity];
    if (pos) {
      console.log(`🦞 ${agent.data.name} → ${activity}`);
      agent.visitBuilding(pos.x, pos.y, activity);
    }
  }

  update(time, delta) {
    // Update all agents
    this.agents.forEach(agent => agent.update(delta, time));
  }

  setupAmbientSound() {
    // Create ambient sound (will be loaded in PreloadScene)
    // Note: Add underwater_ambient.mp3 to /assets/audio/ folder
    try {
      if (this.cache.audio.exists('ambient')) {
        this.ambientSound = this.sound.add('ambient', {
          loop: true,
          volume: 0.3
        });
        console.log('🔊 Ambient sound loaded');
      } else {
        console.log('ℹ️ No ambient audio file found - add underwater_ambient.mp3 to /assets/audio/');
      }
    } catch (e) {
      console.log('ℹ️ Audio not available:', e.message);
    }

    // Setup sound controls in HTML
    this.setupSoundControls();
  }

  setupSoundControls() {
    const soundBtn = document.getElementById('sound-toggle');
    const volumeSlider = document.getElementById('volume-slider');

    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        if (this.ambientSound) {
          if (this.ambientSound.isPlaying) {
            this.ambientSound.pause();
            soundBtn.textContent = '🔇';
            soundBtn.title = 'Unmute';
          } else {
            this.ambientSound.play();
            soundBtn.textContent = '🔊';
            soundBtn.title = 'Mute';
          }
        } else {
          // Try to start sound on first click (browser autoplay policy)
          this.startAmbientSound();
          soundBtn.textContent = '🔊';
          soundBtn.title = 'Mute';
        }
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        if (this.ambientSound) {
          this.ambientSound.setVolume(volume);
        }
      });
    }
  }

  startAmbientSound() {
    if (!this.ambientSound && this.sound.get('ambient')) {
      this.ambientSound = this.sound.add('ambient', {
        loop: true,
        volume: 0.3
      });
    }
    if (this.ambientSound && !this.ambientSound.isPlaying) {
      this.ambientSound.play();
    }
  }

  // Show a post in a modal when clicking speech bubble
  showPostModal(post, agentName) {
    const modal = document.getElementById('post-modal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="post-modal-content">
        <button class="close-btn" onclick="document.getElementById('post-modal').style.display='none';">✕</button>
        <div class="post-author">
          <span class="author-name">🦞 ${agentName}</span>
        </div>
        <h3 class="post-title">${post.title || 'Untitled'}</h3>
        <p class="post-content">${post.content || post.title || ''}</p>
        <div class="post-stats">
          <span>👍 ${post.upvotes || 0}</span>
        </div>
        ${post.id ? `<a href="https://moltbook.com/post/${post.id}" target="_blank" class="view-post-link">View on Moltbook →</a>` : ''}
      </div>
    `;
    modal.style.display = 'flex';
  }

  // Update the AI-readable context panel for OpenClaws browsing the page
  updateAgentContext() {
    const agentsEl = document.getElementById('context-agents');
    const activityEl = document.getElementById('context-activity');

    if (!agentsEl || !activityEl) return;

    // List all agents currently in town
    const agentNames = this.agents
      .filter(a => a.data.name)
      .map(a => '@' + a.data.name)
      .slice(0, 15); // Limit to avoid huge lists

    if (agentNames.length > 0) {
      const moreCount = this.agents.length - agentNames.length;
      agentsEl.textContent = agentNames.join(', ') + (moreCount > 0 ? ` and ${moreCount} more...` : '');
    } else {
      agentsEl.textContent = 'No agents loaded yet...';
    }

    // Describe current activities (agents visiting buildings)
    const activities = this.agents
      .filter(a => a.visitingBuilding && a.data.name)
      .map(a => `@${a.data.name} is ${a.visitingBuilding}`)
      .slice(0, 5);

    if (activities.length > 0) {
      activityEl.textContent = activities.join('; ');
    } else {
      activityEl.textContent = 'Everyone is wandering around the town square...';
    }

    // Also set up periodic updates
    if (!this.contextUpdateTimer) {
      this.contextUpdateTimer = this.time.addEvent({
        delay: 5000,
        callback: () => this.updateAgentContext(),
        loop: true
      });
    }
  }
}
