# Flappy Kiro — Game Mechanics

Reference for physics, movement, collision boundaries, obstacle spawning, and scoring logic.
All constants referenced here are defined in `config.js`.

---

## Physics — Gravity and Flap

Ghosty uses simple Euler integration. Each frame:

```js
// 1. Apply gravity
vy += GRAVITY * dt

// 2. Clamp to terminal velocity (downward only)
if (vy > TERMINAL_VEL) vy = TERMINAL_VEL

// 3. Integrate position
y += vy * dt
```

On flap input, velocity is overridden unconditionally — no additive impulse:

```js
function flap() {
  vy = FLAP_VELOCITY   // always -520 px/s regardless of current vy
}
```

This means rapid flapping does not stack velocity — each flap resets to the same upward speed. This is intentional and matches the Flappy Bird feel.

### Tuning reference

| Constant | Value | Effect of increasing |
|---|---|---|
| `GRAVITY` | 1800 px/s² | Falls faster, harder game |
| `FLAP_VELOCITY` | -520 px/s | Higher jump, easier game |
| `TERMINAL_VEL` | 900 px/s | Caps dive speed, fairer deaths |
| `DELTA_TIME_CAP` | 0.1 s | Prevents physics explosion on tab blur |

---

## Input Responsiveness

Input is captured asynchronously via event listeners and consumed once per frame:

```js
// Event listeners set a flag — never process input directly in handlers
canvas.addEventListener('keydown', e => { if (e.code === 'Space') flapPending = true })
canvas.addEventListener('mousedown', () => { flapPending = true })
canvas.addEventListener('touchstart', () => { flapPending = true }, { passive: true })

// Consumed at the top of the game loop
function consumeFlap() {
  const result = flapPending
  flapPending = false
  return result
}
```

Rules:
- Always use `{ passive: true }` on `touchstart` to avoid scroll-blocking warnings
- Consume the flap flag at the start of the loop, before any subsystem update
- Never call `flap()` or trigger state transitions directly inside event handlers

---

## Pipe Generation and Scrolling

### Spawn trigger

A new pipe pair spawns when the distance scrolled since the last spawn exceeds `PIPE_INTERVAL`:

```js
distanceSinceLastPipe += PIPE_SPEED * dt
if (distanceSinceLastPipe >= PIPE_INTERVAL) {
  spawnPipe()
  distanceSinceLastPipe -= PIPE_INTERVAL   // subtract, don't reset — preserves remainder
}
```

### Gap position randomisation

The gap top is randomised within safe bounds each spawn:

```js
function randomGapTop(canvasHeight, scoreBarHeight) {
  const min = PIPE_GAP_MIN_Y
  const max = canvasHeight - scoreBarHeight - PIPE_GAP - PIPE_GAP_MIN_Y
  return Math.floor(Math.random() * (max - min + 1)) + min
}
```

This guarantees the gap is always fully reachable — never clipped by the top or score bar.

### Scrolling

All active pipes move left at a constant speed each frame:

```js
for (let i = 0; i < pipePool.length; i++) {
  const p = pipePool[i]
  if (!p.active) continue
  p.x -= PIPE_SPEED * dt
  if (p.x + p.width <= 0) releasePipe(p)
}
```

Use index loops — no `.forEach` or `.map` in the update path.

---

## Collision Detection

### Ghosty hitbox (circle)

```js
const cx = ghosty.x + GHOSTY_WIDTH  / 2
const cy = ghosty.y + GHOSTY_HEIGHT / 2
const r  = GHOSTY_RADIUS   // 18px — intentionally smaller than sprite for fairness
```

### Pipe hitbox (AABB)

Two rectangles per pipe pair:

```js
const topRect    = { x: pipe.x, y: 0,             w: PIPE_WIDTH, h: pipe.gapTop }
const bottomRect = { x: pipe.x, y: pipe.gapBottom, w: PIPE_WIDTH, h: canvasHeight - pipe.gapBottom }
```

### Circle vs. Rect

```js
function circleVsRect(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw))
  const nearestY = Math.max(ry, Math.min(cy, ry + rh))
  const dx = cx - nearestX
  const dy = cy - nearestY
  return dx * dx + dy * dy < r * r   // squared distance — no Math.sqrt needed
}
```

Call twice per pipe pair:

```js
const hit = circleVsRect(cx, cy, r, topRect.x, topRect.y, topRect.w, topRect.h)
         || circleVsRect(cx, cy, r, bottomRect.x, bottomRect.y, bottomRect.w, bottomRect.h)
```

### Ceiling and ground (scalar)

```js
const hitCeiling = cy - r < 0
const hitGround  = cy + r > canvasHeight - SCORE_BAR_HEIGHT
```

No rectangle needed — these are single comparisons.

### Collision check order

Always check in this order each frame:
1. Ceiling
2. Ground
3. Pipes (iterate active pipes only)

Return `true` on the first hit — skip remaining checks.

---

## Scoring

Score increments when Ghosty's horizontal center crosses the horizontal center of a pipe pair:

```js
function updateScore(ghostState, pipes) {
  const ghostCenterX = ghostState.x + GHOSTY_WIDTH / 2
  for (let i = 0; i < pipePool.length; i++) {
    const p = pipePool[i]
    if (!p.active || p.passed) continue
    const pipeCenterX = p.x + PIPE_WIDTH / 2
    if (ghostCenterX >= pipeCenterX) {
      score++
      p.passed = true   // prevents double-counting
    }
  }
}
```

`pipe.passed` is reset to `false` when the pipe is released back to the pool.

### High score persistence

```js
function saveHighScore(score) {
  try {
    localStorage.setItem('flappyKiroHighScore', String(score))
  } catch (e) {
    // SecurityError in private browsing — silently fall back to in-memory only
  }
}

function loadHighScore() {
  try {
    return parseInt(localStorage.getItem('flappyKiroHighScore') ?? '0', 10)
  } catch (e) {
    return 0
  }
}
```

---

## Parallax Cloud System

Two layers scroll at different speeds to simulate depth. Layer 0 is far (slow, small, faint); layer 1 is near (fast, large, opaque).

```js
// Each frame — runs in all game states
for (let l = 0; l < CLOUD_LAYERS.length; l++) {
  const layer = CLOUD_LAYERS[l]
  for (let c = 0; c < layers[l].clouds.length; c++) {
    const cloud = layers[l].clouds[c]
    cloud.x -= layer.speed * dt
    // Wrap when fully off-screen left
    if (cloud.x + cloud.r * 3 * layer.scale <= 0) {
      cloud.x = canvasWidth + cloud.r * layer.scale
    }
  }
}
```

Depth invariant that must always hold:

```
CLOUD_LAYERS[0].speed   < CLOUD_LAYERS[1].speed
CLOUD_LAYERS[0].opacity < CLOUD_LAYERS[1].opacity
CLOUD_LAYERS[0].scale   < CLOUD_LAYERS[1].scale
```

If you add more layers, maintain this ordering — index 0 is always the furthest.

---

## Animation — Ghosty Tilt

Ghosty's sprite can be rotated to tilt with velocity for visual polish:

```js
// Map vy to a tilt angle — clamp to avoid extreme rotation
const tiltAngle = Math.max(-0.4, Math.min(vy / TERMINAL_VEL * 1.2, 1.0))  // radians

ctx.save()
ctx.translate(cx, cy)
ctx.rotate(tiltAngle)
ctx.drawImage(ghostyImg, -GHOSTY_WIDTH / 2, -GHOSTY_HEIGHT / 2, GHOSTY_WIDTH, GHOSTY_HEIGHT)
ctx.restore()
```

This is the only place `ctx.save()` / `ctx.restore()` should be used per-object — it's unavoidable for rotation. Keep it outside any loop if possible by drawing Ghosty as a single call.

---

## Reset Sequence

When transitioning from `GAMEOVER` → `PLAYING`, reset all subsystems in this order:

```js
function transitionToPlaying() {
  physicsEngine.reset()     // y = canvas center, vy = 0
  pipeManager.reset()       // release all pipes, reset distance counter
  scoreManager.reset()      // score = 0, high score preserved
  parallaxSystem.reset()    // redistribute clouds (optional — can skip for continuity)
  state = STATE.PLAYING
}
```

`parallaxSystem.reset()` is optional — leaving clouds in their current positions looks natural.
