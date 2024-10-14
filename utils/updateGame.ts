import { GameState, Zombie, Bullet, MathPuzzle, MathBlock, Player } from './gameState';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 640;
const PADDING = 0.05; // 5% padding on each side
const MATH_BLOCK_GAP = 0.2; // 20% gap between blocks
const MATH_BLOCK_WIDTH = (CANVAS_WIDTH * (1 - 2 * PADDING - MATH_BLOCK_GAP)) / 2; // Width of each math block with padding and gap
const ZOMBIE_SPAWN_INTERVAL = 5000;
const SHOOT_COOLDOWN = 500;
const INITIAL_ZOMBIES_PER_WAVE = 10;
const ZOMBIES_PER_WAVE_INCREMENT = 5;
const PUZZLE_INTERVAL = 15000;
const MAX_ZOMBIES = 50;
const MATH_BLOCK_INTERVAL = 10000;

const FORMATION_COLS = 10;
const FORMATION_SPACING_X = 5; // Reduced from 10
const FORMATION_SPACING_Y = 5; // Reduced from 10
const PLAYER_GAP = 3; // Increased from 2 to create a small visible gap

const PLAYER_WIDTH = 15;
const PLAYER_HEIGHT = 15;
const FORMATION_ROWS = 3;

const MAX_FORMATION_WIDTH = 10;

const TOTAL_ZOMBIE_FRAMES = 8; // Adjust this based on the actual number of zombie frames
const ZOMBIE_ANIMATION_FRAME_DURATION = 100; // milliseconds per frame (adjust for desired speed)

const ZOMBIE_RADIUS = 7.5; // Half of the zombie width/height
const ZOMBIE_REPULSION_FORCE = 0.2; // Adjust this value to control how strongly zombies repel each other

const PLAYER_SPEED = 5; // Reduced from 10 to slow down left/right movement
const BULLET_SPEED = 10;
const CLICK_TIMEOUT = 5000; // 5 seconds timeout for click direction

// Add these new interfaces to the top of the file
interface Vector2D {
  x: number;
  y: number;
}

interface GameStateWithClick extends GameState {
  lastClickPosition: Vector2D | null;
  lastClickTime: number;
}

const calculatePlayerFormation = (playerCount: number, baseX: number, baseY: number): Player[] => {
  const formation: Player[] = [];
  const cols = Math.min(Math.ceil(playerCount / FORMATION_ROWS), MAX_FORMATION_WIDTH);
  const rows = Math.ceil(playerCount / cols);
  const formationWidth = (cols - 1) * (PLAYER_WIDTH + PLAYER_GAP) + PLAYER_WIDTH;
  const formationHeight = (rows - 1) * (PLAYER_HEIGHT + PLAYER_GAP) + PLAYER_HEIGHT;
  const startX = Math.max(0, Math.min(baseX, CANVAS_WIDTH - formationWidth));
  const startY = Math.min(baseY, CANVAS_HEIGHT - formationHeight);

  for (let i = 0; i < playerCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (PLAYER_WIDTH + PLAYER_GAP);
    const y = startY + row * (PLAYER_HEIGHT + PLAYER_GAP);

    formation.push({
      x,
      y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      speed: PLAYER_SPEED,
      movingLeft: false,
      movingRight: false,
      movingUp: false,
      movingDown: false,
      lastShot: 0,
      health: 100,
      currentFrame: 0,
      animationState: 'idle',
      lastAnimationUpdate: 0,
    });
  }

  return formation;
};

const TOTAL_FRAMES = 15;
const ANIMATION_FRAME_DURATION = 50; // milliseconds per frame (adjust for desired speed)

export const updateGame = (state: GameState): GameState => {
  if (!state.gameStarted || state.gameOver) return state;

  const newState = { ...state } as GameStateWithClick;
  const currentTime = Date.now();

  // Calculate formation dimensions
  const cols = Math.min(Math.ceil(newState.playerCount / FORMATION_ROWS), MAX_FORMATION_WIDTH);
  const formationWidth = (cols - 1) * (PLAYER_WIDTH + PLAYER_GAP) + PLAYER_WIDTH;

  // Update main player position with reduced speed
  let newPlayerX = newState.player.x;
  let newPlayerY = newState.player.y;
  if (state.player.movingLeft) {
    newPlayerX = Math.max(0, newPlayerX - PLAYER_SPEED);
  }
  if (state.player.movingRight) {
    newPlayerX = Math.min(CANVAS_WIDTH - formationWidth, newPlayerX + PLAYER_SPEED);
  }
  if (state.player.movingUp) {
    newPlayerY = Math.max(0, newPlayerY - PLAYER_SPEED);
  }
  if (state.player.movingDown) {
    newPlayerY = Math.min(CANVAS_HEIGHT - PLAYER_HEIGHT, newPlayerY + PLAYER_SPEED);
  }

  // Calculate player formation based on the new position
  const playerFormation = calculatePlayerFormation(newState.playerCount, newPlayerX, newPlayerY);

  // Update main player and formation
  newState.player = {
    ...playerFormation[0],
    movingLeft: state.player.movingLeft,
    movingRight: state.player.movingRight,
    movingUp: state.player.movingUp,
    movingDown: state.player.movingDown,
    lastShot: state.player.lastShot,
    health: state.player.health,
    currentFrame: state.player.currentFrame,
    animationState: state.player.animationState,
    lastAnimationUpdate: state.player.lastAnimationUpdate,
  };
  newState.playerFormation = playerFormation;

  // Automatic shooting for each player
  if (currentTime - newState.player.lastShot > SHOOT_COOLDOWN) {
    let shootingDirection: Vector2D = { x: 0, y: -1 }; // Default direction (straight up)

    if (newState.lastClickPosition && currentTime - newState.lastClickTime < CLICK_TIMEOUT) {
      const dx = newState.lastClickPosition.x - newState.player.x;
      const dy = newState.lastClickPosition.y - newState.player.y;
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      shootingDirection = {
        x: dx / magnitude,
        y: dy / magnitude
      };
    }

    newState.playerFormation.forEach(player => {
      newState.bullets.push({
        x: player.x + player.width / 2 - 2.5,
        y: player.y,
        width: 5,
        height: 10,
        speed: BULLET_SPEED,
        direction: shootingDirection
      });
    });
    newState.player.lastShot = currentTime;
  }

  // Update bullet positions
  newState.bullets = newState.bullets.filter(bullet => {
    bullet.x += bullet.direction.x * bullet.speed;
    bullet.y += bullet.direction.y * bullet.speed;
    return bullet.y + bullet.height > 0 && bullet.y < CANVAS_HEIGHT &&
           bullet.x + bullet.width > 0 && bullet.x < CANVAS_WIDTH;
  });

  // Spawn zombies in waves
  if (currentTime - newState.lastZombieSpawn > ZOMBIE_SPAWN_INTERVAL && newState.zombies.length === 0) {
    const zombiesToSpawn = INITIAL_ZOMBIES_PER_WAVE + (newState.wave - 1) * ZOMBIES_PER_WAVE_INCREMENT;
    const actualZombiesToSpawn = Math.min(zombiesToSpawn, MAX_ZOMBIES - newState.zombies.length);

    for (let i = 0; i < actualZombiesToSpawn; i++) {
      newState.zombies.push({
        x: Math.random() * (CANVAS_WIDTH - 15), // Adjusted for new zombie width
        y: Math.random() * 100,
        width: 15, // Reduced from 30
        height: 15, // Reduced from 30
        speed: 1 + Math.floor(newState.wave / 5) * 0.2,
        currentFrame: 0,
        lastAnimationUpdate: 0,
      });
    }

    newState.lastZombieSpawn = currentTime;
    newState.wave++;
  }

  // Update zombie positions, check for collisions, and update animations
  newState.zombies = newState.zombies.map(zombie => {
    const oldX = zombie.x;
    const oldY = zombie.y;

    // Move towards the player
    const dx = newState.player.x - zombie.x;
    const dy = newState.player.y - zombie.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      zombie.x += (dx / distance) * zombie.speed;
      zombie.y += (dy / distance) * zombie.speed;
    }

    // Apply repulsion force from other zombies
    newState.zombies.forEach(otherZombie => {
      if (zombie !== otherZombie) {
        const repulsionDx = zombie.x - otherZombie.x;
        const repulsionDy = zombie.y - otherZombie.y;
        const repulsionDistance = Math.sqrt(repulsionDx * repulsionDx + repulsionDy * repulsionDy);

        if (repulsionDistance < ZOMBIE_RADIUS * 2) {
          const repulsionForce = (ZOMBIE_RADIUS * 2 - repulsionDistance) * ZOMBIE_REPULSION_FORCE;
          zombie.x += (repulsionDx / repulsionDistance) * repulsionForce;
          zombie.y += (repulsionDy / repulsionDistance) * repulsionForce;
        }
      }
    });

    // Keep zombies within canvas boundaries
    zombie.x = Math.max(ZOMBIE_RADIUS, Math.min(CANVAS_WIDTH - ZOMBIE_RADIUS, zombie.x));
    zombie.y = Math.max(ZOMBIE_RADIUS, Math.min(CANVAS_HEIGHT - ZOMBIE_RADIUS, zombie.y));

    // Update zombie animation
    const elapsedTime = currentTime - zombie.lastAnimationUpdate;
    const frameProgress = elapsedTime / ZOMBIE_ANIMATION_FRAME_DURATION;
    zombie.currentFrame = (zombie.currentFrame + frameProgress) % TOTAL_ZOMBIE_FRAMES;
    zombie.lastAnimationUpdate = currentTime;

    return zombie;
  });

  // Check for collisions between zombies and players
  newState.zombies = newState.zombies.filter(zombie => {
    let collision = false;
    newState.playerFormation.forEach(player => {
      if (checkCollision(zombie, player)) {
        collision = true;
      }
    });
    if (collision) {
      newState.playerCount = Math.max(1, newState.playerCount - 1);
      return false; // Remove the zombie that hit a player
    }
    return true;
  });

  // Check collisions between bullets and zombies
  newState.bullets = newState.bullets.filter(bullet => {
    let bulletHit = false;
    newState.zombies = newState.zombies.filter(zombie => {
      if (checkCollision(bullet, zombie)) {
        bulletHit = true;
        newState.score += 10;
        return false; // Remove the zombie that was hit
      }
      return true;
    });
    return !bulletHit; // Remove the bullet if it hit a zombie
  });

  // Spawn math blocks
  if (currentTime - newState.lastMathBlockSpawn > MATH_BLOCK_INTERVAL && !newState.mathBlocks) {
    const operations = ['+', '-', '*', '/'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let value: number;

    switch (operation) {
      case '+':
      case '-':
        value = Math.floor(Math.random() * 5) + 1; // Random value between 1 and 5
        break;
      case '*':
        value = Math.floor(Math.random() * 2) + 2; // Random value between 2 and 3
        break;
      case '/':
        value = Math.floor(Math.random() * 2) + 2; // Random value between 2 and 3
        break;
      default:
        value = 1;
    }

    const leftBlockX = CANVAS_WIDTH * PADDING;
    const rightBlockX = CANVAS_WIDTH * (1 - PADDING) - MATH_BLOCK_WIDTH;

    newState.mathBlocks = [
      { operation, value, x: leftBlockX, y: 0, width: MATH_BLOCK_WIDTH, height: 30 },
      { operation: operation === '+' ? '-' : '+', value, x: rightBlockX, y: 0, width: MATH_BLOCK_WIDTH, height: 30 }
    ];
    newState.lastMathBlockSpawn = currentTime;
  }

  // Handle math block collisions
  if (newState.mathBlocks) {
    let collision = false;
    newState.mathBlocks = newState.mathBlocks.filter(block => {
      block.y += 1; // Move down

      // Check for collision with any player in the formation
      for (let player of newState.playerFormation) {
        if (checkCollision(block, player)) {
          collision = true;
          // Apply math operation
          const oldPlayerCount = newState.playerCount;
          switch (block.operation) {
            case '+':
              newState.playerCount = oldPlayerCount + block.value;
              break;
            case '-':
              newState.playerCount = Math.max(1, oldPlayerCount - block.value);
              break;
            case '*':
              newState.playerCount = oldPlayerCount * block.value;
              break;
            case '/':
              newState.playerCount = Math.max(1, Math.floor(oldPlayerCount / block.value));
              break;
          }
          console.log(`Math operation: ${oldPlayerCount} ${block.operation} ${block.value} = ${newState.playerCount}`);
          break; // Exit the loop after first collision
        }
      }

      // Keep the block if it's still on screen and hasn't collided
      return !collision && block.y <= CANVAS_HEIGHT;
    });

    // If all blocks are removed, set mathBlocks to null
    if (newState.mathBlocks.length === 0) {
      newState.mathBlocks = null;
    }
  }

  // Recalculate player formation after potential player count change
  newState.playerFormation = calculatePlayerFormation(newState.playerCount, newState.player.x, CANVAS_HEIGHT - PLAYER_HEIGHT - 10);

  // Update player animation
  const elapsedTime = currentTime - newState.player.lastAnimationUpdate;
  const frameProgress = elapsedTime / ANIMATION_FRAME_DURATION;
  newState.player.currentFrame = (newState.player.currentFrame + frameProgress) % TOTAL_FRAMES;
  newState.player.lastAnimationUpdate = currentTime;

  // Determine player animation state
  if (newState.player.movingLeft || newState.player.movingRight || newState.player.movingUp || newState.player.movingDown) {
    newState.player.animationState = 'running';
  } else if (currentTime - newState.player.lastShot < SHOOT_COOLDOWN) {
    newState.player.animationState = 'shooting';
  } else {
    newState.player.animationState = 'idle';
  }

  // Update animation state and frame for all players in formation
  newState.playerFormation = newState.playerFormation.map(player => ({
    ...player,
    currentFrame: newState.player.currentFrame,
    animationState: newState.player.animationState,
    lastAnimationUpdate: newState.player.lastAnimationUpdate
  }));

  return newState;
};

const checkCollision = (rect1: { x: number; y: number; width: number; height: number }, rect2: { x: number; y: number; width: number; height: number }) => {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
};

const generateMathPuzzle = (): MathPuzzle => {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  let correctAnswer: number;

  switch (operation) {
    case '+':
      correctAnswer = num1 + num2;
      break;
    case '-':
      correctAnswer = num1 - num2;
      break;
    case '*':
      correctAnswer = num1 * num2;
      break;
    default:
      correctAnswer = 0; // This should never happen, but TypeScript requires it
  }

  return {
    question: `${num1} ${operation} ${num2} = ?`,
    correctAnswer,
    userAnswer: null,
  };
};

// Add this new function to handle click events
export const handleCanvasClick = (state: GameState, clickX: number, clickY: number): GameState => {
  const newState = { ...state } as GameStateWithClick;
  newState.lastClickPosition = { x: clickX, y: clickY };
  newState.lastClickTime = Date.now();
  return newState;
};