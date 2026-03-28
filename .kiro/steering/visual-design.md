# Flappy Kiro — Visual Design

Rendering patterns, animation guidelines, and audio-visual feedback for Flappy Kiro.
All draw calls happen on a single `CanvasRenderingContext2D` in `game.js`.

---

## Colour Palette

| Element | Colour | Usage |
|---|---|---|
| Background | `#a8d8ea` | Canvas fill each frame |
| Pipe body | `#4caf50` | Pipe column fill |
| Pipe cap | `#388e3c` | Darker cap on gap-facing end |
| Score bar | `#37474f` | Bottom strip background |
| Score text | `#ffffff` | Score and high score labels |
| Cloud fill | `rgba(255,255,255,opacity)` | Semi-transparent white, opacity per layer |
| Overlay bg | `rgba(0,0,0,0.35)` | Game over / start screen dim |
| Overlay text | `#ffffff` | Prompt and title text |

---

## Draw Order (every frame)

Always draw in this exact order — later draws appear on top:

1. Background fill
2. Far cloud layer (low opacity)
3. Near cloud layer (higher opacity)
4. Pipe bodies (all pipes, one fill style)
5. Pipe caps (all pipes, darker fill style)
6. Ghosty sprite (single `drawImage`, with tilt rotation)
7. Score bar strip + text
8. State overlay (start prompt / game over panel) — only when not `PLAYING`

Never reorder these layers. Ghosty must always appear in front of pipes and clouds.

---

## Background

Fill the entire canvas once per frame before drawing anything else:

```js
ctx.fillStyle = '#a8d8ea'
ctx.fillRect(0, 0, canvas.width, canvas.height)
```

No image asset needed — solid colour is intentional for the retro style.

---

## Cloud Rendering

Clouds are drawn as overlapping circles to form a puff shape. Set `globalAlpha` once per layer:

```js
for (let l = 0; l < layers.length; l++) {
  const layer = CLOUD_LAYERS[l]
  ctx.globalAlpha = layer.opacity
  ctx.fillStyle = '#ffffff'

  for (let c = 0; c < layers[l].clouds.length; c++) {
    const cloud = layers[l].clouds[c]
    const r = cloud.r * layer.scale
    // Three overlapping circles form one cloud puff
    ctx.beginPath(); ctx.arc(cloud.x,         cloud.y, r,        0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cloud.x + r,     cloud.y - r * 0.4, r * 0.75, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cloud.x + r * 1.6, cloud.y, r * 0.6, 0, Math.PI * 2); ctx.fill()
  }
}
ctx.globalAlpha = 1.0   // always reset after cloud pass
```

Clouds use `arc` + `fill` (not `fillRect`) — this is the one exception to the fillRect preference rule, because circles require path drawing.

---

## Pipe Rendering

Two passes — body first, then caps — to avoid setting `fillStyle` per pipe:

```js
// Pass 1: pipe bodies
ctx.fillStyle = '#4caf50'
for (let i = 0; i < pipePool.length; i++) {
  const p = pipePool[i]
  if (!p.active) continue
  ctx.fillRect(p.x, 0, PIPE_WIDTH, p.gapTop)                          // top pipe body
  ctx.fillRect(p.x, p.gapBottom, PIPE_WIDTH, canvasHeight - p.gapBottom) // bottom pipe body
}

// Pass 2: caps (darker, slightly wider, on the gap-facing end)
const CAP_HEIGHT = 16
const CAP_OVERHANG = 4   // px wider each side
ctx.fillStyle = '#388e3c'
for (let i = 0; i < pipePool.length; i++) {
  const p = pipePool[i]
  if (!p.active) continue
  ctx.fillRect(p.x - CAP_OVERHANG, p.gapTop - CAP_HEIGHT, PIPE_WIDTH + CAP_OVERHANG * 2, CAP_HEIGHT)   // top cap
  ctx.fillRect(p.x - CAP_OVERHANG, p.gapBottom,           PIPE_WIDTH + CAP_OVERHANG * 2, CAP_HEIGHT)   // bottom cap
}
```

`CAP_HEIGHT` and `CAP_OVERHANG` can be added to `config.js` if you want to tune them.

---

## Ghosty Sprite Rendering

Ghosty is drawn with a velocity-based tilt. This is the only per-object `ctx.save/restore`:

```js
const cx = ghosty.x + GHOSTY_WIDTH  / 2
const cy = ghosty.y + GHOSTY_HEIGHT / 2
const tiltAngle = Math.max(-0.4, Math.min(ghosty.vy / TERMINAL_VEL * 1.2, 1.0))

ctx.save()
ctx.translate(cx, cy)
ctx.rotate(tiltAngle)
if (ghostyImg.complete && ghostyImg.naturalWidth > 0) {
  ctx.drawImage(ghostyImg, -GHOSTY_WIDTH / 2, -GHOSTY_HEIGHT / 2, GHOSTY_WIDTH, GHOSTY_HEIGHT)
} else {
  // Fallback: white rounded rectangle
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(-GHOSTY_WIDTH / 2, -GHOSTY_HEIGHT / 2, GHOSTY_WIDTH, GHOSTY_HEIGHT)
}
ctx.restore()
```

Tilt range: `-0.4 rad` (nose up, flapping) to `1.0 rad` (nose down, diving).

---

## Score Bar

Drawn last among game elements, always on top of gameplay visuals:

```js
const barY = canvas.height - SCORE_BAR_HEIGHT
ctx.fillStyle = '#37474f'
ctx.fillRect(0, barY, canvas.width, SCORE_BAR_HEIGHT)

ctx.fillStyle = '#ffffff'
ctx.font = 'bold 20px monospace'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText(`Score: ${score} | High: ${highScore}`, canvas.width / 2, barY + SCORE_BAR_HEIGHT / 2)
```

Set `font`, `textAlign`, and `textBaseline` once — don't repeat per text call if drawing multiple labels in the same pass.

---

## Start Screen Overlay

```js
ctx.fillStyle = 'rgba(0,0,0,0.35)'
ctx.fillRect(0, 0, canvas.width, canvas.height - SCORE_BAR_HEIGHT)

ctx.fillStyle = '#ffffff'
ctx.font = 'bold 36px monospace'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('Flappy Kiro', canvas.width / 2, canvas.height * 0.35)

ctx.font = '20px monospace'
ctx.fillText('Press Space / Tap to Start', canvas.width / 2, canvas.height * 0.55)
```

---

## Game Over Overlay

Draw the frozen play frame first (pipes, Ghosty, clouds stay visible), then overlay:

```js
ctx.fillStyle = 'rgba(0,0,0,0.45)'
ctx.fillRect(0, 0, canvas.width, canvas.height - SCORE_BAR_HEIGHT)

ctx.fillStyle = '#ffffff'
ctx.font = 'bold 40px monospace'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('Game Over', canvas.width / 2, canvas.height * 0.38)

ctx.font = '24px monospace'
ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height * 0.50)

ctx.font = '18px monospace'
ctx.fillText('Press Space / Tap to Restart', canvas.width / 2, canvas.height * 0.62)
```

---

## Screen Shake (optional polish)

On collision, apply a brief canvas translation to simulate impact:

```js
// State: shakeFrames (count down from ~8), shakeMagnitude (start ~6px, decay)
if (shakeFrames > 0) {
  const dx = (Math.random() - 0.5) * shakeMagnitude
  const dy = (Math.random() - 0.5) * shakeMagnitude
  ctx.save()
  ctx.translate(dx, dy)
  // ... draw everything ...
  ctx.restore()
  shakeFrames--
  shakeMagnitude *= 0.75   // exponential decay
}
```

Trigger on `transitionToGameOver()`. Keep magnitude small (max 6–8px) — subtle is better.

---

## Audio Integration

Sound effects are fire-and-forget. Reset `currentTime` before `play()` to allow rapid re-triggering:

```js
function playJump() {
  jumpAudio.currentTime = 0
  jumpAudio.play().catch(() => {})   // swallow NotAllowedError before user gesture
}

function playGameOver() {
  gameOverAudio.currentTime = 0
  gameOverAudio.play().catch(() => {})
}
```

Web Audio unlock — call this once on the first user gesture to unblock audio on mobile:

```js
let audioUnlocked = false
function unlockAudio() {
  if (audioUnlocked) return
  // Play and immediately pause a silent buffer to satisfy autoplay policy
  jumpAudio.play().then(() => { jumpAudio.pause(); jumpAudio.currentTime = 0 }).catch(() => {})
  audioUnlocked = true
}
// Attach to the same input listeners as flap
canvas.addEventListener('mousedown', unlockAudio)
canvas.addEventListener('touchstart', unlockAudio, { passive: true })
```

---

## Font and Text Rules

- Always use `monospace` — it fits the retro aesthetic and is universally available
- Set `textAlign = 'center'` and `textBaseline = 'middle'` once before a text pass, not per call
- Use `bold` weight for titles and scores; normal weight for prompts
- Minimum font size: 16px for readability at small canvas sizes

---

## Asset Fallbacks

If `ghosty.png` fails to load, draw a white rounded rectangle of the same dimensions.
If audio fails to load, log a warning and continue — never block gameplay on audio errors.

```js
ghostyImg.onerror = () => { ghostyImgFailed = true }
// In renderer:
if (ghostyImgFailed) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(ghosty.x, ghosty.y, GHOSTY_WIDTH, GHOSTY_HEIGHT)
}
```
