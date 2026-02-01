import { blandClient, CALLABLE_AGENTS } from '../services/blandClient.js';

/**
 * PhoneCallModal - Handles voice calls with Bland AI agents
 */
export class PhoneCallModal {
  constructor() {
    this.modal = null;
    this.isOpen = false;
    this.currentAgent = null;
    this.timerInterval = null;
    this.maxDuration = 180000; // 3 minutes per call - crack the king or wait

    // Bind handlers
    this.handleStatus = this.handleStatus.bind(this);
    this.handleConnected = this.handleConnected.bind(this);
    this.handleTranscript = this.handleTranscript.bind(this);
    this.handleEnded = this.handleEnded.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  init() {
    this.createModalHTML();

    // Set up event listeners
    blandClient.on('status', this.handleStatus);
    blandClient.on('connected', this.handleConnected);
    blandClient.on('transcript', this.handleTranscript);
    blandClient.on('ended', this.handleEnded);
    blandClient.on('error', this.handleError);

    console.log('PhoneCallModal initialized');
  }

  createModalHTML() {
    if (document.getElementById('phone-modal')) {
      this.modal = document.getElementById('phone-modal');
    } else {
      const modal = document.createElement('div');
      modal.id = 'phone-modal';
      modal.className = 'phone-modal';
      modal.innerHTML = `
        <div class="phone-modal-content">
          <div class="phone-header">
            <div class="phone-agent-info">
              <div class="phone-avatar">👑</div>
              <div class="phone-agent-details">
                <div class="phone-agent-name" id="phone-agent-name">Agent Name</div>
                <div class="phone-agent-title" id="phone-agent-title">Title</div>
              </div>
            </div>
            <button class="phone-close">&times;</button>
          </div>

          <div class="phone-status" id="phone-status">
            <div class="phone-status-icon" id="phone-status-icon">📞</div>
            <div class="phone-status-text" id="phone-status-text">Ready to call</div>
            <div class="phone-timer" id="phone-timer"></div>
          </div>

          <div class="phone-transcript" id="phone-transcript">
            <div class="transcript-log" id="transcript-log">
              <div class="transcript-hint">Transcript will appear here...</div>
            </div>
          </div>

          <div class="phone-actions">
            <button class="phone-btn call-btn" id="phone-call-btn">
              📞 Call
            </button>
            <button class="phone-btn end-btn" id="phone-end-btn" style="display: none;">
              📵 End Call
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      this.modal = modal;
    }

    // Attach event listeners
    const closeBtn = this.modal.querySelector('.phone-close');
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }

    const callBtn = document.getElementById('phone-call-btn');
    if (callBtn) {
      callBtn.onclick = () => this.startCall();
    }

    const endBtn = document.getElementById('phone-end-btn');
    if (endBtn) {
      endBtn.onclick = () => this.endCall();
    }

    // Close on backdrop click
    this.modal.onclick = (e) => {
      if (e.target === this.modal && !blandClient.isInCall()) {
        this.close();
      }
    };
  }

  open(agentName) {
    if (!blandClient.isCallable(agentName)) {
      console.warn(`Agent ${agentName} is not callable`);
      return;
    }

    this.currentAgent = agentName;
    const agentInfo = CALLABLE_AGENTS[agentName];

    // Update UI with agent info
    const nameEl = document.getElementById('phone-agent-name');
    const titleEl = document.getElementById('phone-agent-title');
    const avatarEl = this.modal.querySelector('.phone-avatar');

    if (nameEl) nameEl.textContent = agentName;
    if (titleEl) titleEl.textContent = agentInfo.title;
    if (avatarEl) {
      avatarEl.textContent = agentName === 'KingMolt' ? '👑' : '🦞';
    }

    // Reset UI state
    this.updateStatus('idle', 'Ready to call');
    this.clearTranscript();
    this.showCallButton(true);

    this.modal.classList.add('open');
    this.isOpen = true;
  }

  close() {
    if (blandClient.isInCall()) {
      // Don't close while in call, end it first
      this.endCall();
      return;
    }

    if (this.modal) {
      this.modal.classList.remove('open');
      this.isOpen = false;
    }
    this.currentAgent = null;
    this.stopTimer();
  }

  async startCall() {
    if (!this.currentAgent) return;

    try {
      this.showCallButton(false);
      await blandClient.startCall(this.currentAgent);
    } catch (error) {
      console.error('Failed to start call:', error);
      this.showCallButton(true);
    }
  }

  endCall() {
    blandClient.endCall();
    this.stopTimer();
    this.showCallButton(true);
  }

  handleStatus({ status, message }) {
    const icons = {
      idle: '📞',
      connecting: '🔄',
      connected: '🔊',
      error: '❌'
    };
    this.updateStatus(status, message, icons[status] || '📞');
  }

  handleConnected({ agentName }) {
    this.updateStatus('connected', 'Connected!', '🔊');
    this.startTimer();
  }

  handleTranscript({ speaker, text, transcript }) {
    this.addTranscriptEntry(speaker, text);
  }

  handleEnded({ duration, reason }) {
    this.updateStatus('idle', reason, '📞');
    this.stopTimer();
    this.showCallButton(true);
  }

  handleError({ error }) {
    this.updateStatus('error', error, '❌');
    this.showCallButton(true);
  }

  updateStatus(status, message, icon = '📞') {
    const statusText = document.getElementById('phone-status-text');
    const statusIcon = document.getElementById('phone-status-icon');
    const statusEl = document.getElementById('phone-status');

    if (statusText) statusText.textContent = message;
    if (statusIcon) statusIcon.textContent = icon;

    if (statusEl) {
      statusEl.className = `phone-status ${status}`;
    }
  }

  showCallButton(showCall) {
    const callBtn = document.getElementById('phone-call-btn');
    const endBtn = document.getElementById('phone-end-btn');

    if (callBtn) callBtn.style.display = showCall ? 'block' : 'none';
    if (endBtn) endBtn.style.display = showCall ? 'none' : 'block';
  }

  startTimer() {
    const timerEl = document.getElementById('phone-timer');
    const startTime = Date.now();

    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, this.maxDuration - elapsed);
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      if (timerEl) {
        timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        // Flash red when under 30 seconds
        if (remaining < 30000) {
          timerEl.style.color = '#ff4444';
        }
      }

      // Auto-end call at 2 minutes
      if (remaining <= 0) {
        this.endCall();
      }
    }, 100);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    const timerEl = document.getElementById('phone-timer');
    if (timerEl) timerEl.textContent = '';
  }

  clearTranscript() {
    const logEl = document.getElementById('transcript-log');
    if (logEl) {
      logEl.innerHTML = '<div class="transcript-hint">Transcript will appear here...</div>';
    }
  }

  addTranscriptEntry(speaker, text) {
    const logEl = document.getElementById('transcript-log');
    if (!logEl) return;

    // Remove hint if present
    const hint = logEl.querySelector('.transcript-hint');
    if (hint) hint.remove();

    const entry = document.createElement('div');
    entry.className = `transcript-entry ${speaker}`;
    entry.innerHTML = `
      <span class="transcript-speaker">${speaker === 'agent' ? this.currentAgent : 'You'}:</span>
      <span class="transcript-text">${text}</span>
    `;

    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  destroy() {
    this.stopTimer();
    blandClient.off('status', this.handleStatus);
    blandClient.off('connected', this.handleConnected);
    blandClient.off('transcript', this.handleTranscript);
    blandClient.off('ended', this.handleEnded);
    blandClient.off('error', this.handleError);

    if (this.modal) {
      this.modal.remove();
    }
  }
}

// Export singleton
export const phoneCallModal = new PhoneCallModal();
