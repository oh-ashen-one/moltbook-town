import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);

    this.setup();
  }

  setup() {
    // Enable damping for smooth movement
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Zoom limits (expanded for larger town)
    this.controls.minDistance = 20;
    this.controls.maxDistance = 200;

    // Vertical angle limits (prevent going underground)
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = Math.PI / 2.2;

    // Enable panning
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;

    // Limit pan to keep town in view
    this.controls.maxPolarAngle = Math.PI / 2.1;

    // Set initial camera position (isometric-ish view, pulled back for larger town)
    this.camera.position.set(80, 65, 80);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  update() {
    this.controls.update();
  }

  // Focus on a specific point
  focusOn(x, y, z) {
    this.controls.target.set(x, y, z);
  }

  // Reset to default view
  resetView() {
    this.camera.position.set(80, 65, 80);
    this.controls.target.set(0, 0, 0);
  }

  // Animate camera to new position and target
  animateTo(position, target, duration = 1000) {
    const startPos = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };
    const startTarget = {
      x: this.controls.target.x,
      y: this.controls.target.y,
      z: this.controls.target.z
    };

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      this.camera.position.x = startPos.x + (position.x - startPos.x) * ease;
      this.camera.position.y = startPos.y + (position.y - startPos.y) * ease;
      this.camera.position.z = startPos.z + (position.z - startPos.z) * ease;

      this.controls.target.x = startTarget.x + (target.x - startTarget.x) * ease;
      this.controls.target.y = startTarget.y + (target.y - startTarget.y) * ease;
      this.controls.target.z = startTarget.z + (target.z - startTarget.z) * ease;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  dispose() {
    this.controls.dispose();
  }
}
