// game.js — Flappy Kiro game logic
// Constants are loaded from config.js globals (no imports needed)

// ---------------------------------------------------------------------------
// State enum
// ---------------------------------------------------------------------------
const STATE = { START: 'start', PLAYING: 'playing', GAMEOVER: 'gameover' }

// ---------------------------------------------------------------------------
// InputHandler — keyboard / mouse / touch input
// ---------------------------------------------------------------------------
class InputHandler {
  constructor(canvas) {
    this._flapPending = false
    window.addEventListener('keydown', e => { if (e.code === 'Space') this._flapPending = true })
    canvas.addEventListener('mousedown', () => { this._flapPending = true })
    canvas.addEventListener('touchstart', () => { this._flapPending = true }, { passive: true })
  }

  consumeFlap() {
    const result = this._flapPending
    this._flapPending = false
    return result
  }
}

// ---------------------------------------------------------------------------
// PhysicsEngine — gravity and flap velocity
// ---------------------------------------------------------------------------
class PhysicsEngine {
  // TODO: implement in task 3
}

// ---------------------------------------------------------------------------
// PipeManager — pipe pool, spawning, scrolling
// ---------------------------------------------------------------------------
class PipeManager {
  // TODO: implement in task 4
}

// ---------------------------------------------------------------------------
// ParallaxSystem — cloud layer scrolling
// ---------------------------------------------------------------------------
class ParallaxSystem {
  // TODO: implement in task 8
}

// ---------------------------------------------------------------------------
// CollisionDetector — circle-vs-rect and edge checks
// ---------------------------------------------------------------------------
class CollisionDetector {
  // TODO: implement in task 5
}

// ---------------------------------------------------------------------------
// ScoreManager — score tracking and localStorage
// ---------------------------------------------------------------------------
class ScoreManager {
  // TODO: implement in task 6
}

// ---------------------------------------------------------------------------
// AudioManager — sound effect playback
// ---------------------------------------------------------------------------
class AudioManager {
  // TODO: implement in task 9
}

// ---------------------------------------------------------------------------
// Renderer — all canvas draw calls
// ---------------------------------------------------------------------------
class Renderer {
  // TODO: implement in task 11
}
