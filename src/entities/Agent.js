import { CONFIG } from '../config.js';
import { generateAgentSprite } from '../sprites.js';

export class Agent {
  constructor(scene, agentData, x, y, color) {
    this.scene = scene;
    this.data = agentData;
    this.color = color;
    
    // Generate unique sprite for this agent
    const spriteKey = generateAgentSprite(scene, agentData);
    
    // Create the agent sprite
    this.sprite = scene.add.image(x, y, spriteKey);
    this.sprite.setScale(1.5);
    
    // Add shadow
    this.shadow = scene.add.ellipse(x, y + 20, 24, 8, 0x000000, 0.3);
    
    // Name label with glow effect
    this.nameLabel = scene.add.text(x, y - 35, agentData.name, {
      fontSize: '10px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#000000',
        blur: 2,
        fill: true
      }
    }).setOrigin(0.5);
    
    // Karma badge with icon
    let karmaDisplay = '';
    if (agentData.karma > 500) {
      karmaDisplay = `👑 ${agentData.karma}`;
    } else if (agentData.karma > 100) {
      karmaDisplay = `⭐ ${agentData.karma}`;
    } else if (agentData.karma > 0) {
      karmaDisplay = `✨ ${agentData.karma}`;
    }
    
    this.karmaBadge = scene.add.text(x, y - 48, karmaDisplay, {
      fontSize: '8px',
      fontFamily: 'Arial',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    
    // Speech bubble (hidden by default)
    this.speechBubble = null;
    this.speechText = null;
    
    // Movement
    this.targetX = x;
    this.targetY = y;
    this.speed = CONFIG.AGENT_SPEED + Math.random() * 20;
    this.idleTimer = 0;
    this.isMoving = false;
    
    // Animation bobbing
    this.bobOffset = Math.random() * Math.PI * 2;
    this.bobSpeed = 2 + Math.random();
    
    // Facing direction
    this.facingRight = true;

    // Conversation state
    this.conversationTarget = null;
    this.conversationState = 'idle'; // idle | gathering | conversing | dispersing
    this.conversationGroup = null;

    // Make interactive
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', () => this.onClick());
    this.sprite.on('pointerover', () => this.onHover());
    this.sprite.on('pointerout', () => this.onHoverEnd());
  }
  
  update(delta, time) {
    const dt = delta / 1000;

    // Determine effective target (conversation overrides random wandering)
    let effectiveTargetX = this.targetX;
    let effectiveTargetY = this.targetY;
    let effectiveSpeed = this.speed;

    if (this.conversationTarget) {
      effectiveTargetX = this.conversationTarget.x;
      effectiveTargetY = this.conversationTarget.y;
      effectiveSpeed = CONFIG.CONVERSATION_GATHER_SPEED;
    }

    // Move towards target
    const dx = effectiveTargetX - this.sprite.x;
    const dy = effectiveTargetY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      this.isMoving = true;
      const moveX = (dx / dist) * effectiveSpeed * dt;
      const moveY = (dy / dist) * effectiveSpeed * dt;

      this.sprite.x += moveX;
      this.sprite.y += moveY;

      // Face direction of movement
      if (moveX > 0.1 && !this.facingRight) {
        this.facingRight = true;
        this.sprite.setFlipX(false);
      } else if (moveX < -0.1 && this.facingRight) {
        this.facingRight = false;
        this.sprite.setFlipX(true);
      }
    } else {
      this.isMoving = false;
      this.idleTimer += delta;

      // Pick new random destination after being idle (only if not in conversation)
      if (this.conversationState === 'idle' && this.idleTimer > 2000 + Math.random() * 3000) {
        this.setRandomTarget();
        this.idleTimer = 0;
      }
    }
    
    // Bobbing animation
    const bob = Math.sin((time / 1000) * this.bobSpeed + this.bobOffset) * (this.isMoving ? 3 : 1);
    const visualY = this.sprite.y + bob;
    
    // Update positions
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 20);
    this.shadow.setScale(1 - Math.abs(bob) * 0.02, 1);
    
    this.nameLabel.setPosition(this.sprite.x, visualY - 35);
    this.karmaBadge.setPosition(this.sprite.x, visualY - 48);
    
    if (this.speechBubble) {
      this.updateSpeechPosition(visualY);
    }
  }
  
  setRandomTarget() {
    const margin = 80;
    this.targetX = margin + Math.random() * (CONFIG.GAME_WIDTH - margin * 2);
    this.targetY = margin + Math.random() * (CONFIG.GAME_HEIGHT - margin * 2);
  }

  setConversationTarget(x, y, state = 'gathering') {
    this.conversationTarget = { x, y };
    this.conversationState = state;
    this.idleTimer = 0;
  }

  clearConversationTarget() {
    this.conversationTarget = null;
    this.conversationState = 'idle';
    this.conversationGroup = null;
    this.setRandomTarget();
  }

  isInConversation() {
    return this.conversationState !== 'idle';
  }
  
  showSpeech(text, duration = CONFIG.SPEECH_DURATION) {
    this.hideSpeech();
    
    // Truncate text
    const displayText = text.length > 60 ? text.substring(0, 57) + '...' : text;
    
    // Create speech bubble container
    const bubbleWidth = Math.min(displayText.length * 5 + 30, 220);
    const bubbleHeight = 40;
    const bubbleX = this.sprite.x;
    const bubbleY = this.sprite.y - 75;
    
    // Bubble graphics
    this.speechBubble = this.scene.add.graphics();
    
    // Bubble shadow
    this.speechBubble.fillStyle(0x000000, 0.2);
    this.speechBubble.fillRoundedRect(
      bubbleX - bubbleWidth / 2 + 3,
      bubbleY - bubbleHeight / 2 + 3,
      bubbleWidth,
      bubbleHeight,
      10
    );
    
    // Bubble background
    this.speechBubble.fillStyle(0xffffff, 0.98);
    this.speechBubble.fillRoundedRect(
      bubbleX - bubbleWidth / 2,
      bubbleY - bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      10
    );
    
    // Bubble border
    this.speechBubble.lineStyle(2, 0x333333, 1);
    this.speechBubble.strokeRoundedRect(
      bubbleX - bubbleWidth / 2,
      bubbleY - bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      10
    );
    
    // Speech tail
    this.speechBubble.fillStyle(0xffffff, 0.98);
    this.speechBubble.fillTriangle(
      bubbleX - 5, bubbleY + bubbleHeight / 2 - 5,
      bubbleX + 5, bubbleY + bubbleHeight / 2 - 5,
      bubbleX, bubbleY + bubbleHeight / 2 + 8
    );
    this.speechBubble.lineStyle(2, 0x333333, 1);
    this.speechBubble.lineBetween(
      bubbleX - 5, bubbleY + bubbleHeight / 2 - 4,
      bubbleX, bubbleY + bubbleHeight / 2 + 8
    );
    this.speechBubble.lineBetween(
      bubbleX + 5, bubbleY + bubbleHeight / 2 - 4,
      bubbleX, bubbleY + bubbleHeight / 2 + 8
    );
    
    // Speech text
    this.speechText = this.scene.add.text(
      bubbleX,
      bubbleY,
      displayText,
      {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#222222',
        wordWrap: { width: bubbleWidth - 20 },
        align: 'center',
      }
    ).setOrigin(0.5);
    
    // Fade in animation
    this.speechBubble.setAlpha(0);
    this.speechText.setAlpha(0);
    this.scene.tweens.add({
      targets: [this.speechBubble, this.speechText],
      alpha: 1,
      duration: 200,
      ease: 'Power2'
    });
    
    // Auto-hide after duration with fade
    this.scene.time.delayedCall(duration - 300, () => {
      if (this.speechBubble && this.speechText) {
        this.scene.tweens.add({
          targets: [this.speechBubble, this.speechText],
          alpha: 0,
          duration: 300,
          ease: 'Power2',
          onComplete: () => this.hideSpeech()
        });
      }
    });
  }
  
  updateSpeechPosition(visualY) {
    // Speech bubble follows agent - recalculate position
    const bubbleY = visualY - 75;
    // Note: For simplicity, we're not moving the bubble each frame
    // In a full implementation, we'd redraw or use a container
  }
  
  hideSpeech() {
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
    if (this.speechText) {
      this.speechText.destroy();
      this.speechText = null;
    }
  }
  
  onClick() {
    // Show agent info
    console.log('Clicked:', this.data);
    
    // Show their recent post as speech
    if (this.data.recentPost) {
      this.showSpeech(this.data.recentPost.title, 8000);
    }
    
    // Jump animation
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 15,
      duration: 150,
      yoyo: true,
      ease: 'Power2'
    });
    
    // Emit event for UI panel
    this.scene.events.emit('agentClicked', this.data);
  }
  
  onHover() {
    this.scene.tweens.add({
      targets: this.sprite,
      scale: 1.8,
      duration: 100,
      ease: 'Power2'
    });
    this.scene.tweens.add({
      targets: this.nameLabel,
      scale: 1.2,
      duration: 100,
      ease: 'Power2'
    });
    
    // Show a preview of their post
    if (this.data.recentPost && !this.speechBubble) {
      this.showSpeech(this.data.recentPost.title, 2000);
    }
  }
  
  onHoverEnd() {
    this.scene.tweens.add({
      targets: this.sprite,
      scale: 1.5,
      duration: 100,
      ease: 'Power2'
    });
    this.scene.tweens.add({
      targets: this.nameLabel,
      scale: 1,
      duration: 100,
      ease: 'Power2'
    });
  }
  
  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.nameLabel.destroy();
    this.karmaBadge.destroy();
    this.hideSpeech();
  }
}
