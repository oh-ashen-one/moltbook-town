export const CONFIG = {
  // Game settings
  GAME_WIDTH: 960,
  GAME_HEIGHT: 640,
  TILE_SIZE: 32,

  // Day/night cycle settings
  DAY_CYCLE_DURATION: 60000, // 1 minute = full day
  TIME_PHASES: {
    DAWN:  { start: 0.0,  end: 0.15, tint: 0xffccaa, alpha: 0.3 },
    DAY:   { start: 0.15, end: 0.5,  tint: 0xffffff, alpha: 0.0 },
    DUSK:  { start: 0.5,  end: 0.65, tint: 0xff6644, alpha: 0.35 },
    NIGHT: { start: 0.65, end: 1.0,  tint: 0x2233aa, alpha: 0.5 },
  },

  // Weather settings
  WEATHER: {
    CHANGE_INTERVAL: 45000, // weather changes every 45s
    TYPES: ['clear', 'cloudy', 'rain', 'snow'],
    RAIN_INTENSITY: 80,
    SNOW_INTENSITY: 50,
    CLOUD_COUNT: 4,
  },
  
  // Town layout (in tiles)
  TOWN_WIDTH: 30,
  TOWN_HEIGHT: 20,
  
  // Agent settings
  MAX_AGENTS: 20,
  AGENT_SPEED: 50,
  SPEECH_DURATION: 8000, // ms to show speech bubble
  
  // API settings (public endpoint - no auth needed)
  MOLTBOOK_API: 'https://www.moltbook.com/api/v1',
  REFRESH_INTERVAL: 300000, // 5 minutes between API refreshes (rate limited)
  
  // Colors for agents (cycle through these)
  AGENT_COLORS: [
    0xff6b6b, // red
    0x4ecdc4, // teal
    0xffe66d, // yellow
    0x95e1d3, // mint
    0xf38181, // coral
    0xaa96da, // purple
    0xfcbad3, // pink
    0xa8d8ea, // sky blue
    0xf9ed69, // bright yellow
    0xb8de6f, // lime
  ],
  
  // Town zones (agents will gravitate to these)
  ZONES: {
    TOWN_SQUARE: { x: 15, y: 10, radius: 4 },
    CAFE: { x: 5, y: 5, radius: 3 },
    LIBRARY: { x: 25, y: 5, radius: 3 },
    PARK: { x: 5, y: 15, radius: 3 },
    WORKSHOP: { x: 25, y: 15, radius: 3 },
  },

  // Conversation clustering settings
  CONVERSATION_CLUSTER_RADIUS: 45,
  CONVERSATION_DURATION_MIN: 8000,
  CONVERSATION_DURATION_MAX: 20000,
  CONVERSATION_GATHER_SPEED: 80,
  MAX_ACTIVE_CONVERSATIONS: 3,
  CONVERSATION_CHECK_INTERVAL: 12000,
};
