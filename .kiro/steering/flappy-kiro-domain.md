# Flappy Kiro — Domain Rules

Game state management, session lifecycle, scoring, difficulty progression, and Ghosty behaviour.
This file captures domain-level rules that cut across subsystems.

---

## Game States

Three states gate all subsystem activity:

```js
const STATE = { START: 'start', PLAYING: 'playing', GAMEOVER: 'gameover' }
```

| State | Active subsystems | Clouds scroll | Pipes move | Physics runs |
|---|---|---|---|---|
| `START` | InputHandler, ParallaxSystem, Renderer | yes | no | no |
| `PLAYING` | all | yes | yes | yes |
| `GAMEOVER` | InputHandler, ParallaxSystem, Renderer | yes | no | no |

### Transition rules

- `START` → `PLAYING`: triggered by any flap input. Call `transitionToPlaying()`.
- `PLAYING` → `GAMEOVER`: triggered by collision. Call `transitionToGameOver()`.
- `GAMEOVER` → `PLAYING`: triggered by any flap input. Call `transitionToPlaying()`.

No other transitions are valid. Never set `state` directly outside the two transition functions.

### transitionToPlaying()

```js
function transitionToPlaying() {
  physicsEngine.reset()
  pipeManager.reset()
  scoreManager.reset()
  // parallaxSystem.reset() is optional — clouds can continue from current position
  state = STATE.PLAYING
}
```

### transitionToGameOver()

```js
function transitionToGameOver() {
  scoreManager.saveHighScore()
  audioManager.playGameOver()
  // trigger screen shake if implemented
  state = STATE.GAMEOVER
}
```

Always save the high score and play the sound in `transitionToGameOver()` — never elsewhere.

---

## Session Lifecycle

```
Page load
  → loadAssets()          // load ghosty.png, jump.wav, game_over.wav
  → initSubsystems()      // construct all subsystem instances
  → loadHighScore()       // read from localStorage
  → state = STATE.START
  → requestAnimationFrame(gameLoop)
```

On every restart (`GAMEOVER` → `PLAYING`):
- Score resets to 0
- High score is preserved (in memory and localStorage)
- Pipes are all released back to pool
- Ghosty returns to vertical center, `vy = 0`
- Pipe spawn distance counter resets to 0

---

## Scoring Rules

- Score increments by exactly 1 each time Ghosty's horizontal center passes a pipe's horizontal center
- Each pipe has a `passed` flag — set to `true` on score increment, prevents double-counting
- `passed` resets to `false` when the pipe is released back to the pool
- High score updates only when `score > highScore` at game over — never mid-game
- High score persists to `localStorage` key `'flappyKiroHighScore'`
- If `localStorage` is unavailable (private browsing), high score is session-only (in-memory)

---

## Obstacle Generation Rules

### Spawn interval

A new pipe pair spawns when accumulated scroll distance exceeds `PIPE_INTERVAL`:

```js
distanceSinceLastPipe += PIPE_SPEED * dt
if (distanceSinceLastPipe >= PIPE_INTERVAL) {
  spawnPipe()
  distanceSinceLastPipe -= PIPE_INTERVAL   // preserve remainder — don't reset to 0
}
```

Subtracting (not resetting) keeps spawn timing consistent regardless of frame rate variation.

### Gap position bounds

Gap top must always satisfy:

```
PIPE_GAP_MIN_Y  <=  gapTop  <=  canvasHeight - scoreBarHeight - PIPE_GAP - PIPE_GAP_MIN_Y
```

This guarantees the gap is never clipped by the top edge or the score bar. If the canvas is too small to satisfy this constraint (e.g. extreme resize), clamp `gapTop` to the midpoint rather than spawning an unreachable gap.

### Gap bottom

Always derived from gap top — never stored independently:

```js
pipe.gapBottom = pipe.gapTop + PIPE_GAP
```

---

## Difficulty Progression (optional)

The base spec uses constant speed. If progressive difficulty is added, follow these rules:

- Increase `PIPE_SPEED` gradually as score increases — never decrease it mid-session
- Decrease `PIPE_INTERVAL` gradually to spawn pipes closer together at higher scores
- Never change `PIPE_GAP` — gap size stays constant to keep the game fair
- Apply speed changes only at pipe spawn time, not mid-scroll (avoids visual lurching)
- Cap maximum speed to prevent the game becoming physically impossible

Example progression curve (if implemented):

```js
function currentPipeSpeed(score) {
  return Math.min(PIPE_SPEED + score * 2, PIPE_SPEED * 1.8)   // max 80% faster
}
```

All progression constants belong in `config.js`.

---

## Ghosty Behaviour Rules

- Ghosty's horizontal position (`x`) is fixed — it never moves left or right
- Only vertical position (`y`) and velocity (`vy`) change during play
- Ghosty is always visible — never hidden, even on start screen or game over
- On start screen, Ghosty hovers at vertical center with `vy = 0` (no gravity applied)
- On game over, Ghosty freezes at its final position — no further physics updates
- Ghosty's collision shape is a circle, not its sprite bounding box — the hitbox is intentionally smaller than the sprite for player fairness

### Ghosty initial position

```js
ghosty.x = canvas.width * 0.25    // fixed at 25% from left
ghosty.y = (canvas.height - SCORE_BAR_HEIGHT) / 2 - GHOSTY_HEIGHT / 2   // vertical center
ghosty.vy = 0
```

Recalculate on canvas resize.

---

## Collision Response

On collision detection returning `true`:

1. Freeze physics — stop calling `physicsEngine.update(dt)`
2. Freeze pipes — stop calling `pipeManager.update(dt)`
3. Freeze score — stop calling `scoreManager.update()`
4. Call `transitionToGameOver()` — this saves high score and plays sound
5. Render the frozen frame with game over overlay on top

Do not move Ghosty to a "death position" — freeze in place. Do not play the jump sound on the frame of collision.

---

## High Score Persistence

```js
const HS_KEY = 'flappyKiroHighScore'

function loadHighScore() {
  try { return parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) }
  catch (e) { return 0 }
}

function saveHighScore(score) {
  try { localStorage.setItem(HS_KEY, String(score)) }
  catch (e) { /* private browsing — in-memory only */ }
}
```

- Load once at startup, store in `ScoreManager`
- Save only on `transitionToGameOver()` when `score > highScore`
- Never save on restart or mid-game

---

## Restart Behaviour

On restart (flap in `GAMEOVER` state):

1. All pipes released to pool (`active = false`, `passed = false`)
2. Pipe spawn distance counter reset to 0
3. Score reset to 0 — high score unchanged
4. Ghosty position and velocity reset
5. State set to `PLAYING`
6. Clouds continue scrolling from current position (no visual jump)
7. First pipe spawns after `PIPE_INTERVAL` pixels of scroll — same as a fresh start

The restart must feel instant — no delay, no fade, no animation between game over and playing.

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Canvas too small for valid gap bounds | Clamp `gapTop` to midpoint; log warning |
| Pipe pool exhausted (`acquirePipe` returns null) | Log warning, skip spawn — don't throw |
| Score overflows (very long session) | `Number.MAX_SAFE_INTEGER` is ~9 quadrillion — not a practical concern |
| Flap input during asset loading | Ignore — game loop hasn't started yet |
| Multiple collisions in one frame | First collision wins — `transitionToGameOver()` sets state, subsequent checks are skipped |
