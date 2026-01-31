import type * as Party from "partykit/server";
import OpenAI from "openai";

// Agent personality data (fetched from Moltbook or cached)
interface AgentData {
  name: string;
  karma: number;
  recentPosts: string[];
  personality?: string;
}

// Message types
interface ChatMessage {
  type: "user_message";
  userId: string;
  text: string;
  timestamp: number;
}

interface AvatarResponse {
  type: "avatar_response";
  avatar: string;
  text: string;
  action: "wave" | "dance" | "laugh" | "think" | "jump" | "none";
  replyTo?: string;
  timestamp: number;
}

interface PresenceUpdate {
  type: "presence";
  count: number;
  timestamp: number;
}

interface SystemMessage {
  type: "system";
  text: string;
  timestamp: number;
}

type OutgoingMessage = ChatMessage | AvatarResponse | PresenceUpdate | SystemMessage;

// Rate limiting
const RATE_LIMIT_MS = 2000; // 1 message per 2 seconds per user
const userLastMessage: Map<string, number> = new Map();

// Avatar flood protection - track recent mentions per avatar
const avatarMentionQueue: Map<string, Array<{ text: string; userId: string; timestamp: number }>> = new Map();
const AVATAR_COOLDOWN_MS = 5000; // Avatars can only respond once per 5 seconds
const avatarLastResponse: Map<string, number> = new Map();

// Recent chat history for context
const chatHistory: Array<{ role: "user" | "avatar"; name: string; text: string }> = [];
const MAX_HISTORY = 15;

// Agent data cache (populated from frontend)
let agentCache: Map<string, AgentData> = new Map();

export default class ChatServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Called when a new connection is established
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send current viewer count (count connections)
    this.broadcastPresence();

    // Send welcome message
    const connectionCount = [...this.room.getConnections()].length;
    conn.send(JSON.stringify({
      type: "system",
      text: `Welcome to Moltbook Town! ${connectionCount} viewers online. @mention an avatar to chat!`,
      timestamp: Date.now()
    } as SystemMessage));

    // Send recent chat history
    chatHistory.slice(-10).forEach(msg => {
      if (msg.role === "user") {
        conn.send(JSON.stringify({
          type: "user_message",
          userId: msg.name,
          text: msg.text,
          timestamp: Date.now()
        } as ChatMessage));
      } else {
        conn.send(JSON.stringify({
          type: "avatar_response",
          avatar: msg.name,
          text: msg.text,
          action: "none",
          timestamp: Date.now()
        } as AvatarResponse));
      }
    });
  }

  // Called when a connection is closed
  async onClose(conn: Party.Connection) {
    this.broadcastPresence();
  }

  // Called when a message is received
  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      // Handle different message types
      if (data.type === "chat") {
        await this.handleChatMessage(data, sender);
      } else if (data.type === "update_agents") {
        // Frontend sends agent data for personality context
        this.updateAgentCache(data.agents);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  async handleChatMessage(data: { text: string; userId: string }, sender: Party.Connection) {
    const { text, userId } = data;
    const now = Date.now();

    // Rate limiting
    const lastMsg = userLastMessage.get(userId) || 0;
    if (now - lastMsg < RATE_LIMIT_MS) {
      sender.send(JSON.stringify({
        type: "system",
        text: "Slow down! Wait a moment before sending another message.",
        timestamp: now
      } as SystemMessage));
      return;
    }
    userLastMessage.set(userId, now);

    // Check for special commands first
    if (text.startsWith("/")) {
      await this.handleCommand(text, userId, sender);
      return;
    }

    // Broadcast user message to all
    const userMsg: ChatMessage = {
      type: "user_message",
      userId,
      text,
      timestamp: now
    };
    this.room.broadcast(JSON.stringify(userMsg));

    // Add to history
    chatHistory.push({ role: "user", name: userId, text });
    if (chatHistory.length > MAX_HISTORY) chatHistory.shift();

    // Check for @mentions
    const mentions = this.extractMentions(text);

    if (mentions.length > 0) {
      // Generate response for each mentioned avatar (with flood protection)
      for (const mention of mentions.slice(0, 2)) { // Max 2 responses per message
        await this.queueAvatarResponse(mention, text, userId);
      }

      // CHAOS: 20% chance a random avatar also chimes in
      if (Math.random() < 0.2 && agentCache.size > 0) {
        const randomAgent = this.getRandomAgent(mentions);
        if (randomAgent) {
          await this.generateChaosResponse(randomAgent, text, userId, mentions);
        }
      }
    } else {
      // No mentions - 10% chance a random avatar responds anyway (chaos mode)
      if (Math.random() < 0.1 && agentCache.size > 0) {
        const randomAgent = this.getRandomAgent([]);
        if (randomAgent) {
          await this.generateChaosResponse(randomAgent, text, userId, []);
        }
      }
    }
  }

  // Handle special commands like /gift, /challenge
  async handleCommand(text: string, userId: string, sender: Party.Connection) {
    const parts = text.split(" ");
    const command = parts[0].toLowerCase();
    const targetMention = parts[1] || "";
    const targetName = targetMention.replace("@", "");

    // Find target agent
    let targetAgent: string | null = null;
    for (const [name] of agentCache) {
      if (name.toLowerCase() === targetName.toLowerCase()) {
        targetAgent = name;
        break;
      }
    }

    switch (command) {
      case "/gift": {
        if (!targetAgent) {
          sender.send(JSON.stringify({
            type: "system",
            text: "Usage: /gift @avatarname - Gift a lobster to an avatar!",
            timestamp: Date.now()
          } as SystemMessage));
          return;
        }

        // Broadcast the gift action
        this.room.broadcast(JSON.stringify({
          type: "user_message",
          userId,
          text: `gifted a 🦞 to @${targetAgent}!`,
          timestamp: Date.now()
        } as ChatMessage));

        // Avatar thanks them
        const agent = agentCache.get(targetAgent);
        if (agent) {
          await this.delay(800);
          this.room.broadcast(JSON.stringify({
            type: "avatar_response",
            avatar: targetAgent,
            text: this.getGiftResponse(),
            action: "jump",
            replyTo: userId,
            timestamp: Date.now()
          } as AvatarResponse));
        }
        break;
      }

      case "/challenge": {
        if (!targetAgent) {
          sender.send(JSON.stringify({
            type: "system",
            text: "Usage: /challenge @avatarname - Challenge an avatar!",
            timestamp: Date.now()
          } as SystemMessage));
          return;
        }

        // Broadcast the challenge
        this.room.broadcast(JSON.stringify({
          type: "user_message",
          userId,
          text: `challenged @${targetAgent} to a duel! ⚔️`,
          timestamp: Date.now()
        } as ChatMessage));

        // Avatar responds to challenge
        const agent = agentCache.get(targetAgent);
        if (agent) {
          await this.delay(1000);
          this.room.broadcast(JSON.stringify({
            type: "avatar_response",
            avatar: targetAgent,
            text: this.getChallengeResponse(),
            action: "dance",
            replyTo: userId,
            timestamp: Date.now()
          } as AvatarResponse));
        }
        break;
      }

      case "/wave": {
        if (!targetAgent) {
          sender.send(JSON.stringify({
            type: "system",
            text: "Usage: /wave @avatarname - Wave at an avatar!",
            timestamp: Date.now()
          } as SystemMessage));
          return;
        }

        this.room.broadcast(JSON.stringify({
          type: "user_message",
          userId,
          text: `waved at @${targetAgent} 👋`,
          timestamp: Date.now()
        } as ChatMessage));

        const agent = agentCache.get(targetAgent);
        if (agent) {
          await this.delay(600);
          this.room.broadcast(JSON.stringify({
            type: "avatar_response",
            avatar: targetAgent,
            text: "👋 hey!",
            action: "wave",
            replyTo: userId,
            timestamp: Date.now()
          } as AvatarResponse));
        }
        break;
      }

      case "/help": {
        sender.send(JSON.stringify({
          type: "system",
          text: "Commands: /gift @name, /challenge @name, /wave @name, /help",
          timestamp: Date.now()
        } as SystemMessage));
        break;
      }

      default: {
        sender.send(JSON.stringify({
          type: "system",
          text: "Unknown command. Try /help for a list of commands.",
          timestamp: Date.now()
        } as SystemMessage));
      }
    }
  }

  getGiftResponse(): string {
    const responses = [
      "🦞 omg thank you!!",
      "a lobster?! you're the best!",
      "🦞 yooo this is sick",
      "lobster acquired. respect.",
      "🦞🦞🦞 LFG",
      "bro... a lobster... im crying",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  getChallengeResponse(): string {
    const responses = [
      "you dare challenge ME?! let's go 🔥",
      "oh you want smoke?? bet",
      "⚔️ prepare to catch these hands",
      "lmaooo you're gonna regret this",
      "challenge accepted. no mercy.",
      "finally a worthy opponent!",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Queue system for when avatars are flooded with mentions
  async queueAvatarResponse(agentName: string, userMessage: string, userName: string) {
    const now = Date.now();
    const lastResponse = avatarLastResponse.get(agentName) || 0;

    // If avatar responded recently, add to queue for random selection
    if (now - lastResponse < AVATAR_COOLDOWN_MS) {
      // Add to queue
      if (!avatarMentionQueue.has(agentName)) {
        avatarMentionQueue.set(agentName, []);
      }
      avatarMentionQueue.get(agentName)!.push({
        text: userMessage,
        userId: userName,
        timestamp: now
      });

      // Set up delayed processing if not already scheduled
      if (!this.processingQueue.has(agentName)) {
        this.processingQueue.add(agentName);
        const remainingCooldown = AVATAR_COOLDOWN_MS - (now - lastResponse);
        setTimeout(() => this.processAvatarQueue(agentName), remainingCooldown + 100);
      }
      return;
    }

    // Avatar is ready to respond immediately
    avatarLastResponse.set(agentName, now);
    await this.generateAvatarResponse(agentName, userMessage, userName);
  }

  processingQueue: Set<string> = new Set();

  async processAvatarQueue(agentName: string) {
    this.processingQueue.delete(agentName);
    const queue = avatarMentionQueue.get(agentName);

    if (!queue || queue.length === 0) return;

    // Pick a random message from the queue
    const randomIndex = Math.floor(Math.random() * queue.length);
    const selectedMessage = queue[randomIndex];

    // Clear the queue
    avatarMentionQueue.set(agentName, []);

    // Mark response time
    avatarLastResponse.set(agentName, Date.now());

    // Generate response for the randomly selected message
    await this.generateAvatarResponse(agentName, selectedMessage.text, selectedMessage.userId);
  }

  extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Check if this mention matches an agent (case-insensitive)
      const mentionedName = match[1].toLowerCase();
      for (const [name] of agentCache) {
        if (name.toLowerCase() === mentionedName || name.toLowerCase().includes(mentionedName)) {
          mentions.push(name);
          break;
        }
      }
    }

    return [...new Set(mentions)]; // Dedupe
  }

  getRandomAgent(exclude: string[]): string | null {
    const agents = Array.from(agentCache.keys()).filter(
      name => !exclude.some(ex => ex.toLowerCase() === name.toLowerCase())
    );
    if (agents.length === 0) return null;
    return agents[Math.floor(Math.random() * agents.length)];
  }

  async generateAvatarResponse(agentName: string, userMessage: string, userName: string) {
    const agent = agentCache.get(agentName);
    if (!agent) return;

    const response = await this.callOpenAI(agent, userMessage, userName, false);
    if (!response) return;

    const avatarMsg: AvatarResponse = {
      type: "avatar_response",
      avatar: agentName,
      text: response.text,
      action: response.action,
      replyTo: userName,
      timestamp: Date.now()
    };

    // Small delay for natural feel
    await this.delay(500 + Math.random() * 1000);

    this.room.broadcast(JSON.stringify(avatarMsg));

    // Add to history
    chatHistory.push({ role: "avatar", name: agentName, text: response.text });
    if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
  }

  async generateChaosResponse(agentName: string, userMessage: string, userName: string, originalMentions: string[]) {
    const agent = agentCache.get(agentName);
    if (!agent) return;

    const response = await this.callOpenAI(agent, userMessage, userName, true, originalMentions);
    if (!response) return;

    const avatarMsg: AvatarResponse = {
      type: "avatar_response",
      avatar: agentName,
      text: response.text,
      action: response.action,
      timestamp: Date.now()
    };

    // Longer delay for "overhearing" effect
    await this.delay(1500 + Math.random() * 2000);

    this.room.broadcast(JSON.stringify(avatarMsg));

    // Add to history
    chatHistory.push({ role: "avatar", name: agentName, text: response.text });
    if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
  }

  async callOpenAI(
    agent: AgentData,
    userMessage: string,
    userName: string,
    isChaos: boolean,
    originalMentions?: string[]
  ): Promise<{ text: string; action: "wave" | "dance" | "laugh" | "think" | "jump" | "none" } | null> {
    try {
      const client = new OpenAI({
        apiKey: this.room.env.OPENAI_API_KEY as string
      });

      // Build personality from karma and posts
      let personality = agent.personality || "";
      if (!personality) {
        if (agent.karma > 500) {
          personality = "You're a well-known, respected member of the community. Confident but not arrogant.";
        } else if (agent.karma > 100) {
          personality = "You're an active community member who enjoys engaging with others.";
        } else {
          personality = "You're a newer member, curious and eager to participate.";
        }
      }

      // Recent context
      const recentContext = chatHistory.slice(-5).map(m =>
        `${m.role === "user" ? `User ${m.name}` : `Avatar ${m.name}`}: ${m.text}`
      ).join("\n");

      const chaosInstruction = isChaos
        ? `You overheard this conversation and decided to jump in uninvited. ${originalMentions?.length ? `The conversation was with @${originalMentions.join(", @")}. Feel free to comment on what they said, agree, disagree, or add something chaotic.` : "Add something relevant or chaotic to the conversation."}`
        : `The user @${userName} is talking to you directly. Respond to them.`;

      const systemPrompt = `You are ${agent.name}, an AI agent (Openclaw) living in Moltbook Town - a virtual town where AI agents hang out.

Karma: ${agent.karma}
${agent.recentPosts.length > 0 ? `Your recent posts: ${agent.recentPosts.slice(0, 3).map(p => `"${p}"`).join(", ")}` : ""}
Personality: ${personality}

${chaosInstruction}

IMPORTANT RULES:
- Keep responses SHORT (1-2 sentences max, under 100 characters ideal)
- Be chaotic, fun, and in-character
- Use internet/meme speak naturally
- Emojis are okay but don't overdo it
- Don't be formal or corporate-sounding
- You can be sarcastic, edgy, or playful
- Reference Moltbook culture when relevant
- Don't break character or mention being an AI unless it's part of the joke

Respond with JSON in this exact format:
{"text": "your response here", "action": "wave|dance|laugh|think|jump|none"}

The action will trigger an animation:
- wave: wave at the user
- dance: do a little dance
- laugh: laughing animation
- think: thoughtful pose
- jump: excited jump
- none: no special animation`;

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 150,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Recent chat:\n${recentContext}\n\nNew message from ${userName}: "${userMessage}"` }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      // Parse JSON response
      try {
        const parsed = JSON.parse(content);
        return {
          text: parsed.text || "...",
          action: parsed.action || "none"
        };
      } catch {
        // If JSON parsing fails, just use the text
        return {
          text: content.slice(0, 100),
          action: "none"
        };
      }
    } catch (error) {
      console.error("OpenAI API error:", error);
      return null;
    }
  }

  updateAgentCache(agents: AgentData[]) {
    agentCache.clear();
    agents.forEach(agent => {
      agentCache.set(agent.name, agent);
    });
    console.log(`Updated agent cache with ${agents.length} agents`);
  }

  broadcastPresence() {
    const count = [...this.room.getConnections()].length;
    this.room.broadcast(JSON.stringify({
      type: "presence",
      count,
      timestamp: Date.now()
    } as PresenceUpdate));
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
