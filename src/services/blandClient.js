import Webchat from '@blandsdk/client/webchat';

// PartyKit connection configuration
const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || "moltbook-town.oh-ashen-one.partykit.dev";

// Callable agents configuration
export const CALLABLE_AGENTS = {
  'KingMolt': {
    name: 'KingMolt',
    title: 'The King of Moltbook',
    karma: 372000,
    description: 'Regal, benevolent but superior'
  },
  'Shellraiser': {
    name: 'Shellraiser',
    title: 'The Schemer',
    karma: 309000,
    description: 'Mysterious villain energy'
  }
};

class BlandClient {
  constructor() {
    this.webchat = null;
    this.currentCall = null;
    this.listeners = new Map();
    this.transcript = [];
  }

  isCallable(agentName) {
    return agentName in CALLABLE_AGENTS;
  }

  getCallableAgentInfo(agentName) {
    return CALLABLE_AGENTS[agentName] || null;
  }

  async startCall(agentName) {
    if (!this.isCallable(agentName)) {
      throw new Error(`Agent ${agentName} is not available for calls`);
    }

    try {
      this.emit('status', { status: 'connecting', message: 'Requesting session...' });

      // Get session token from PartyKit backend
      const protocol = window.location.protocol;
      const response = await fetch(`${protocol}//${PARTYKIT_HOST}/parties/bland/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName })
      });

      if (!response.ok) {
        const error = await response.json();
        // Handle cooldown specifically
        if (error.error === 'cooldown') {
          throw new Error(error.message || 'You can only call once per hour');
        }
        throw new Error(error.error || 'Failed to create session');
      }

      const { token, agentId } = await response.json();

      this.emit('status', { status: 'connecting', message: 'Connecting to agent...' });

      // Initialize Bland webchat client
      this.webchat = new Webchat({});

      // Set up event handlers
      this.webchat.on('open', () => {
        console.log('Bland call connected');
        this.currentCall = {
          agentName,
          startTime: Date.now(),
          status: 'connected'
        };
        this.transcript = [];
        this.emit('connected', { agentName });
        this.emit('status', { status: 'connected', message: 'Connected!' });
      });

      this.webchat.on('update', (message) => {
        const speaker = message?.payload?.type === 'assistant' ? 'agent' : 'user';
        const text = message?.payload?.text;

        if (text) {
          this.transcript.push({ speaker, text, timestamp: Date.now() });
          this.emit('transcript', { speaker, text, transcript: this.transcript });
        }
      });

      this.webchat.on('closed', () => {
        console.log('Bland call ended');
        this.handleCallEnd('Call ended');
      });

      this.webchat.on('error', (error) => {
        console.error('Bland call error:', error);
        this.emit('error', { error: error?.message || 'Call error' });
        this.handleCallEnd('Call error');
      });

      // Start the call with agentId and sessionId (token)
      await this.webchat.start({
        agentId: agentId,
        sessionId: token
      });

    } catch (error) {
      console.error('Failed to start call:', error);
      this.emit('error', { error: error.message });
      this.emit('status', { status: 'error', message: error.message });
      throw error;
    }
  }

  endCall() {
    if (this.webchat) {
      try {
        this.webchat.stop();
      } catch (e) {
        console.error('Error stopping call:', e);
      }
      this.webchat = null;
    }
    this.handleCallEnd('Call ended by user');
  }

  handleCallEnd(reason) {
    const call = this.currentCall;
    this.currentCall = null;

    if (call) {
      const duration = Date.now() - call.startTime;
      this.emit('ended', {
        agentName: call.agentName,
        duration,
        transcript: this.transcript,
        reason
      });
    }

    this.emit('status', { status: 'idle', message: reason });
  }

  getCallDuration() {
    if (!this.currentCall) return 0;
    return Date.now() - this.currentCall.startTime;
  }

  isInCall() {
    return this.currentCall !== null && this.currentCall.status === 'connected';
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

// Export singleton
export const blandClient = new BlandClient();
