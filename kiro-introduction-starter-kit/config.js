// config.js — all tunable constants, grouped by category

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
