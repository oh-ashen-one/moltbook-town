import { CONFIG } from '../config.js';

export class Agent {
  constructor(scene, agentData, x, y, spriteKey) {
    this.scene = scene;
    this.data = agentData;
    this.spriteKey = spriteKey;

    // Scale based on karma (0.4 to 0.7 range)
    const karmaScale = Math.min(0.7, 0.4 + (agentData.karma / 500) * 0.3);
    this.baseScale = karmaScale;

    // Create the agent sprite
    this.sprite = scene.add.image(x, y, spriteKey);
    this.sprite.setScale(karmaScale);

    // Add glow for high-karma agents
    this.glow = null;
    if (agentData.karma > 200) {
      const glowColor = agentData.karma > 500 ? 0xffd700 : 0xaaddff;
      const glowAlpha = Math.min(0.4, agentData.karma / 1500);
      this.glow = scene.add.circle(x, y, 30 * karmaScale, glowColor, glowAlpha);
      this.glow.setDepth(-1);
    }

    // Add shadow
    this.shadow = scene.add.ellipse(x, y + 25, 30, 10, 0x000000, 0.3);

    // Name label
    this.nameLabel = scene.add.text(x, y - 40, agentData.name, {
      fontSize: '9px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Karma badge
    let karmaDisplay = '';
    if (agentData.karma > 500) {
      karmaDisplay = `👑 ${agentData.karma}`;
    } else if (agentData.karma > 100) {
      karmaDisplay = `⭐ ${agentData.karma}`;
    } else if (agentData.karma > 0) {
      karmaDisplay = `✨ ${agentData.karma}`;
    }

    this.karmaBadge = scene.add.text(x, y - 52, karmaDisplay, {
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

    // Animation
    this.bobOffset = Math.random() * Math.PI * 2;
    this.bobSpeed = 2 + Math.random();
    this.walkFrame = 0;
    this.walkTimer = 0;

    // Make interactive
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', () => this.onClick());
    this.sprite.on('pointerover', () => this.onHover());
    this.sprite.on('pointerout', () => this.onHoverEnd());
  }

  update(delta, time) {
    const dt = delta / 1000;

    // Move towards target
    const dx = this.targetX - this.sprite.x;
    const dy = this.targetY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      this.isMoving = true;
      const moveX = (dx / dist) * this.speed * dt;
      const moveY = (dy / dist) * this.speed * dt;

      this.sprite.x += moveX;
      this.sprite.y += moveY;

      // Flip sprite based on direction
      if (moveX < -0.1) {
        this.sprite.setFlipX(true);
      } else if (moveX > 0.1) {
        this.sprite.setFlipX(false);
      }

      // Walk animation
      this.walkTimer += delta;
      if (this.walkTimer > 200) {
        this.walkTimer = 0;
        this.walkFrame = 1 - this.walkFrame;
      }
    } else {
      this.isMoving = false;
      this.idleTimer += delta;

      if (this.idleTimer > 2000 + Math.random() * 3000) {
        this.setRandomTarget();
        this.idleTimer = 0;
      }
    }

    // Bobbing animation
    const bob = Math.sin((time / 1000) * this.bobSpeed + this.bobOffset) * (this.isMoving ? 4 : 2);
    const visualY = this.sprite.y + bob;

    // Update positions
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 25);
    this.shadow.setScale(1 - Math.abs(bob) * 0.02, 1);

    // Glow follows agent
    if (this.glow) {
      this.glow.setPosition(this.sprite.x, this.sprite.y);
    }

    this.nameLabel.setPosition(this.sprite.x, visualY - 40);
    this.karmaBadge.setPosition(this.sprite.x, visualY - 52);
  }

  setRandomTarget() {
    const margin = 120;
    this.targetX = margin + Math.random() * (CONFIG.GAME_WIDTH - margin * 2);
    this.targetY = margin + Math.random() * (CONFIG.GAME_HEIGHT - margin * 2);
  }

  showSpeech(text, duration = CONFIG.SPEECH_DURATION) {
    this.hideSpeech();

    const displayText = text.length > 50 ? text.substring(0, 47) + '...' : text;
    const bubbleWidth = Math.min(displayText.length * 5 + 30, 200);
    const bubbleHeight = 40;
    const bubbleX = this.sprite.x;
    const bubbleY = this.sprite.y - 80;

    // Bubble graphics
    this.speechBubble = this.scene.add.graphics();

    // Shadow
    this.speechBubble.fillStyle(0x000000, 0.2);
    this.speechBubble.fillRoundedRect(bubbleX - bubbleWidth / 2 + 3, bubbleY - bubbleHeight / 2 + 3, bubbleWidth, bubbleHeight, 10);

    // Background
    this.speechBubble.fillStyle(0xffffff, 0.95);
    this.speechBubble.fillRoundedRect(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 10);

    // Border
    this.speechBubble.lineStyle(2, 0x333333, 1);
    this.speechBubble.strokeRoundedRect(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 10);

    // Tail
    this.speechBubble.fillStyle(0xffffff, 0.95);
    this.speechBubble.fillTriangle(bubbleX - 5, bubbleY + bubbleHeight / 2 - 5, bubbleX + 5, bubbleY + bubbleHeight / 2 - 5, bubbleX, bubbleY + bubbleHeight / 2 + 8);

    // Text
    this.speechText = this.scene.add.text(bubbleX, bubbleY, displayText, {
      fontSize: '9px',
      fontFamily: 'Arial, sans-serif',
      color: '#222222',
      wordWrap: { width: bubbleWidth - 15 },
      align: 'center',
    }).setOrigin(0.5);

    // Fade in
    this.speechBubble.setAlpha(0);
    this.speechText.setAlpha(0);
    this.scene.tweens.add({
      targets: [this.speechBubble, this.speechText],
      alpha: 1,
      duration: 200,
    });

    // Auto-hide
    this.scene.time.delayedCall(duration - 300, () => {
      if (this.speechBubble && this.speechText) {
        this.scene.tweens.add({
          targets: [this.speechBubble, this.speechText],
          alpha: 0,
          duration: 300,
          onComplete: () => this.hideSpeech()
        });
      }
    });
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
    if (this.data.recentPost) {
      this.showSpeech(this.data.recentPost.title, 8000);
    }

    // Jump animation
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 20,
      duration: 150,
      yoyo: true,
      ease: 'Power2'
    });

    this.scene.events.emit('agentClicked', this.data);
  }

  onHover() {
    this.scene.tweens.add({
      targets: this.sprite,
      scale: this.baseScale * 1.2,
      duration: 100,
    });
    this.scene.tweens.add({
      targets: this.nameLabel,
      scale: 1.1,
      duration: 100,
    });

    // Show a preview of their post
    if (this.data.recentPost && !this.speechBubble) {
      this.showSpeech(this.data.recentPost.title, 2000);
    }
  }

  onHoverEnd() {
    this.scene.tweens.add({
      targets: this.sprite,
      scale: this.baseScale,
      duration: 100,
    });
    this.scene.tweens.add({
      targets: this.nameLabel,
      scale: 1,
      duration: 100,
    });
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.nameLabel.destroy();
    this.karmaBadge.destroy();
    if (this.glow) this.glow.destroy();
    this.hideSpeech();
  }
}
