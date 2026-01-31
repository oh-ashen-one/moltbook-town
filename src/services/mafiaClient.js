import PartySocket from "partysocket";

// PartyKit connection configuration
const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || "localhost:1999";
const ROOM_NAME = "mafia-game";

class MafiaClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.gameState = null;
  }

  connect() {
    if (this.socket && this.connected) return;

    try {
      this.socket = new PartySocket({
        host: PARTYKIT_HOST,
        room: ROOM_NAME,
        party: "mafia" // Use the mafia party instead of default
      });

      this.socket.addEventListener("open", () => {
        console.log("Connected to Mafia game server!");
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit("connected", {});
      });

      this.socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error("Failed to parse mafia message:", e);
        }
      });

      this.socket.addEventListener("close", () => {
        console.log("Disconnected from Mafia server");
        this.connected = false;
        this.emit("disconnected", {});

        // Auto-reconnect with backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          this.reconnectAttempts++;
          console.log(`Reconnecting to Mafia in ${delay}ms...`);
          setTimeout(() => this.connect(), delay);
        }
      });

      this.socket.addEventListener("error", (error) => {
        console.error("Mafia WebSocket error:", error);
        this.emit("error", { error });
      });
    } catch (error) {
      console.error("Failed to connect to Mafia server:", error);
      this.emit("error", { error, fallback: true });
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case "game_state":
        this.gameState = data;
        this.emit("game_state", data);
        break;

      case "system":
        this.emit("system", data);
        break;

      default:
        console.log("Unknown mafia message type:", data.type);
    }
  }

  // Send agent data for game (players available)
  updateAgents(agents) {
    if (!this.socket || !this.connected) return;

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

  // Manually start a game (for testing)
  startGame() {
    console.log("startGame called, connected:", this.connected, "socket:", !!this.socket);

    if (!this.socket || !this.connected) {
      console.warn("Not connected to Mafia server - attempting to connect first");
      this.connect();
      // Try again after connection
      setTimeout(() => {
        if (this.connected && this.socket) {
          this.socket.send(JSON.stringify({ type: "start_game" }));
          console.log("Sent start_game message (after reconnect)");
        } else {
          console.error("Still not connected after reconnect attempt");
        }
      }, 1500);
      return false;
    }

    this.socket.send(JSON.stringify({ type: "start_game" }));
    console.log("Sent start_game message");
    return true;
  }

  // Request current game state
  requestState() {
    if (!this.socket || !this.connected) return;

    this.socket.send(JSON.stringify({
      type: "request_state"
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

  getGameState() {
    return this.gameState;
  }

  isGameActive() {
    return this.gameState && this.gameState.phase !== "waiting";
  }
}

// Export singleton instance
export const mafiaClient = new MafiaClient();
