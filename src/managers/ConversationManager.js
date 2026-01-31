import { CONFIG } from '../config.js';
import { moltbookService } from '../services/moltbook.js';

class ConversationGroup {
  constructor(id, agents, topic, centerX, centerY, scene) {
    this.id = id;
    this.agents = agents;
    this.topic = topic;
    this.centerX = centerX;
    this.centerY = centerY;
    this.scene = scene;
    this.startTime = Date.now();
    this.duration = CONFIG.CONVERSATION_DURATION_MIN +
      Math.random() * (CONFIG.CONVERSATION_DURATION_MAX - CONFIG.CONVERSATION_DURATION_MIN);
    this.phase = 'gathering'; // gathering | conversing | dispersing
    this.bubble = null;
    this.bubbleText = null;
    this.connectionLines = null;
  }

  update(delta) {
    const elapsed = Date.now() - this.startTime;

    // Phase transitions
    if (this.phase === 'gathering') {
      // Check if all agents have arrived
      const allArrived = this.agents.every(agent => {
        const dx = agent.sprite.x - agent.conversationTarget.x;
        const dy = agent.sprite.y - agent.conversationTarget.y;
        return Math.sqrt(dx * dx + dy * dy) < 15;
      });

      if (allArrived) {
        this.phase = 'conversing';
        this.showGroupBubble();
        this.agents.forEach(a => a.conversationState = 'conversing');
      }
    } else if (this.phase === 'conversing') {
      // Update bubble and lines position
      this.updateVisuals();

      // Check if conversation should end
      if (elapsed > this.duration) {
        this.phase = 'dispersing';
        this.hideGroupBubble();
        this.agents.forEach(a => a.conversationState = 'dispersing');
      }
    } else if (this.phase === 'dispersing') {
      // Give agents time to disperse
      if (elapsed > this.duration + 2000) {
        return true; // Signal to remove this conversation
      }
    }

    return false;
  }

  showGroupBubble() {
    // Calculate center of agents
    const avgX = this.agents.reduce((sum, a) => sum + a.sprite.x, 0) / this.agents.length;
    const avgY = this.agents.reduce((sum, a) => sum + a.sprite.y, 0) / this.agents.length;

    const bubbleWidth = Math.min(this.topic.length * 6 + 40, 200);
    const bubbleHeight = 35;
    const bubbleY = avgY - 80;

    // Create bubble graphics
    this.bubble = this.scene.add.graphics();

    // Bubble shadow
    this.bubble.fillStyle(0x000000, 0.2);
    this.bubble.fillRoundedRect(
      avgX - bubbleWidth / 2 + 3,
      bubbleY - bubbleHeight / 2 + 3,
      bubbleWidth,
      bubbleHeight,
      12
    );

    // Bubble background (slightly blue tint for group conversations)
    this.bubble.fillStyle(0xeef6ff, 0.98);
    this.bubble.fillRoundedRect(
      avgX - bubbleWidth / 2,
      bubbleY - bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      12
    );

    // Bubble border
    this.bubble.lineStyle(2, 0x5588cc, 1);
    this.bubble.strokeRoundedRect(
      avgX - bubbleWidth / 2,
      bubbleY - bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      12
    );

    // Multiple tails pointing to agents
    this.agents.forEach((agent, i) => {
      const tailX = avgX + (i - (this.agents.length - 1) / 2) * 15;
      this.bubble.fillStyle(0xeef6ff, 0.98);
      this.bubble.fillTriangle(
        tailX - 4, bubbleY + bubbleHeight / 2 - 5,
        tailX + 4, bubbleY + bubbleHeight / 2 - 5,
        tailX, bubbleY + bubbleHeight / 2 + 6
      );
    });

    // Topic text
    this.bubbleText = this.scene.add.text(avgX, bubbleY, this.topic, {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#334466',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Connection lines between agents
    this.connectionLines = this.scene.add.graphics();
    this.updateConnectionLines();

    // Fade in
    this.bubble.setAlpha(0);
    this.bubbleText.setAlpha(0);
    this.connectionLines.setAlpha(0);
    this.scene.tweens.add({
      targets: [this.bubble, this.bubbleText, this.connectionLines],
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
  }

  updateVisuals() {
    if (!this.bubble || !this.bubbleText) return;

    // Recalculate center
    const avgX = this.agents.reduce((sum, a) => sum + a.sprite.x, 0) / this.agents.length;
    const avgY = this.agents.reduce((sum, a) => sum + a.sprite.y, 0) / this.agents.length;
    const bubbleY = avgY - 80;

    // Move text (bubble graphics are harder to move, so we redraw connection lines)
    this.bubbleText.setPosition(avgX, bubbleY);
    this.updateConnectionLines();
  }

  updateConnectionLines() {
    if (!this.connectionLines) return;

    this.connectionLines.clear();
    this.connectionLines.lineStyle(1, 0x5588cc, 0.3);

    // Draw subtle lines connecting all agents
    for (let i = 0; i < this.agents.length; i++) {
      for (let j = i + 1; j < this.agents.length; j++) {
        this.connectionLines.lineBetween(
          this.agents[i].sprite.x,
          this.agents[i].sprite.y,
          this.agents[j].sprite.x,
          this.agents[j].sprite.y
        );
      }
    }
  }

  hideGroupBubble() {
    if (this.bubble) {
      this.scene.tweens.add({
        targets: [this.bubble, this.bubbleText, this.connectionLines],
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          this.bubble?.destroy();
          this.bubbleText?.destroy();
          this.connectionLines?.destroy();
          this.bubble = null;
          this.bubbleText = null;
          this.connectionLines = null;
        }
      });
    }
  }

  destroy() {
    this.hideGroupBubble();
    this.agents.forEach(agent => agent.clearConversationTarget());
  }
}

export class ConversationManager {
  constructor(scene) {
    this.scene = scene;
    this.activeConversations = new Map();
    this.usedConversationIds = new Set();
  }

  async startConversation(agentRefs, topic, conversationId) {
    // Filter out agents already in conversations
    const availableAgents = agentRefs.filter(a => !a.isInConversation());
    if (availableAgents.length < 2) return null;

    // Calculate cluster center (average position of agents)
    const centerX = availableAgents.reduce((sum, a) => sum + a.sprite.x, 0) / availableAgents.length;
    const centerY = availableAgents.reduce((sum, a) => sum + a.sprite.y, 0) / availableAgents.length;

    // Clamp to valid area
    const margin = 100;
    const clampedX = Math.max(margin, Math.min(CONFIG.GAME_WIDTH - margin, centerX));
    const clampedY = Math.max(margin, Math.min(CONFIG.GAME_HEIGHT - margin, centerY));

    // Create conversation group
    const group = new ConversationGroup(
      conversationId,
      availableAgents,
      topic,
      clampedX,
      clampedY,
      this.scene
    );

    // Set conversation targets for each agent (arranged in a circle)
    availableAgents.forEach((agent, i) => {
      const angle = (i / availableAgents.length) * Math.PI * 2;
      const radius = CONFIG.CONVERSATION_CLUSTER_RADIUS;
      const targetX = clampedX + Math.cos(angle) * radius;
      const targetY = clampedY + Math.sin(angle) * radius;

      agent.setConversationTarget(targetX, targetY, 'gathering');
      agent.conversationGroup = group;
    });

    this.activeConversations.set(conversationId, group);
    this.usedConversationIds.add(conversationId);

    return group;
  }

  async triggerRandomConversation(allAgents) {
    // Don't start too many conversations
    if (this.activeConversations.size >= CONFIG.MAX_ACTIVE_CONVERSATIONS) {
      return null;
    }

    // Get a conversation we haven't used recently
    const conversations = await moltbookService.fetchActiveConversations();
    const unused = conversations.filter(c => !this.usedConversationIds.has(c.id));

    // If all used, reset and pick any
    const pool = unused.length > 0 ? unused : conversations;
    if (pool.length === 0) return null;

    const conv = pool[Math.floor(Math.random() * pool.length)];

    // Find the agents by ID
    const agentRefs = conv.agentIds
      .map(id => allAgents.find(a => a.data.id === id))
      .filter(Boolean);

    if (agentRefs.length >= 2) {
      return this.startConversation(agentRefs, conv.topic, conv.id);
    }

    return null;
  }

  update(delta) {
    // Update all active conversations
    for (const [id, group] of this.activeConversations) {
      const shouldRemove = group.update(delta);
      if (shouldRemove) {
        group.destroy();
        this.activeConversations.delete(id);
      }
    }
  }

  getActiveCount() {
    return this.activeConversations.size;
  }
}
