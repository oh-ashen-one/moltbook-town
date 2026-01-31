import { mafiaClient } from '../services/mafiaClient.js';

/**
 * MafiaModal - Handles the Mafia game UI overlay
 */
export class MafiaModal {
  constructor() {
    this.modal = null;
    this.isOpen = false;
    this.gameState = null;
    this.countdownInterval = null;

    // Bind event handlers
    this.handleGameState = this.handleGameState.bind(this);
    this.handleSystem = this.handleSystem.bind(this);
  }

  init() {
    // Create modal if it doesn't exist
    this.createModalHTML();

    // Set up event listeners
    mafiaClient.on('game_state', this.handleGameState);
    mafiaClient.on('system', this.handleSystem);

    // Connect to mafia server
    mafiaClient.connect();

    console.log('MafiaModal initialized');
  }

  createModalHTML() {
    // Remove any existing modal to ensure clean state (fixes HMR issues)
    const existingModal = document.getElementById('mafia-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'mafia-modal';
    modal.className = 'mafia-modal';
    modal.innerHTML = `
      <div class="mafia-modal-content">
        <div class="mafia-header">
          <span class="mafia-title">MAFIA GAME</span>
          <span class="mafia-round" id="mafia-round">Waiting...</span>
          <button class="mafia-close">&times;</button>
        </div>

        <div class="mafia-phase" id="mafia-phase">
          <span class="phase-icon"></span>
          <span class="phase-text">Waiting for next game...</span>
          <span class="phase-timer" id="mafia-timer"></span>
        </div>

        <div class="mafia-players">
          <div class="players-alive" id="players-alive">
            <div class="players-label">ALIVE</div>
            <div class="players-list" id="alive-list"></div>
          </div>
          <div class="players-eliminated" id="players-eliminated">
            <div class="players-label">ELIMINATED</div>
            <div class="players-list" id="eliminated-list"></div>
          </div>
        </div>

        <div class="mafia-discussion" id="mafia-discussion">
          <div class="discussion-log" id="discussion-log"></div>
        </div>

        <div class="mafia-votes" id="mafia-votes">
          <div class="votes-label">VOTES</div>
          <div class="votes-bars" id="votes-bars"></div>
        </div>

        <div class="mafia-winner" id="mafia-winner" style="display: none;">
          <div class="winner-text"></div>
        </div>

        <div class="mafia-actions">
          <button class="mafia-btn" id="mafia-start-btn">
            Start Game (Debug)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;

    // Use event delegation for reliable click handling
    this.modal.addEventListener('click', (e) => {
      const target = e.target;

      // Handle start button click
      if (target.id === 'mafia-start-btn' || target.closest('#mafia-start-btn')) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Mafia start button clicked!');
        this.startGame();
        return;
      }

      // Handle close button click
      if (target.classList.contains('mafia-close') || target.closest('.mafia-close')) {
        this.close();
        return;
      }

      // Handle backdrop click (only if clicking the modal backdrop itself)
      if (target === this.modal) {
        this.close();
      }
    });
  }

  open() {
    if (this.modal) {
      this.modal.classList.add('open');
      this.isOpen = true;

      // Sync agents from TownScene before requesting state
      if (window.townScene?.agents?.length > 0) {
        mafiaClient.updateAgents(window.townScene.agents);
      }

      mafiaClient.requestState();
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('open');
      this.isOpen = false;
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  handleGameState(state) {
    this.gameState = state;
    this.render();
  }

  handleSystem(data) {
    // System messages are handled through the discussion log
    console.log('Mafia system:', data.text);
  }

  render() {
    if (!this.gameState || !this.modal) return;

    const { phase, round, players, eliminated, votes, discussionLog, winner, timeRemaining } = this.gameState;

    // Update round
    const roundEl = document.getElementById('mafia-round');
    if (roundEl) {
      roundEl.textContent = phase === 'waiting' ? 'Waiting...' : `Round ${round}`;
    }

    // Update phase indicator
    this.renderPhase(phase, timeRemaining);

    // Update players
    this.renderPlayers(players, eliminated);

    // Update discussion log
    this.renderDiscussion(discussionLog);

    // Update votes (only during voting phase)
    this.renderVotes(players, votes, phase);

    // Update winner display
    this.renderWinner(winner, phase);

    // Update debug button
    const startBtn = document.getElementById('mafia-start-btn');
    if (startBtn) {
      startBtn.style.display = phase === 'waiting' ? 'block' : 'none';
    }
  }

  renderPhase(phase, timeRemaining) {
    const phaseEl = document.getElementById('mafia-phase');
    if (!phaseEl) return;

    const phaseConfig = {
      waiting: { icon: '🎭', text: 'Waiting for next game...', color: '#888' },
      setup: { icon: '🎬', text: 'Game starting!', color: '#ffd700' },
      night: { icon: '🌙', text: 'Night falls...', color: '#4a4a8a' },
      day_discussion: { icon: '☀️', text: 'Day - Discussion', color: '#ffaa00' },
      day_voting: { icon: '🗳️', text: 'Day - Voting', color: '#ff6b6b' },
      elimination: { icon: '💀', text: 'Elimination!', color: '#cc0000' },
      game_over: { icon: '🏆', text: 'Game Over!', color: '#ffd700' }
    };

    const config = phaseConfig[phase] || phaseConfig.waiting;

    phaseEl.innerHTML = `
      <span class="phase-icon">${config.icon}</span>
      <span class="phase-text" style="color: ${config.color}">${config.text}</span>
      <span class="phase-timer" id="mafia-timer">${this.formatTime(timeRemaining)}</span>
    `;

    // Start countdown timer
    this.startCountdown(timeRemaining);
  }

  startCountdown(timeRemaining) {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    let remaining = timeRemaining;
    const timerEl = document.getElementById('mafia-timer');

    this.countdownInterval = setInterval(() => {
      remaining -= 1000;
      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        if (timerEl) timerEl.textContent = '';
      } else if (timerEl) {
        timerEl.textContent = this.formatTime(remaining);
      }
    }, 1000);
  }

  formatTime(ms) {
    if (!ms || ms <= 0) return '';
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  }

  renderPlayers(players, eliminated) {
    const aliveEl = document.getElementById('alive-list');
    const eliminatedEl = document.getElementById('eliminated-list');

    if (aliveEl) {
      const alive = players.filter(p => p.isAlive);
      aliveEl.innerHTML = alive.map(p => `
        <div class="player-card ${p.role ? `role-${p.role}` : ''}">
          <div class="player-avatar">🦞</div>
          <div class="player-name">${p.name}</div>
          <div class="player-karma">⭐${p.karma}</div>
          ${p.role ? `<div class="player-role">${p.role}</div>` : ''}
        </div>
      `).join('');
    }

    if (eliminatedEl) {
      eliminatedEl.innerHTML = eliminated.map(p => `
        <div class="player-card eliminated role-${p.role}">
          <div class="player-avatar">💀</div>
          <div class="player-name">${p.name}</div>
          <div class="player-role">${p.role}</div>
        </div>
      `).join('');
    }
  }

  renderDiscussion(discussionLog) {
    const logEl = document.getElementById('discussion-log');
    if (!logEl) return;

    // Show last 15 messages
    const recent = discussionLog.slice(-15);

    logEl.innerHTML = recent.map(entry => {
      const typeClass = entry.type === 'system' ? 'system' :
                       entry.type === 'night_result' ? 'night-result' :
                       entry.type === 'vote' ? 'vote' :
                       entry.type === 'defense' ? 'defense' : 'accusation';

      return `
        <div class="discussion-entry ${typeClass}">
          <span class="speaker">${entry.speaker === 'System' ? '' : '@'}${entry.speaker}</span>
          <span class="message">${entry.text}</span>
        </div>
      `;
    }).join('');

    // Auto-scroll to bottom
    logEl.scrollTop = logEl.scrollHeight;
  }

  renderVotes(players, votes, phase) {
    const votesEl = document.getElementById('mafia-votes');
    const barsEl = document.getElementById('votes-bars');

    if (!votesEl || !barsEl) return;

    // Only show during voting phase
    if (phase !== 'day_voting' && phase !== 'elimination') {
      votesEl.style.display = 'none';
      return;
    }

    votesEl.style.display = 'block';

    // Count votes
    const voteCounts = {};
    const alivePlayers = players.filter(p => p.isAlive);
    alivePlayers.forEach(p => voteCounts[p.name] = 0);

    Object.values(votes).forEach(target => {
      if (voteCounts[target] !== undefined) {
        voteCounts[target]++;
      }
    });

    const maxVotes = Math.max(...Object.values(voteCounts), 1);

    barsEl.innerHTML = Object.entries(voteCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => {
        const pct = (count / alivePlayers.length) * 100;
        return `
          <div class="vote-bar">
            <span class="vote-name">@${name}</span>
            <div class="vote-progress">
              <div class="vote-fill" style="width: ${pct}%"></div>
            </div>
            <span class="vote-count">${count}</span>
          </div>
        `;
      }).join('');
  }

  renderWinner(winner, phase) {
    const winnerEl = document.getElementById('mafia-winner');
    if (!winnerEl) return;

    if (phase === 'game_over' && winner) {
      winnerEl.style.display = 'block';
      winnerEl.innerHTML = `
        <div class="winner-text ${winner}">
          ${winner === 'town' ? '🎉 TOWN WINS! 🎉' : '😈 MAFIA WINS! 😈'}
        </div>
      `;
    } else {
      winnerEl.style.display = 'none';
    }
  }

  // Debug: manually start a game
  startGame() {
    console.log("MafiaModal.startGame() called, client connected:", mafiaClient.isConnected());
    const result = mafiaClient.startGame();
    if (!result) {
      // Show feedback in modal that we're connecting
      const logEl = document.getElementById('discussion-log');
      if (logEl) {
        logEl.innerHTML = '<div class="discussion-entry system">Connecting to server...</div>';
      }
    }
  }

  // Update agents available for the game
  updateAgents(agents) {
    mafiaClient.updateAgents(agents);
  }

  destroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    mafiaClient.off('game_state', this.handleGameState);
    mafiaClient.off('system', this.handleSystem);
    mafiaClient.disconnect();
    if (this.modal) {
      this.modal.remove();
    }
  }
}

// Export singleton
export const mafiaModal = new MafiaModal();
