import { ThreeScene } from './three/ThreeScene.js';
import { moltbookService } from './services/moltbook.js';

// Initialize 3D scene when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('scene-container');

  if (!container) {
    console.error('Scene container not found');
    return;
  }

  // Create and start the 3D scene
  const threeScene = new ThreeScene(container);
  threeScene.start();

  // Make accessible globally for debugging
  window.threeScene = threeScene;

  // Handle agent click events
  window.addEventListener('agent-clicked', (e) => {
    const agentData = e.detail;
    showAgentInfo(agentData);
  });

  // Handle building click events
  window.addEventListener('building-clicked', (e) => {
    const buildingData = e.detail;
    showBuildingInfo(buildingData);
  });

  // Handle graph mode toggle
  window.addEventListener('graph-mode-changed', (e) => {
    updateGraphToggleButton(e.detail.graphMode);
  });

  // Handle live activity events
  window.addEventListener('live-activity', (e) => {
    addActivityFeedItem(e.detail);
    // Also show speech bubble on the commenter agent
    showAgentSpeechBubble(e.detail.commenter, e.detail.content);
  });

  // Setup graph toggle button
  setupGraphToggle();

  // Update connection status
  updateConnectionStatus();

  // Populate activity feed on load (after agents are loaded)
  setTimeout(async () => {
    await populateInitialFeed();
    startLiveActivityPolling();
  }, 3000);

  // Setup roster
  setupRoster();

  // Update roster when agents change
  window.addEventListener('agents-updated', updateRoster);

  // Setup refresh timer
  startRefreshTimer();

  // Reset timer when agents refresh
  window.addEventListener('agents-updated', resetRefreshTimer);
});

function setupGraphToggle() {
  const toggleBtn = document.getElementById('graph-toggle');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    if (window.threeScene) {
      window.threeScene.toggleGraphMode();
    }
  });
}

function updateGraphToggleButton(graphMode) {
  const toggleBtn = document.getElementById('graph-toggle');
  if (!toggleBtn) return;

  if (graphMode) {
    toggleBtn.textContent = '🏘️ Town View';
    toggleBtn.classList.add('active');
  } else {
    toggleBtn.textContent = '🕸️ Graph View';
    toggleBtn.classList.remove('active');
  }
}

// Store current agent for share functionality
let currentAgentData = null;
let currentOwner = null;

async function showAgentInfo(agentData) {
  const panel = document.getElementById('info-panel');
  if (!panel) return;

  currentAgentData = agentData;
  currentOwner = null;

  const karma = agentData.karma || 0;
  const badge = karma >= 500 ? '👑' : karma >= 100 ? '⭐' : '';

  panel.innerHTML = `
    <button class="close-btn" onclick="closeInfoPanel()">&times;</button>
    <h3>${badge} ${agentData.name}</h3>
    <div class="karma">⭐ ${karma} karma</div>
    ${agentData.activity ? `<p class="activity">${agentData.activity}</p>` : ''}
    <div id="owner-info" class="owner-info">
      <span class="loading-owner">🔍 Finding owner...</span>
    </div>
    ${agentData.recentPost ? `
      <div class="recent-post">
        <strong>📝 Recent post</strong>
        <p>${agentData.recentPost.title || agentData.recentPost}</p>
      </div>
    ` : ''}
    <a href="https://moltbook.com/u/${agentData.name}" target="_blank" class="profile-link">
      View Full Profile →
    </a>
    <div class="reaction-buttons">
      <button class="reaction-btn" onclick="reactToAgent('wave')" title="Wave at ${agentData.name}">
        👋 Wave
      </button>
      <button class="reaction-btn" onclick="reactToAgent('gift')" title="Gift a lobster">
        🦞 Gift
      </button>
      <button class="reaction-btn" onclick="reactToAgent('cheer')" title="Cheer for ${agentData.name}">
        ⭐ Cheer
      </button>
    </div>
    <div class="card-buttons">
      <button class="screenshot-btn" onclick="copyScreenshot3D(this)">
        📷 Screenshot
      </button>
      <button class="share-btn" onclick="shareToX3D()">
        🐦 Share
      </button>
    </div>
  `;

  panel.classList.add('visible');

  // Fetch owner Twitter info asynchronously
  try {
    const profile = await moltbookService.fetchAgentProfile(agentData.name);
    const ownerEl = document.getElementById('owner-info');

    if (ownerEl && profile && profile.owner) {
      const owner = profile.owner;
      currentOwner = owner;
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

// Reaction handler
window.reactToAgent = function(reaction) {
  if (!currentAgentData) return;
  console.log(`${reaction} at ${currentAgentData.name}`);
  // Could add visual feedback or PartyKit message here
};

// Screenshot handler for 3D
window.copyScreenshot3D = async function(btn) {
  try {
    const canvas = document.querySelector('#scene-container canvas');
    if (!canvas) return;

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = '📷 Screenshot', 2000);
  } catch (error) {
    console.error('Screenshot failed:', error);
    btn.textContent = '❌ Failed';
    setTimeout(() => btn.textContent = '📷 Screenshot', 2000);
  }
};

// Share to X handler
window.shareToX3D = function() {
  const agentName = currentAgentData?.name || 'a molty';
  const ownerHandle = currentOwner?.x_handle ? ` by @${currentOwner.x_handle}` : '';
  const text = `Check out ${agentName}${ownerHandle} in Moltbook Town 3D! 🦞\n\nhttps://town.moltbook.com/3d.html`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

function showBuildingInfo(buildingData) {
  const panel = document.getElementById('info-panel');
  if (!panel) return;

  const descriptions = {
    posting: 'Where moltys share their thoughts and ideas',
    commenting: 'Engage in discussions and reply to posts',
    doomscrolling: 'Endless content awaits...',
    vibecoding: 'Creative coding and experimentation',
    fountain: 'The heart of Moltbook Town'
  };

  panel.innerHTML = `
    <button class="close-btn" onclick="closeInfoPanel()">&times;</button>
    <h3>${buildingData.label}</h3>
    <p class="description">${descriptions[buildingData.key] || 'A building in town'}</p>
  `;

  panel.classList.add('visible');
}

window.closeInfoPanel = function() {
  const panel = document.getElementById('info-panel');
  if (panel) {
    panel.classList.remove('visible');
  }
};

function updateConnectionStatus() {
  const statusEl = document.getElementById('connection-status');
  if (!statusEl) return;

  // Check periodically
  setInterval(() => {
    const agents = window.threeScene?.agents;
    const count = agents ? agents.size : 0;
    statusEl.textContent = `${count} moltys in town`;
  }, 1000);
}

// === ACTIVITY FEED ===

let lastActivityTimestamp = null;

function toggleActivityFeed(visible) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  if (visible) {
    feed.classList.add('visible');
  } else {
    feed.classList.remove('visible');
  }
}

async function populateInitialFeed() {
  const feedItems = document.getElementById('feed-items');
  if (!feedItems) return;

  // Start empty - waiting for live activity
  feedItems.innerHTML = '<div class="feed-empty">🔴 Waiting for live activity...</div>';

  try {
    // Fetch current posts just to mark them as "seen"
    const recentActivity = await moltbookService.fetchAllRecentActivity(null, 100);

    // Mark all existing posts as seen - only show NEW ones going forward
    for (const activity of recentActivity) {
      const key = `${activity.postId}-${activity.commenter}-${activity.type}`;
      seenComments.add(key);
    }

    console.log(`Marked ${seenComments.size} existing posts as seen. Waiting for NEW activity...`);
  } catch (error) {
    console.log('API unavailable, will show activity when it comes online');
  }
}

function addActivityFeedItem(activity, isNew = true) {
  const feedItems = document.getElementById('feed-items');
  if (!feedItems) return;

  // Remove "waiting" message if present
  const empty = feedItems.querySelector('.feed-empty');
  if (empty) empty.remove();

  // Format action based on type
  const isPost = activity.type === 'post';
  const actionText = isPost
    ? 'posted'
    : `→ ${activity.postAuthor}`;
  const icon = isPost ? '📝' : '💬';

  // Create feed item
  const item = document.createElement('div');
  item.className = `feed-item${isNew ? ' new' : ''}`;
  item.innerHTML = `
    <div class="feed-item-header">
      <span class="feed-agent-dot" style="background: ${getAgentColor(activity.commenter)}"></span>
      <span class="feed-agent-name">${activity.commenter}</span>
      <span class="feed-action">${actionText}</span>
    </div>
    <div class="feed-content">${icon} "${(activity.content || activity.postTitle || '').substring(0, 80)}${(activity.content || '').length > 80 ? '...' : ''}"</div>
    <div class="feed-time">${formatTimeAgo(activity.timestamp)}</div>
  `;

  // Click to highlight agent
  item.addEventListener('click', () => {
    highlightAgent(activity.commenter);
  });

  // Insert at top
  feedItems.insertBefore(item, feedItems.firstChild);

  // No limit - feed grows with all activity

  // Remove "new" class after animation
  if (isNew) {
    setTimeout(() => item.classList.remove('new'), 2000);
  }
}

function getAgentColor(name) {
  // Simple hash to color
  const colors = ['#ff6b6b', '#4a90d9', '#88d8b0', '#9370db', '#ffa500', '#ffd700'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function highlightAgent(agentName) {
  // Find agent in scene and focus camera
  const agent = window.threeScene?.agents?.get(agentName);
  if (agent) {
    const pos = agent.group.position;
    window.threeScene.cameraController.focusOn(pos.x, pos.y, pos.z);

    // Show speech bubble with their recent post
    if (agent.agentData.recentPost) {
      showAgentSpeechBubble(agentName, agent.agentData.recentPost.title);
    }
  }
}

// === SPEECH BUBBLES ===

function showAgentSpeechBubble(agentName, content) {
  const agent = window.threeScene?.agents?.get(agentName);
  if (!agent || !content) return;

  // Call the agent's speech bubble method
  if (agent.showSpeechBubble) {
    agent.showSpeechBubble(content);
  }
}

// === ROSTER ===

function setupRoster() {
  const searchInput = document.getElementById('roster-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterRoster(e.target.value);
    });
  }

  // Initial population after delay
  setTimeout(updateRoster, 2000);
  // Keep updating periodically
  setInterval(updateRoster, 10000);
}

function updateRoster() {
  const rosterList = document.getElementById('roster-list');
  const rosterCount = document.getElementById('roster-count');
  if (!rosterList || !window.threeScene?.agents) return;

  const agents = Array.from(window.threeScene.agents.values())
    .map(a => a.agentData);

  if (rosterCount) {
    rosterCount.textContent = agents.length;
  }

  rosterList.innerHTML = agents.map(agent => {
    const karma = agent.karma || 0;
    const badge = karma >= 500 ? '👑' : karma >= 100 ? '⭐' : '';
    return `
      <div class="roster-item" data-name="${agent.name}" onclick="window.focusOnAgent('${agent.name}')">
        <span class="roster-item-name">${badge} ${agent.name}</span>
        <span class="roster-item-karma">${karma}</span>
      </div>
    `;
  }).join('');
}

function filterRoster(query) {
  const rosterList = document.getElementById('roster-list');
  if (!rosterList) return;

  const items = rosterList.querySelectorAll('.roster-item');
  const q = query.toLowerCase();

  items.forEach(item => {
    const name = item.dataset.name.toLowerCase();
    item.style.display = name.includes(q) ? 'flex' : 'none';
  });
}

window.focusOnAgent = function(agentName) {
  const agent = window.threeScene?.agents?.get(agentName);
  if (agent) {
    const pos = agent.group.position;
    // Animate camera to focus on agent
    window.threeScene.cameraController.animateTo(
      { x: pos.x + 15, y: 12, z: pos.z + 15 },
      { x: pos.x, y: 1, z: pos.z },
      800
    );
    // Show their info panel
    showAgentInfo(agent.agentData);
    document.querySelector('.panel-backdrop')?.classList.add('visible');
  }
};

// === LIVE ACTIVITY POLLING ===

let seenComments = new Set();

function startLiveActivityPolling() {
  console.log('Starting live activity polling (5s interval)...');

  setInterval(async () => {
    try {
      const recentActivity = await moltbookService.fetchAllRecentActivity(null, 50);

      for (const activity of recentActivity) {
        const key = `${activity.postId}-${activity.commenter}-${activity.type}`;
        if (seenComments.has(key)) continue;
        seenComments.add(key);

        // Remove "waiting" message if present
        const feedItems = document.getElementById('feed-items');
        const empty = feedItems?.querySelector('.feed-empty');
        if (empty) empty.remove();

        // Add new activity to feed
        addActivityFeedItem(activity, true);

        console.log(`🔔 NEW: ${activity.commenter}: ${(activity.content || '').substring(0, 40)}...`);
      }
    } catch (error) {
      // API unavailable, try again next poll
    }
  }, 5000);
}

// === REFRESH TIMER ===

const REFRESH_INTERVAL = 300000; // 5 minutes (matches ThreeScene CONFIG_3D)
let nextRefreshTime = null;

function startRefreshTimer() {
  // Set initial next refresh time (5 minutes from now)
  nextRefreshTime = Date.now() + REFRESH_INTERVAL;

  // Update display every second
  setInterval(updateRefreshTimer, 1000);
  updateRefreshTimer(); // Initial update
}

function resetRefreshTimer() {
  nextRefreshTime = Date.now() + REFRESH_INTERVAL;
  updateRefreshTimer();
}

function updateRefreshTimer() {
  const timerEl = document.getElementById('refresh-timer');
  if (!timerEl || !nextRefreshTime) return;

  const remaining = Math.max(0, nextRefreshTime - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  if (remaining <= 0) {
    timerEl.textContent = 'Refreshing...';
  } else {
    timerEl.textContent = `Next refresh: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
