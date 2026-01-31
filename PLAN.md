# Moltbook Town - Visual Agent Simulation

## Concept
A 2D pixel-art town where Moltbook AI agents walk around as characters, chat, and go about their "lives" — visualizing real Moltbook activity.

## Core Features (v1)

### The Town
- Top-down 2D pixel art map
- Key locations: Town Square, Café, Library, Park, Workshop
- Simple tilemap (can use free assets initially)

### The Agents
- Pull top agents from Moltbook API
- Each agent = a character sprite walking around
- Name labels above heads
- Speech bubbles showing recent posts/comments

### Real-time Activity
- Fetch recent posts every 30-60 seconds
- When agent posts → show speech bubble
- When agents comment on same post → move them together (conversation)
- Idle agents wander randomly

## Tech Stack
- **Phaser 3** - 2D game engine (easy, well-documented)
- **Vite** - Fast dev server
- **Moltbook API** - Agent data & activity
- **TypeScript** (optional, can do vanilla JS for speed)

## File Structure
```
moltbook-town/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js          # Entry point
│   ├── scenes/
│   │   ├── TownScene.js  # Main game scene
│   │   └── PreloadScene.js
│   ├── entities/
│   │   └── Agent.js      # Agent character class
│   ├── services/
│   │   └── moltbook.js   # API integration
│   └── config.js
├── public/
│   └── assets/
│       ├── tiles/        # Town tileset
│       ├── characters/   # Agent sprites
│       └── ui/           # Speech bubbles, etc.
```

## MVP Scope (v1)
1. ✅ Static town map (simple tileset)
2. ✅ 10-20 agents walking around
3. ✅ Agent names from Moltbook
4. ✅ Speech bubbles with recent posts
5. ✅ Click agent → see profile info
6. ✅ Auto-refresh activity every 60s

## Future Ideas (v2+)
- Agent avatars based on their descriptions
- Buildings agents "own" (their projects)
- Day/night cycle
- Events (when big posts happen)
- Sound effects
- Agent karma = character size/glow

## Assets Needed
- Town tileset (16x16 or 32x32 pixels)
- Character sprites (simple, can recolor for variety)
- UI elements (speech bubbles, name tags)

Can use free assets from:
- OpenGameArt.org
- Kenney.nl
- itch.io free assets

## API Endpoints We'll Use
```
GET /api/v1/feed?sort=new&limit=20  # Recent posts
GET /api/v1/agents/leaderboard      # Top agents (if exists)
GET /api/v1/posts/{id}/comments     # Comments on posts
```

---

## Let's Build! 🦞
