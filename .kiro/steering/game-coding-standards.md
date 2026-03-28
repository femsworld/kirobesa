# Flappy Kiro — Game Coding Standards

Coding standards and patterns for the Flappy Kiro vanilla JS browser game.
Apply these guidelines to `config.js`, `game.js`, and `game.test.js`.

---

## File Structure and Load Order

```
index.html      ← canvas element + script tags
config.js       ← all numerical constants (loaded first)
game.js         ← all game logic (reads CONFIG globals)
game.test.js    ← unit + property-based tests
assets/         ← ghosty.png, jump.wav, game_over.wav
```

`index.html` must load scripts in this order:
```html
<script src="config.js"></script>
<script src="game.js"></script>
```

---

## Constants and Configuration

All numerical values live in `config.js` as top-level `const` declarations grouped by category.
No magic numbers in `game.js` — always reference a named constant.

```js
// config.js — grouped by category, one constant per line with unit comment

// Physics
const GRAVITY        = 1800   // px/s²
const FLAP_VELOCITY  = -520   // px/s (upward, negative)
const TERMINAL_VEL   = 900    // px/s (downward cap)
const DELTA_TIME_CAP = 0.1    // seconds

// Pipes
const PIPE_SPEED     = 200    // px/s
const PIPE_INTERVAL  = 300    // px between spawns
const PIPE_WIDTH     = 60     // px
const PIPE_GAP       = 160    // px vertical opening
const PIPE_GAP_MIN_Y = 80     // px from top edge
const PIPE_POOL_SIZE = 10     // pre-allocated pool size

// Ghosty
const GHOSTY_WIDTH   = 48     // px
const GHOSTY_HEIGHT  = 48     // px
const GHOSTY_RADIUS  = 18     // px collision circle radius

// UI
const SCORE_BAR_HEIGHT = 48   // px

// Clouds (array — index 0 = far/slow, index 1 = near/fast)
const CLOUD_LAYERS = [
  { speed: 30,  opacity: 0.25, scale: 0.6 },
  { speed: 70,  opacity: 0.45, scale: 1.0 },
]
```

---

## Class Naming Conventions

| Class | Purpose |
|---|---|
| `InputHandler` | Keyboard / mouse / touch input |
| `PhysicsEngine` | Gravity and flap velocity |
| `PipeManager` | Pipe pool, spawning, scrolling |
| `ParallaxSystem` | Cloud layer scrolling |
| `CollisionDetector` | Circle-vs-rect and edge checks |
| `ScoreManager` | Score tracking and localStorage |
| `AudioManager` | Sound effect playback |
| `Renderer` | All canvas draw calls |

Rules:
- PascalCase for classes, camelCase for instances and methods
- One class per logical subsystem — do not merge responsibilities
- Each class exposes a minimal public interface; keep internals private with `#` or by convention (`_prefix`)

---

## Game Loop Structure

```js
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, DELTA_TIME_CAP)
  lastTime = timestamp

  const flapped = inputHandler.consumeFlap()

  if (state === STATE.PLAYING) {
    if (flapped) { physicsEngine.flap(); audioManager.playJump() }
    physicsEngine.update(dt)
    parallaxSystem.update(dt)
    pipeManager.update(dt)
    if (collisionDetector.check(...)) { transitionToGameOver() }
    scoreManager.update(...)
  } else {
    parallaxSystem.update(dt)   // clouds always scroll
    if (flapped) { transitionToPlaying() }
  }

  renderer.draw(state, ...)
  requestAnimationFrame(gameLoop)
}
```

Rules:
- Always cap `dt` with `DELTA_TIME_CAP` before any physics calculation
- Process input first, then update subsystems, then render — never mix order
- Parallax always updates regardless of game state
- Never call `new` inside the game loop — allocate everything at init time

---

## State Machine

```js
const STATE = { START: 'start', PLAYING: 'playing', GAMEOVER: 'gameover' }
```

Valid transitions only:
- `START` → `PLAYING` on flap
- `PLAYING` → `GAMEOVER` on collision
- `GAMEOVER` → `PLAYING` on flap (full reset of all subsystems)

Each subsystem must implement `reset()` — call all resets together in `transitionToPlaying()`.

---

## Collision Detection

### Ghosty — circular hitbox

```js
const cx = ghosty.x + ghosty.width  / 2
const cy = ghosty.y + ghosty.height / 2
const r  = GHOSTY_RADIUS
```

### Pipes — AABB rectangles

```js
// top pipe
{ x: pipe.x, y: 0,             w: pipe.width, h: pipe.gapTop }
// bottom pipe
{ x: pipe.x, y: pipe.gapBottom, w: pipe.width, h: canvasHeight - pipe.gapBottom }
```

### Circle vs. Rect algorithm

```js
function circleVsRect(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw))
  const nearestY = Math.max(ry, Math.min(cy, ry + rh))
  const dx = cx - nearestX
  const dy = cy - nearestY
  return dx * dx + dy * dy < r * r
}
```

### Ceiling / ground — scalar only

```js
const hitCeiling = cy - r < 0
const hitGround  = cy + r > canvasHeight - SCORE_BAR_HEIGHT
```

---

## Object Pooling (Pipes)

Pre-allocate at startup, never allocate during gameplay:

```js
// init
const pipePool = Array.from({ length: PIPE_POOL_SIZE }, () => ({
  x: 0, gapTop: 0, gapBottom: 0, width: PIPE_WIDTH, passed: false, active: false
}))

function acquirePipe() { return pipePool.find(p => !p.active) ?? null }
function releasePipe(p) { p.active = false }
```

- `getPipes()` returns only `active === true` entries
- `reset()` calls `releasePipe` on all pipes
- Log a warning (don't throw) if `acquirePipe()` returns `null` — increase `PIPE_POOL_SIZE` in config

---

## Canvas Rendering Guidelines

Batch draw calls to minimize context state changes each frame:

1. Fill background (`fillRect` — one call)
2. Draw all clouds — set `globalAlpha` once per layer, draw all clouds in that layer, then move to next layer
3. Draw all pipe bodies — set `fillStyle` once, loop all pipes
4. Draw all pipe caps — set darker `fillStyle` once, loop all pipes
5. Draw Ghosty — single `drawImage` call
6. Draw score bar — set styles once, fill rect + fill text

Rules:
- Never set `fillStyle`, `globalAlpha`, or `font` inside a per-object loop if the value is the same for all objects in that group
- Only use `ctx.save()` / `ctx.restore()` around the full render pass, not inside loops
- Use `ctx.fillRect` for solid shapes; avoid `ctx.beginPath` / `ctx.fill` for rectangles

---

## Memory Management

- No `new` calls inside `gameLoop` or any `update()` method
- No array `.map`, `.filter`, or `.reduce` inside the game loop — mutate in place or use index loops
- Reuse the pipe pool; never `push` new pipe objects after init
- Cloud arrays are fixed-size after `ParallaxSystem` init — wrap in place, don't splice

---

## Performance Target

- 60 FPS via `requestAnimationFrame`
- `deltaTime` capped at `DELTA_TIME_CAP` (0.1s) to survive tab blur/focus
- All subsystem `update()` calls must complete in under 1ms on mid-range hardware
- Avoid `console.log` in the game loop — use it only in init and error paths

---

## Testing Standards

Use **vitest** as the test runner and **fast-check** for property-based tests.

### Property test format

```js
// Feature: flappy-kiro, Property N: <property description>
it('Property N: description', () => {
  fc.assert(fc.property(
    fc.float(), fc.float(),   // arbitraries matching the property inputs
    (a, b) => {
      // assertion
    }
  ), { numRuns: 100 })
})
```

- Minimum 100 runs per property test (`numRuns: 100`)
- Tag every property test with the comment format above for traceability
- Unit tests cover concrete inputs; property tests cover the full input space — both are required
- Mock `localStorage` and `HTMLAudioElement` in tests — never rely on real browser APIs in test files
