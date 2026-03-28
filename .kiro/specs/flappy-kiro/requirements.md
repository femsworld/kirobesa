# Requirements Document

## Introduction

Flappy Kiro is a browser-based, Flappy Bird-style endless scroller game. The player controls a ghost character (Ghosty) that falls under gravity and flaps upward on player input. Pipes scroll from right to left, and the player must guide Ghosty through the gaps. The game ends on collision with a pipe or screen edge. Score increments as Ghosty passes each pipe gap, and the all-time high score is persisted and displayed.

## Glossary

- **Game**: The browser-based Flappy Kiro application running in an HTML5 Canvas element.
- **Ghosty**: The player-controlled ghost sprite rendered using `ghosty.png`.
- **Pipe**: A vertically-oriented obstacle pair (top pipe + bottom pipe with caps) that scrolls from right to left.
- **Pipe_Gap**: The vertical opening between the top and bottom pipe through which Ghosty must pass.
- **Score**: The count of Pipe_Gaps successfully passed by Ghosty in the current session.
- **High_Score**: The highest Score achieved across all sessions, persisted in browser localStorage.
- **Score_Bar**: The UI strip at the bottom of the canvas displaying the current Score and High_Score.
- **Physics_Engine**: The subsystem responsible for applying gravity and flap velocity to Ghosty.
- **Collision_Detector**: The subsystem that detects contact between Ghosty and Pipes or screen edges.
- **Renderer**: The subsystem that draws all game elements to the HTML5 Canvas each frame.
- **Audio_Manager**: The subsystem that plays sound effects using the provided `.wav` assets.
- **Input_Handler**: The subsystem that captures keyboard, mouse, and touch input from the player.
- **Cloud_Layer**: A set of cloud shapes rendered at a specific depth level, each with a defined opacity, scale, and scroll speed.
- **Parallax_System**: The subsystem responsible for managing multiple Cloud_Layers and scrolling each at a distinct speed to simulate depth.

---

## Requirements

### Requirement 1: Game Initialization

**User Story:** As a player, I want the game to load and display a start screen, so that I know the game is ready and can begin playing.

#### Acceptance Criteria

1. WHEN the browser loads the Game, THE Renderer SHALL display the light-blue sketchy background, Ghosty centered vertically on the canvas, and a "Press Space / Tap to Start" prompt.
2. WHEN the browser loads the Game, THE Score_Bar SHALL display a Score of 0 and the stored High_Score.
3. IF browser localStorage does not contain a saved High_Score, THEN THE Game SHALL initialize High_Score to 0.

---

### Requirement 2: Player Input

**User Story:** As a player, I want to control Ghosty by pressing Space, clicking, or tapping, so that I can play on both desktop and mobile devices.

#### Acceptance Criteria

1. WHEN the player presses the Space key, THE Input_Handler SHALL trigger a flap action.
2. WHEN the player clicks the mouse on the canvas, THE Input_Handler SHALL trigger a flap action.
3. WHEN the player taps the canvas on a touch-enabled device, THE Input_Handler SHALL trigger a flap action.
4. WHILE the Game is in the start screen state, WHEN a flap action is triggered, THE Game SHALL transition to the active play state.
5. WHILE the Game is in the game over state, WHEN a flap action is triggered, THE Game SHALL reset and transition to the active play state.

---

### Requirement 3: Physics — Gravity and Flap

**User Story:** As a player, I want Ghosty to fall under gravity and jump upward when I flap, so that the game has the expected Flappy Bird feel.

#### Acceptance Criteria

1. WHILE the Game is in the active play state, THE Physics_Engine SHALL apply a constant downward gravitational acceleration to Ghosty each frame.
2. WHEN a flap action is triggered during active play, THE Physics_Engine SHALL set Ghosty's vertical velocity to a fixed upward value, overriding any current vertical velocity.
3. THE Physics_Engine SHALL update Ghosty's vertical position each frame by adding the current vertical velocity to the previous position.
4. THE Physics_Engine SHALL clamp Ghosty's maximum downward velocity to a defined terminal velocity value.

---

### Requirement 4: Pipe Generation and Scrolling

**User Story:** As a player, I want pipes to appear continuously and scroll toward me, so that the game presents an endless series of obstacles.

#### Acceptance Criteria

1. WHILE the Game is in the active play state, THE Game SHALL spawn a new Pipe pair at a fixed horizontal interval measured in pixels scrolled.
2. WHEN a Pipe pair is spawned, THE Game SHALL randomize the vertical position of the Pipe_Gap within defined minimum and maximum bounds to ensure the gap is always reachable.
3. WHILE the Game is in the active play state, THE Renderer SHALL move all Pipes leftward at a constant scroll speed each frame.
4. WHEN a Pipe pair moves entirely off the left edge of the canvas, THE Game SHALL remove that Pipe pair from the active obstacle list.
5. THE Renderer SHALL draw each Pipe with a green fill and a darker green cap on the open end facing the Pipe_Gap.

---

### Requirement 5: Collision Detection

**User Story:** As a player, I want the game to end when Ghosty hits a pipe or the screen boundary, so that the game has meaningful challenge.

#### Acceptance Criteria

1. WHILE the Game is in the active play state, THE Collision_Detector SHALL check for overlap between Ghosty's bounding box and each Pipe's bounding box every frame.
2. WHEN the Collision_Detector detects an overlap between Ghosty and a Pipe, THE Game SHALL transition to the game over state.
3. WHEN Ghosty's vertical position causes its bounding box to exceed the top edge of the canvas, THE Game SHALL transition to the game over state.
4. WHEN Ghosty's vertical position causes its bounding box to exceed the bottom edge of the Score_Bar, THE Game SHALL transition to the game over state.

---

### Requirement 6: Scoring

**User Story:** As a player, I want my score to increase each time I pass through a pipe gap, so that I have a clear measure of progress.

#### Acceptance Criteria

1. WHEN Ghosty's horizontal center passes the horizontal center of a Pipe pair during active play, THE Game SHALL increment Score by 1.
2. THE Score_Bar SHALL display the current Score updated in real time each frame.
3. WHEN the Game transitions to the game over state, IF the current Score exceeds the stored High_Score, THEN THE Game SHALL update High_Score to the current Score and persist it to browser localStorage.
4. THE Score_Bar SHALL display the High_Score at all times.

---

### Requirement 7: Game Over State

**User Story:** As a player, I want to see a game over screen with my score when I lose, so that I know the round has ended and can choose to retry.

#### Acceptance Criteria

1. WHEN the Game transitions to the game over state, THE Renderer SHALL overlay a "Game Over" message and the final Score on the canvas.
2. WHEN the Game transitions to the game over state, THE Renderer SHALL display a "Press Space / Tap to Restart" prompt.
3. WHILE the Game is in the game over state, THE Game SHALL freeze all Pipe movement and Physics_Engine updates.

---

### Requirement 8: Audio Feedback

**User Story:** As a player, I want sound effects when I flap and when the game ends, so that the game feels responsive and engaging.

#### Acceptance Criteria

1. WHEN a flap action is triggered during active play, THE Audio_Manager SHALL play the `jump.wav` sound effect.
2. WHEN the Game transitions to the game over state, THE Audio_Manager SHALL play the `game_over.wav` sound effect.
3. IF the browser has not yet received a user gesture, THEN THE Audio_Manager SHALL defer audio playback until a gesture is received, in compliance with browser autoplay policies.

---

### Requirement 9: Visual Style

**User Story:** As a player, I want the game to have a consistent retro/sketchy visual style, so that it feels cohesive and charming.

#### Acceptance Criteria

1. THE Renderer SHALL fill the canvas background with a light-blue color each frame before drawing other elements.
2. THE Renderer SHALL draw Ghosty using the `ghosty.png` sprite scaled to a consistent size.
3. THE Renderer SHALL draw the Score_Bar as a distinct strip at the bottom of the canvas with a contrasting background color.
4. THE Renderer SHALL draw Pipes using a green fill with a darker green rectangular cap on the end facing the Pipe_Gap.

---

### Requirement 11: Parallax Cloud Layers

**User Story:** As a player, I want to see clouds scrolling at different speeds in the background, so that the game has a sense of depth and visual richness.

#### Acceptance Criteria

1. THE Renderer SHALL render at least two Cloud_Layers in the background, behind Ghosty and Pipes.
2. THE Renderer SHALL draw each cloud shape with a semi-transparent fill, so that the background color remains partially visible through the clouds.
3. WHILE the Game is in the active play state, THE Parallax_System SHALL scroll each Cloud_Layer leftward at a speed proportional to its perceived depth, such that Cloud_Layers representing greater distance scroll slower than those representing lesser distance.
4. THE Renderer SHALL draw clouds in Cloud_Layers representing greater distance at a smaller scale and lower opacity than clouds in Cloud_Layers representing lesser distance.
5. WHEN a cloud shape moves entirely off the left edge of the canvas, THE Parallax_System SHALL reposition that cloud to the right edge of the canvas to maintain continuous scrolling.
6. WHILE the Game is in the start screen or game over state, THE Parallax_System SHALL continue scrolling Cloud_Layers to keep the background animated.

---

### Requirement 10: Responsive Canvas

**User Story:** As a player, I want the game canvas to fit my browser window, so that I can play comfortably on different screen sizes.

#### Acceptance Criteria

1. WHEN the browser window is resized, THE Game SHALL resize the canvas to match the new window dimensions.
2. WHEN the canvas is resized, THE Game SHALL recalculate all layout-dependent values (Score_Bar height, pipe spawn bounds) to maintain correct proportions.
