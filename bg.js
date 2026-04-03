// ── ANIMATED BACKGROUND ──────────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');

  let W, H, particles = [], nodes = [], animFrame;
  const PARTICLE_COUNT = 55;
  const NODE_COUNT = 18;
  const GRID_SIZE = 60;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // Grid lines
  function drawGrid() {
    ctx.strokeStyle = 'rgba(42,100,200,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  // Floating particles
  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = (Math.random() - 0.5) * 0.25 - 0.05;
      this.r  = Math.random() * 1.5 + 0.3;
      this.alpha = Math.random() * 0.4 + 0.1;
      this.color = Math.random() < 0.7
        ? `rgba(42,127,255,${this.alpha})`
        : `rgba(79,212,106,${this.alpha * 0.6})`;
      this.life = 0;
      this.maxLife = Math.random() * 300 + 200;
    }
    update() {
      this.x += this.vx; this.y += this.vy; this.life++;
      if (this.life > this.maxLife || this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      const fade = Math.min(this.life / 40, (this.maxLife - this.life) / 40, 1);
      ctx.globalAlpha = this.alpha * fade;
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Network nodes
  class Node {
    constructor() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = (Math.random() - 0.5) * 0.2;
      this.r  = 2;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
    }
  }

  function drawConnections() {
    const MAX_DIST = 160;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < MAX_DIST) {
          const a = (1 - dist / MAX_DIST) * 0.08;
          ctx.globalAlpha = a;
          ctx.strokeStyle = '#2a7fff';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }
  }

  // Slow sweeping radial glow
  let glowAngle = 0;
  function drawGlow() {
    glowAngle += 0.002;
    const cx = W * 0.5 + Math.cos(glowAngle) * W * 0.15;
    const cy = H * 0.4 + Math.sin(glowAngle * 0.7) * H * 0.12;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.55);
    grad.addColorStop(0,   'rgba(20, 60, 140, 0.07)');
    grad.addColorStop(0.5, 'rgba(10, 30, 80,  0.04)');
    grad.addColorStop(1,   'rgba(5,  8,  16,  0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Scanning horizontal line
  let scanY = 0;
  function drawScan() {
    scanY = (scanY + 0.4) % H;
    const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 10);
    scanGrad.addColorStop(0, 'rgba(42,127,255,0)');
    scanGrad.addColorStop(1, 'rgba(42,127,255,0.025)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 40, W, 50);
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    nodes     = Array.from({ length: NODE_COUNT },     () => new Node());
  }

  function loop() {
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);

    // Deep background
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, W, H);

    drawGrid();
    drawGlow();
    drawScan();
    drawConnections();

    nodes.forEach(n => { n.update(); });

    // Node dots
    ctx.globalAlpha = 0.3;
    nodes.forEach(n => {
      ctx.fillStyle = '#2a7fff';
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2); ctx.fill();
    });

    particles.forEach(p => { p.update(); p.draw(); });

    ctx.globalAlpha = 1;
    animFrame = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { resize(); nodes.forEach(n => { n.x = Math.random()*W; n.y = Math.random()*H; }); });
  init();
  loop();
})();
