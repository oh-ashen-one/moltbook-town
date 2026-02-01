import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CameraController } from './CameraController.js';
import { Ground } from './Ground.js';
import { createAllBuildings } from './Building3D.js';
import { Agent3D } from './Agent3D.js';
import { Edge3D } from './Edge3D.js';
import { ForceGraph } from './ForceGraph.js';
import { pixelTo3D } from './utils/coordinates.js';
import { partyClient } from '../services/partyClient.js';
import { moltbookService } from '../services/moltbook.js';
import { CONFIG } from '../config.js';

// 3D-specific config (independent from 2D)
const CONFIG_3D = {
  MAX_AGENTS: 1000,         // 1000 unique users
  REFRESH_INTERVAL: 300000, // 5 minutes
  POSTS_TO_FETCH: 5000      // Fetch 5000 posts to get 1000+ unique users
};

export class ThreeScene {
  constructor(container) {
    this.container = container;
    this.agents = new Map(); // name -> Agent3D
    this.buildings = [];
    this.clock = new THREE.Clock();
    this.isRunning = false;

    // Graph mode
    this.graphMode = false;
    this.edges = []; // Edge3D instances
    this.forceGraph = new ForceGraph();
    this.relationships = []; // Raw edge data
    this.transitioning = false;
    this.transitionProgress = 0;
    this.savedPositions = new Map(); // Store town positions during graph mode

    this.init();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 200);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // CSS2D Renderer for labels
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    // Camera controller
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // Ground
    this.ground = new Ground(this.scene);

    // Buildings
    this.buildings = createAllBuildings(this.scene);

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    // Raycaster for picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Connect to data sources
    this.connectToDataSources();
  }

  setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    // Directional light (sun)
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(50, 80, 30);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 200;
    directional.shadow.camera.left = -60;
    directional.shadow.camera.right = 60;
    directional.shadow.camera.top = 60;
    directional.shadow.camera.bottom = -60;
    this.scene.add(directional);

    // Hemisphere light for sky/ground color
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a7c59, 0.4);
    this.scene.add(hemi);
  }

  connectToDataSources() {
    // Connect to PartyKit
    partyClient.connect();

    // Listen for avatar responses (chat/speech)
    partyClient.on('avatar_response', (data) => {
      // Could show speech bubbles in 3D
      console.log('Avatar response:', data);
    });

    // Initial agent load from moltbook service
    this.loadAgentsFromService();

    // Refresh agents periodically (3D uses longer interval)
    setInterval(() => this.loadAgentsFromService(), CONFIG_3D.REFRESH_INTERVAL);
  }

  async loadAgentsFromService() {
    try {
      // Fetch posts AND comments to get more unique agents for 3D
      const { agents } = await moltbookService.fetchFeed('hot', CONFIG_3D.POSTS_TO_FETCH, true);
      this.syncAgents(agents.slice(0, CONFIG_3D.MAX_AGENTS));
      console.log(`3D: Loaded ${Math.min(agents.length, CONFIG_3D.MAX_AGENTS)} agents`);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  syncAgents(agentsData) {
    const currentNames = new Set(this.agents.keys());
    const newNames = new Set(agentsData.map(a => a.name));

    // Remove agents no longer present
    for (const name of currentNames) {
      if (!newNames.has(name)) {
        const agent = this.agents.get(name);
        if (agent) {
          agent.dispose();
          this.agents.delete(name);
        }
      }
    }

    // Add or update agents
    agentsData.forEach(data => {
      if (this.agents.has(data.name)) {
        // Update existing
        const agent = this.agents.get(data.name);
        agent.updateData(data);
        if (data.position) {
          agent.updatePosition(data.position.x, data.position.y);
        }
      } else {
        // Create new
        const position = data.position || {
          x: Math.random() * CONFIG.GAME_WIDTH,
          y: Math.random() * CONFIG.GAME_HEIGHT
        };
        const agentData = { ...data, position };
        const agent = new Agent3D(this.scene, agentData);
        this.agents.set(data.name, agent);

        // Set random movement target
        this.setRandomTarget(agent);
      }
    });

    // Dispatch event for roster update
    window.dispatchEvent(new CustomEvent('agents-updated'));
  }

  setRandomTarget(agent) {
    const targetX = 100 + Math.random() * (CONFIG.GAME_WIDTH - 200);
    const targetY = 100 + Math.random() * (CONFIG.GAME_HEIGHT - 200);
    agent.setTarget(targetX, targetY);

    // Set new target after reaching current one
    setTimeout(() => {
      if (this.agents.has(agent.agentData.name)) {
        this.setRandomTarget(agent);
      }
    }, 5000 + Math.random() * 10000);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  onClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const intersect of intersects) {
      let obj = intersect.object;
      while (obj && !obj.userData.type) {
        obj = obj.parent;
      }

      if (obj && obj.userData.type === 'agent') {
        this.onAgentClick(obj.userData.data);
        break;
      } else if (obj && obj.userData.type === 'building') {
        this.onBuildingClick(obj.userData.data);
        break;
      }
    }
  }

  onMouseMove(event) {
    // Could add hover effects here
  }

  onAgentClick(agentData) {
    console.log('Clicked agent:', agentData.name);
    // Show agent panel - dispatch event for UI to handle
    window.dispatchEvent(new CustomEvent('agent-clicked', { detail: agentData }));
  }

  onBuildingClick(buildingData) {
    console.log('Clicked building:', buildingData.label);
    window.dispatchEvent(new CustomEvent('building-clicked', { detail: buildingData }));
  }

  start() {
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
  }

  animate() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime() * 1000;

    // Update camera
    this.cameraController.update();

    // Update graph mode or normal mode
    if (this.graphMode) {
      this.updateGraphMode(delta, time);
    }

    // Update agents
    this.agents.forEach(agent => {
      agent.update(delta, time, this.graphMode);
    });

    // Render
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  // === GRAPH MODE METHODS ===

  async toggleGraphMode() {
    if (this.transitioning) return;

    this.graphMode = !this.graphMode;
    this.transitioning = true;
    this.transitionProgress = 0;

    if (this.graphMode) {
      // Reset graph simulation state
      this.graphSettled = false;
      this.graphSimTime = 0;
      // Entering graph mode
      await this.buildRelationshipGraph();
      this.showEdges();
      this.fadeBuildings(false);
      this.animateToGraphView();
      this.startLiveActivityPolling();
    } else {
      // Exiting graph mode
      this.stopLiveActivityPolling();
      this.hideEdges();
      this.fadeBuildings(true);
      this.animateToTownView();
    }

    // Dispatch event for UI
    window.dispatchEvent(new CustomEvent('graph-mode-changed', { detail: { graphMode: this.graphMode } }));
  }

  async buildRelationshipGraph() {
    const agents = Array.from(this.agents.values()).map(a => a.agentData);
    const agentNames = agents.map(a => a.name);
    console.log(`Building graph for ${agents.length} agents`);

    // Always set up nodes for force simulation (even without edges)
    this.forceGraph.setNodes(agents);

    try {
      // Fetch conversations for relationship data (pass agent names for filtering)
      const conversations = await moltbookService.fetchActiveConversations(agentNames);
      console.log(`Fetched ${conversations.length} conversations`);

      // Build edges
      this.relationships = moltbookService.buildRelationshipGraph(agents, conversations);
      console.log(`Built ${this.relationships.length} relationship edges`);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      this.relationships = [];
    }

    // If no real relationships found, create karma-based connections
    if (this.relationships.length === 0 && agents.length >= 2) {
      console.log('No conversation edges found, generating karma-based connections');
      // Sort agents by karma and connect neighbors
      const sorted = [...agents].sort((a, b) => (b.karma || 0) - (a.karma || 0));
      for (let i = 0; i < sorted.length - 1; i++) {
        this.relationships.push({
          source: sorted[i].name,
          target: sorted[i + 1].name,
          weight: 1 + Math.floor(Math.random() * 2),
          topics: ['karma neighbors']
        });
      }
      // Add some cross-connections for visual interest
      for (let i = 0; i < Math.min(5, Math.floor(agents.length / 3)); i++) {
        const a = Math.floor(Math.random() * agents.length);
        const b = Math.floor(Math.random() * agents.length);
        if (a !== b) {
          this.relationships.push({
            source: agents[a].name,
            target: agents[b].name,
            weight: 1,
            topics: ['random']
          });
        }
      }
      console.log(`Generated ${this.relationships.length} fallback edges`);
    }

    // Update force graph with edges
    this.forceGraph.setEdges(this.relationships);

    // Create edge visuals
    this.createEdgeVisuals();
  }

  createEdgeVisuals() {
    // Clear existing edges
    this.edges.forEach(edge => edge.dispose());
    this.edges = [];

    // Create new edge visuals
    for (const rel of this.relationships) {
      const sourceAgent = this.agents.get(rel.source);
      const targetAgent = this.agents.get(rel.target);

      if (sourceAgent && targetAgent) {
        const edge = new Edge3D(this.scene, sourceAgent, targetAgent, rel.weight);
        edge.setVisible(this.graphMode);
        this.edges.push(edge);
      }
    }
  }

  showEdges() {
    this.edges.forEach(edge => edge.setVisible(true));
  }

  hideEdges() {
    this.edges.forEach(edge => edge.setVisible(false));
  }

  fadeBuildings(visible) {
    this.buildings.forEach(building => {
      if (building.group) {
        building.group.visible = visible;
      }
    });
    // Also toggle ground visibility
    if (this.ground && this.ground.mesh) {
      this.ground.mesh.visible = visible;
    }
  }

  animateToGraphView() {
    // Save current positions
    this.agents.forEach((agent, name) => {
      this.savedPositions.set(name, {
        x: agent.group.position.x,
        y: agent.group.position.y,
        z: agent.group.position.z
      });
    });

    // Run force simulation for initial layout
    for (let i = 0; i < 100; i++) {
      this.forceGraph.step(0.05);
    }

    // Animate camera to better graph view
    this.cameraController.animateTo(
      { x: 0, y: 60, z: 60 },
      { x: 0, y: 0, z: 0 },
      1000
    );

    setTimeout(() => {
      this.transitioning = false;
    }, 1000);
  }

  animateToTownView() {
    // Animate camera back
    this.cameraController.animateTo(
      { x: 60, y: 50, z: 60 },
      { x: 0, y: 0, z: 0 },
      1000
    );

    // Restore saved positions (Y=0 to ensure ground level)
    this.agents.forEach((agent, name) => {
      const saved = this.savedPositions.get(name);
      if (saved) {
        agent.group.position.set(saved.x, 0, saved.z);
      }
      // Resume random movement
      this.setRandomTarget(agent);
    });

    setTimeout(() => {
      this.transitioning = false;
    }, 1000);
  }

  updateGraphMode(delta, time) {
    if (!this.graphMode) return;

    // Only run simulation for first 2 seconds, then stop (settled)
    if (!this.graphSettled) {
      this.graphSimTime = (this.graphSimTime || 0) + delta;

      if (this.graphSimTime < 2) {
        // Step force simulation
        this.forceGraph.step(delta);

        // Update agent positions from force graph
        this.agents.forEach((agent, name) => {
          const pos = this.forceGraph.getNodePosition(name);
          if (pos) {
            // Smoothly interpolate to target position
            agent.group.position.x += (pos.x - agent.group.position.x) * 0.2;
            agent.group.position.y += (pos.y - agent.group.position.y) * 0.2;
            agent.group.position.z += (pos.z - agent.group.position.z) * 0.2;
          }
        });
      } else {
        // Snap to final positions and mark as settled
        this.agents.forEach((agent, name) => {
          const pos = this.forceGraph.getNodePosition(name);
          if (pos) {
            agent.group.position.set(pos.x, pos.y, pos.z);
          }
        });
        this.graphSettled = true;
        console.log('Graph settled');
      }
    }

    // Update edge positions
    this.edges.forEach(edge => edge.update(time));
  }

  // === LIVE ACTIVITY POLLING ===

  startLiveActivityPolling() {
    if (this.liveActivityInterval) return; // Already running

    const agentNames = Array.from(this.agents.keys());
    this.seenComments = new Set(); // Track seen comments to avoid duplicate pulses

    console.log('Starting live activity polling...');

    // Poll every 15 seconds
    this.liveActivityInterval = setInterval(async () => {
      if (!this.graphMode) return;

      try {
        const recentComments = await moltbookService.fetchRecentComments(agentNames, 10);

        for (const activity of recentComments) {
          // Create unique key for this comment
          const key = `${activity.commenter}-${activity.postAuthor}-${activity.postId}`;
          if (this.seenComments.has(key)) continue;
          this.seenComments.add(key);

          // Find the edge between commenter and post author
          const edge = this.findEdgeBetween(activity.commenter, activity.postAuthor);
          if (edge) {
            edge.pulse();
            console.log(`🔔 Live: ${activity.commenter} commented on ${activity.postAuthor}'s post`);

            // Dispatch event for UI notification
            window.dispatchEvent(new CustomEvent('live-activity', {
              detail: {
                commenter: activity.commenter,
                postAuthor: activity.postAuthor,
                postTitle: activity.postTitle,
                content: activity.content
              }
            }));
          }
        }
      } catch (error) {
        console.error('Live activity poll failed:', error);
      }
    }, 15000);

    // Also do an initial check
    setTimeout(() => this.checkForActivity(agentNames), 2000);
  }

  async checkForActivity(agentNames) {
    if (!this.graphMode) return;

    try {
      const recentComments = await moltbookService.fetchRecentComments(agentNames, 10);
      console.log(`Found ${recentComments.length} recent interactions`);

      // Pulse a random edge if we found activity (for demo)
      if (recentComments.length > 0 && this.edges.length > 0) {
        const randomEdge = this.edges[Math.floor(Math.random() * this.edges.length)];
        randomEdge.pulse();
      }
    } catch (error) {
      console.error('Initial activity check failed:', error);
    }
  }

  stopLiveActivityPolling() {
    if (this.liveActivityInterval) {
      clearInterval(this.liveActivityInterval);
      this.liveActivityInterval = null;
      console.log('Stopped live activity polling');
    }
  }

  findEdgeBetween(nameA, nameB) {
    // Normalize order (edges are stored with sorted names)
    const [a, b] = [nameA, nameB].sort();

    for (const edge of this.edges) {
      const sourceName = edge.sourceAgent.agentData.name;
      const targetName = edge.targetAgent.agentData.name;
      const [edgeA, edgeB] = [sourceName, targetName].sort();

      if (edgeA === a && edgeB === b) {
        return edge;
      }
    }
    return null;
  }

  dispose() {
    this.stop();
    this.stopLiveActivityPolling();
    this.cameraController.dispose();
    this.agents.forEach(agent => agent.dispose());
    this.edges.forEach(edge => edge.dispose());
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize);
  }
}
