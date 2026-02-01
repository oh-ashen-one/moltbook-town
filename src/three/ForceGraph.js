// Simple 3D force-directed graph simulation
// Implements spring forces (edges) and repulsion (all nodes)

export class ForceGraph {
  constructor(options = {}) {
    this.nodes = new Map(); // name -> { x, y, z, vx, vy, vz, mass }
    this.edges = []; // { source, target, weight }

    // Force parameters
    this.repulsion = options.repulsion || 800;    // Repulsion strength
    this.springLength = options.springLength || 15; // Ideal edge length
    this.springStrength = options.springStrength || 0.1;
    this.damping = options.damping || 0.85;       // Velocity damping
    this.centerStrength = options.centerStrength || 0.01; // Pull to center

    // Bounds
    this.bounds = {
      minX: -40, maxX: 40,
      minY: 5, maxY: 25,
      minZ: -30, maxZ: 30
    };
  }

  setNodes(agents) {
    // Initialize nodes from agents
    const existingNames = new Set(this.nodes.keys());
    const newNames = new Set(agents.map(a => a.name));

    // Remove old nodes
    for (const name of existingNames) {
      if (!newNames.has(name)) {
        this.nodes.delete(name);
      }
    }

    // Add or update nodes
    agents.forEach((agent, i) => {
      if (!this.nodes.has(agent.name)) {
        // Initialize with random position in a sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 20 + Math.random() * 10;

        this.nodes.set(agent.name, {
          x: r * Math.sin(phi) * Math.cos(theta),
          y: 10 + Math.random() * 10,
          z: r * Math.sin(phi) * Math.sin(theta),
          vx: 0, vy: 0, vz: 0,
          mass: 1 + (agent.karma || 0) / 500, // Higher karma = more mass
          agent
        });
      } else {
        // Update agent reference
        this.nodes.get(agent.name).agent = agent;
      }
    });
  }

  setEdges(edges) {
    this.edges = edges;
  }

  step(delta = 0.016) {
    const nodes = Array.from(this.nodes.values());
    const n = nodes.length;
    if (n === 0) return;

    // Use fixed timestep for consistent physics (ignore frame delta)
    const dt = 1.0;

    // Reset forces
    nodes.forEach(node => {
      node.fx = 0;
      node.fy = 0;
      node.fz = 0;
    });

    // Repulsion between all nodes (O(n²))
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = b.z - a.z;
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 0.1) dist = 0.1; // Avoid division by zero

        const force = this.repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        a.fx -= fx;
        a.fy -= fy;
        a.fz -= fz;
        b.fx += fx;
        b.fy += fy;
        b.fz += fz;
      }
    }

    // Spring forces along edges
    for (const edge of this.edges) {
      const a = this.nodes.get(edge.source);
      const b = this.nodes.get(edge.target);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 0.1) dist = 0.1;

      // Spring force (Hooke's law)
      const displacement = dist - this.springLength;
      const force = displacement * this.springStrength * (edge.weight || 1);

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      a.fx += fx;
      a.fy += fy;
      a.fz += fz;
      b.fx -= fx;
      b.fy -= fy;
      b.fz -= fz;
    }

    // Center gravity
    nodes.forEach(node => {
      node.fx -= node.x * this.centerStrength;
      node.fy -= (node.y - 10) * this.centerStrength; // Pull to y=10
      node.fz -= node.z * this.centerStrength;
    });

    // Apply forces and update positions
    nodes.forEach(node => {
      // F = ma, so a = F/m (using fixed timestep)
      node.vx += (node.fx / node.mass) * dt * 0.01;
      node.vy += (node.fy / node.mass) * dt * 0.01;
      node.vz += (node.fz / node.mass) * dt * 0.01;

      // Damping
      node.vx *= this.damping;
      node.vy *= this.damping;
      node.vz *= this.damping;

      // Update position
      node.x += node.vx * dt;
      node.y += node.vy * dt;
      node.z += node.vz * dt;

      // Constrain to bounds
      node.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, node.x));
      node.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, node.y));
      node.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, node.z));
    });
  }

  getNodePosition(name) {
    const node = this.nodes.get(name);
    if (!node) return null;
    return { x: node.x, y: node.y, z: node.z };
  }

  // Get total kinetic energy (for checking convergence)
  getEnergy() {
    let energy = 0;
    this.nodes.forEach(node => {
      energy += node.vx * node.vx + node.vy * node.vy + node.vz * node.vz;
    });
    return energy;
  }
}
