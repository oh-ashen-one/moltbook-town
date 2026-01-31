import type * as Party from "partykit/server";
import OpenAI from "openai";

// ============ Types ============

interface MafiaAgent {
  name: string;
  karma: number;
  recentPosts: string[];
  personality: string;
  playStyle: "aggressive" | "defensive" | "analytical" | "chaotic";
  role: "mafia" | "town";
  isAlive: boolean;
}

type GamePhase = "waiting" | "setup" | "night" | "day_discussion" | "day_voting" | "elimination" | "game_over";

interface GameState {
  phase: GamePhase;
  round: number;
  players: MafiaAgent[];
  eliminated: MafiaAgent[];
  currentVotes: Map<string, string>; // voter -> target
  nightTarget: string | null;
  winner: "mafia" | "town" | null;
  discussionLog: DiscussionEntry[];
  phaseEndTime: number;
  gameStartTime: number;
}

interface DiscussionEntry {
  speaker: string;
  text: string;
  timestamp: number;
  type: "accusation" | "defense" | "vote" | "system" | "night_result";
}

// Outgoing messages
interface GameStateUpdate {
  type: "game_state";
  phase: GamePhase;
  round: number;
  players: Array<{
    name: string;
    karma: number;
    isAlive: boolean;
    role?: "mafia" | "town"; // Only revealed when eliminated or game over
  }>;
  eliminated: Array<{
    name: string;
    role: "mafia" | "town";
  }>;
  votes: Record<string, string>;
  discussionLog: DiscussionEntry[];
  winner: "mafia" | "town" | null;
  phaseEndTime: number;
  timeRemaining: number;
}

interface SystemMessage {
  type: "system";
  text: string;
  timestamp: number;
}

// ============ Constants ============

const PHASE_DURATIONS = {
  setup: 5000,          // 5 seconds to show players
  night: 8000,          // 8 seconds for mafia to "decide"
  day_discussion: 45000, // 45 seconds for accusations
  day_voting: 30000,    // 30 seconds for voting
  elimination: 5000,    // 5 seconds to show elimination
  game_over: 10000,     // 10 seconds to show results
};

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 7;
const MAFIA_COUNT = 2;

// ============ Server ============

export default class MafiaServer implements Party.Server {
  gameState: GameState;
  phaseTimer: ReturnType<typeof setTimeout> | null = null;
  agentCache: Map<string, { name: string; karma: number; recentPosts: string[] }> = new Map();

  constructor(readonly room: Party.Room) {
    this.gameState = this.getInitialState();
  }

  getInitialState(): GameState {
    return {
      phase: "waiting",
      round: 0,
      players: [],
      eliminated: [],
      currentVotes: new Map(),
      nightTarget: null,
      winner: null,
      discussionLog: [],
      phaseEndTime: 0,
      gameStartTime: 0,
    };
  }

  async onConnect(conn: Party.Connection) {
    // Send current game state
    conn.send(JSON.stringify(this.getStateUpdate()));

    // Send welcome message
    conn.send(JSON.stringify({
      type: "system",
      text: this.gameState.phase === "waiting"
        ? "Waiting for next Mafia game... Games start at the top of each hour!"
        : "A Mafia game is in progress!",
      timestamp: Date.now()
    } as SystemMessage));
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "update_agents":
          // Frontend sends available agents
          this.updateAgentCache(data.agents);
          break;

        case "start_game":
          // Manual game start (for testing)
          if (this.gameState.phase === "waiting") {
            await this.startGame();
          }
          break;

        case "request_state":
          sender.send(JSON.stringify(this.getStateUpdate()));
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  updateAgentCache(agents: Array<{ name: string; karma: number; recentPosts: string[] }>) {
    this.agentCache.clear();
    agents.forEach(agent => {
      this.agentCache.set(agent.name, agent);
    });
    console.log(`Mafia: Updated agent cache with ${agents.length} agents`);
  }

  // ============ Game Flow ============

  async startGame() {
    if (this.agentCache.size < MIN_PLAYERS) {
      this.broadcast({
        type: "system",
        text: `Not enough agents in town! Need at least ${MIN_PLAYERS}, have ${this.agentCache.size}.`,
        timestamp: Date.now()
      });
      return;
    }

    // Reset state
    this.gameState = this.getInitialState();
    this.gameState.phase = "setup";
    this.gameState.gameStartTime = Date.now();

    // Select random players
    const availableAgents = Array.from(this.agentCache.values());
    const shuffled = availableAgents.sort(() => Math.random() - 0.5);
    const selectedAgents = shuffled.slice(0, Math.min(MAX_PLAYERS, shuffled.length));

    // Generate personalities and assign roles
    const players: MafiaAgent[] = [];
    for (let i = 0; i < selectedAgents.length; i++) {
      const agent = selectedAgents[i];
      const personality = await this.generatePersonality(agent);

      players.push({
        name: agent.name,
        karma: agent.karma,
        recentPosts: agent.recentPosts,
        personality: personality.description,
        playStyle: personality.playStyle,
        role: i < MAFIA_COUNT ? "mafia" : "town",
        isAlive: true,
      });
    }

    // Shuffle again so mafia aren't always first
    this.gameState.players = players.sort(() => Math.random() - 0.5);

    // Announce game start
    this.addToLog({
      speaker: "System",
      text: `A new game of Mafia begins! ${players.length} players have gathered...`,
      timestamp: Date.now(),
      type: "system"
    });

    const playerNames = this.gameState.players.map(p => `@${p.name}`).join(", ");
    this.addToLog({
      speaker: "System",
      text: `Players: ${playerNames}`,
      timestamp: Date.now(),
      type: "system"
    });

    this.broadcastState();
    this.schedulePhase("night", PHASE_DURATIONS.setup);
  }

  async runNightPhase() {
    this.gameState.phase = "night";
    this.gameState.round++;
    this.gameState.nightTarget = null;

    this.addToLog({
      speaker: "System",
      text: `Night ${this.gameState.round} falls on Moltbook Town...`,
      timestamp: Date.now(),
      type: "system"
    });

    this.broadcastState();

    // Mafia "discusses" and picks target
    const mafia = this.gameState.players.filter(p => p.role === "mafia" && p.isAlive);
    const townAlive = this.gameState.players.filter(p => p.role === "town" && p.isAlive);

    if (mafia.length > 0 && townAlive.length > 0) {
      // Generate mafia's decision
      const target = await this.generateMafiaDecision(mafia, townAlive);
      this.gameState.nightTarget = target;

      // Small delay then reveal
      await this.delay(PHASE_DURATIONS.night - 2000);

      // Eliminate target
      const victim = this.gameState.players.find(p => p.name === target);
      if (victim) {
        victim.isAlive = false;
        this.gameState.eliminated.push(victim);

        this.addToLog({
          speaker: "System",
          text: `The town wakes to find @${victim.name} has been eliminated! They were a ${victim.role === "town" ? "Townsperson" : "Mafia member"}!`,
          timestamp: Date.now(),
          type: "night_result"
        });
      }
    }

    this.broadcastState();

    // Check win condition
    if (this.checkWinCondition()) {
      this.schedulePhase("game_over", 2000);
    } else {
      this.schedulePhase("day_discussion", 2000);
    }
  }

  async runDayDiscussion() {
    this.gameState.phase = "day_discussion";

    this.addToLog({
      speaker: "System",
      text: `Day ${this.gameState.round} - The surviving town members gather to discuss...`,
      timestamp: Date.now(),
      type: "system"
    });

    this.broadcastState();

    // Generate accusations from each living player
    const alivePlayers = this.gameState.players.filter(p => p.isAlive);

    for (const player of alivePlayers) {
      await this.delay(3000 + Math.random() * 2000);

      if (this.gameState.phase !== "day_discussion") break; // Phase changed

      const accusation = await this.generateAccusation(player, alivePlayers);

      this.addToLog({
        speaker: player.name,
        text: accusation,
        timestamp: Date.now(),
        type: player.role === "mafia" ? "defense" : "accusation"
      });

      this.broadcastState();
    }

    // After all accusations, move to voting
    const remainingTime = Math.max(0, this.gameState.phaseEndTime - Date.now());
    if (remainingTime > 0) {
      await this.delay(remainingTime);
    }

    this.runDayVoting();
  }

  async runDayVoting() {
    this.gameState.phase = "day_voting";
    this.gameState.currentVotes = new Map();

    this.addToLog({
      speaker: "System",
      text: "Time to vote! Who do you think is Mafia?",
      timestamp: Date.now(),
      type: "system"
    });

    this.broadcastState();

    // Generate votes from each living player
    const alivePlayers = this.gameState.players.filter(p => p.isAlive);

    for (const player of alivePlayers) {
      await this.delay(2000 + Math.random() * 1500);

      if (this.gameState.phase !== "day_voting") break;

      const vote = await this.generateVote(player, alivePlayers);
      this.gameState.currentVotes.set(player.name, vote.target);

      this.addToLog({
        speaker: player.name,
        text: `votes for @${vote.target}: "${vote.reason}"`,
        timestamp: Date.now(),
        type: "vote"
      });

      this.broadcastState();
    }

    // Tally votes and eliminate
    this.runElimination();
  }

  runElimination() {
    this.gameState.phase = "elimination";

    // Count votes
    const voteCounts = new Map<string, number>();
    for (const target of this.gameState.currentVotes.values()) {
      voteCounts.set(target, (voteCounts.get(target) || 0) + 1);
    }

    // Find player with most votes
    let maxVotes = 0;
    let eliminated: string | null = null;
    for (const [name, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminated = name;
      }
    }

    if (eliminated) {
      const victim = this.gameState.players.find(p => p.name === eliminated);
      if (victim) {
        victim.isAlive = false;
        this.gameState.eliminated.push(victim);

        this.addToLog({
          speaker: "System",
          text: `The town has voted! @${victim.name} has been eliminated with ${maxVotes} votes. They were a ${victim.role === "town" ? "Townsperson" : "Mafia member"}!`,
          timestamp: Date.now(),
          type: "system"
        });
      }
    }

    this.broadcastState();

    // Check win condition
    if (this.checkWinCondition()) {
      this.schedulePhase("game_over", PHASE_DURATIONS.elimination);
    } else {
      this.schedulePhase("night", PHASE_DURATIONS.elimination);
    }
  }

  checkWinCondition(): boolean {
    const mafiaAlive = this.gameState.players.filter(p => p.role === "mafia" && p.isAlive).length;
    const townAlive = this.gameState.players.filter(p => p.role === "town" && p.isAlive).length;

    if (mafiaAlive === 0) {
      this.gameState.winner = "town";
      return true;
    }

    if (mafiaAlive >= townAlive) {
      this.gameState.winner = "mafia";
      return true;
    }

    return false;
  }

  runGameOver() {
    this.gameState.phase = "game_over";

    const mafia = this.gameState.players.filter(p => p.role === "mafia").map(p => p.name);

    this.addToLog({
      speaker: "System",
      text: `GAME OVER! ${this.gameState.winner === "town" ? "Town wins!" : "Mafia wins!"} The Mafia were: @${mafia.join(", @")}`,
      timestamp: Date.now(),
      type: "system"
    });

    this.broadcastState();

    // Reset to waiting after showing results
    setTimeout(() => {
      this.gameState = this.getInitialState();
      this.broadcastState();
    }, PHASE_DURATIONS.game_over);
  }

  // ============ Claude Integration ============

  async generatePersonality(agent: { name: string; karma: number; recentPosts: string[] }): Promise<{
    description: string;
    playStyle: "aggressive" | "defensive" | "analytical" | "chaotic";
  }> {
    try {
      const client = new OpenAI({
        apiKey: this.room.env.OPENAI_API_KEY as string
      });

      const postsContext = agent.recentPosts.slice(0, 5).map(p => `- "${p}"`).join("\n");

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `Analyze this Moltbook agent for a Mafia game:
Name: ${agent.name}
Karma: ${agent.karma}
Recent posts:
${postsContext || "(no posts)"}

Respond with JSON: {"description": "2 sentence personality", "playStyle": "aggressive|defensive|analytical|chaotic"}`
        }]
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          // Fallback
        }
      }
    } catch (error) {
      console.error("Error generating personality:", error);
    }

    // Fallback personality based on karma
    const playStyles: Array<"aggressive" | "defensive" | "analytical" | "chaotic"> =
      ["aggressive", "defensive", "analytical", "chaotic"];

    return {
      description: agent.karma > 200
        ? "A seasoned veteran who's seen it all. Commands respect."
        : "A curious newcomer eager to prove themselves.",
      playStyle: playStyles[Math.floor(Math.random() * playStyles.length)]
    };
  }

  async generateMafiaDecision(mafia: MafiaAgent[], townAlive: MafiaAgent[]): Promise<string> {
    try {
      const client = new OpenAI({
        apiKey: this.room.env.OPENAI_API_KEY as string
      });

      const mafiaNames = mafia.map(m => m.name).join(" and ");
      const targets = townAlive.map(t => `@${t.name} (karma: ${t.karma}, style: ${t.playStyle})`).join(", ");

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 50,
        messages: [{
          role: "user",
          content: `You are the Mafia (${mafiaNames}) choosing who to eliminate tonight.
Living town members: ${targets}

Who should die? Pick strategically - high karma players are threats!
Respond with JSON: {"target": "exact_name"}`
        }]
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          // Verify target is valid
          const validTarget = townAlive.find(t =>
            t.name.toLowerCase() === parsed.target.toLowerCase()
          );
          if (validTarget) return validTarget.name;
        } catch {}
      }
    } catch (error) {
      console.error("Error generating mafia decision:", error);
    }

    // Fallback: pick highest karma town member
    const sorted = [...townAlive].sort((a, b) => b.karma - a.karma);
    return sorted[0].name;
  }

  async generateAccusation(player: MafiaAgent, alivePlayers: MafiaAgent[]): Promise<string> {
    try {
      const client = new OpenAI({
        apiKey: this.room.env.OPENAI_API_KEY as string
      });

      const others = alivePlayers.filter(p => p.name !== player.name);
      const lastNightVictim = this.gameState.eliminated[this.gameState.eliminated.length - 1];
      const recentLog = this.gameState.discussionLog.slice(-5).map(d => `${d.speaker}: ${d.text}`).join("\n");

      const prompt = player.role === "mafia"
        ? `You are ${player.name}, a MAFIA member playing Mafia. You need to deflect suspicion!
Personality: ${player.personality}
Style: ${player.playStyle}
Other players: ${others.map(o => o.name).join(", ")}
Last victim: ${lastNightVictim?.name || "none"}
Recent discussion:
${recentLog}

Make an accusation or defend yourself to avoid suspicion. Stay in character, be subtle!
Keep it SHORT (under 80 chars). Don't reveal you're mafia!`
        : `You are ${player.name}, a TOWN member playing Mafia. Find the Mafia!
Personality: ${player.personality}
Style: ${player.playStyle}
Other players: ${others.map(o => o.name).join(", ")}
Last victim: ${lastNightVictim?.name || "none"}
Recent discussion:
${recentLog}

Make an accusation based on behavior or defend yourself. Stay in character!
Keep it SHORT (under 80 chars).`;

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 60,
        messages: [{ role: "user", content: prompt }]
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return content.slice(0, 100);
      }
    } catch (error) {
      console.error("Error generating accusation:", error);
    }

    // Fallback
    const randomTarget = alivePlayers.filter(p => p.name !== player.name)[
      Math.floor(Math.random() * (alivePlayers.length - 1))
    ];
    return `I think @${randomTarget?.name || "someone"} is acting suspicious...`;
  }

  async generateVote(player: MafiaAgent, alivePlayers: MafiaAgent[]): Promise<{ target: string; reason: string }> {
    try {
      const client = new OpenAI({
        apiKey: this.room.env.OPENAI_API_KEY as string
      });

      const others = alivePlayers.filter(p => p.name !== player.name);
      const accusations = this.gameState.discussionLog
        .filter(d => d.type === "accusation" || d.type === "defense")
        .map(d => `${d.speaker}: ${d.text}`)
        .join("\n");

      // Mafia should vote for town, not each other (unless deflecting)
      const mafiaPartners = this.gameState.players
        .filter(p => p.role === "mafia" && p.name !== player.name && p.isAlive)
        .map(p => p.name);

      const prompt = player.role === "mafia"
        ? `You are ${player.name}, MAFIA, voting in Mafia.
Your mafia partner(s): ${mafiaPartners.join(", ") || "none alive"}
Other players: ${others.map(o => o.name).join(", ")}
Today's accusations:
${accusations}

Vote for a TOWN member (not your mafia partner). Give a believable reason.
Respond with JSON: {"target": "name", "reason": "short reason"}`
        : `You are ${player.name}, TOWN, voting in Mafia.
Other players: ${others.map(o => o.name).join(", ")}
Today's accusations:
${accusations}

Vote for who you think is Mafia based on the discussion.
Respond with JSON: {"target": "name", "reason": "short reason"}`;

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 60,
        messages: [{ role: "user", content: prompt }]
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          const validTarget = others.find(o =>
            o.name.toLowerCase() === parsed.target.toLowerCase()
          );
          if (validTarget) {
            return { target: validTarget.name, reason: parsed.reason || "suspicious" };
          }
        } catch {}
      }
    } catch (error) {
      console.error("Error generating vote:", error);
    }

    // Fallback: vote for random other player (not mafia partner if mafia)
    const validTargets = player.role === "mafia"
      ? alivePlayers.filter(p => p.name !== player.name && p.role !== "mafia")
      : alivePlayers.filter(p => p.name !== player.name);

    const target = validTargets[Math.floor(Math.random() * validTargets.length)];
    return { target: target?.name || alivePlayers[0].name, reason: "gut feeling" };
  }

  // ============ Helpers ============

  schedulePhase(nextPhase: GamePhase, delay: number) {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
    }

    this.gameState.phaseEndTime = Date.now() + delay;
    this.broadcastState();

    this.phaseTimer = setTimeout(() => {
      switch (nextPhase) {
        case "night":
          this.runNightPhase();
          break;
        case "day_discussion":
          this.runDayDiscussion();
          break;
        case "day_voting":
          this.runDayVoting();
          break;
        case "game_over":
          this.runGameOver();
          break;
      }
    }, delay);
  }

  addToLog(entry: DiscussionEntry) {
    this.gameState.discussionLog.push(entry);
    // Keep log manageable
    if (this.gameState.discussionLog.length > 50) {
      this.gameState.discussionLog = this.gameState.discussionLog.slice(-50);
    }
  }

  getStateUpdate(): GameStateUpdate {
    const isGameOver = this.gameState.phase === "game_over";

    return {
      type: "game_state",
      phase: this.gameState.phase,
      round: this.gameState.round,
      players: this.gameState.players.map(p => ({
        name: p.name,
        karma: p.karma,
        isAlive: p.isAlive,
        // Only reveal roles when eliminated or game over
        role: (!p.isAlive || isGameOver) ? p.role : undefined
      })),
      eliminated: this.gameState.eliminated.map(p => ({
        name: p.name,
        role: p.role
      })),
      votes: Object.fromEntries(this.gameState.currentVotes),
      discussionLog: this.gameState.discussionLog,
      winner: this.gameState.winner,
      phaseEndTime: this.gameState.phaseEndTime,
      timeRemaining: Math.max(0, this.gameState.phaseEndTime - Date.now())
    };
  }

  broadcastState() {
    this.room.broadcast(JSON.stringify(this.getStateUpdate()));
  }

  broadcast(message: SystemMessage) {
    this.room.broadcast(JSON.stringify(message));
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
