/**
 * Chúc Mừng Sinh Nhật Mẹ Yêu 💖 29/09
 * - Chuỗi chữ: "Chúc mừng" -> "Ngày" -> "29/09" -> "Sinh Nhật Mẹ Yêu" (Đom đóm vàng)
 * - Tại khúc "29/09": Pháo hoa bắn lên rực rỡ từ 2 góc dưới màn hình!
 * - Vỡ òa bay ra màn hình và quy tụ thành Khung Trái Tim Hồng (theo đúng ảnh mẫu của người dùng)
 * - Khung trái tim đập theo nhịp 4/4 (Phách 1 Mạnh - 2 Nhẹ - 3 Vừa - 4 Nhẹ), đồng bộ với file music.mp3
 * - Tương tác: Kéo qua kéo lại, đom đóm bu quanh chuột (Du Long Swarm), tự bay về khung tim khi chuột rời xa
 */

(() => {
  // DOM Elements
  const canvas = document.getElementById('fireflyCanvas');
  const ctx = canvas.getContext('2d');
  const stageBadge = document.getElementById('stageBadge');
  const badgeText = document.getElementById('badgeText');
  const interactiveHint = document.getElementById('interactiveHint');
  const musicBtn = document.getElementById('musicBtn');
  const musicLabel = document.getElementById('musicLabel');
  const replayBtn = document.getElementById('replayBtn');
  const skipBtn = document.getElementById('skipBtn');
  const messageBtn = document.getElementById('messageBtn');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const closeCardBtn = document.getElementById('closeCardBtn');
  const cardActionBtn = document.getElementById('cardActionBtn');
  const bgMusic = document.getElementById('bgMusic');

  // Love Scroll Panel Elements
  const loveScrollPanel = document.getElementById('loveScrollPanel');
  const scrollTrackContainer = document.getElementById('scrollTrackContainer');
  const scrollFillBar = document.getElementById('scrollFillBar');
  const scrollThumbHeart = document.getElementById('scrollThumbHeart');
  const scrollPercentPill = document.getElementById('scrollPercentPill');
  const scrollPromptText = document.getElementById('scrollPromptText');

  // Canvas Dimensions & DPR
  let width = 0;
  let height = 0;
  let dpr = 1;

  // Stages
  const STAGE = {
    INTRO: 0,
    TEXT_CHUC_MUNG: 1,
    TEXT_NGAY: 2,
    TEXT_DATE: 3,         // "29/09" with fireworks shooting up from 2 corners
    TEXT_SINH_NHAT: 4,
    EXPLODE_OUT: 5,
    ASSEMBLE_HEART: 6,
    HEART_INTERACTIVE: 7,
    STORY_MODE: 8,
  };

  const TEXT_STAGES = [
    { id: STAGE.TEXT_CHUC_MUNG, text: "Chúc mừng", duration: 3200, badge: "✨ Chúc mừng" },
    { id: STAGE.TEXT_NGAY, text: "Ngày", duration: 2400, badge: "✨ Ngày" },
    { id: STAGE.TEXT_DATE, text: "29/09", duration: 5600, badge: "🎆 29/09 Pháo Hoa Đại Hội 🎆" },
    { id: STAGE.TEXT_SINH_NHAT, text: "Sinh Nhật Mẹ Yêu", duration: 6000, badge: "✍️ Sinh Nhật Mẹ Yêu 💖" }
  ];

  let currentStage = STAGE.INTRO;
  let stageStartTime = performance.now();
  let textIndex = 0;

  // Colors
  const COLOR_GOLDEN_FIREFLY = { r: 255, g: 215, b: 50 };
  const COLOR_PINK_FIREFLY = { r: 255, g: 50, b: 135 };

  let targetColorTheme = { ...COLOR_GOLDEN_FIREFLY };
  let currentColorTheme = { ...COLOR_GOLDEN_FIREFLY };

  // -------------------------------------------------------------
  // Pure Mathematical Heart Frame Coordinates Generator (Khung Trái Tim Thuần Túy)
  // Perfectly uniform arc-length parameterization along the classic cardioid heart perimeter.
  // Absolutely ZERO inner glyphs, characters, or internal scribbles.
  // -------------------------------------------------------------
  function generatePureHeartCoordinates(count = 500) {
    const steps = 10000;
    const raw = [];
    let totalLength = 0;
    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      // Classic romantic heart curve
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      // Center vertically around origin
      const yCentered = y - 2.5385;
      const nx = x / 16.0;
      const ny = yCentered / 16.0;

      if (i > 0) {
        totalLength += Math.hypot(nx - prevX, ny - prevY);
      }
      raw.push({ nx, ny, dist: totalLength });
      prevX = nx;
      prevY = ny;
    }

    const coords = [];
    const stepDist = totalLength / count;
    let rawIdx = 0;

    for (let k = 0; k < count; k++) {
      const targetDist = k * stepDist;
      while (rawIdx < raw.length - 1 && raw[rawIdx].dist < targetDist) {
        rawIdx++;
      }
      const p0 = raw[Math.max(0, rawIdx - 1)];
      const p1 = raw[rawIdx];
      const seg = p1.dist - p0.dist;
      const alpha = seg > 1e-9 ? (targetDist - p0.dist) / seg : 0;
      const baseNx = p0.nx + alpha * (p1.nx - p0.nx);
      const baseNy = p0.ny + alpha * (p1.ny - p0.ny);

      // Subtle alternating micro-thickness (±1.5%) for a rich glowing ribbon frame
      const ribbonOffset = 1.0 + ((k % 3) - 1) * 0.018;

      coords.push([
        Number((baseNx * ribbonOffset).toFixed(4)),
        Number((baseNy * ribbonOffset).toFixed(4))
      ]);
    }
    return coords;
  }

  const FIREFLY_COUNT = 500;
  const HEART_COORDS = generatePureHeartCoordinates(FIREFLY_COUNT);

  // Mouse / Pointer State
  const mouse = {
    x: -9999,
    y: -9999,
    isDown: false,
    isInside: false,
    lastMoveTime: 0
  };

  // Heart Center & Drag Physics ("Kéo qua kéo lại")
  const heartAnchor = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    vx: 0,
    vy: 0,
    rotation: 0,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0
  };

  // Offscreen Canvas for text sampling
  const offscreenCanvas = document.createElement('canvas');
  const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // High-Fidelity Audio Playback & Autoplay Manager
  // Plays music.mp3 (trimmed 5s) directly through native HTML5 Audio
  // Guaranteed loud, clear sound with zero CORS/WebAudio muting issues
  // -------------------------------------------------------------
  let isMusicPlaying = false;
  const audioPromptBanner = document.getElementById('audioPromptBanner');

  function updateMusicUI(playing) {
    isMusicPlaying = playing;
    if (playing) {
      musicBtn.classList.add('active');
      musicLabel.textContent = "Tắt nhạc";
      if (audioPromptBanner) audioPromptBanner.classList.remove('visible');
    } else {
      musicBtn.classList.remove('active');
      musicLabel.textContent = "Bật nhạc";
    }
  }

  function playMusic() {
    bgMusic.volume = 1.0;
    const promise = bgMusic.play();
    if (promise !== undefined) {
      promise.then(() => {
        updateMusicUI(true);
        removeUnlockEvents();
      }).catch(err => {
        console.log("Autoplay waiting for first user gesture:", err);
        updateMusicUI(false);
        if (audioPromptBanner) audioPromptBanner.classList.add('visible');
        setupUnlockEvents();
      });
    }
  }

  function pauseMusic() {
    bgMusic.pause();
    updateMusicUI(false);
  }

  function toggleMusic() {
    if (bgMusic.paused) {
      playMusic();
    } else {
      pauseMusic();
    }
  }

  // Global one-time interaction unlockers:
  // If the browser blocks immediate unmuted playback, ANY first touch, click, or tap instantly plays music!
  let unlockEventsBound = false;
  function handleUnlockGesture() {
    if (bgMusic.paused) {
      playMusic();
    } else {
      removeUnlockEvents();
    }
  }

  const UNLOCK_EVENTS = ['click', 'touchstart', 'touchend', 'mousedown', 'pointerdown', 'keydown'];

  function setupUnlockEvents() {
    if (unlockEventsBound) return;
    unlockEventsBound = true;
    UNLOCK_EVENTS.forEach(evt => {
      window.addEventListener(evt, handleUnlockGesture, { passive: true });
    });
  }

  function removeUnlockEvents() {
    if (!unlockEventsBound) return;
    unlockEventsBound = false;
    UNLOCK_EVENTS.forEach(evt => {
      window.removeEventListener(evt, handleUnlockGesture);
    });
    if (audioPromptBanner) audioPromptBanner.classList.remove('visible');
  }

  // Click on audio prompt banner directly plays music
  if (audioPromptBanner) {
    audioPromptBanner.addEventListener('click', (e) => {
      e.stopPropagation();
      playMusic();
    });
  }

  // Seamless looping safeguard
  bgMusic.addEventListener('ended', () => {
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.warn(e));
  });

  // -------------------------------------------------------------
  // Cosmic Universe Background System (Vũ Trụ Ngân Hà Huyền Ảo)
  // -------------------------------------------------------------
  const STAR_COUNT = 280;
  const stars = [];
  const shootingStars = [];
  let lastShootingStarSpawn = 0;
  let nextShootingStarInterval = 2500;

  class Star {
    constructor() {
      this.reset();
    }
    reset() {
      this.xRatio = Math.random();
      this.yRatio = Math.random();
      this.size = Math.random() < 0.75 ? Math.random() * 0.9 + 0.5 : Math.random() * 1.5 + 1.1;
      this.baseAlpha = Math.random() * 0.5 + 0.35;
      this.twinkleSpeed = Math.random() * 0.035 + 0.015;
      this.twinklePhase = Math.random() * Math.PI * 2;
      this.hasCross = Math.random() < 0.09; // 9% brightest stars have diffraction spikes
      this.crossSize = Math.random() * 5 + 4;
      const starColors = ['#ffffff', '#ffffff', '#e3f1ff', '#c8e5ff', '#ffeef8', '#fff6d8'];
      this.color = starColors[Math.floor(Math.random() * starColors.length)];
    }
  }

  function initStarfield() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(new Star());
    }
  }

  class ShootingStar {
    constructor() {
      this.active = false;
      this.reset();
    }

    reset() {
      // Spawn mostly from upper and upper-right sky
      this.x = Math.random() * (width * 1.2) - width * 0.1;
      this.y = Math.random() * (height * 0.38);
      const angle = Math.PI * 0.74 + (Math.random() - 0.5) * 0.28; // Diagonally down-left
      this.speed = Math.random() * 9 + 17;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
      this.length = Math.random() * 100 + 90;
      this.width = Math.random() * 1.5 + 1.2;
      this.alpha = 1.0;
      this.decay = Math.random() * 0.016 + 0.012;
      this.active = true;
    }

    update() {
      if (!this.active) return;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
      if (this.alpha <= 0 || this.x < -200 || this.y > height + 200) {
        this.active = false;
      }
    }

    draw(ctx) {
      if (!this.active || this.alpha <= 0) return;
      const tailX = this.x - (this.vx / this.speed) * this.length;
      const tailY = this.y - (this.vy / this.speed) * this.length;

      const grad = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${this.alpha})`);
      grad.addColorStop(0.2, `rgba(180, 225, 255, ${this.alpha * 0.8})`);
      grad.addColorStop(0.6, `rgba(160, 140, 255, ${this.alpha * 0.3})`);
      grad.addColorStop(1, `rgba(120, 80, 255, 0)`);

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = this.width;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Bright starlight core
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
      ctx.fill();
    }
  }

  let skyFlashAlpha = 0;
  let skyFlashColor = { r: 255, g: 255, b: 255 };

  function drawCosmicBackground(ctx, now) {
    // 1. Deep Space Celestial Gradient
    const bgGrad = ctx.createRadialGradient(
      width * 0.5, height * 0.55, Math.min(width, height) * 0.08,
      width * 0.5, height * 0.5, Math.max(width, height) * 0.88
    );
    bgGrad.addColorStop(0, '#0c132c');
    bgGrad.addColorStop(0.45, '#070b1d');
    bgGrad.addColorStop(0.85, '#040612');
    bgGrad.addColorStop(1, '#020308');

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Cosmic Nebulas (Mây tinh vân huyền ảo)
    ctx.globalCompositeOperation = 'screen';

    // Nebula 1: Magenta / Cosmic Rose
    const n1X = width * (0.68 + Math.sin(now * 0.00025) * 0.04);
    const n1Y = height * (0.35 + Math.cos(now * 0.00025) * 0.04);
    const n1R = Math.min(width, height) * 0.58;
    const g1 = ctx.createRadialGradient(n1X, n1Y, 0, n1X, n1Y, n1R);
    g1.addColorStop(0, 'rgba(190, 40, 130, 0.075)');
    g1.addColorStop(0.5, 'rgba(130, 25, 95, 0.035)');
    g1.addColorStop(1, 'rgba(130, 25, 95, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, width, height);

    // Nebula 2: Deep Violet / Indigo
    const n2X = width * (0.24 + Math.cos(now * 0.0002) * 0.04);
    const n2Y = height * (0.62 + Math.sin(now * 0.0002) * 0.04);
    const n2R = Math.min(width, height) * 0.65;
    const g2 = ctx.createRadialGradient(n2X, n2Y, 0, n2X, n2Y, n2R);
    g2.addColorStop(0, 'rgba(75, 35, 170, 0.08)');
    g2.addColorStop(0.5, 'rgba(45, 20, 115, 0.04)');
    g2.addColorStop(1, 'rgba(45, 20, 115, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, width, height);

    // Nebula 3: Electric Cyan / Starlight Azure
    const n3X = width * (0.42 + Math.sin(now * 0.00018) * 0.05);
    const n3Y = height * (0.18 + Math.cos(now * 0.00018) * 0.03);
    const n3R = Math.min(width, height) * 0.45;
    const g3 = ctx.createRadialGradient(n3X, n3Y, 0, n3X, n3Y, n3R);
    g3.addColorStop(0, 'rgba(0, 160, 240, 0.055)');
    g3.addColorStop(0.5, 'rgba(0, 90, 170, 0.025)');
    g3.addColorStop(1, 'rgba(0, 90, 170, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, width, height);

    // 3. Ambient Sky Flash from exploding fireworks
    if (skyFlashAlpha > 0.003) {
      ctx.fillStyle = `rgba(${skyFlashColor.r}, ${skyFlashColor.g}, ${skyFlashColor.b}, ${skyFlashAlpha})`;
      ctx.fillRect(0, 0, width, height);
      skyFlashAlpha *= 0.86;
    }

    ctx.globalCompositeOperation = 'source-over';

    // 4. Starfield (Bầu trời sao lấp lánh)
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.twinklePhase += s.twinkleSpeed;
      const tw = (Math.sin(s.twinklePhase) + 1) * 0.5;
      const alpha = s.baseAlpha * (0.45 + tw * 0.55);

      const sx = s.xRatio * width;
      const sy = s.yRatio * height;

      ctx.beginPath();
      ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.fill();

      // Cross diffraction spikes on prominent stars
      if (s.hasCross && alpha > 0.45) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(sx - s.crossSize, sy);
        ctx.lineTo(sx + s.crossSize, sy);
        ctx.moveTo(sx, sy - s.crossSize);
        ctx.lineTo(sx, sy + s.crossSize);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;

    // 5. Shooting Stars (Sao băng)
    if (now - lastShootingStarSpawn > nextShootingStarInterval) {
      let reused = false;
      for (const ss of shootingStars) {
        if (!ss.active) {
          ss.reset();
          reused = true;
          break;
        }
      }
      if (!reused && shootingStars.length < 5) {
        shootingStars.push(new ShootingStar());
      }
      lastShootingStarSpawn = now;
      nextShootingStarInterval = Math.random() * 2000 + 2000; // New shooting star every 2-4 seconds
    }

    for (const ss of shootingStars) {
      if (ss.active) {
        ss.update();
        ss.draw(ctx);
      }
    }
  }

  // -------------------------------------------------------------
  // Massive Fireworks System for "29/09" (Đại Hội Pháo Hoa Rực Rỡ)
  // -------------------------------------------------------------
  const rockets = [];
  const sparks = [];
  let lastFireworkSalvoTime = 0;
  let nextFireworkInterval = 280;

  const FIREWORK_COLORS = [
    { r: 255, g: 215, b: 50 },   // Imperial Gold
    { r: 255, g: 45, b: 130 },   // Rose Pink
    { r: 0, g: 235, b: 255 },    // Cyan Electric
    { r: 255, g: 85, b: 40 },    // Bright Coral
    { r: 185, g: 80, b: 255 },   // Royal Violet
    { r: 60, g: 255, b: 150 },   // Neon Emerald
    { r: 255, g: 245, b: 200 }   // Champagne Diamond
  ];

  class Rocket {
    constructor(startX, startY, targetX, targetY, color, burstType = 'PEONY') {
      this.x = startX;
      this.y = startY;
      this.targetX = targetX;
      this.targetY = targetY;
      this.color = color || FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      this.burstType = burstType;

      const dx = targetX - startX;
      const dy = targetY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.speed = Math.random() * 4 + 14.5;
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;

      this.trail = [];
      this.exploded = false;
    }

    update() {
      this.trail.unshift({ x: this.x, y: this.y });
      if (this.trail.length > 7) this.trail.pop();

      this.x += this.vx;
      this.y += this.vy;

      // Check distance to target or upward deceleration
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      if (Math.sqrt(dx * dx + dy * dy) < 22 || this.vy >= 0) {
        this.explode();
      }
    }

    explode() {
      this.exploded = true;
      skyFlashAlpha = 0.12;
      skyFlashColor = this.color;

      if (this.burstType === 'WILLOW') {
        const count = Math.floor(Math.random() * 20 + 75);
        for (let i = 0; i < count; i++) {
          sparks.push(new FireworkSpark(this.x, this.y, this.color, 'WILLOW'));
        }
      } else if (this.burstType === 'RING') {
        const ringCount = 50;
        const speed = Math.random() * 2.5 + 4.5;
        for (let i = 0; i < ringCount; i++) {
          const angle = (i / ringCount) * Math.PI * 2;
          sparks.push(new FireworkSpark(this.x, this.y, this.color, 'RING', angle, speed));
        }
        for (let i = 0; i < 20; i++) {
          sparks.push(new FireworkSpark(this.x, this.y, { r: 255, g: 255, b: 255 }, 'PEONY'));
        }
      } else if (this.burstType === 'DOUBLE') {
        const c2 = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
        for (let i = 0; i < 55; i++) {
          sparks.push(new FireworkSpark(this.x, this.y, this.color, 'PEONY', null, Math.random() * 4 + 4));
        }
        for (let i = 0; i < 40; i++) {
          sparks.push(new FireworkSpark(this.x, this.y, c2, 'PEONY', null, Math.random() * 2.5 + 1.5));
        }
      } else {
        // Standard PEONY / CHRYSANTHEMUM
        const sparkCount = Math.floor(Math.random() * 25 + 75);
        for (let i = 0; i < sparkCount; i++) {
          sparks.push(new FireworkSpark(this.x, this.y, this.color, 'PEONY'));
        }
      }
    }

    draw(ctx) {
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.75)`;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  class FireworkSpark {
    constructor(x, y, color, type = 'PEONY', fixedAngle = null, fixedSpeed = null) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.type = type;

      const angle = fixedAngle !== null ? fixedAngle : Math.random() * Math.PI * 2;
      const speed = fixedSpeed !== null ? fixedSpeed : (type === 'WILLOW' ? Math.random() * 4.5 + 1.8 : Math.random() * 6.5 + 2.0);

      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      if (type === 'WILLOW') {
        this.gravity = 0.065;
        this.drag = 0.965;
        this.alpha = 1.0;
        this.decay = Math.random() * 0.009 + 0.007; // Lasts longer, falling golden rain
        this.size = Math.random() * 1.5 + 1.0;
        this.trail = [];
        this.maxTrail = 6;
      } else {
        this.gravity = 0.10;
        this.drag = 0.94;
        this.alpha = 1.0;
        this.decay = Math.random() * 0.018 + 0.012;
        this.size = Math.random() * 1.8 + 1.2;
        this.trail = [];
        this.maxTrail = 3;
      }
      this.flicker = Math.random() * Math.PI * 2;
    }

    update() {
      this.trail.unshift({ x: this.x, y: this.y });
      if (this.trail.length > this.maxTrail) this.trail.pop();

      this.vx *= this.drag;
      this.vy *= this.drag;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
      this.flicker += 0.28;
    }

    draw(ctx) {
      if (this.alpha <= 0) return;
      const fAlpha = this.alpha * (0.65 + 0.35 * Math.sin(this.flicker));

      // Luminous spark trail
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${fAlpha * 0.45})`;
        ctx.lineWidth = this.size * 0.8;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${fAlpha})`;
      ctx.fill();

      // Sparkle white core
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${fAlpha})`;
      ctx.fill();
    }
  }

  function launchDenseFireworkSalvo() {
    const salvoType = Math.floor(Math.random() * 4);
    const burstTypes = ['PEONY', 'WILLOW', 'RING', 'DOUBLE'];
    const bType = burstTypes[Math.floor(Math.random() * burstTypes.length)];

    if (salvoType === 0) {
      // 1. Criss-Cross from 2 Corners (Bắn chéo từ 2 góc qua trung tâm)
      const c1 = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      const c2 = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

      rockets.push(new Rocket(
        width * 0.05, height,
        width * (Math.random() * 0.25 + 0.45),
        height * (Math.random() * 0.22 + 0.14),
        c1, bType
      ));

      rockets.push(new Rocket(
        width * 0.95, height,
        width * (Math.random() * 0.25 + 0.30),
        height * (Math.random() * 0.22 + 0.14),
        c2, bType
      ));

    } else if (salvoType === 1) {
      // 2. Triple Fan Salvo (Trái - Giữa - Phải)
      const c1 = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      const c2 = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      const c3 = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

      rockets.push(new Rocket(
        width * 0.08, height,
        width * (Math.random() * 0.18 + 0.12),
        height * (Math.random() * 0.25 + 0.18),
        c1, 'PEONY'
      ));
      rockets.push(new Rocket(
        width * 0.5, height,
        width * (Math.random() * 0.2 + 0.4),
        height * (Math.random() * 0.2 + 0.12),
        c2, 'WILLOW'
      ));
      rockets.push(new Rocket(
        width * 0.92, height,
        width * (Math.random() * 0.18 + 0.70),
        height * (Math.random() * 0.25 + 0.18),
        c3, 'PEONY'
      ));

    } else if (salvoType === 2) {
      // 3. Staggered Corner Volley (2 pháo góc lệch tầng)
      const isLeft = Math.random() < 0.5;
      const startX = isLeft ? width * 0.06 : width * 0.94;
      const targetBaseX = isLeft ? width * 0.35 : width * 0.65;
      const c = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

      rockets.push(new Rocket(
        startX, height,
        targetBaseX + (Math.random() - 0.5) * width * 0.15,
        height * (Math.random() * 0.15 + 0.15),
        c, 'DOUBLE'
      ));
      setTimeout(() => {
        if (currentStage === STAGE.TEXT_DATE) {
          rockets.push(new Rocket(
            startX, height,
            targetBaseX + (Math.random() - 0.5) * width * 0.15,
            height * (Math.random() * 0.15 + 0.28),
            FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)], 'RING'
          ));
        }
      }, 120);

    } else {
      // 4. High Altitude Grand Willow
      const startX = Math.random() < 0.5 ? width * 0.1 : width * 0.9;
      rockets.push(new Rocket(
        startX, height,
        width * (Math.random() * 0.4 + 0.3),
        height * (Math.random() * 0.18 + 0.12),
        FIREWORK_COLORS[0], // Gold
        'WILLOW'
      ));
    }
  }

  function updateAndDrawFireworks(ctx) {
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.update();
      r.draw(ctx);
      if (r.exploded) {
        rockets.splice(i, 1);
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.update();
      s.draw(ctx);
      if (s.alpha <= 0) {
        sparks.splice(i, 1);
      }
    }
  }

  // -------------------------------------------------------------
  // Firefly Class (Đom Đóm Khí Động Học - Fluid Reynolds Steering)
  // -------------------------------------------------------------
  class Firefly {
    constructor(index, normX, normY) {
      this.index = index;
      this.normX = normX;
      this.normY = normY;

      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 5;
      this.vy = (Math.random() - 0.5) * 5;

      // Target in world space
      this.tx = this.x;
      this.ty = this.y;

      this.baseRadius = Math.random() * 0.8 + 1.6;
      this.twinklePhase = Math.random() * Math.PI * 2;
      this.twinkleSpeed = Math.random() * 0.045 + 0.025;
      this.alpha = Math.random() * 0.3 + 0.7;

      this.maxSpeed = 22;
      this.sprintSpeed = 38;
      this.steerForce = 1.35;

      this.trailHistory = [];
      this.maxTrailLength = 5;

      this.swarmRadius = Math.random() * 72 + 20;
      this.swarmAngle = (this.index / FIREFLY_COUNT) * Math.PI * 4;
      this.swarmSpeed = 0.042 + (this.index % 6) * 0.004;

      this.color = { ...COLOR_GOLDEN_FIREFLY };
      this.isSwarming = false;
      this.isScattering = false;
    }

    setTarget(x, y) {
      this.tx = x;
      this.ty = y;
    }

    setExplosionOutward() {
      const cx = width / 2;
      const cy = height / 2;
      const dx = this.x - cx;
      const dy = this.y - cy;
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.45;
      const speed = Math.random() * 12 + 26;

      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.tx = this.x + Math.cos(angle) * (width + 600);
      this.ty = this.y + Math.sin(angle) * (height + 600);
    }

    setScatterRandomly() {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 16 + 14;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.isScattering = true;
      this.color = Math.random() < 0.5 ? { ...COLOR_GOLDEN_FIREFLY } : { ...COLOR_PINK_FIREFLY };
    }

    update(now, heartbeatScale) {
      // Color interpolation
      this.color.r += (targetColorTheme.r - this.color.r) * 0.06;
      this.color.g += (targetColorTheme.g - this.color.g) * 0.06;
      this.color.b += (targetColorTheme.b - this.color.b) * 0.06;

      // Twinkle pulsation
      this.twinklePhase += this.twinkleSpeed;
      const twinkle = (Math.sin(this.twinklePhase) + 1) * 0.5;
      this.alpha = 0.6 + twinkle * 0.4;

      // Contrail tail history
      this.trailHistory.unshift({ x: this.x, y: this.y });
      if (this.trailHistory.length > this.maxTrailLength) {
        this.trailHistory.pop();
      }

      // STAGE: EXPLODE OUT
      if (currentStage === STAGE.EXPLODE_OUT) {
        this.x += this.vx;
        this.y += this.vy;
        return;
      }

      // STAGE: STORY MODE (Mọi đốm bay tứ tung rồi lượn bay bồng bềnh êm dịu)
      if (currentStage === STAGE.STORY_MODE) {
        if (this.isScattering) {
          this.x += this.vx;
          this.y += this.vy;
          this.vx *= 0.94;
          this.vy *= 0.94;
          if (Math.hypot(this.vx, this.vy) < 1.2) {
            this.isScattering = false;
          }
        } else {
          // Ambient floating in deep cosmic space behind story cards
          const driftX = Math.sin(now * 0.0012 + this.index) * 0.9;
          const driftY = Math.cos(now * 0.0015 + this.index) * 0.7 - 0.25;
          this.x += driftX;
          this.y += driftY;
          if (this.x < -30) this.x = width + 30;
          if (this.x > width + 30) this.x = -30;
          if (this.y < -30) this.y = height + 30;
          if (this.y > height + 30) this.y = -30;
        }
        return;
      }

      let desiredX = this.tx;
      let desiredY = this.ty;

      // STAGE: HEART (ASSEMBLE OR INTERACTIVE)
      if (currentStage === STAGE.HEART_INTERACTIVE || currentStage === STAGE.ASSEMBLE_HEART) {
        const cosR = Math.cos(heartAnchor.rotation);
        const sinR = Math.sin(heartAnchor.rotation);

        const baseHeartScale = Math.min(width, height) * 0.42;
        const currentScale = baseHeartScale * heartbeatScale;

        const rx = (this.normX * cosR - this.normY * sinR) * currentScale;
        const ry = (this.normX * sinR + this.normY * cosR) * currentScale;

        const homeX = heartAnchor.x + rx;
        const homeY = heartAnchor.y + ry;

        let attractedToMouse = false;

        // Proximity detection for Du Long Swarm
        if (currentStage === STAGE.HEART_INTERACTIVE && mouse.isInside) {
          const dxM = mouse.x - this.x;
          const dyM = mouse.y - this.y;
          const distToMouse = Math.sqrt(dxM * dxM + dyM * dyM);

          const triggerDist = Math.min(width, height) * 0.32; // ~230px

          if (distToMouse < triggerDist) {
            attractedToMouse = true;
            this.isSwarming = true;

            // Du Long (Dragon Swarm): Fireflies swirl in smooth concentric streams around mouse
            this.swarmAngle += this.swarmSpeed;
            const wave = Math.sin(now * 0.004 + this.swarmAngle * 3) * 6;
            const r = this.swarmRadius * (distToMouse / triggerDist * 0.7 + 0.3) + wave;

            desiredX = mouse.x + Math.cos(this.swarmAngle) * r;
            desiredY = mouse.y + Math.sin(this.swarmAngle) * r;
          }
        }

        if (!attractedToMouse) {
          this.isSwarming = false;
          const floatX = Math.sin(now * 0.0018 + this.index) * 1.5;
          const floatY = Math.cos(now * 0.0018 + this.index) * 1.5;
          desiredX = homeX + floatX;
          desiredY = homeY + floatY;
        }

      } else {
        // STAGES: TEXT FORMATION & INTRO
        let targetX = this.tx;
        let targetY = this.ty;

        // Apple Cursive Handwriting Reveal for "Sinh Nhật Mẹ Yêu"
        if (currentStage === STAGE.TEXT_SINH_NHAT && activeHandwritingPoints.length > 0) {
          const elapsed = now - stageStartTime;
          const T_WRITE = 3600;
          const writeProgress = Math.min(1.0, elapsed / T_WRITE);
          const pEased = writeProgress < 0.5
            ? 2 * writeProgress * writeProgress
            : -1 + (4 - 2 * writeProgress) * writeProgress;

          const currentWriteIdx = Math.min(activeHandwritingPoints.length - 1, Math.floor(pEased * (activeHandwritingPoints.length - 1)));

          if (this.index <= currentWriteIdx) {
            // Point is already written: settle smoothly onto the cursive stroke!
            targetX = this.tx;
            targetY = this.ty;
          } else {
            // Point is waiting at stylus nib: hover around pen tip like liquid gold starlight ink!
            const penPoint = activeHandwritingPoints[currentWriteIdx] || { x: width / 2, y: height / 2 };
            const swirlAngle = (this.index / FIREFLY_COUNT) * Math.PI * 6 + now * 0.005;
            const swirlR = Math.min(32, (this.index - currentWriteIdx) * 0.12 + 6);
            targetX = penPoint.x + Math.cos(swirlAngle) * swirlR;
            targetY = penPoint.y + Math.sin(swirlAngle) * swirlR;
          }
        }

        const floatX = Math.sin(now * 0.0018 + this.index) * 1.8;
        const floatY = Math.cos(now * 0.0018 + this.index) * 1.8;
        desiredX = targetX + floatX;
        desiredY = targetY + floatY;

        // Interactive parting wave if mouse sweeps through text
        if (mouse.isInside && currentStage >= STAGE.TEXT_CHUC_MUNG) {
          const dxM = this.x - mouse.x;
          const dyM = this.y - mouse.y;
          const dM = Math.sqrt(dxM * dxM + dyM * dyM);
          if (dM < 95 && dM > 1) {
            const push = (1 - dM / 95) * 8;
            desiredX += (dxM / dM) * push * 12;
            desiredY += (dyM / dM) * push * 12;
          }
        }
      }

      // Reynolds Steering Physics (Seek + Arrival) from sword-control
      const toTargetX = desiredX - this.x;
      const toTargetY = desiredY - this.y;
      const dist = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);

      let targetSpeed = this.maxSpeed;
      if (dist > 180) {
        targetSpeed = this.sprintSpeed;
      } else if (dist < 60) {
        targetSpeed = this.maxSpeed * (dist / 60);
      }

      let desiredVx = 0;
      let desiredVy = 0;
      if (dist > 0.01) {
        desiredVx = (toTargetX / dist) * targetSpeed;
        desiredVy = (toTargetY / dist) * targetSpeed;
      }

      let steerX = desiredVx - this.vx;
      let steerY = desiredVy - this.vy;
      const steerLen = Math.sqrt(steerX * steerX + steerY * steerY);

      const maxF = this.steerForce;
      if (steerLen > maxF) {
        steerX = (steerX / steerLen) * maxF;
        steerY = (steerY / steerLen) * maxF;
      }

      this.vx += steerX;
      this.vy += steerY;

      this.vx *= 0.91;
      this.vy *= 0.91;

      this.x += this.vx;
      this.y += this.vy;
    }

    draw(ctx) {
      const r = Math.round(this.color.r);
      const g = Math.round(this.color.g);
      const b = Math.round(this.color.b);
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

      // 1. Aerodynamic trailing light streak
      if (speed > 2.0 && this.trailHistory.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.trailHistory[0].x, this.trailHistory[0].y);
        for (let i = 1; i < this.trailHistory.length; i++) {
          ctx.lineTo(this.trailHistory[i].x, this.trailHistory[i].y);
        }
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.32 * this.alpha})`;
        ctx.lineWidth = this.baseRadius * 1.3;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // 2. Soft luminous halo (dịu êm không chói)
      const haloRadius = this.baseRadius * (this.isSwarming ? 3.4 : 2.8);
      ctx.beginPath();
      ctx.arc(this.x, this.y, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.25 * this.alpha})`;
      ctx.fill();

      // 3. Glowing Firefly Body
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.9 * this.alpha})`;
      ctx.fill();

      // 4. Bright white-warm core point
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.baseRadius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 240, ${0.95 * this.alpha})`;
      ctx.fill();
    }
  }

  // -------------------------------------------------------------
  // Text Sampling with Full Vietnamese Typography & Cursive Stroke Sequence
  // -------------------------------------------------------------
  let activeHandwritingPoints = [];

  function sampleTextPoints(text, targetCount) {
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCtx.clearRect(0, 0, width, height);

    const isSmallScreen = width < 680;
    offscreenCtx.textAlign = 'center';
    offscreenCtx.textBaseline = 'middle';
    offscreenCtx.fillStyle = '#ffffff';

    if (text === "Sinh Nhật Mẹ Yêu") {
      // Artistic Apple-Style Cursive Script
      if (isSmallScreen) {
        const fontSize = Math.min(width * 0.175, 84);
        offscreenCtx.font = `700 ${fontSize}px 'Dancing Script', 'Caveat', cursive`;
        offscreenCtx.fillText("Sinh Nhật", width / 2, height / 2 - fontSize * 0.65);
        offscreenCtx.fillText("Mẹ Yêu", width / 2, height / 2 + fontSize * 0.65);
      } else {
        const fontSize = Math.min(width * 0.118, 138);
        offscreenCtx.font = `700 ${fontSize}px 'Dancing Script', 'Caveat', cursive`;
        offscreenCtx.fillText("Sinh Nhật Mẹ Yêu", width / 2, height / 2);
      }
    } else if (text === "Chúc mừng") {
      // "Kéo" dài chữ theo chiều dọc cho dễ nhìn hơn (Vertically elongated typography)
      const baseFontSize = isSmallScreen
        ? Math.min(width * 0.145, 110)
        : Math.min(width * 0.165, 160);

      offscreenCtx.save();
      offscreenCtx.translate(width / 2, height / 2);
      // Elongate vertically by ~1.48x and slightly condense horizontally to 0.92x
      offscreenCtx.scale(0.92, 1.48);
      offscreenCtx.font = `800 ${baseFontSize}px 'Montserrat', 'Be Vietnam Pro', sans-serif`;
      offscreenCtx.fillText("Chúc mừng", 0, 0);
      offscreenCtx.restore();
    } else {
      let fontSize;
      if (text === "29/09") {
        fontSize = Math.min(width * 0.22, 190);
      } else if (text === "Ngày") {
        fontSize = Math.min(width * 0.19, 175);
      } else {
        fontSize = Math.min(width * 0.16, 140);
      }
      offscreenCtx.font = `800 ${fontSize}px 'Montserrat', 'Be Vietnam Pro', sans-serif`;
      offscreenCtx.fillText(text, width / 2, height / 2);
    }

    const imgData = offscreenCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const rawPoints = [];

    const step = (text === "Sinh Nhật Mẹ Yêu" || text === "Chúc mừng") ? 3 : 4;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        if (data[index + 3] > 128) {
          rawPoints.push({ x, y });
        }
      }
    }

    // Sort points in stroke order for "Sinh Nhật Mẹ Yêu"
    if (text === "Sinh Nhật Mẹ Yêu") {
      if (isSmallScreen) {
        const midY = height / 2;
        const line1 = rawPoints.filter(p => p.y < midY).sort((a, b) => a.x - b.x);
        const line2 = rawPoints.filter(p => p.y >= midY).sort((a, b) => a.x - b.x);
        rawPoints.length = 0;
        rawPoints.push(...line1, ...line2);
      } else {
        rawPoints.sort((a, b) => a.x - b.x);
      }
    }

    const points = [];
    if (rawPoints.length > 0) {
      for (let i = 0; i < targetCount; i++) {
        const idx = Math.floor((i / targetCount) * rawPoints.length);
        const pt = rawPoints[idx];
        points.push({
          x: pt.x + (Math.random() - 0.5) * 2.5,
          y: pt.y + (Math.random() - 0.5) * 2.5
        });
      }
    }

    // For other texts, shuffle points so they gather organically from all directions
    if (text !== "Sinh Nhật Mẹ Yêu") {
      for (let i = points.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [points[i], points[j]] = [points[j], points[i]];
      }
    } else {
      activeHandwritingPoints = points;
    }

    return points;
  }

  // -------------------------------------------------------------
  // Apple Cursive Handwriting Renderer ("Xin Chào" Style)
  // -------------------------------------------------------------
  const calligraphySparks = [];

  class CalligraphySpark {
    constructor(x, y) {
      this.x = x + (Math.random() - 0.5) * 8;
      this.y = y + (Math.random() - 0.5) * 8;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.5 + 0.8;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed + 0.3;
      this.size = Math.random() * 1.6 + 0.8;
      this.alpha = 1.0;
      this.decay = Math.random() * 0.024 + 0.016;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
    }
    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 235, 120, ${this.alpha})`;
      ctx.fill();
    }
  }

  function drawAppleCursiveText(ctx, now) {
    if (currentStage !== STAGE.TEXT_SINH_NHAT) return;

    const elapsed = now - stageStartTime;
    const T_WRITE = 3600;
    const writeProgress = Math.min(1.0, elapsed / T_WRITE);
    const pEased = writeProgress < 0.5
      ? 2 * writeProgress * writeProgress
      : -1 + (4 - 2 * writeProgress) * writeProgress;

    const isSmallScreen = width < 680;
    const currentWriteIdx = Math.min(FIREFLY_COUNT - 1, Math.floor(pEased * (FIREFLY_COUNT - 1)));
    const penPoint = activeHandwritingPoints[currentWriteIdx] || { x: width / 2, y: height / 2 };

    // Update and draw calligraphy stardust sparks
    if (pEased < 1.0 && Math.random() < 0.75) {
      calligraphySparks.push(new CalligraphySpark(penPoint.x, penPoint.y));
    }
    for (let i = calligraphySparks.length - 1; i >= 0; i--) {
      const sp = calligraphySparks[i];
      sp.update();
      sp.draw(ctx);
      if (sp.alpha <= 0) calligraphySparks.splice(i, 1);
    }

    // 1. Draw glowing calligraphy stroke underlay with progressive handwriting reveal
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isSmallScreen) {
      const fontSize = Math.min(width * 0.175, 84);
      ctx.font = `700 ${fontSize}px 'Dancing Script', 'Caveat', cursive`;

      const line1Y = height / 2 - fontSize * 0.65;
      const line2Y = height / 2 + fontSize * 0.65;

      if (pEased < 0.52) {
        // Line 1 is revealing
        ctx.beginPath();
        ctx.rect(0, 0, penPoint.x + 16, height);
        ctx.clip();

        ctx.strokeStyle = 'rgba(255, 215, 50, 0.45)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeText("Sinh Nhật", width / 2, line1Y);

        ctx.strokeStyle = 'rgba(255, 245, 140, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.strokeText("Sinh Nhật", width / 2, line1Y);

        ctx.fillStyle = 'rgba(255, 250, 200, 0.95)';
        ctx.fillText("Sinh Nhật", width / 2, line1Y);
      } else {
        // Line 1 is fully completed!
        ctx.strokeStyle = 'rgba(255, 215, 50, 0.45)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeText("Sinh Nhật", width / 2, line1Y);

        ctx.strokeStyle = 'rgba(255, 245, 140, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.strokeText("Sinh Nhật", width / 2, line1Y);

        ctx.fillStyle = 'rgba(255, 250, 200, 0.95)';
        ctx.fillText("Sinh Nhật", width / 2, line1Y);

        // Line 2 is revealing
        ctx.restore();
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${fontSize}px 'Dancing Script', 'Caveat', cursive`;

        if (pEased < 1.0) {
          ctx.beginPath();
          ctx.rect(0, height / 2, penPoint.x + 16, height);
          ctx.clip();
        }

        ctx.strokeStyle = 'rgba(255, 215, 50, 0.45)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeText("Mẹ Yêu", width / 2, line2Y);

        ctx.strokeStyle = 'rgba(255, 245, 140, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.strokeText("Mẹ Yêu", width / 2, line2Y);

        ctx.fillStyle = 'rgba(255, 250, 200, 0.95)';
        ctx.fillText("Mẹ Yêu", width / 2, line2Y);
      }
    } else {
      // Desktop: Single line progressive reveal
      const fontSize = Math.min(width * 0.118, 138);
      ctx.font = `700 ${fontSize}px 'Dancing Script', 'Caveat', cursive`;

      if (pEased < 1.0) {
        ctx.beginPath();
        ctx.rect(0, 0, penPoint.x + 16, height);
        ctx.clip();
      }

      ctx.strokeStyle = 'rgba(255, 215, 50, 0.45)';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeText("Sinh Nhật Mẹ Yêu", width / 2, height / 2);

      ctx.strokeStyle = 'rgba(255, 245, 140, 0.9)';
      ctx.lineWidth = 2.8;
      ctx.strokeText("Sinh Nhật Mẹ Yêu", width / 2, height / 2);

      ctx.fillStyle = 'rgba(255, 250, 200, 0.95)';
      ctx.fillText("Sinh Nhật Mẹ Yêu", width / 2, height / 2);
    }
    ctx.restore();

    // 2. Draw Apple Stylus Glowing Light Tip (Ngòi bút ánh sáng Apple)
    if (pEased < 1.0) {
      const penX = penPoint.x;
      const penY = penPoint.y;

      // Halo
      const haloGrad = ctx.createRadialGradient(penX, penY, 0, penX, penY, 22);
      haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      haloGrad.addColorStop(0.35, 'rgba(255, 235, 100, 0.65)');
      haloGrad.addColorStop(1, 'rgba(255, 215, 50, 0)');
      ctx.beginPath();
      ctx.arc(penX, penY, 22, 0, Math.PI * 2);
      ctx.fillStyle = haloGrad;
      ctx.fill();

      // Core point
      ctx.beginPath();
      ctx.arc(penX, penY, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 4-point cross diffraction sparkle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(penX - 16, penY); ctx.lineTo(penX + 16, penY);
      ctx.moveTo(penX, penY - 16); ctx.lineTo(penX, penY + 16);
      ctx.stroke();
    }
  }

  // -------------------------------------------------------------
  // Birthday Cake Light-Dot System ("Đốm Đèn Bánh Kem Hai Bên Side")
  // -------------------------------------------------------------
  const cakeEmbers = [];
  const cakeExplosionSparks = [];

  function generateCakeDotModel() {
    const dots = [];

    // 1. Platter / Base Plate (Đế bánh cong nhẹ)
    const platterXCount = 13;
    for (let i = 0; i < platterXCount; i++) {
      const rx = -54 + (i / (platterXCount - 1)) * 108;
      const curve = Math.pow(rx / 54, 2) * -3.2;
      dots.push({
        rx,
        ry: 44 + curve,
        radius: 2.8,
        color: { r: 255, g: 240, b: 190 }, // Warm silver-gold platter
        phase: i * 0.5
      });
    }

    // 2. Lower Tier (Tầng dưới rộng 86px, cao 28px)
    const tier1BottomCount = 9;
    for (let i = 0; i < tier1BottomCount; i++) {
      const rx = -40 + (i / (tier1BottomCount - 1)) * 80;
      dots.push({
        rx,
        ry: 40,
        radius: 2.6,
        color: { r: 255, g: 215, b: 120 },
        phase: i * 0.6 + 1
      });
    }

    // Left & Right boundary walls of Tier 1
    const wall1Y = [33, 26, 19];
    for (const ry of wall1Y) {
      dots.push({ rx: -42, ry, radius: 2.5, color: { r: 255, g: 180, b: 120 }, phase: ry });
      dots.push({ rx: +42, ry, radius: 2.5, color: { r: 255, g: 180, b: 120 }, phase: ry + 2 });
    }

    // Tier 1 Scallop Frosting Wave (Viền kem dâu lượn sóng)
    const tier1Scallops = 9;
    for (let i = 0; i < tier1Scallops; i++) {
      const rx = -42 + (i / (tier1Scallops - 1)) * 84;
      const wave = Math.sin((i / (tier1Scallops - 1)) * Math.PI * 4) * 3.5;
      dots.push({
        rx,
        ry: 14 + wave,
        radius: 3.0,
        color: { r: 255, g: 155, b: 200 }, // Sweet strawberry pink frosting
        phase: i * 0.7
      });
    }

    // Tier 1 decorative cream pearls
    const tier1DecorX = [-28, -14, 0, 14, 28];
    for (let i = 0; i < tier1DecorX.length; i++) {
      dots.push({
        rx: tier1DecorX[i],
        ry: 27,
        radius: 2.4,
        color: { r: 255, g: 235, b: 150 },
        phase: i * 1.1 + 3
      });
    }

    // 3. Upper Tier (Tầng trên rộng 54px, cao 24px)
    const wall2Y = [9, 3, -3];
    for (const ry of wall2Y) {
      dots.push({ rx: -27, ry, radius: 2.4, color: { r: 255, g: 180, b: 120 }, phase: ry + 1 });
      dots.push({ rx: +27, ry, radius: 2.4, color: { r: 255, g: 180, b: 120 }, phase: ry + 3 });
    }

    // Tier 2 Scallop Frosting Line
    const tier2Scallops = 7;
    for (let i = 0; i < tier2Scallops; i++) {
      const rx = -27 + (i / (tier2Scallops - 1)) * 54;
      const wave = Math.sin((i / (tier2Scallops - 1)) * Math.PI * 3) * 2.8;
      dots.push({
        rx,
        ry: -10 + wave,
        radius: 2.9,
        color: { r: 255, g: 165, b: 210 }, // Rose frosting
        phase: i * 0.8 + 2
      });
    }

    // Tier 2 decorative center pearls
    const tier2DecorX = [-14, 0, 14];
    for (let i = 0; i < tier2DecorX.length; i++) {
      dots.push({
        rx: tier2DecorX[i],
        ry: 0,
        radius: 2.3,
        color: { r: 255, g: 240, b: 160 },
        phase: i * 1.3
      });
    }

    // 4. Three Birthday Candles (3 Cây nến lung linh)
    const candleConfigs = [
      { rx: -17, h: 18, color: { r: 255, g: 245, b: 210 } },
      { rx: 0,   h: 21, color: { r: 255, g: 250, b: 220 } },
      { rx: 17,  h: 18, color: { r: 255, g: 245, b: 210 } }
    ];

    const candles = [];
    candleConfigs.forEach((c, idx) => {
      const topY = -10 - c.h;
      // Candle Stem dots
      const stemCount = 4;
      for (let s = 1; s <= stemCount; s++) {
        const ry = -10 - (s / stemCount) * c.h;
        dots.push({
          rx: c.rx,
          ry,
          radius: 2.1,
          color: c.color,
          phase: idx + s
        });
      }
      // Candle wick dot
      dots.push({
        rx: c.rx,
        ry: topY - 3,
        radius: 1.2,
        color: { r: 220, g: 190, b: 120 },
        phase: idx
      });

      // Save flame position for dynamic animated rendering
      candles.push({
        rx: c.rx,
        flameRy: topY - 8,
        idx
      });
    });

    return { dots, candles };
  }

  const CAKE_MODEL = generateCakeDotModel();

  function getCakePositions() {
    const isSmallScreen = width < 680;
    const cakeScale = isSmallScreen
      ? Math.max(0.52, Math.min(width * 0.0016, 0.72))
      : Math.min(Math.max(width * 0.00095, 0.95), 1.28);

    const marginX = isSmallScreen
      ? Math.max(38, width * 0.095)
      : Math.max(width * 0.12, 100);

    const leftX = marginX;
    const rightX = width - marginX;
    const cakeY = height * 0.50;

    return { leftX, rightX, cakeY, cakeScale, isSmallScreen };
  }

  function drawCandleFlame(ctx, x, y, scale, now, candleIdx, alpha) {
    const flicker = Math.sin(now * 0.015 + candleIdx * 2.3) * 0.2 +
                    Math.cos(now * 0.023 + candleIdx * 1.4) * 0.15;
    const flameWanderX = Math.sin(now * 0.009 + candleIdx * 1.8) * 1.2 * scale;
    const flameWanderY = Math.cos(now * 0.012 + candleIdx * 2.2) * 1.0 * scale;

    const fx = x + flameWanderX;
    const fy = y + flameWanderY;
    const flameScale = scale * (1.0 + flicker * 0.25);

    // Outer golden flame aura
    const auraR = 14 * flameScale;
    const flameGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, auraR);
    flameGrad.addColorStop(0, `rgba(255, 245, 180, ${0.95 * alpha})`);
    flameGrad.addColorStop(0.35, `rgba(255, 180, 40, ${0.75 * alpha})`);
    flameGrad.addColorStop(0.75, `rgba(255, 95, 20, ${0.32 * alpha})`);
    flameGrad.addColorStop(1, `rgba(255, 50, 0, 0)`);

    ctx.beginPath();
    ctx.arc(fx, fy, auraR, 0, Math.PI * 2);
    ctx.fillStyle = flameGrad;
    ctx.fill();

    // Teardrop flame body
    ctx.beginPath();
    ctx.moveTo(fx, fy - 10 * flameScale);
    ctx.bezierCurveTo(fx + 5.5 * flameScale, fy - 2 * flameScale, fx + 4.5 * flameScale, fy + 5 * flameScale, fx, fy + 5 * flameScale);
    ctx.bezierCurveTo(fx - 4.5 * flameScale, fy + 5 * flameScale, fx - 5.5 * flameScale, fy - 2 * flameScale, fx, fy - 10 * flameScale);
    ctx.fillStyle = `rgba(255, 235, 120, ${0.92 * alpha})`;
    ctx.fill();

    // White-hot inner core
    ctx.beginPath();
    ctx.arc(fx, fy + 1 * flameScale, 2.6 * flameScale, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.98 * alpha})`;
    ctx.fill();

    // Vertical starlight diffraction spike
    ctx.strokeStyle = `rgba(255, 255, 235, ${0.85 * alpha})`;
    ctx.lineWidth = 1.0 * flameScale;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 13 * flameScale);
    ctx.lineTo(fx, fy + 3 * flameScale);
    ctx.stroke();
  }

  function renderSingleCake(ctx, cx, cy, scale, now, sideIdx, alpha) {
    const { dots, candles } = CAKE_MODEL;

    // 1. Draw glowing light dots ("đốm đèn")
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const px = cx + d.rx * scale;
      const py = cy + d.ry * scale;

      // Breathing shimmer for each light dot
      const twinkle = 0.85 + 0.15 * Math.sin(now * 0.0035 + d.phase + sideIdx * 2.5);
      const dotAlpha = alpha * twinkle;
      const r = d.radius * scale;

      // Soft luminous halo
      ctx.beginPath();
      ctx.arc(px, py, r * 3.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.color.r}, ${d.color.g}, ${d.color.b}, ${0.26 * dotAlpha})`;
      ctx.fill();

      // Main lamp bulb body
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.color.r}, ${d.color.g}, ${d.color.b}, ${0.92 * dotAlpha})`;
      ctx.fill();

      // Hot white filament core
      ctx.beginPath();
      ctx.arc(px, py, r * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 245, ${0.98 * dotAlpha})`;
      ctx.fill();
    }

    // 2. Draw 3 Candle Flames (Ngọn lửa nến sinh nhật lung linh)
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const fx = cx + c.rx * scale;
      const fy = cy + c.flameRy * scale;
      drawCandleFlame(ctx, fx, fy, scale, now, c.idx + sideIdx * 3, alpha);
    }
  }

  class CakeEmber {
    constructor(cakeX, cakeY, scale) {
      const candle = CAKE_MODEL.candles[Math.floor(Math.random() * CAKE_MODEL.candles.length)];
      this.x = cakeX + candle.rx * scale + (Math.random() - 0.5) * 6 * scale;
      this.y = cakeY + candle.flameRy * scale;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      const speed = Math.random() * 1.6 + 0.8;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.size = (Math.random() * 1.6 + 0.9) * scale;
      this.alpha = 1.0;
      this.decay = Math.random() * 0.022 + 0.014;
      this.color = Math.random() < 0.65 ? { r: 255, g: 215, b: 70 } : { r: 255, g: 165, b: 195 };
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
    }
    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
      ctx.fill();
    }
  }

  class CakeExplosionSpark {
    constructor(x, y, color, scale) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 1.5;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.size = (Math.random() * 2.2 + 1.2) * scale;
      this.color = color;
      this.alpha = 1.0;
      this.decay = Math.random() * 0.025 + 0.015;
      this.gravity = 0.04;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.vx *= 0.96;
      this.vy *= 0.96;
      this.alpha -= this.decay;
    }
    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
      ctx.fill();
    }
  }

  function triggerCakeExplosion() {
    const { leftX, rightX, cakeY, cakeScale } = getCakePositions();
    const spawnForCake = (cx) => {
      for (const d of CAKE_MODEL.dots) {
        const px = cx + d.rx * cakeScale;
        const py = cakeY + d.ry * cakeScale;
        cakeExplosionSparks.push(new CakeExplosionSpark(px, py, d.color, cakeScale));
      }
      for (const c of CAKE_MODEL.candles) {
        const fx = cx + c.rx * cakeScale;
        const fy = cakeY + c.flameRy * cakeScale;
        for (let k = 0; k < 6; k++) {
          cakeExplosionSparks.push(new CakeExplosionSpark(fx, fy, { r: 255, g: 215, b: 60 }, cakeScale));
        }
      }
    };
    spawnForCake(leftX);
    spawnForCake(rightX);
  }

  function drawBirthdayCakes(ctx, now) {
    if (currentStage !== STAGE.TEXT_SINH_NHAT && cakeExplosionSparks.length === 0) return;

    const { leftX, rightX, cakeY, cakeScale } = getCakePositions();

    if (currentStage === STAGE.TEXT_SINH_NHAT) {
      const elapsed = now - stageStartTime;
      const fadeIn = Math.min(1.0, elapsed / 800);
      // Gentle floating zero-gravity breath
      const bobLeft = Math.sin(now * 0.0022) * 5;
      const bobRight = Math.sin(now * 0.0022 + Math.PI) * 5;

      // Draw Left Cake
      renderSingleCake(ctx, leftX, cakeY + bobLeft, cakeScale, now, 0, fadeIn);

      // Draw Right Cake
      renderSingleCake(ctx, rightX, cakeY + bobRight, cakeScale, now, 1, fadeIn);

      // Embers floating from candle flames
      if (Math.random() < 0.28) {
        cakeEmbers.push(new CakeEmber(leftX, cakeY + bobLeft, cakeScale));
      }
      if (Math.random() < 0.28) {
        cakeEmbers.push(new CakeEmber(rightX, cakeY + bobRight, cakeScale));
      }
    }

    // Update and draw floating candle embers
    for (let i = cakeEmbers.length - 1; i >= 0; i--) {
      const emb = cakeEmbers[i];
      emb.update();
      emb.draw(ctx);
      if (emb.alpha <= 0) cakeEmbers.splice(i, 1);
    }

    // Update and draw explosion sparks if transitioning from Sinh Nhat
    for (let i = cakeExplosionSparks.length - 1; i >= 0; i--) {
      const sp = cakeExplosionSparks[i];
      sp.update();
      sp.draw(ctx);
      if (sp.alpha <= 0) cakeExplosionSparks.splice(i, 1);
    }
  }

  // -------------------------------------------------------------
  // Target Assignment Helpers
  // -------------------------------------------------------------
  const fireflies = [];

  function assignTextTargets(textPoints) {
    const fCount = fireflies.length;
    const tCount = textPoints.length;

    for (let i = 0; i < fCount; i++) {
      if (tCount > 0) {
        const pt = textPoints[i % tCount];
        fireflies[i].setTarget(pt.x, pt.y);
      } else {
        fireflies[i].setTarget(width / 2, height / 2);
      }
    }
  }

  function assignHeartTargets() {
    for (let i = 0; i < fireflies.length; i++) {
      const f = fireflies[i];
      const dx = f.x - width / 2;
      const dy = f.y - height / 2;
      const dist = Math.hypot(dx, dy);
      // If firefly is still near center, position it along outer perimeter so it gathers gracefully inward
      if (dist < Math.min(width, height) * 0.45) {
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = Math.max(width, height) * 0.75;
        f.x = width / 2 + Math.cos(angle) * spawnDist;
        f.y = height / 2 + Math.sin(angle) * spawnDist;
        f.vx = -Math.cos(angle) * 12;
        f.vy = -Math.sin(angle) * 12;
      }
    }
  }

  // -------------------------------------------------------------
  // 4/4 Beat Calculation (Nhịp 4/4: Phách 1 Mạnh - 2 Nhẹ - 3 Vừa - 4 Nhẹ)
  // -------------------------------------------------------------
  const BPM = 96.8;
  const BEAT_DURATION = 60.0 / BPM; // ~0.620s
  const MEASURE_DURATION = BEAT_DURATION * 4; // ~2.480s

  function calculate4_4Heartbeat(nowSec) {
    // When music is playing, lock pulse directly to song's currentTime for exact audio sync!
    const timePos = (isMusicPlaying && !bgMusic.paused && bgMusic.currentTime > 0)
      ? bgMusic.currentTime
      : nowSec;

    const measurePhase = (timePos % MEASURE_DURATION) / MEASURE_DURATION;
    const beatIndex = Math.floor(measurePhase * 4);
    const tau = (measurePhase * 4) - beatIndex;

    // Phách 1 Mạnh (0.16) - Phách 2 Nhẹ (0.04) - Phách 3 Mạnh vừa (0.09) - Phách 4 Nhẹ (0.04)
    const BEAT_WEIGHTS = [0.16, 0.04, 0.09, 0.04];
    const weight = BEAT_WEIGHTS[beatIndex];

    const cardiacImpulse = Math.pow(Math.sin(Math.PI * Math.pow(tau, 0.7)), 1.5) * Math.exp(-2.8 * tau);
    const rhythmicPulse = weight * cardiacImpulse;

    return 1.0 + rhythmicPulse;
  }

  // -------------------------------------------------------------
  // Love Heart Fill & Scrolling System ("Bơm Đầy Màu Hồng Tình Yêu & Chữ Số %")
  // -------------------------------------------------------------
  let targetFillPercent = 0;
  let loveFillPercent = 0;
  let is100PercentCelebrated = false;
  const loveBubbles = [];
  const loveConfetti = [];

  class LoveBubble {
    constructor(scale, surfaceY, bottomY) {
      this.x = (Math.random() - 0.5) * scale * 1.05;
      this.y = bottomY - Math.random() * Math.max(10, bottomY - surfaceY);
      this.radius = (Math.random() * 2.8 + 1.4) * (scale / 180);
      this.speed = Math.random() * 1.8 + 1.1;
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = Math.random() * 0.05 + 0.03;
      this.alpha = Math.random() * 0.6 + 0.35;
      this.dead = false;
    }
    update(surfaceY) {
      this.y -= this.speed;
      this.wobble += this.wobbleSpeed;
      this.x += Math.sin(this.wobble) * 0.55;
      if (this.y <= surfaceY) {
        this.dead = true;
      }
    }
    draw(ctx) {
      if (this.dead) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 230, 245, ${this.alpha})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.9})`;
      ctx.fill();
    }
  }

  class LoveConfettiParticle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = Math.random() * 7.5 + 3.0;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.gravity = 0.12;
      this.drag = 0.98;
      this.size = Math.random() * 4.2 + 2.4;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.16;
      this.alpha = 1.0;
      this.decay = Math.random() * 0.012 + 0.007;
      const colors = [
        { r: 255, g: 50, b: 135 },
        { r: 255, g: 215, b: 0 },
        { r: 255, g: 105, b: 180 },
        { r: 255, g: 245, b: 140 },
        { r: 255, g: 255, b: 255 }
      ];
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.isHeart = Math.random() < 0.5;
    }
    update() {
      this.vx *= this.drag;
      this.vy *= this.drag;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.rotSpeed;
      this.alpha -= this.decay;
    }
    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;

      if (this.isHeart) {
        const s = this.size * 0.55;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.3);
        ctx.bezierCurveTo(-s, -s * 0.5, -s * 1.5, s * 0.5, 0, s * 1.5);
        ctx.bezierCurveTo(s * 1.5, s * 0.5, s, -s * 0.5, 0, s * 0.3);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function celebrate100Percent() {
    const cx = heartAnchor.x;
    const cy = heartAnchor.y;
    const baseHeartScale = Math.min(width, height) * 0.42;

    for (let i = 0; i < 75; i++) {
      loveConfetti.push(new LoveConfettiParticle(
        cx + (Math.random() - 0.5) * baseHeartScale * 0.8,
        cy + (Math.random() - 0.5) * baseHeartScale * 0.6
      ));
    }

    skyFlashAlpha = 0.22;
    skyFlashColor = { r: 255, g: 50, b: 135 };
  }

  function trigger100PercentTransition() {
    if (is100PercentCelebrated) return;
    is100PercentCelebrated = true;
    targetFillPercent = 100;
    loveFillPercent = 100;
    updateLoveScrollUI(100);

    // 1. Confetti & celebratory flash
    celebrate100Percent();

    // 2. All fireflies scatter in all directions ("mọi đốm bay tứ tung")!
    for (const f of fireflies) {
      f.setScatterRandomly();
    }

    // 3. Smooth transition to Story Mode
    setTimeout(() => {
      if (currentStage === STAGE.HEART_INTERACTIVE) {
        switchStage(STAGE.STORY_MODE);
      }
    }, 1400);
  }

  function updateAndDrawLoveConfetti(ctx) {
    for (let i = loveConfetti.length - 1; i >= 0; i--) {
      const c = loveConfetti[i];
      c.update();
      c.draw(ctx);
      if (c.alpha <= 0) loveConfetti.splice(i, 1);
    }
  }

  function traceHeartPath(ctx, cx, cy, scale, rot) {
    const steps = 180;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      const yCentered = y - 2.5385;
      const nx = x / 16.0;
      const ny = yCentered / 16.0;

      const rx = (nx * cosR - ny * sinR) * scale;
      const ry = (nx * sinR + ny * cosR) * scale;

      if (i === 0) {
        ctx.moveTo(cx + rx, cy + ry);
      } else {
        ctx.lineTo(cx + rx, cy + ry);
      }
    }
    ctx.closePath();
  }

  function drawLovePercentage(ctx, cx, cy, scale, rot, percent, p) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    const isSmallScreen = width < 680;
    const fontSize = isSmallScreen ? Math.min(scale * 0.32, 54) : Math.min(scale * 0.28, 72);
    const rounded = Math.min(100, Math.round(percent));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const percentText = `${rounded}%`;
    const textY = -scale * 0.12;

    // Outer dark shadow for sharp contrast over any background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Glowing pink rim
    ctx.strokeStyle = 'rgba(255, 20, 120, 0.95)';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.font = `900 ${fontSize}px 'Montserrat', 'Be Vietnam Pro', sans-serif`;
    ctx.strokeText(percentText, 0, textY);

    // Crisp white or golden fill
    ctx.fillStyle = rounded >= 100 ? '#fff8db' : '#ffffff';
    ctx.fillText(percentText, 0, textY);

    ctx.shadowBlur = 0;

    // Dynamic Subtitle Message
    let subtitle = "";
    if (rounded < 25) {
      subtitle = "Đang bơm tình yêu... 💖";
    } else if (rounded < 50) {
      subtitle = "Đong đầy yêu thương... 🌸";
    } else if (rounded < 75) {
      subtitle = "Bao la như biển trời... ✨";
    } else if (rounded < 100) {
      subtitle = "Sắp đầy rồi Mẹ ơi... 💕";
    } else {
      subtitle = "💖 YÊU MẸ VÔ CÙNG! 💖";
    }

    const subFontSize = isSmallScreen ? Math.max(12, fontSize * 0.36) : Math.max(14, fontSize * 0.34);
    ctx.font = `700 ${subFontSize}px 'Montserrat', 'Be Vietnam Pro', sans-serif`;

    const subMetrics = ctx.measureText(subtitle);
    const pillW = subMetrics.width + 24;
    const pillH = subFontSize * 1.9;
    const pillY = textY + fontSize * 0.68;

    // Subtitle Pill
    ctx.fillStyle = rounded >= 100 ? 'rgba(255, 215, 0, 0.35)' : 'rgba(15, 23, 42, 0.70)';
    ctx.beginPath();
    ctx.roundRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, pillH / 2);
    ctx.fill();

    ctx.strokeStyle = rounded >= 100 ? 'rgba(255, 215, 0, 0.85)' : 'rgba(255, 105, 180, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = rounded >= 100 ? '#fffbe0' : '#fce7f3';
    ctx.fillText(subtitle, 0, pillY);

    ctx.restore();
  }

  function renderLoveHeartFill(ctx, now, heartbeatScale) {
    if (currentStage !== STAGE.HEART_INTERACTIVE && currentStage !== STAGE.ASSEMBLE_HEART) return;
    if (loveFillPercent <= 0.2 && targetFillPercent <= 0.2) return;

    // Smooth fluid lerp
    loveFillPercent += (targetFillPercent - loveFillPercent) * 0.085;
    const p = Math.max(0, Math.min(1.0, loveFillPercent / 100));

    if ((p >= 0.995 || (targetFillPercent >= 100 && loveFillPercent >= 97)) && !is100PercentCelebrated) {
      trigger100PercentTransition();
    }

    const cx = heartAnchor.x;
    const cy = heartAnchor.y;
    const rot = heartAnchor.rotation;

    const baseHeartScale = Math.min(width, height) * 0.42;
    const currentScale = baseHeartScale * heartbeatScale;

    // 1. Clip strictly inside heart contour
    ctx.save();
    traceHeartPath(ctx, cx, cy, currentScale, rot);
    ctx.clip();

    // 2. Liquid Surface in rotated heart coordinate space
    const nyBottom = 0.905;
    const nyTop = -1.250;
    const totalH = nyBottom - nyTop;
    const targetNy = nyBottom - p * totalH;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    const localWaterY = targetNy * currentScale;
    const bottomY = nyBottom * currentScale;

    // Wave calculation
    const waveAmp = (p > 0.02 && p < 0.98) ? Math.min(7.5, 4.5 * currentScale / 180) : 0;
    const waveSpeed = now * 0.0032;
    const waveFreq = 0.032 / (currentScale / 180);

    const leftX = -currentScale * 1.35;
    const rightX = currentScale * 1.35;
    const stepX = 8;

    // Liquid Body
    ctx.beginPath();
    ctx.moveTo(leftX, localWaterY);
    for (let lx = leftX; lx <= rightX; lx += stepX) {
      const wave1 = Math.sin(lx * waveFreq + waveSpeed) * waveAmp;
      const wave2 = Math.cos(lx * waveFreq * 1.5 - waveSpeed * 0.7) * (waveAmp * 0.55);
      ctx.lineTo(lx, localWaterY + wave1 + wave2);
    }
    ctx.lineTo(rightX, currentScale * 1.6);
    ctx.lineTo(leftX, currentScale * 1.6);
    ctx.closePath();

    // Glowing Pink Liquid Gradient
    const fluidGrad = ctx.createLinearGradient(0, bottomY, 0, localWaterY);
    fluidGrad.addColorStop(0, 'rgba(235, 15, 95, 0.90)');
    fluidGrad.addColorStop(0.45, 'rgba(255, 45, 135, 0.82)');
    fluidGrad.addColorStop(0.85, 'rgba(255, 95, 175, 0.85)');
    fluidGrad.addColorStop(1, 'rgba(255, 185, 220, 0.95)');
    ctx.fillStyle = fluidGrad;
    ctx.fill();

    // Surface wave highlight stroke
    ctx.beginPath();
    ctx.moveTo(leftX, localWaterY);
    for (let lx = leftX; lx <= rightX; lx += stepX) {
      const wave1 = Math.sin(lx * waveFreq + waveSpeed) * waveAmp;
      const wave2 = Math.cos(lx * waveFreq * 1.5 - waveSpeed * 0.7) * (waveAmp * 0.55);
      ctx.lineTo(lx, localWaterY + wave1 + wave2);
    }
    ctx.strokeStyle = 'rgba(255, 240, 250, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Rising Love Bubbles
    if (p > 0.05 && Math.random() < 0.35) {
      loveBubbles.push(new LoveBubble(currentScale, localWaterY, bottomY));
    }
    for (let i = loveBubbles.length - 1; i >= 0; i--) {
      const b = loveBubbles[i];
      b.update(localWaterY);
      b.draw(ctx);
      if (b.dead) loveBubbles.splice(i, 1);
    }

    ctx.restore();

    // 3. Draw Percentage Typography ("chữ số %")
    if (loveFillPercent >= 1.0) {
      drawLovePercentage(ctx, cx, cy, currentScale, rot, loveFillPercent, p);
    }

    ctx.restore(); // Restore clip
  }

  function updateLoveScrollUI(percent) {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    if (scrollFillBar) scrollFillBar.style.width = `${p}%`;
    if (scrollThumbHeart) scrollThumbHeart.style.left = `${p}%`;
    if (scrollPercentPill) scrollPercentPill.textContent = `${p}%`;

    if (scrollPromptText) {
      if (p < 25) {
        scrollPromptText.textContent = "Cuộn xuống để bơm đầy tình yêu";
      } else if (p < 50) {
        scrollPromptText.textContent = "Tiếp tục cuộn! Đang đong đầy yêu thương...";
      } else if (p < 85) {
        scrollPromptText.textContent = "Tình cảm bao la như biển trời...";
      } else if (p < 100) {
        scrollPromptText.textContent = "Gần chạm mốc 100% rồi Mẹ ơi!";
      } else {
        scrollPromptText.textContent = "🎉 Tình Yêu Đầy 100%! Nhấp mở thiệp 💌";
        if (loveScrollPanel) loveScrollPanel.classList.add('completed');
      }
    }
  }

  // -------------------------------------------------------------
  // Pumping Love Fluid in Heart Stage (Wheel, Trackpad, Touch, Scrubber, Keys)
  // -------------------------------------------------------------
  let isScrubbingTrack = false;
  let heartTouchStartY = null;
  let isTouchPumping = false;

  // Direct wheel scrolling on window (smoothly increments fill percent)
  window.addEventListener('wheel', (e) => {
    if (currentStage !== STAGE.HEART_INTERACTIVE) return;
    const delta = e.deltaY;
    // Step magnitude: responsive and smooth across both mouse wheel notches and trackpad scrolls
    const step = Math.min(18, Math.max(3.5, Math.abs(delta) * 0.12));

    if (delta > 0) {
      targetFillPercent = Math.min(100, targetFillPercent + step);
    } else if (delta < 0) {
      targetFillPercent = Math.max(0, targetFillPercent - step * 0.8);
    }

    updateLoveScrollUI(targetFillPercent);

    if (targetFillPercent >= 100 && !is100PercentCelebrated) {
      trigger100PercentTransition();
    }
  }, { passive: true });

  // Mobile Touch Swipe Pumping
  window.addEventListener('touchstart', (e) => {
    if (currentStage === STAGE.HEART_INTERACTIVE && e.touches.length > 0) {
      heartTouchStartY = e.touches[0].clientY;
      isTouchPumping = true;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (currentStage === STAGE.HEART_INTERACTIVE && isTouchPumping && heartTouchStartY !== null && e.touches.length > 0) {
      if (isScrubbingTrack) return;

      const currentY = e.touches[0].clientY;
      const diffY = heartTouchStartY - currentY; // positive when swiping up (natural scroll down)

      if (Math.abs(diffY) > 4) {
        const deltaPercent = (diffY / (window.innerHeight * 0.35)) * 100;
        targetFillPercent = Math.min(100, Math.max(0, targetFillPercent + deltaPercent));
        updateLoveScrollUI(targetFillPercent);
        heartTouchStartY = currentY;

        if (targetFillPercent >= 100 && !is100PercentCelebrated) {
          trigger100PercentTransition();
        }
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isTouchPumping = false;
    heartTouchStartY = null;
  }, { passive: true });

  // Keyboard navigation for Heart Stage
  window.addEventListener('keydown', (e) => {
    if (currentStage === STAGE.HEART_INTERACTIVE) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        targetFillPercent = Math.min(100, targetFillPercent + 8);
        updateLoveScrollUI(targetFillPercent);
        if (targetFillPercent >= 100 && !is100PercentCelebrated) {
          trigger100PercentTransition();
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        targetFillPercent = Math.max(0, targetFillPercent - 8);
        updateLoveScrollUI(targetFillPercent);
      }
    }
  });

  // Interactive scrubber on the Love Scroll Panel
  if (scrollTrackContainer) {
    const handleTrackScrub = (clientX) => {
      if (currentStage !== STAGE.HEART_INTERACTIVE) return;
      const rect = scrollTrackContainer.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      targetFillPercent = ratio * 100;
      updateLoveScrollUI(targetFillPercent);
      if (targetFillPercent >= 100 && !is100PercentCelebrated) {
        trigger100PercentTransition();
      }
    };

    scrollTrackContainer.addEventListener('mousedown', (e) => {
      isScrubbingTrack = true;
      handleTrackScrub(e.clientX);
    });
    window.addEventListener('mousemove', (e) => {
      if (isScrubbingTrack) handleTrackScrub(e.clientX);
    });
    window.addEventListener('mouseup', () => {
      isScrubbingTrack = false;
    });

    scrollTrackContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        isScrubbingTrack = true;
        handleTrackScrub(e.touches[0].clientX);
      }
    }, { passive: true });
    scrollTrackContainer.addEventListener('touchmove', (e) => {
      if (isScrubbingTrack && e.touches.length > 0) {
        handleTrackScrub(e.touches[0].clientX);
      }
    }, { passive: true });
    scrollTrackContainer.addEventListener('touchend', () => {
      isScrubbingTrack = false;
    });
  }

  if (loveScrollPanel) {
    loveScrollPanel.addEventListener('click', (e) => {
      if (targetFillPercent >= 90 || loveFillPercent >= 90) {
        trigger100PercentTransition();
      }
    });
  }

  // -------------------------------------------------------------
  // Stage Sequencing Machine
  // -------------------------------------------------------------
  function switchStage(newStage) {
    currentStage = newStage;
    stageStartTime = performance.now();
    calligraphySparks.length = 0;

    if (newStage < STAGE.TEXT_SINH_NHAT) {
      cakeEmbers.length = 0;
      cakeExplosionSparks.length = 0;
    }

    if (newStage !== STAGE.STORY_MODE) {
      document.documentElement.classList.remove('story-active', 'story-stage-scroll');
      document.body.classList.remove('story-active', 'story-stage-scroll');
      const storyContainer = document.getElementById('storyContainer');
      if (storyContainer) {
        storyContainer.classList.remove('active');
      }
    }

    if (newStage < STAGE.HEART_INTERACTIVE) {
      document.body.classList.remove('heart-stage-scroll');
      if (loveScrollPanel) {
        loveScrollPanel.classList.remove('visible', 'completed');
      }
      if (newStage < STAGE.ASSEMBLE_HEART) {
        window.scrollTo(0, 0);
        targetFillPercent = 0;
        loveFillPercent = 0;
        is100PercentCelebrated = false;
        loveBubbles.length = 0;
        loveConfetti.length = 0;
        updateLoveScrollUI(0);
      }
    }

    if (newStage >= STAGE.TEXT_CHUC_MUNG && newStage <= STAGE.TEXT_SINH_NHAT) {
      targetColorTheme = { ...COLOR_GOLDEN_FIREFLY };
      const stageConfig = TEXT_STAGES[textIndex];
      badgeText.textContent = stageConfig.badge;
      stageBadge.style.borderColor = 'rgba(255, 215, 50, 0.4)';
      interactiveHint.classList.remove('visible');

      const points = sampleTextPoints(stageConfig.text, fireflies.length);
      assignTextTargets(points);

      // Trigger Massive Fireworks show at "29/09"
      if (newStage === STAGE.TEXT_DATE) {
        lastFireworkSalvoTime = performance.now() - 300;
        launchDenseFireworkSalvo();
      }

    } else if (newStage === STAGE.EXPLODE_OUT) {
      badgeText.textContent = "✨ Vạn Đom Đóm Tề Phi...";
      interactiveHint.classList.remove('visible');
      triggerCakeExplosion();
      for (const f of fireflies) {
        f.setExplosionOutward();
      }

    } else if (newStage === STAGE.ASSEMBLE_HEART) {
      targetColorTheme = { ...COLOR_PINK_FIREFLY };
      badgeText.textContent = "💖 Trái Tim Đom Đóm Hồng...";
      stageBadge.style.borderColor = 'rgba(255, 50, 135, 0.4)';
      assignHeartTargets();

    } else if (newStage === STAGE.HEART_INTERACTIVE) {
      targetColorTheme = { ...COLOR_PINK_FIREFLY };
      badgeText.textContent = "💖 Trái Tim Đập Nhịp 4/4";
      stageBadge.style.borderColor = 'rgba(255, 50, 135, 0.6)';
      interactiveHint.classList.remove('visible');

      // Enable scrolling & love panel
      document.body.classList.add('heart-stage-scroll');
      if (loveScrollPanel) {
        loveScrollPanel.classList.add('visible');
      }
      updateLoveScrollUI(targetFillPercent);

    } else if (newStage === STAGE.STORY_MODE) {
      targetColorTheme = { ...COLOR_PINK_FIREFLY };
      badgeText.textContent = "📖 Kỷ Niệm Yêu Thương Bên Mẹ 💖";
      stageBadge.style.borderColor = 'rgba(255, 215, 0, 0.7)';
      interactiveHint.classList.remove('visible');

      // Mọi đốm bay tứ tung ("all dots fly randomly in all directions")
      for (const f of fireflies) {
        f.setScatterRandomly();
      }

      // Hide love scroll panel & remove heart scroll
      document.body.classList.remove('heart-stage-scroll');
      if (loveScrollPanel) {
        loveScrollPanel.classList.remove('visible', 'completed');
      }

      // Show Story Container and enable page scroll on both html and body
      document.documentElement.classList.add('story-active', 'story-stage-scroll');
      document.body.classList.add('story-active', 'story-stage-scroll');

      const storyContainer = document.getElementById('storyContainer');
      if (storyContainer) {
        storyContainer.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      // Reveal first card immediately
      const firstCard = document.querySelector('.story-card[data-chapter="1"]');
      if (firstCard) firstCard.classList.add('revealed');

      celebrate100Percent();
    }
  }

  // -------------------------------------------------------------
  // Mouse & Touch Interaction
  // -------------------------------------------------------------
  function handlePointerMove(clientX, clientY) {
    mouse.x = clientX;
    mouse.y = clientY;
    mouse.isInside = true;
    mouse.lastMoveTime = performance.now();

    if (heartAnchor.isDragging) {
      const targetHeartX = clientX - heartAnchor.dragOffsetX;
      const targetHeartY = clientY - heartAnchor.dragOffsetY;

      heartAnchor.vx = (targetHeartX - heartAnchor.x) * 0.35;
      heartAnchor.vy = (targetHeartY - heartAnchor.y) * 0.35;

      heartAnchor.x = targetHeartX;
      heartAnchor.y = targetHeartY;

      heartAnchor.rotation = Math.max(-0.35, Math.min(0.35, heartAnchor.vx * 0.015));
    }
  }

  function handlePointerDown(clientX, clientY, isTouch = false) {
    mouse.x = clientX;
    mouse.y = clientY;
    mouse.isDown = true;
    mouse.isInside = true;

    if (bgMusic.paused) {
      playMusic();
    }

    // If during "29/09" stage, tap/click anywhere to shoot a custom firework rocket!
    if (currentStage === STAGE.TEXT_DATE) {
      const startX = clientX < width / 2 ? width * 0.05 : width * 0.95;
      const c = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      const burstTypes = ['PEONY', 'WILLOW', 'RING', 'DOUBLE'];
      const bType = burstTypes[Math.floor(Math.random() * burstTypes.length)];
      rockets.push(new Rocket(startX, height, clientX, clientY, c, bType));
    }

    // If during "Sinh Nhật Mẹ Yêu" stage, tapping near either cake bursts celebratory stardust embers!
    if (currentStage === STAGE.TEXT_SINH_NHAT) {
      const { leftX, rightX, cakeY, cakeScale } = getCakePositions();
      const hitRadius = 75 * cakeScale;
      const dLeft = Math.hypot(clientX - leftX, clientY - cakeY);
      const dRight = Math.hypot(clientX - rightX, clientY - cakeY);
      if (dLeft < hitRadius || dRight < hitRadius) {
        const cx = dLeft < hitRadius ? leftX : rightX;
        for (let k = 0; k < 14; k++) {
          cakeEmbers.push(new CakeEmber(cx, cakeY, cakeScale * 1.2));
        }
      }
    }

    if (currentStage === STAGE.HEART_INTERACTIVE) {
      const dx = clientX - heartAnchor.x;
      const dy = clientY - heartAnchor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // On desktop mouse, drag radius can be generous. On touch, avoid hijacking vertical swipe gestures
      const dragHitRadius = isTouch ? 40 : Math.min(width, height) * 0.35;
      if (dist < dragHitRadius) {
        heartAnchor.isDragging = true;
        heartAnchor.dragOffsetX = dx;
        heartAnchor.dragOffsetY = dy;
      }
    }
  }

  function handlePointerUp() {
    mouse.isDown = false;
    if (heartAnchor.isDragging) {
      heartAnchor.isDragging = false;
    }
  }

  window.addEventListener('mousemove', (e) => handlePointerMove(e.clientX, e.clientY));
  window.addEventListener('mousedown', (e) => handlePointerDown(e.clientX, e.clientY, false));
  window.addEventListener('mouseup', handlePointerUp);
  window.addEventListener('mouseleave', () => {
    mouse.isInside = false;
    mouse.x = -9999;
    mouse.y = -9999;
    handlePointerUp();
  });

  window.addEventListener('touchmove', (e) => {
    // Only prevent default if actively dragging heart anchor during HEART_INTERACTIVE
    if (currentStage === STAGE.HEART_INTERACTIVE && heartAnchor.isDragging && e.cancelable) {
      e.preventDefault();
    }
    if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: true });

  window.addEventListener('touchend', handlePointerUp);

  // -------------------------------------------------------------
  // Window Resize
  // -------------------------------------------------------------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    heartAnchor.targetX = width / 2;
    heartAnchor.targetY = height / 2;
    if (!heartAnchor.isDragging) {
      heartAnchor.x = width / 2;
      heartAnchor.y = height / 2;
    }

    if (currentStage >= STAGE.TEXT_CHUC_MUNG && currentStage <= STAGE.TEXT_SINH_NHAT) {
      const stageConfig = TEXT_STAGES[textIndex];
      const points = sampleTextPoints(stageConfig.text, fireflies.length);
      assignTextTargets(points);
    }
  }

  window.addEventListener('resize', resize);

  // -------------------------------------------------------------
  // UI Controls
  // -------------------------------------------------------------
  musicBtn.addEventListener('click', toggleMusic);

  replayBtn.addEventListener('click', () => {
    textIndex = 0;
    switchStage(STAGE.TEXT_CHUC_MUNG);
  });

  skipBtn.addEventListener('click', () => {
    if (currentStage === STAGE.HEART_INTERACTIVE) {
      switchStage(STAGE.STORY_MODE);
    } else {
      switchStage(STAGE.HEART_INTERACTIVE);
    }
  });

  messageBtn.addEventListener('click', () => modalBackdrop.classList.add('open'));
  closeCardBtn.addEventListener('click', () => modalBackdrop.classList.remove('open'));
  cardActionBtn.addEventListener('click', () => modalBackdrop.classList.remove('open'));

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) modalBackdrop.classList.remove('open');
  });

  // -------------------------------------------------------------
  // Main Animation Loop
  // -------------------------------------------------------------
  function animate(now) {
    requestAnimationFrame(animate);

    const elapsedInStage = now - stageStartTime;
    const nowSec = now / 1000.0;

    // Stage Timing Machine
    if (currentStage === STAGE.INTRO) {
      if (elapsedInStage > 1000) {
        textIndex = 0;
        switchStage(STAGE.TEXT_CHUC_MUNG);
      }
    } else if (currentStage >= STAGE.TEXT_CHUC_MUNG && currentStage <= STAGE.TEXT_SINH_NHAT) {
      const stageConfig = TEXT_STAGES[textIndex];
      if (elapsedInStage > stageConfig.duration) {
        textIndex++;
        if (textIndex < TEXT_STAGES.length) {
          switchStage(TEXT_STAGES[textIndex].id);
        } else {
          switchStage(STAGE.EXPLODE_OUT);
        }
      }
    } else if (currentStage === STAGE.EXPLODE_OUT) {
      if (elapsedInStage > 1600) {
        switchStage(STAGE.ASSEMBLE_HEART);
      }
    } else if (currentStage === STAGE.ASSEMBLE_HEART) {
      if (elapsedInStage > 2200) {
        switchStage(STAGE.HEART_INTERACTIVE);
      }
    }

    // Calculate 4/4 Beat Pulse
    const heartbeatScale = calculate4_4Heartbeat(nowSec);

    // Heart Anchor Spring Return
    if (currentStage === STAGE.HEART_INTERACTIVE && !heartAnchor.isDragging) {
      const targetCenterX = width / 2;
      const targetCenterY = height / 2;
      const spring = 0.045;
      const damping = 0.86;

      heartAnchor.vx += (targetCenterX - heartAnchor.x) * spring;
      heartAnchor.vy += (targetCenterY - heartAnchor.y) * spring;

      heartAnchor.vx *= damping;
      heartAnchor.vy *= damping;

      heartAnchor.x += heartAnchor.vx;
      heartAnchor.y += heartAnchor.vy;

      heartAnchor.rotation *= 0.88;
    }

    // Continuous Massive Fireworks Show in "29/09" stage
    if (currentStage === STAGE.TEXT_DATE) {
      if (now - lastFireworkSalvoTime > nextFireworkInterval) {
        launchDenseFireworkSalvo();
        lastFireworkSalvoTime = now;
        nextFireworkInterval = Math.random() * 180 + 220; // Rapid salvos every 220-400ms!
      }
    }

    // 1. Draw Ethereal Cosmic Universe Background (Nebulas, Starfield, Meteors, Ambient Sky Flashes)
    drawCosmicBackground(ctx, now);

    // 2. Draw Birthday Cakes on Both Sides using Light Dots ("Đốm Đèn Bánh Kem Hai Bên Side")
    drawBirthdayCakes(ctx, now);

    // 3. Draw Apple Cursive Calligraphy Handwriting for "Sinh Nhật Mẹ Yêu"
    drawAppleCursiveText(ctx, now);

    // 4. Update and draw fireworks
    updateAndDrawFireworks(ctx);

    // 5. Render Love Liquid Fill inside the Heart with dynamic % typography
    renderLoveHeartFill(ctx, now, heartbeatScale);

    // 6. Update and draw 100% celebration confetti
    updateAndDrawLoveConfetti(ctx);

    // 7. Update and draw fireflies
    for (let i = 0; i < fireflies.length; i++) {
      fireflies[i].update(now, heartbeatScale);
      fireflies[i].draw(ctx);
    }
  }

  // -------------------------------------------------------------
  // Story Mode Interactions & Reveal
  // -------------------------------------------------------------
  function setupStoryInteractions() {
    const storyCards = document.querySelectorAll('.story-card');
    const revealCard = (card) => {
      card.classList.add('revealed');
    };

    // 1. Intersection Observer for progressive scroll-reveal of chapter cards
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            revealCard(entry.target);
          }
        });
      }, { threshold: [0.05, 0.15], rootMargin: '0px 0px 60px 0px' });

      storyCards.forEach(c => observer.observe(c));
    }

    // Scroll listener fallback for instant response while scrolling down
    window.addEventListener('scroll', () => {
      if (currentStage === STAGE.STORY_MODE) {
        const triggerY = window.innerHeight * 0.95;
        storyCards.forEach(card => {
          if (!card.classList.contains('revealed')) {
            const rect = card.getBoundingClientRect();
            if (rect.top <= triggerY) {
              revealCard(card);
            }
          }
        });
      }
    }, { passive: true });

    // Reveal Chapter 1 immediately
    const firstCard = document.querySelector('.story-card[data-chapter="1"]');
    if (firstCard) revealCard(firstCard);

    // 2. Lightbox Modal for Photo Fullscreen Preview
    const lightboxBackdrop = document.getElementById('lightboxBackdrop');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');

    const openLightbox = (src, caption) => {
      if (lightboxImg && lightboxBackdrop) {
        lightboxImg.src = src;
        if (lightboxCaption) lightboxCaption.textContent = caption || '';
        lightboxBackdrop.classList.add('open');
      }
    };

    const closeLightbox = () => {
      if (lightboxBackdrop) lightboxBackdrop.classList.remove('open');
    };

    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
    if (lightboxBackdrop) {
      lightboxBackdrop.addEventListener('click', (e) => {
        if (e.target === lightboxBackdrop) closeLightbox();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightboxBackdrop && lightboxBackdrop.classList.contains('open')) {
        closeLightbox();
      }
    });

    // Clicking any chapter photo frame opens fullscreen lightbox
    document.querySelectorAll('.story-photo-frame').forEach(frame => {
      const img = frame.querySelector('.story-photo-img');
      const input = frame.querySelector('.story-photo-input');

      frame.addEventListener('click', () => {
        if (img && img.src) {
          const cap = img.getAttribute('data-caption') || img.alt || '';
          openLightbox(img.src, cap);
        }
      });

      if (input) {
        input.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              if (img) {
                img.src = evt.target.result;
                img.style.display = 'block';
              }
              frame.classList.add('has-photo');
            };
            reader.readAsDataURL(file);
          }
        });
      }
    });

    // Clicking any mosaic thumb opens fullscreen lightbox
    document.querySelectorAll('.mosaic-thumb').forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const src = thumb.getAttribute('data-src') || (thumb.querySelector('img') && thumb.querySelector('img').src);
        const caption = thumb.getAttribute('data-caption') || '';
        if (src) openLightbox(src, caption);
      });
    });

    // 3. Finale Action: Thả Ngàn Trái Tim Cho Mẹ
    const heartBurstBtn = document.getElementById('storyHeartBurstBtn');
    if (heartBurstBtn) {
      heartBurstBtn.addEventListener('click', () => {
        celebrate100Percent();
        for (let i = 0; i < 50; i++) {
          loveConfetti.push(new LoveConfettiParticle(
            width * (Math.random() * 0.8 + 0.1),
            height * (Math.random() * 0.5 + 0.3)
          ));
        }
      });
    }

    // 4. Finale Action: Mở Thiệp Chúc Mừng
    const openLetterBtn = document.getElementById('storyOpenLetterBtn');
    if (openLetterBtn) {
      openLetterBtn.addEventListener('click', () => {
        modalBackdrop.classList.add('open');
      });
    }

    // 5. Story Footer Replay
    const footerReplayBtn = document.getElementById('footerReplayBtn');
    if (footerReplayBtn) {
      footerReplayBtn.addEventListener('click', () => {
        textIndex = 0;
        switchStage(STAGE.TEXT_CHUC_MUNG);
      });
    }
  }

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  async function init() {
    try {
      await document.fonts.ready;
    } catch (e) {}

    resize();
    initStarfield();
    setupStoryInteractions();

    // Start playing music immediately by default as soon as the web page opens!
    playMusic();

    fireflies.length = 0;
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const [nx, ny] = HEART_COORDS[i];
      fireflies.push(new Firefly(i, nx, ny));
    }

    heartAnchor.x = width / 2;
    heartAnchor.y = height / 2;

    switchStage(STAGE.INTRO);
    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
