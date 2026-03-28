# Design Document: Flappy Kiro

## Overview

Flappy Kiro is a single-file (or minimal-file) browser-based HTML5 Canvas game implemented in vanilla JavaScript. No build tools or frameworks are required — the game runs by opening `index.html` directly in a browser.

The architecture follows a classic game-loop pattern: a fixed `requestAnimationFrame` loop drives physics updates, input processing, collision detection, scoring, and rendering each frame. Game state is modeled as a simple enum (`start`, `playing`, `gameover`) that gates which subsystems are active.

Assets are loaded at startup from the `assets/` directory. The canvas is sized to the browser viewport and re-sized on `window.resize`.

```mermaid
flowchart TD
    A[Browser loads index.html] --> B[Asset Loader]
    B --> C[Game Init]
    C --> D{Game Loop - rAF}
    D --> E[Input Handler]
    E --> F{State?}
    F -- start --> G[Render Start Screen]
    F -- playing --> H[Physics Engine]
    H --> I[Parallax System]
    I --> J[Pipe Manager]
    J --> K[Collision Detector]
    K --> L[Score Manager]
    L --> M[Renderer]
    F -- gameover --> N[Render Game Over]
    M --> D
    G --> D
    N --> D
```

---

## Architecture

### Game Loop

The main loop runs via `requestAnimationFrame`. Each tick:

1. Compute `deltaTime` (capped to avoid spiral-of-death on tab blur)
2. Process pending input events
3. If `playing`: update physics, parallax, pipes, collision, score
4. Render the current frame

### State Machine

```mermaid
stateDiagram-v2
    [*] --> start
    start --> playing : flap action
    playing --> gameover : collision detected
    gameover --> playing : flap action (reset)
```

### Subsystem Responsibilities

| Subsystem | Responsibility |
|---|---|
| InputHandler | Captures Space/click/touch, emits flap events |
| PhysicsEngine | Applies gravity + flap velocity to Ghosty |
| PipeManager | Spawns, scrolls, and culls pipe pairs |
| ParallaxSystem | Manages cloud layers at varying speeds/opacities |
| CollisionDetector | AABB overlap checks between Ghosty and pipes/edges |
| ScoreManager | Tracks current score, updates and persists high score |
| AudioManager | Loads and plays jump.wav / game_over.wav |
| Renderer | Draws all visual elements to the canvas each frame |

---

## Components and Interfaces

### InputHandler

```js
// Listens to keydown (Space), mousedown, touchstart on canvas
// Sets a pending flap flag consumed once per frame
inputHandler.consumeFlap() → boolean
```

### PhysicsEngine

```js
physicsEngine.flap()                    // sets vy = FLAP_VELOCITY
physicsEngine.update(dt)               // vy += GRAVITY * dt; y += vy * dt; clamp vy
physicsEngine.getState() → { x, y, vy }
physicsEngine.reset()
```

### PipeManager

```js
pipeManager.update(dt)                 // scroll pipes left, cull off-screen, spawn new
pipeManager.getPipes() → Pipe[]        // array of active pipe pairs
pipeManager.reset()
```

### ParallaxSystem

```js
parallaxSystem.update(dt, isPlaying)   // scroll each layer; always runs (even on start/gameover)
parallaxSystem.getLayers() → CloudLayer[]
parallaxSystem.reset()
```

### CollisionDetector

```js
collisionDetector.check(ghostState, pipes, canvasHeight, scoreBarHeight) → boolean
```

### ScoreManager

```js
scoreManager.update(ghostState, pipes) // increments score when ghost passes pipe center
scoreManager.getScore() → number
scoreManager.getHighScore() → number
scoreManager.saveHighScore()           // persists to localStorage
scoreManager.reset()
```

### AudioManager

```js
audioManager.playJump()
audioManager.playGameOver()
// Defers playback until first user gesture (Web Audio unlock pattern)
```

### Renderer

```js
renderer.drawStartScreen(ghostState, score, highScore)
renderer.drawPlayFrame(ghostState, pipes, clouds, score, highScore)
renderer.drawGameOver(score, highScore)
// All draw calls happen on a single 2D canvas context
```

---

## Data Models

### GameState (enum)

```js
const STATE = { START: 'start', PLAYING: 'playing', GAMEOVER: 'gameover' }
```

### GhostyState

```js
{
  x: number,       // fixed horizontal position (canvas center-left)
  y: number,       // vertical position (top of sprite)
  vy: number,      // vertical velocity (positive = downward)
  width: number,   // sprite render width
  height: number   // sprite render height
}
```

### Pipe

```js
{
  x: number,       // left edge of pipe column
  gapTop: number,  // y coordinate of top of gap
  gapBottom: number, // y coordinate of bottom of gap
  width: number,   // pipe column width
  passed: boolean  // true once Ghosty's center has crossed pipe center
}
```

### CloudLayer

```js
{
  speed: number,    // pixels per second scroll speed
  opacity: number,  // 0–1 fill opacity
  scale: number,    // relative size multiplier
  clouds: Cloud[]   // individual cloud shapes in this layer
}
```

### Cloud

```js
{
  x: number,   // left edge
  y: number,   // top edge
  r: number    // base radius for the puff circles
}
```

### Constants (tunable)

```js
const GRAVITY          = 1800   // px/s²
const FLAP_VELOCITY    = -520   // px/s (upward)
const TERMINAL_VEL     = 900    // px/s (downward cap)
const PIPE_SPEED       = 200    // px/s
const PIPE_INTERVAL    = 300    // px scrolled between spawns
const PIPE_WIDTH       = 60     // px
const PIPE_GAP         = 160    // px vertical gap height
const PIPE_GAP_MIN_Y   = 80     // px from top (min gap top)
const GHOSTY_WIDTH     = 48     // px
const GHOSTY_HEIGHT    = 48     // px
const SCORE_BAR_HEIGHT = 48     // px
const CLOUD_LAYERS     = [
  { speed: 30,  opacity: 0.25, scale: 0.6 },  // far/slow
  { speed: 70,  opacity: 0.45, scale: 1.0 },  // near/fast
]
```


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: State transition on flap

*For any* game in the `start` or `gameover` state, triggering a flap action should transition the game to the `playing` state.

**Validates: Requirements 2.4, 2.5**

---

### Property 2: Physics gravity update

*For any* initial vertical velocity `vy` and time delta `dt`, after one physics update the new velocity should equal `vy + GRAVITY * dt` (clamped to TERMINAL_VEL), and the new position should equal `old_y + new_vy * dt`.

**Validates: Requirements 3.1, 3.3**

---

### Property 3: Flap overrides velocity

*For any* current vertical velocity value, calling `flap()` should always result in `vy === FLAP_VELOCITY`, regardless of the previous velocity.

**Validates: Requirements 3.2**

---

### Property 4: Terminal velocity clamp

*For any* downward velocity exceeding `TERMINAL_VEL`, after a physics update the resulting velocity should be clamped to exactly `TERMINAL_VEL`.

**Validates: Requirements 3.4**

---

### Property 5: Pipe scrolling and culling

*For any* active pipe and time delta `dt`, after `pipeManager.update(dt)` the pipe's `x` should decrease by `PIPE_SPEED * dt`. Furthermore, any pipe whose `x + width <= 0` should no longer appear in `getPipes()` after the update.

**Validates: Requirements 4.3, 4.4**

---

### Property 6: Pipe gap bounds

*For any* spawned pipe pair given a canvas height `h` and score bar height `s`, the gap top position should satisfy `PIPE_GAP_MIN_Y <= gapTop <= h - s - PIPE_GAP - PIPE_GAP_MIN_Y`, ensuring the gap is always reachable.

**Validates: Requirements 4.2**

---

### Property 7: Collision detection triggers game over

*For any* Ghosty bounding box and pipe configuration where the boxes overlap, or where Ghosty's bounding box exceeds the canvas top or score bar bottom, `collisionDetector.check()` should return `true` and the game should transition to `gameover`.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

---

### Property 8: Score increments on pipe pass

*For any* pipe that Ghosty's horizontal center crosses during active play, the score should increase by exactly 1, and the `passed` flag on that pipe should be set to prevent double-counting.

**Validates: Requirements 6.1**

---

### Property 9: High score persistence

*For any* final score that exceeds the current high score, after the game transitions to `gameover`, `localStorage` should contain the new score as the high score.

**Validates: Requirements 6.3**

---

### Property 10: Frozen state in game over

*For any* game in the `gameover` state, calling the update loop should not change pipe positions, Ghosty's physics state, or the score.

**Validates: Requirements 7.3**

---

### Property 11: Cloud layer depth ordering

*For any* two cloud layers where layer A represents greater distance than layer B, layer A's `speed` and `opacity` and `scale` should all be strictly less than layer B's corresponding values.

**Validates: Requirements 11.3, 11.4**

---

### Property 12: Cloud wrapping

*For any* cloud whose `x + effectiveWidth <= 0` after a parallax update, the cloud should be repositioned to `x >= canvasWidth`, maintaining continuous scrolling.

**Validates: Requirements 11.5**

---

### Property 13: Clouds scroll in all states

*For any* game state (start, playing, or gameover), calling `parallaxSystem.update(dt)` should change cloud positions by the expected amount for each layer's speed.

**Validates: Requirements 11.3, 11.6**

---

### Property 14: Layout proportionality on resize

*For any* canvas dimensions `(w, h)`, layout-dependent values (score bar height, pipe gap min/max bounds) should be recalculated proportionally such that the game remains playable at any reasonable resolution.

**Validates: Requirements 10.2**

---

## Error Handling

| Scenario | Handling |
|---|---|
| Asset load failure (ghosty.png, .wav) | Log warning; fall back to colored rectangle for sprite, silent for audio |
| localStorage unavailable (private browsing) | Catch `SecurityError`; treat high score as session-only (in-memory) |
| `requestAnimationFrame` not available | Not supported; game requires a modern browser |
| Canvas 2D context unavailable | Display a static error message in the page body |
| Resize to zero dimensions | Guard against division-by-zero in layout recalculation; skip resize if `w === 0 || h === 0` |
| Tab blur / visibility change | Cap `deltaTime` to 100ms to prevent physics explosion on tab return |

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests catch concrete bugs at specific inputs and integration points
- Property tests verify universal correctness across the full input space

### Unit Tests

Focus on:
- Asset loader resolves/rejects correctly
- `InputHandler` emits flap on Space, click, and touch events
- `AudioManager` calls `play()` on the correct audio element
- `ScoreManager.reset()` zeroes score but preserves high score
- Start screen and game over screen render calls include expected text content
- Canvas resize updates `canvas.width` and `canvas.height` to match window

### Property-Based Tests

Use **fast-check** (JavaScript property-based testing library).

Each property test must run a minimum of **100 iterations**.

Each test must include a comment tag in the format:
`// Feature: flappy-kiro, Property N: <property_text>`

| Property | Test Description |
|---|---|
| Property 1 | For random non-playing states, flap transitions to playing |
| Property 2 | For random (vy, dt) pairs, physics update produces correct y and vy |
| Property 3 | For random vy values, flap() always sets vy to FLAP_VELOCITY |
| Property 4 | For random vy > TERMINAL_VEL, update clamps to TERMINAL_VEL |
| Property 5 | For random pipes and dt, x decreases correctly; off-screen pipes are culled |
| Property 6 | For random canvas heights, spawned pipe gapTop is always within bounds |
| Property 7 | For random overlapping/non-overlapping bounding boxes, collision check is correct |
| Property 8 | For random pipe positions and ghost x values, score increments exactly once per pipe |
| Property 9 | For random (score, highScore) pairs where score > highScore, localStorage is updated |
| Property 10 | For random gameover states and dt values, update produces no state changes |
| Property 11 | For any generated layer config, depth ordering invariants hold |
| Property 12 | For random cloud positions and canvas widths, off-screen clouds wrap correctly |
| Property 13 | For random dt and any game state, cloud positions change by speed * dt |
| Property 14 | For random canvas dimensions, layout values remain proportional and in-bounds |

### Test File Structure

```
index.html          ← game entry point
game.js             ← all game logic
game.test.js        ← unit + property tests (using fast-check + vitest or jest)
```
