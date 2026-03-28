# Implementation Plan: Flappy Kiro

## Overview

Implement a vanilla JS browser-based Flappy Bird-style game using HTML5 Canvas. No build tools — runs by opening `index.html` directly. All constants live in `config.js`; all game logic lives in `game.js`. Tests live in `game.test.js` using fast-check + vitest.

## Tasks

- [x] 1. Scaffold project files and constants
  - Create `index.html` with canvas element, score bar, and script tags loading `config.js` then `game.js`
  - Create `config.js` with all tunable constants grouped by category: Physics, Pipes, Ghosty, UI, Clouds
  - Define `STATE` enum (`START`, `PLAYING`, `GAMEOVER`) in `game.js`
  - _Requirements: 1.1, 9.1_

- [x] 2. Implement InputHandler
  - [x] 2.1 Write `InputHandler` class that listens to `keydown` (Space), `mousedown`, and `touchstart` on the canvas
    - Expose `consumeFlap() → boolean` that returns true once per pending flap and resets the flag
    - _Requirements: 2.1, 2.2, 2.3_
  - [~] 2.2 Write unit tests for InputHandler
    - Test that Space keydown, mousedown, and touchstart each set the flap flag
    - Test that `consumeFlap()` returns true once then false until next event
    - _Requirements: 2.1, 2.2, 2.3_

- [~] 3. Implement PhysicsEngine
  - [ ] 3.1 Write `PhysicsEngine` class with `flap()`, `update(dt)`, `getState()`, and `reset()`
    - `update(dt)`: apply `vy += GRAVITY * dt`, clamp to `TERMINAL_VEL`, then `y += vy * dt`
    - `flap()`: set `vy = FLAP_VELOCITY`
    - `reset()`: restore initial `y` (canvas vertical center) and `vy = 0`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 3.2 Write property test for gravity update (Property 2)
    - **Property 2: Physics gravity update**
    - **Validates: Requirements 3.1, 3.3**
  - [ ]* 3.3 Write property test for flap override (Property 3)
    - **Property 3: Flap overrides velocity**
    - **Validates: Requirements 3.2**
  - [ ]* 3.4 Write property test for terminal velocity clamp (Property 4)
    - **Property 4: Terminal velocity clamp**
    - **Validates: Requirements 3.4**

- [ ] 4. Implement PipeManager with object pooling
  - [ ] 4.1 Write `PipeManager` class with pre-allocated pool of `PIPE_POOL_SIZE` pipe objects
    - Implement `acquirePipe()` and `releasePipe(pipe)` helpers
    - `update(dt)`: scroll all active pipes left by `PIPE_SPEED * dt`, release off-screen pipes, spawn new pair at `PIPE_INTERVAL` pixel intervals
    - Randomize `gapTop` within `[PIPE_GAP_MIN_Y, canvasHeight - scoreBarHeight - PIPE_GAP - PIPE_GAP_MIN_Y]`
    - `getPipes()`: return only pipes where `active === true`
    - `reset()`: release all pipes
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 4.2 Write property test for pipe scrolling and culling (Property 5)
    - **Property 5: Pipe scrolling and culling**
    - **Validates: Requirements 4.3, 4.4**
  - [ ]* 4.3 Write property test for pipe gap bounds (Property 6)
    - **Property 6: Pipe gap bounds**
    - **Validates: Requirements 4.2**

- [ ] 5. Implement CollisionDetector
  - [ ] 5.1 Write `circleVsRect(cx, cy, r, rx, ry, rw, rh)` helper using nearest-point clamping
    - Write `CollisionDetector` class with `check(ghostState, pipes, canvasHeight, scoreBarHeight) → boolean`
    - Check ceiling (`center_y - r < 0`) and ground (`center_y + r > canvasHeight - scoreBarHeight`)
    - Call `circleVsRect` twice per pipe pair (top rect and bottom rect)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 5.2 Write property test for collision detection (Property 7)
    - **Property 7: Collision detection triggers game over**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [ ] 6. Implement ScoreManager
  - [ ] 6.1 Write `ScoreManager` class with `update(ghostState, pipes)`, `getScore()`, `getHighScore()`, `saveHighScore()`, and `reset()`
    - `update`: increment score when ghost's horizontal center crosses pipe center and `pipe.passed === false`; set `pipe.passed = true`
    - `saveHighScore()`: write to `localStorage`, catching `SecurityError` for private browsing
    - `reset()`: zero score, preserve high score
    - Load stored high score from `localStorage` on construction
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 6.2 Write property test for score increment (Property 8)
    - **Property 8: Score increments on pipe pass**
    - **Validates: Requirements 6.1**
  - [ ]* 6.3 Write property test for high score persistence (Property 9)
    - **Property 9: High score persistence**
    - **Validates: Requirements 6.3**
  - [ ]* 6.4 Write unit tests for ScoreManager
    - Test `reset()` zeroes score but preserves high score
    - Test `localStorage` unavailable fallback (mock `SecurityError`)
    - _Requirements: 6.3, 6.4_

- [ ] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement ParallaxSystem
  - [ ] 8.1 Write `ParallaxSystem` class that initializes two `CloudLayer` objects from `CLOUD_LAYERS` config
    - Each layer holds an array of `Cloud` objects distributed across the canvas width at init
    - `update(dt, isPlaying)`: scroll all clouds left by `layer.speed * dt`; wrap any cloud whose `x + effectiveWidth <= 0` to `x >= canvasWidth`
    - `getLayers()`: return all layers
    - `reset()`: redistribute clouds to initial positions
    - Always scroll regardless of game state
    - _Requirements: 11.1, 11.3, 11.5, 11.6_
  - [ ]* 8.2 Write property test for cloud depth ordering (Property 11)
    - **Property 11: Cloud layer depth ordering**
    - **Validates: Requirements 11.3, 11.4**
  - [ ]* 8.3 Write property test for cloud wrapping (Property 12)
    - **Property 12: Cloud wrapping**
    - **Validates: Requirements 11.5**
  - [ ]* 8.4 Write property test for clouds scrolling in all states (Property 13)
    - **Property 13: Clouds scroll in all states**
    - **Validates: Requirements 11.3, 11.6**

- [ ] 9. Implement AudioManager
  - [ ] 9.1 Write `AudioManager` class that loads `jump.wav` and `game_over.wav` via `HTMLAudioElement`
    - Implement Web Audio unlock pattern: defer playback until first user gesture
    - `playJump()`: play jump sound (reset `currentTime` to allow rapid replays)
    - `playGameOver()`: play game over sound
    - Log warning and continue silently on load failure
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 9.2 Write unit tests for AudioManager
    - Test `playJump()` calls `play()` on the correct audio element
    - Test `playGameOver()` calls `play()` on the correct audio element
    - _Requirements: 8.1, 8.2_

- [ ] 10. Implement asset loader
  - [ ] 10.1 Write `loadAssets()` function that returns a Promise resolving when `ghosty.png` is loaded
    - Fall back to drawing a colored rectangle if the image fails to load
    - _Requirements: 9.2_
  - [ ]* 10.2 Write unit tests for asset loader
    - Test that the promise resolves on successful load
    - Test that the promise resolves (with fallback flag) on load error
    - _Requirements: 9.2_

- [ ] 11. Implement Renderer
  - [ ] 11.1 Write `Renderer` class with `drawStartScreen`, `drawPlayFrame`, and `drawGameOver` methods
    - `drawStartScreen`: fill light-blue background, draw clouds, draw Ghosty sprite (or fallback rect), draw score bar, draw "Press Space / Tap to Start" prompt
    - `drawPlayFrame`: fill background, draw clouds (grouped by layer for single-pass alpha), draw pipes (body pass then cap pass), draw Ghosty, draw score bar with live score and high score
    - `drawGameOver`: draw play frame frozen state, overlay "Game Over" message, final score, and "Press Space / Tap to Restart" prompt
    - Score bar is a distinct strip at the bottom with contrasting background
    - Pipes: green fill body, darker green rectangular cap on gap-facing end
    - _Requirements: 1.1, 4.5, 7.1, 7.2, 9.1, 9.2, 9.3, 9.4, 11.1, 11.2, 11.4_
  - [ ]* 11.2 Write unit tests for Renderer
    - Test start screen render includes "Press Space / Tap to Start" text call
    - Test game over render includes "Game Over" text call
    - _Requirements: 1.1, 7.1, 7.2_

- [ ] 12. Implement game loop and state machine
  - [ ] 12.1 Wire all subsystems into the main game loop in `game.js`
    - Initialize all subsystems after assets load
    - `requestAnimationFrame` loop: compute `dt = Math.min((now - lastTime) / 1000, DELTA_TIME_CAP)`, process `inputHandler.consumeFlap()`
    - State transitions: `START` → `PLAYING` on flap; `PLAYING` → `GAMEOVER` on collision (play game over sound, save high score); `GAMEOVER` → `PLAYING` on flap (reset all subsystems)
    - During `PLAYING`: update physics, parallax, pipes, collision, score; play jump sound on flap
    - During `START` or `GAMEOVER`: update parallax only
    - Dispatch to correct renderer method based on state
    - _Requirements: 1.1, 2.4, 2.5, 3.1, 6.2, 7.3, 8.1, 8.2, 11.6_
  - [ ]* 12.2 Write property test for state transitions (Property 1)
    - **Property 1: State transition on flap**
    - **Validates: Requirements 2.4, 2.5**
  - [ ]* 12.3 Write property test for frozen game over state (Property 10)
    - **Property 10: Frozen state in game over**
    - **Validates: Requirements 7.3**

- [ ] 13. Implement responsive canvas resize
  - [ ] 13.1 Add `window.resize` handler that sets `canvas.width` and `canvas.height` to `window.innerWidth` / `window.innerHeight`
    - Recalculate `scoreBarHeight`, pipe spawn bounds, and Ghosty initial `x` position after resize
    - Guard against zero dimensions: skip recalculation if `w === 0 || h === 0`
    - _Requirements: 10.1, 10.2_
  - [ ]* 13.2 Write unit tests for canvas resize
    - Test that resize handler updates `canvas.width` and `canvas.height` to match window dimensions
    - _Requirements: 10.1_
  - [ ]* 13.3 Write property test for layout proportionality on resize (Property 14)
    - **Property 14: Layout proportionality on resize**
    - **Validates: Requirements 10.2**

- [ ] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with a minimum of 100 iterations each
- Each property test must include the comment tag: `// Feature: flappy-kiro, Property N: <property_text>`
- Unit tests and property tests are complementary — both are needed for full coverage
