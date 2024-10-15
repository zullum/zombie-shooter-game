import { GameState, Zombie, Bullet, MathPuzzle, MathBlock, Player } from './gameState';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 640;
const PADDING = 0.05; // 5% padding on each side
const MATH_BLOCK_GAP = 0.2; // 20% gap between blocks
const MATH_BLOCK_WIDTH = (CANVAS_WIDTH * (1 - 2 * PADDING - MATH_BLOCK_GAP)) / 2; // Width of each math block with padding and gap
const ZOMBIE_SPAWN_INTERVAL = 5000;
const SHOOT_COOLDOWN = 2000; // Increased from 1500 to 2000 milliseconds
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
const BULLET_SPEED = 18; // Increased from 15 to 18
const CLICK_TIMEOUT = 1000; // Reduced from 5000 to 1000 milliseconds (1 second)
const SHOOT_DELAY_MIN = 200; // Increased from 50 to 200 milliseconds
const SHOOT_DELAY_MAX = 500; // Increased from 300 to 500 milliseconds

const ZOMBIE_MIN_SCALE = 1;
const ZOMBIE_MAX_SCALE = 3; // Changed from 1.5 to 3

const BULLET_DELAY = 50; // Milliseconds of delay before bullet becomes visible
const PLAYER_SHOT_DELAY_MIN = 200; // Minimum delay between individual player shots (milliseconds)
const PLAYER_SHOT_DELAY_MAX = 800; // Maximum delay between individual player shots (milliseconds)
const VOLLEY_DURATION = 1000; // Duration over which all soldiers will fire (milliseconds)

// Add these new interfaces to the top of the file
interface Vector2D {
  x: number;
  y: number;
}

interface GameStateWithClick extends GameState {
  lastClickPosition: Vector2D | null;
  lastClickTime: number;
}

const MAX_SOUND_EFFECTS = 20;
const SOUND_OVERLAP_THRESHOLD = 50; // milliseconds

let audioContext: AudioContext | null = null;
let bulletSoundBuffer: AudioBuffer | null = null;

// Remove the export from the function declaration
const initializeAudio = async () => {
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const response = await fetch('/audio/deserteagle.mp3');
    const arrayBuffer = await response.arrayBuffer();
    bulletSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log('Audio initialized successfully');
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
};

const playBulletSound = () => {
  if (audioContext && bulletSoundBuffer) {
    const source = audioContext.createBufferSource();
    source.buffer = bulletSoundBuffer;
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Reduced volume
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();
  } else {
    console.warn('Audio not initialized');
  }
};

const BASE_ZOMBIE_SPEED = 0.3; // Base speed for zombies
const SPEED_INCREMENT_PER_WAVE = 0.05; // Speed increase per wave

const ANIMATION_FRAME_DURATION = 100; // milliseconds per frame
const TOTAL_FRAMES = 15; // Assuming 15 frames for player animation

// Remove the 'export' keyword from here
const updateGame = (state: GameState): GameState => {
  if (!state.gameStarted || state.gameOver) return state;

  const newState = { ...state };
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

  // Automatic shooting for each player with randomized delay
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

    const volleyStartTime = currentTime;
    let soundsPlayed = 0;

    newState.playerFormation.forEach((player, index) => {
      const randomDelay = Math.random() * VOLLEY_DURATION;
      
      setTimeout(() => {
        newState.setGameState?.(prevState => {
          const updatedPlayer = prevState.playerFormation[index];
          if (!updatedPlayer) {
            console.error(`Player at index ${index} not found in formation`);
            return prevState;
          }

          const newBullet = {
            x: updatedPlayer.x + updatedPlayer.width / 2,
            y: updatedPlayer.y,
            width: 4,
            height: 8,
            speed: BULLET_SPEED,
            direction: shootingDirection,
            trail: [],
            creationTime: Date.now(),
            glowIntensity: 1,
            visible: true,
          };

          // Play bullet sound
          if (soundsPlayed < MAX_SOUND_EFFECTS) {
            playBulletSound();
            soundsPlayed++;
          }

          return {
            ...prevState,
            bullets: [...prevState.bullets, newBullet]
          };
        });
      }, randomDelay);
    });

    newState.player.lastShot = volleyStartTime;
  }

  // Update bullet positions and trails
  newState.bullets = newState.bullets.filter(bullet => {
    // Add current position to trail
    bullet.trail.unshift({ x: bullet.x, y: bullet.y });
    // Limit trail length
    if (bullet.trail.length > 10) {
      bullet.trail.pop();
    }

    bullet.x += bullet.direction.x * bullet.speed;
    bullet.y += bullet.direction.y * bullet.speed;

    // Update glow intensity
    bullet.glowIntensity = Math.max(0, bullet.glowIntensity - 0.02); // Gradually reduce glow

    // Remove bullets that are off-screen or too old
    return (currentTime - bullet.creationTime < 5000) && // Remove after 5 seconds
           (bullet.y + bullet.height > 0) && (bullet.y < CANVAS_HEIGHT) &&
           (bullet.x + bullet.width > 0) && (bullet.x < CANVAS_WIDTH);
  });

  // Spawn zombies in waves
  if (currentTime - newState.lastZombieSpawn > ZOMBIE_SPAWN_INTERVAL && newState.zombies.length === 0) {
    const zombiesToSpawn = INITIAL_ZOMBIES_PER_WAVE + (newState.wave - 1) * ZOMBIES_PER_WAVE_INCREMENT;
    const actualZombiesToSpawn = Math.min(zombiesToSpawn, MAX_ZOMBIES - newState.zombies.length);

    for (let i = 0; i < actualZombiesToSpawn; i++) {
      newState.zombies.push({
        x: Math.random() * (CANVAS_WIDTH - 15),
        y: Math.random() * 100,
        width: 15,
        height: 15,
        speed: BASE_ZOMBIE_SPEED + (newState.wave - 1) * SPEED_INCREMENT_PER_WAVE,
        currentFrame: 0,
        lastAnimationUpdate: 0,
        scale: ZOMBIE_MIN_SCALE,
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

    // Update zombie scale based on y position
    const progressToPlayer = zombie.y / CANVAS_HEIGHT;
    zombie.scale = ZOMBIE_MIN_SCALE + (ZOMBIE_MAX_SCALE - ZOMBIE_MIN_SCALE) * progressToPlayer;

    // Apply repulsion force from other zombies
    newState.zombies.forEach(otherZombie => {
      if (zombie !== otherZombie) {
        const repulsionDx = zombie.x - otherZombie.x;
        const repulsionDy = zombie.y - otherZombie.y;
        const repulsionDistance = Math.sqrt(repulsionDx * repulsionDx + repulsionDy * repulsionDy);

        if (repulsionDistance < ZOMBIE_RADIUS * 2 * zombie.scale) {
          const repulsionForce = (ZOMBIE_RADIUS * 2 * zombie.scale - repulsionDistance) * ZOMBIE_REPULSION_FORCE;
          zombie.x += (repulsionDx / repulsionDistance) * repulsionForce;
          zombie.y += (repulsionDy / repulsionDistance) * repulsionForce;
        }
      }
    });

    // Keep zombies within canvas boundaries
    const scaledRadius = ZOMBIE_RADIUS * zombie.scale;
    zombie.x = Math.max(scaledRadius, Math.min(CANVAS_WIDTH - scaledRadius, zombie.x));
    zombie.y = Math.max(scaledRadius, Math.min(CANVAS_HEIGHT - scaledRadius, zombie.y));

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
      if (checkCollisionWithZombie(bullet, zombie)) {
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

const checkCollisionWithZombie = (bullet: Bullet, zombie: Zombie) => {
  const scaledWidth = zombie.width * zombie.scale;
  const scaledHeight = zombie.height * zombie.scale;
  const zombieRect = {
    x: zombie.x - scaledWidth / 2,
    y: zombie.y - scaledHeight / 2,
    width: scaledWidth,
    height: scaledHeight
  };
  return checkCollision(bullet, zombieRect);
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

// Remove the 'export' keyword from here
const handleCanvasClick = (state: GameState, clickX: number, clickY: number): GameState => {
  const newState = { ...state } as GameStateWithClick;
  newState.lastClickPosition = { x: clickX, y: clickY };
  newState.lastClickTime = Date.now();
  return newState;
};

const calculatePlayerFormation = (playerCount: number, baseX: number, baseY: number): Player[] => {
  const formation: Player[] = [];
  const actualPlayerCount = Math.max(1, playerCount); // Ensure at least one player
  let cols, rows;

  if (actualPlayerCount < 3) {
    cols = actualPlayerCount;
    rows = 1;
  } else {
    cols = Math.min(Math.ceil(actualPlayerCount / FORMATION_ROWS), MAX_FORMATION_WIDTH);
    rows = Math.ceil(actualPlayerCount / cols);
  }

  const formationWidth = (cols - 1) * (PLAYER_WIDTH + PLAYER_GAP) + PLAYER_WIDTH;
  const formationHeight = (rows - 1) * (PLAYER_HEIGHT + PLAYER_GAP) + PLAYER_HEIGHT;
  const startX = Math.max(0, Math.min(baseX, CANVAS_WIDTH - formationWidth));
  const startY = Math.min(baseY, CANVAS_HEIGHT - formationHeight);

  for (let i = 0; i < actualPlayerCount; i++) {
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

// Keep only this export at the end of the file
export { initializeAudio, updateGame, handleCanvasClick };