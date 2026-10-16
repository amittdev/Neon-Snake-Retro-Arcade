/**
 * Neon Snake Retro Arcade - Pure Vanilla JavaScript Engine
 * Production-ready, fully responsive, zero-dependency, Vercel-static compatible.
 */

(function () {
  'use strict';

  // --- Constants & Config ---
  const GRID_SIZE = 20; // 20x20 grid
  const BASE_SPEED = 140; // Base milliseconds per step
  const MIN_SPEED = 65; // Fastest milliseconds per step
  const SPEED_DECREMENT = 2.5; // Speed increase per food eaten
  const POINTS_PER_FOOD = 10;
  const LOCAL_STORAGE_KEY = 'neon_snake_best_score_v1';
  const SOUND_STORAGE_KEY = 'neon_snake_sound_muted_v1';

  // --- Directions ---
  const DIR = {
    UP: { x: 0, y: -1, name: 'UP' },
    DOWN: { x: 0, y: 1, name: 'DOWN' },
    LEFT: { x: -1, y: 0, name: 'LEFT' },
    RIGHT: { x: 1, y: 0, name: 'RIGHT' },
  };

  // --- Audio System (Procedural Web Audio API) ---
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.muted = false;
      try {
        const stored = localStorage.getItem(SOUND_STORAGE_KEY);
        if (stored === 'true') {
          this.muted = true;
        }
      } catch (e) {
        // Fallback if localStorage is unavailable
      }
    }

    init() {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      try {
        localStorage.setItem(SOUND_STORAGE_KEY, String(this.muted));
      } catch (e) {}
      return this.muted;
    }

    playTone(freq, type, duration, startVol = 0.15, endVol = 0.001) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(startVol, now);
        gain.gain.exponentialRampToValueAtTime(endVol, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      } catch (e) {
        // Audio error suppression
      }
    }

    playEat() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // G5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (e) {}
    }

    playDie() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } catch (e) {}
    }

    playHighScore() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, High C
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            this.playTone(freq, 'sine', 0.18, 0.2, 0.01);
          }, idx * 100);
        });
      } catch (e) {}
    }

    playClick() {
      this.playTone(400, 'sine', 0.04, 0.08, 0.001);
    }
  }

  // --- Particles System for Canvas Polish ---
  class ParticlePool {
    constructor(maxCount = 40) {
      this.particles = [];
      this.maxCount = maxCount;
    }

    burst(x, y, color = '#22c55e') {
      const count = 10;
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxCount) {
          this.particles.shift();
        }
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 2.5;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 2.5,
          color: Math.random() > 0.4 ? color : '#f59e0b',
          alpha: 1,
          life: 20 + Math.floor(Math.random() * 12),
          maxLife: 32,
        });
      }
    }

    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life--;
        p.alpha = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    draw(ctx, cellSize) {
      if (this.particles.length === 0) return;
      ctx.save();
      for (const p of this.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    clear() {
      this.particles = [];
    }
  }

  // --- Pure Game State & Rules Module ---
  class SnakeEngine {
    constructor(gridSize = GRID_SIZE) {
      this.gridSize = gridSize;
      this.snake = [];
      this.direction = DIR.RIGHT;
      this.food = { x: 0, y: 0 };
      this.score = 0;
      this.foodsEaten = 0;
      this.isGameOver = false;
    }

    reset() {
      const midY = Math.floor(this.gridSize / 2);
      const startX = 6;
      this.snake = [
        { x: startX, y: midY },
        { x: startX - 1, y: midY },
        { x: startX - 2, y: midY },
      ];
      this.direction = DIR.RIGHT;
      this.score = 0;
      this.foodsEaten = 0;
      this.isGameOver = false;
      this.spawnFood();
    }

    isCellOccupied(x, y) {
      return this.snake.some(seg => seg.x === x && seg.y === y);
    }

    spawnFood() {
      const emptyCells = [];
      for (let x = 0; x < this.gridSize; x++) {
        for (let y = 0; y < this.gridSize; y++) {
          if (!this.isCellOccupied(x, y)) {
            emptyCells.push({ x, y });
          }
        }
      }

      if (emptyCells.length === 0) {
        // Player filled entire grid (Victory!)
        this.food = { x: -1, y: -1 };
        return;
      }

      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      this.food = emptyCells[randomIndex];
    }

    step(nextDir) {
      if (this.isGameOver) return { moved: false, ate: false, collision: true };

      if (nextDir) {
        // Prevent reverse direction
        if (
          !(nextDir.x === -this.direction.x && nextDir.y === 0) &&
          !(nextDir.y === -this.direction.y && nextDir.x === 0)
        ) {
          this.direction = nextDir;
        }
      }

      const head = this.snake[0];
      const newHead = {
        x: head.x + this.direction.x,
        y: head.y + this.direction.y,
      };

      // 1. Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= this.gridSize ||
        newHead.y < 0 ||
        newHead.y >= this.gridSize
      ) {
        this.isGameOver = true;
        return { moved: false, ate: false, collision: true };
      }

      // 2. Self collision
      // Note: Tail is about to move unless food is eaten, but standard snake collides if hitting any current body part
      const hitsSelf = this.snake.some((seg, idx) => {
        // Exclude the tail if we are not eating, but to avoid tunneling we check all
        return seg.x === newHead.x && seg.y === newHead.y;
      });

      if (hitsSelf) {
        this.isGameOver = true;
        return { moved: false, ate: false, collision: true };
      }

      // Check food collision
      const ateFood = newHead.x === this.food.x && newHead.y === this.food.y;

      this.snake.unshift(newHead);

      if (ateFood) {
        this.score += POINTS_PER_FOOD;
        this.foodsEaten += 1;
        this.spawnFood();
      } else {
        this.snake.pop(); // Remove tail
      }

      return { moved: true, ate: ateFood, collision: false };
    }

    getSpeed() {
      const speed = BASE_SPEED - this.foodsEaten * SPEED_DECREMENT;
      return Math.max(MIN_SPEED, Math.round(speed));
    }

    getLevel() {
      return Math.floor(this.score / 50) + 1;
    }
  }

  // --- Main Game Controller ---
  class SnakeGameApp {
    constructor() {
      this.engine = new SnakeEngine(GRID_SIZE);
      this.sound = new SoundManager();
      this.particles = new ParticlePool();

      this.state = 'title'; // 'title' | 'playing' | 'paused' | 'gameover'
      this.inputQueue = [];
      this.bestScore = 0;
      this.isNewHighScore = false;

      // Timing
      this.lastTickTime = 0;
      this.accumulator = 0;
      this.isLoopRunning = false;
      this.rafId = null;

      // Shake animation
      this.shakeDuration = 0;
      this.shakeIntensity = 0;

      // DOM Elements
      this.dom = {
        canvasContainer: document.getElementById('canvas-container'),
        canvas: document.getElementById('game-canvas'),
        scoreDisplay: document.getElementById('score-display'),
        bestDisplay: document.getElementById('best-display'),
        levelDisplay: document.getElementById('level-display'),
        soundBtn: document.getElementById('sound-btn'),
        soundIconOn: document.getElementById('sound-icon-on'),
        soundIconOff: document.getElementById('sound-icon-off'),
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        fullscreenIconEnter: document.getElementById('fullscreen-icon-enter'),
        fullscreenIconExit: document.getElementById('fullscreen-icon-exit'),
        pauseBtn: document.getElementById('pause-btn'),
        pauseIcon: document.getElementById('pause-icon'),
        resumeIcon: document.getElementById('resume-icon'),
        startOverlay: document.getElementById('start-overlay'),
        pauseOverlay: document.getElementById('pause-overlay'),
        gameoverOverlay: document.getElementById('gameover-overlay'),
        startBtn: document.getElementById('start-btn'),
        resumeBtn: document.getElementById('resume-btn'),
        pauseRestartBtn: document.getElementById('pause-restart-btn'),
        restartBtn: document.getElementById('restart-btn'),
        pauseScore: document.getElementById('pause-score'),
        pauseLength: document.getElementById('pause-length'),
        finalScore: document.getElementById('final-score'),
        finalBest: document.getElementById('final-best'),
        finalFood: document.getElementById('final-food'),
        finalLength: document.getElementById('final-length'),
        newHighScoreBanner: document.getElementById('new-high-score-banner'),
        btnUp: document.getElementById('btn-up'),
        btnDown: document.getElementById('btn-down'),
        btnLeft: document.getElementById('btn-left'),
        btnRight: document.getElementById('btn-right'),
      };

      this.ctx = this.dom.canvas.getContext('2d');

      this.loadBestScore();
      this.updateSoundIcon();
      this.setupCanvasDPI();
      this.bindEvents();

      // Render initial background & state
      this.setState('title');
      this.engine.reset();
      this.draw();

      // Start the master RAF animation loop
      this.startMasterLoop();

      // Check query parameter autostart
      if (
        typeof window !== 'undefined' &&
        window.location.search &&
        window.location.search.includes('autostart=1')
      ) {
        setTimeout(() => this.startGame(), 50);
      }
    }

    loadBestScore() {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored !== null) {
          const val = parseInt(stored, 10);
          if (!isNaN(val) && val >= 0) {
            this.bestScore = val;
          }
        }
      } catch (e) {
        this.bestScore = 0;
      }
      this.dom.bestDisplay.textContent = String(this.bestScore);
    }

    saveBestScore(newScore) {
      if (newScore > this.bestScore) {
        this.bestScore = newScore;
        this.isNewHighScore = true;
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, String(this.bestScore));
        } catch (e) {}
        this.dom.bestDisplay.textContent = String(this.bestScore);
      }
    }

    setupCanvasDPI() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const container = this.dom.canvasContainer || this.dom.canvas.parentElement;
      const rect = container ? container.getBoundingClientRect() : this.dom.canvas.getBoundingClientRect();
      const displaySize = Math.max(260, Math.round(rect.width || 400));

      this.logicalSize = displaySize;
      this.dom.canvas.width = Math.round(displaySize * dpr);
      this.dom.canvas.height = Math.round(displaySize * dpr);

      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);
      this.cellSize = displaySize / GRID_SIZE;
    }

    toggleFullscreen() {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }

    setState(newState) {
      this.state = newState;
      document.body.dataset.state = newState;

      // Update overlays
      this.dom.startOverlay.classList.toggle('hidden', newState !== 'title');
      this.dom.pauseOverlay.classList.toggle('hidden', newState !== 'paused');
      this.dom.gameoverOverlay.classList.toggle('hidden', newState !== 'gameover');

      // Update pause button icons
      if (newState === 'paused') {
        this.dom.pauseIcon.classList.add('hidden');
        this.dom.resumeIcon.classList.remove('hidden');
        this.dom.pauseBtn.setAttribute('aria-label', 'Resume game');
        this.dom.pauseScore.textContent = String(this.engine.score);
        this.dom.pauseLength.textContent = String(this.engine.snake.length);
      } else {
        this.dom.pauseIcon.classList.remove('hidden');
        this.dom.resumeIcon.classList.add('hidden');
        this.dom.pauseBtn.setAttribute('aria-label', 'Pause game');
      }

      // If transitioning to title/gameover, blur active button
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }

    queueDirection(dir) {
      if (this.state !== 'playing') return;

      // Determine the reference direction
      const lastDir = this.inputQueue.length > 0
        ? this.inputQueue[this.inputQueue.length - 1]
        : this.engine.direction;

      // Ignore 180-degree immediate reversal
      if (dir.x === -lastDir.x && dir.y === 0) return;
      if (dir.y === -lastDir.y && dir.x === 0) return;
      if (dir.x === lastDir.x && dir.y === lastDir.y) return;

      // Keep max 2 directions buffered for responsive reflex moves
      if (this.inputQueue.length < 2) {
        this.inputQueue.push(dir);
      }
    }

    startGame() {
      this.sound.playClick();
      this.engine.reset();
      this.inputQueue = [];
      this.isNewHighScore = false;
      this.particles.clear();
      this.accumulator = 0;
      this.lastTickTime = performance.now();

      this.dom.scoreDisplay.textContent = '0';
      this.dom.levelDisplay.textContent = '1';

      this.setState('playing');
    }

    togglePause() {
      if (this.state === 'playing') {
        this.sound.playClick();
        this.setState('paused');
      } else if (this.state === 'paused') {
        this.sound.playClick();
        this.lastTickTime = performance.now();
        this.accumulator = 0;
        this.setState('playing');
      }
    }

    restartFromPause() {
      this.sound.playClick();
      this.startGame();
    }

    triggerGameOver() {
      this.sound.playDie();
      this.shakeDuration = 180; // ms
      this.shakeIntensity = 6;

      const finalScore = this.engine.score;
      const priorBest = this.bestScore;

      if (finalScore > priorBest) {
        this.saveBestScore(finalScore);
        this.sound.playHighScore();
        this.dom.newHighScoreBanner.classList.remove('hidden');
      } else {
        this.dom.newHighScoreBanner.classList.add('hidden');
      }

      this.dom.finalScore.textContent = String(finalScore);
      this.dom.finalBest.textContent = String(this.bestScore);
      this.dom.finalFood.textContent = String(this.engine.foodsEaten);
      this.dom.finalLength.textContent = String(this.engine.snake.length);

      this.setState('gameover');
    }

    startMasterLoop() {
      if (this.isLoopRunning) return;
      this.isLoopRunning = true;
      let lastFrameTime = performance.now();

      const frame = (now) => {
        const delta = Math.min(now - lastFrameTime, 100); // Clamp delta to avoid huge jumps on background tab
        lastFrameTime = now;

        // Update screen shake
        if (this.shakeDuration > 0) {
          this.shakeDuration -= delta;
          if (this.shakeDuration <= 0) {
            this.shakeDuration = 0;
            this.shakeIntensity = 0;
          }
        }

        // Gameplay physics ticks
        if (this.state === 'playing') {
          this.accumulator += delta;
          const stepInterval = this.engine.getSpeed();

          while (this.accumulator >= stepInterval) {
            this.accumulator -= stepInterval;

            const nextDir = this.inputQueue.shift() || null;
            const result = this.engine.step(nextDir);

            if (result.collision) {
              this.triggerGameOver();
              break;
            }

            if (result.ate) {
              this.sound.playEat();
              const head = this.engine.snake[0];
              this.particles.burst(head.x, head.y);
              this.dom.scoreDisplay.textContent = String(this.engine.score);
              this.dom.levelDisplay.textContent = String(this.engine.getLevel());
              if (this.engine.score > this.bestScore) {
                this.dom.bestDisplay.textContent = String(this.engine.score);
              }
            }
          }
        }

        // Always update particles and draw
        this.particles.update();
        this.draw();

        this.rafId = requestAnimationFrame(frame);
      };

      this.rafId = requestAnimationFrame(frame);
    }

    // --- Rendering Logic ---
    draw() {
      const ctx = this.ctx;
      const size = this.logicalSize || 400;
      const cell = this.cellSize || (size / GRID_SIZE);

      ctx.save();

      // Screen shake translation
      if (this.shakeDuration > 0) {
        const ox = (Math.random() - 0.5) * this.shakeIntensity;
        const oy = (Math.random() - 0.5) * this.shakeIntensity;
        ctx.translate(ox, oy);
      }

      // 1. Clear background
      ctx.fillStyle = '#090e18';
      ctx.fillRect(0, 0, size, size);

      // 2. Draw subtle retro grid
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        const pos = i * cell;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, size);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(size, pos);
        ctx.stroke();
      }

      // 3. Draw particles
      this.particles.draw(ctx, cell);

      // 4. Draw Food (pulsing glowing orb)
      const food = this.engine.food;
      if (food && food.x >= 0 && food.y >= 0) {
        const fx = food.x * cell;
        const fy = food.y * cell;
        const centerFx = fx + cell / 2;
        const centerFy = fy + cell / 2;

        const pulse = Math.sin(performance.now() * 0.008) * (cell * 0.08);
        const foodRadius = Math.max(3, cell * 0.38 + pulse);

        // Outer glow
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = Math.round(cell * 0.6);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(centerFx, centerFy, foodRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(centerFx - 2, centerFy - 2, foodRadius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Draw Snake
      const snake = this.engine.snake;
      if (snake.length > 0) {
        const isDead = this.state === 'gameover';

        // Draw body segments
        for (let i = snake.length - 1; i >= 0; i--) {
          const seg = snake[i];
          const sx = seg.x * cell;
          const sy = seg.y * cell;
          const isHead = i === 0;

          const padding = isHead ? Math.max(1, Math.round(cell * 0.05)) : Math.max(1, Math.round(cell * 0.1));
          const cornerRadius = isHead ? Math.round(cell * 0.3) : Math.round(cell * 0.2);

          ctx.save();

          if (isDead) {
            ctx.fillStyle = isHead ? '#ef4444' : '#7f1d1d';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = isHead ? 10 : 2;
          } else if (isHead) {
            ctx.fillStyle = '#4ade80';
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = Math.round(cell * 0.6);
          } else {
            // Gradient green along the body
            const ratio = i / snake.length;
            const g = Math.floor(197 - ratio * 40);
            ctx.fillStyle = `rgb(34, ${g}, 94)`;
            ctx.shadowColor = 'rgba(34, 197, 94, 0.4)';
            ctx.shadowBlur = 4;
          }

          // Rounded rect
          this.roundRect(
            ctx,
            sx + padding,
            sy + padding,
            cell - padding * 2,
            cell - padding * 2,
            cornerRadius
          );
          ctx.fill();

          // If Head, draw eyes
          if (isHead) {
            ctx.shadowBlur = 0;
            const dir = this.engine.direction;
            let e1x, e1y, e2x, e2y;
            const eyeOffset = cell * 0.28;
            const eyeFront = cell * 0.3;
            const eyeSize = Math.max(2, cell * 0.12);

            if (dir === DIR.RIGHT) {
              e1x = sx + cell - eyeFront; e1y = sy + eyeOffset;
              e2x = sx + cell - eyeFront; e2y = sy + cell - eyeOffset;
            } else if (dir === DIR.LEFT) {
              e1x = sx + eyeFront; e1y = sy + eyeOffset;
              e2x = sx + eyeFront; e2y = sy + cell - eyeOffset;
            } else if (dir === DIR.UP) {
              e1x = sx + eyeOffset; e1y = sy + eyeFront;
              e2x = sx + cell - eyeOffset; e2y = sy + eyeFront;
            } else {
              // DOWN
              e1x = sx + eyeOffset; e1y = sy + cell - eyeFront;
              e2x = sx + cell - eyeOffset; e2y = sy + cell - eyeFront;
            }

            // White eye base
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(e1x, e1y, eyeSize, 0, Math.PI * 2);
            ctx.arc(e2x, e2y, eyeSize, 0, Math.PI * 2);
            ctx.fill();

            // Pupil
            ctx.fillStyle = '#05070c';
            ctx.beginPath();
            ctx.arc(e1x, e1y, eyeSize * 0.5, 0, Math.PI * 2);
            ctx.arc(e2x, e2y, eyeSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      ctx.restore();
    }

    roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    updateSoundIcon() {
      if (this.sound.muted) {
        this.dom.soundIconOn.classList.add('hidden');
        this.dom.soundIconOff.classList.remove('hidden');
      } else {
        this.dom.soundIconOn.classList.remove('hidden');
        this.dom.soundIconOff.classList.add('hidden');
      }
    }

    // --- Input & Event Bindings ---
    bindEvents() {
      // 1. Keyboard Controls
      window.addEventListener('keydown', (e) => {
        const key = e.key;

        // Prevent page scroll for gameplay keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
          e.preventDefault();
        }

        // Start / Restart on Enter
        if (key === 'Enter') {
          e.preventDefault();
          if (this.state === 'title' || this.state === 'gameover') {
            this.startGame();
            return;
          }
        }

        // Toggle Fullscreen on 'f' or 'F'
        if (key === 'f' || key === 'F') {
          this.toggleFullscreen();
          return;
        }

        // Pause / Resume on Space or 'p' / 'P' or 'Escape'
        if (key === ' ' || key === 'p' || key === 'P' || key === 'Escape') {
          if (this.state === 'playing' || this.state === 'paused') {
            this.togglePause();
            return;
          }
        }

        // Direction keys
        if (this.state === 'playing') {
          switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
              this.queueDirection(DIR.UP);
              break;
            case 'ArrowDown':
            case 's':
            case 'S':
              this.queueDirection(DIR.DOWN);
              break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
              this.queueDirection(DIR.LEFT);
              break;
            case 'ArrowRight':
            case 'd':
            case 'D':
              this.queueDirection(DIR.RIGHT);
              break;
          }
        }
      });

      // 2. Buttons
      this.dom.startBtn.addEventListener('click', () => this.startGame());
      this.dom.restartBtn.addEventListener('click', () => this.startGame());
      this.dom.resumeBtn.addEventListener('click', () => this.togglePause());
      this.dom.pauseRestartBtn.addEventListener('click', () => this.restartFromPause());
      this.dom.pauseBtn.addEventListener('click', () => this.togglePause());

      if (this.dom.fullscreenBtn) {
        this.dom.fullscreenBtn.addEventListener('click', () => {
          this.sound.playClick();
          this.toggleFullscreen();
        });
      }

      this.dom.soundBtn.addEventListener('click', () => {
        this.sound.toggleMute();
        this.updateSoundIcon();
      });

      // Handle Fullscreen state change
      const onFullscreenChange = () => {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        document.body.classList.toggle('is-fullscreen', isFs);
        if (this.dom.fullscreenIconEnter && this.dom.fullscreenIconExit) {
          this.dom.fullscreenIconEnter.classList.toggle('hidden', isFs);
          this.dom.fullscreenIconExit.classList.toggle('hidden', !isFs);
        }
        setTimeout(() => {
          this.setupCanvasDPI();
          this.draw();
        }, 80);
      };

      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);

      // 3. Mobile On-Screen D-Pad buttons
      const bindDpad = (btn, dir) => {
        const trigger = (e) => {
          if (e.cancelable) e.preventDefault();
          btn.classList.add('pressed');
          this.queueDirection(dir);
        };
        const release = () => {
          btn.classList.remove('pressed');
        };

        btn.addEventListener('pointerdown', trigger);
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointerleave', release);
        btn.addEventListener('pointercancel', release);
      };

      bindDpad(this.dom.btnUp, DIR.UP);
      bindDpad(this.dom.btnDown, DIR.DOWN);
      bindDpad(this.dom.btnLeft, DIR.LEFT);
      bindDpad(this.dom.btnRight, DIR.RIGHT);

      // 4. Touch Gestures on Canvas (Swipe controls)
      let touchStartX = 0;
      let touchStartY = 0;
      const minSwipeDistance = 24;

      this.dom.canvas.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches && e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          }
        },
        { passive: true }
      );

      this.dom.canvas.addEventListener(
        'touchend',
        (e) => {
          if (this.state !== 'playing') return;
          if (!e.changedTouches || e.changedTouches.length === 0) return;

          const touchEndX = e.changedTouches[0].clientX;
          const touchEndY = e.changedTouches[0].clientY;

          const dx = touchEndX - touchStartX;
          const dy = touchEndY - touchStartY;

          if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) {
            return; // Tap, not swipe
          }

          if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (dx > 0) {
              this.queueDirection(DIR.RIGHT);
            } else {
              this.queueDirection(DIR.LEFT);
            }
          } else {
            // Vertical swipe
            if (dy > 0) {
              this.queueDirection(DIR.DOWN);
            } else {
              this.queueDirection(DIR.UP);
            }
          }
        },
        { passive: true }
      );

      // 5. Window Resize & ResizeObserver for dynamic scaling
      window.addEventListener('resize', () => {
        this.setupCanvasDPI();
        this.draw();
      });

      if (typeof ResizeObserver !== 'undefined' && this.dom.canvasContainer) {
        const ro = new ResizeObserver(() => {
          this.setupCanvasDPI();
          this.draw();
        });
        ro.observe(this.dom.canvasContainer);
      }
    }
  }

  // --- Initialize when DOM is ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.__snakeApp = new SnakeGameApp();
    });
  } else {
    window.__snakeApp = new SnakeGameApp();
  }
})();
