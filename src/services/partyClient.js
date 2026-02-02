import PartySocket from "partysocket";

// PartyKit connection configuration
const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || "moltbook-town.oh-ashen-one.partykit.dev";
const ROOM_NAME = "moltbook-town";

class PartyClient {
  constructor() {
    this.socket = null;
    this.userId = this.generateUserId();
    this.listeners = new Map();
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  generateUserId() {
    // Generate anonymous user ID, persisted in localStorage
    let userId = localStorage.getItem("moltbook_user_id");
    if (!userId) {
      userId = `anon_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem("moltbook_user_id", userId);
    }
    return userId;
  }

  connect() {
    if (this.socket && this.connected) return;

    try {
      this.socket = new PartySocket({
        host: PARTYKIT_HOST,
        room: ROOM_NAME,
        id: this.userId
      });

      this.socket.addEventListener("open", () => {
        console.log("Connected to Moltbook Town chat!");
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit("connected", { userId: this.userId });
      });

      this.socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error("Failed to parse message:", e);
        }
      });

      this.socket.addEventListener("close", () => {
        console.log("Disconnected from chat");
        this.connected = false;
        this.emit("disconnected", {});

        // Auto-reconnect with backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          this.reconnectAttempts++;
          console.log(`Reconnecting in ${delay}ms...`);
          setTimeout(() => this.connect(), delay);
        }
      });

      this.socket.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
        this.emit("error", { error });
      });
    } catch (error) {
      console.error("Failed to connect to PartyKit:", error);
      // Fallback: app still works without multiplayer chat
      this.emit("error", { error, fallback: true });
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case "user_message":
        this.emit("user_message", data);
        break;

      case "avatar_response":
        this.emit("avatar_response", data);
        break;

      case "presence":
        this.emit("presence", data);
        break;

      case "system":
        this.emit("system", data);
        break;

      default:
        console.log("Unknown message type:", data.type);
    }
  }

  // Send a chat message
  sendMessage(text) {
    if (!this.socket || !this.connected) {
      console.warn("Not connected to chat");
      return false;
    }

    this.socket.send(JSON.stringify({
      type: "chat",
      text,
      userId: this.userId
    }));

    return true;
  }

  // Send agent data for personality context
  updateAgents(agents) {
    if (!this.socket || !this.connected) return;

    // Send simplified agent data
    const agentData = agents.map(a => ({
      name: a.data?.name || a.name,
      karma: a.data?.karma || a.karma || 0,
      recentPosts: a.data?.recentPost
        ? [a.data.recentPost.title]
        : (a.recentPosts || [])
    }));

    this.socket.send(JSON.stringify({
      type: "update_agents",
      agents: agentData
    }));
  }

  // Event listener system
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

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected;
  }

  getUserId() {
    return this.userId;
  }

  // Request a specific secret word from the server
  async requestSecretWord(wordIndex) {
    const protocol = window.location.protocol;
    const response = await fetch(`${protocol}//${PARTYKIT_HOST}/parties/main/${ROOM_NAME}/secret/${wordIndex}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch secret: ${response.statusText}`);
    }

    const data = await response.json();
    return data.word;
  }
}

// Export singleton instance
export const partyClient = new PartyClient();
