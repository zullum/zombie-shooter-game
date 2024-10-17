import { GameState, Zombie, BossZombie, Player, Bullet, MathBlock, MathPuzzle, INITIAL_WAVE_INTERVAL, initialGameState, GameSize } from './gameState';
import { Howl, Howler } from 'howler';

declare module 'howler' {
  interface Howl {
    playing(): boolean;
  }
}

// Add these new interfaces to the top of the file
interface Vector2D {
  x: number;
  y: number;
}

interface GameStateWithClick extends GameState {
  lastClickPosition: Vector2D | null;
  lastClickTime: number;
}

interface GameState {
  // ... (existing properties)
  bossZombie: BossZombie | null;
}

// Update the Zombie interface
interface Zombie {
  // ... (existing properties)
  lastAttackTime: number;
}

// Update the BossZombie interface
interface BossZombie extends Zombie {
  // ... (existing properties)
  playersEliminatedPerAttack: number;
}

interface GameState {
  // ... (existing properties)
  waveInterval: number;
  lastWaveTime: number;
}

interface MathBlock {
  operation: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lastHitTime: number;
}

// Add this interface
interface SoundState {
  singleLaserSound: Howl;
  multipleLaserSound: Howl;
  isLaserPlaying: boolean;
}

// Add this to your existing GameState interface
interface GameState {
  // ... (existing properties)
  soundState: SoundState;
}

// Add this to your GameState interface if not already present
interface GameState {
  // ... (other properties)
  isMultipleLaserPlaying: boolean;
}

interface MathBlock {
  operation: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lastHitTime: number;
  lastPositiveUpdateTime: number;
  positiveUpdateCount: number;
}

interface BossZombie extends Zombie {
  isActive: boolean;
  maxHealth: number;
  currentHealth: number;
}


const PADDING = 0.05; // 5% padding on each side
const MATH_BLOCK_GAP = 0.2; // 20% gap between blocks
const SHOOT_COOLDOWN = 700; // Increase cooldown to 700ms for even less frequent shooting
const INITIAL_ZOMBIES_PER_WAVE = 5; // Reduced from 3
const ZOMBIES_PER_WAVE_INCREMENT = 1.5; // Reduced from 1
const MATH_BLOCK_INTERVAL = 10000;
const PLAYER_GAP = 3; // Increased from 2 to create a small visible gap
const PLAYER_WIDTH = 15;
const PLAYER_HEIGHT = 15;
const FORMATION_ROWS = 3;
const MAX_FORMATION_WIDTH = 12;
const TOTAL_ZOMBIE_FRAMES = 8; // Adjust this based on the actual number of zombie frames
const ZOMBIE_ANIMATION_FRAME_DURATION = 50; // milliseconds per frame (adjust for desired speed)
const ZOMBIE_RADIUS = 7.5; // Half of the zombie width/height
const ZOMBIE_REPULSION_FORCE = 0.2; // Adjust this value to control how strongly zombies repel each other
const PLAYER_SPEED = 5; // Reduced from 10 to slow down left/right movement
const BULLET_SPEED = 18; // Increased from 15 to 18
const CLICK_TIMEOUT = 1000; // Reduced from 5000 to 1000 milliseconds (1 second)
const ZOMBIE_MIN_SCALE = 1;
const ZOMBIE_MAX_SCALE = 3; // Changed from 1.5 to 3
const BASE_ZOMBIE_SPEED = 0.8; // Adjust this value as needed
const SPEED_INCREMENT_PER_WAVE = 0.05; // Adjust this value as needed
const ANIMATION_FRAME_DURATION = 100; // milliseconds per frame
const TOTAL_FRAMES = 15; // Assuming 15 frames for player animation
const SHOOT_CHANCE_PER_PLAYER = 0.03; // Decrease chance to shoot to 3% per frame
const INITIAL_BOSS_HEALTH = 15;
const BOSS_HEALTH_INCREMENT = 3;
const INITIAL_BOSS_SCALE = 2;
const BOSS_SCALE_INCREMENT = 0.2;
const BOSS_HEALTH_MULTIPLIER = 7; // Increase from 5 to 7 for more strength
const BOSS_DAMAGE_MULTIPLIER = 6; // Increase from 5 to 6
const ZOMBIE_ATTACK_COOLDOWN = 1000; // 1 second cooldown for regular zombies
const BOSS_ATTACK_COOLDOWN = 1000; // 1 second cooldown for boss zombies
const BOSS_PLAYERS_ELIMINATED_PER_ATTACK = 12; // Increase from 10 to 12
const BOSS_SPAWN_INTERVAL = 20000; // 45 seconds between boss spawns (adjusted from 60000)
const BOSS_SPEED = 0.8; // Slower speed for the boss
const BOSS_WAVE_FREQUENCY = 2; // Boss appears every 2nd wave
const FIRST_BOSS_WAVE = 2; // First boss appears after the 2nd wave
const WAVE_DURATION = 10000; // 10 seconds per wave
const INITIAL_MATH_BLOCK_VALUE_MIN = -5;
const INITIAL_MATH_BLOCK_VALUE_MAX = -3;
const MATH_BLOCK_VALUE_WAVE_MULTIPLIER = 1.15; // This will be used to scale the values for subsequent waves
const MATH_BLOCK_SPEED = 1.5; // Adjust this value as needed for the desired speed
const MAX_SINGLE_SOUND_PLAYERS = 6;
const LASER_SINGLE_SOUND = '/audio/laser_single.mp3';
const LASER_MULTIPLE_SOUND = '/audio/laser_multiple.mp3';
const MAX_ZOMBIES_PER_WAVE = 50; // Maximum number of zombies per wave
const PADDING_TOP = 40;
const BOTTOM_PADDING = 40; // Add this constant if not already present
const MATH_BLOCK_HIT_COOLDOWN_NEGATIVE = 30; // ms for negative values
const MATH_BLOCK_HIT_COOLDOWN_POSITIVE = 150; // ms for positive values
const MATH_BLOCK_VALUES = {
  health: 80,  // Decreased from 100
  damage: 15,  // Decreased from 20
  points: 40   // Decreased from 50
};

let audioContext: AudioContext | null = null;
let bulletSoundBuffer: AudioBuffer | null = null;

// Remove the export from the function declaration
const initializeAudio = async () => {
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    console.log('Audio context created:', audioContext);
    const response = await fetch('/audio/bullet_impact.mp3');
    console.log('Fetch response:', response);
    const arrayBuffer = await response.arrayBuffer();
    console.log('Array buffer loaded, size:', arrayBuffer.byteLength);
    bulletSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log('Audio buffer decoded:', bulletSoundBuffer);
    console.log('Audio initialized successfully');
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
};

// Update the createZombie function signature to include gameSize
export const createZombie = (wave: number, gameSize: GameSize): Zombie => {
  const baseSpeed = BASE_ZOMBIE_SPEED + (wave - 1) * SPEED_INCREMENT_PER_WAVE;
  const speedVariation = baseSpeed * 0.2; // 20% speed variation

  return {
    x: Math.random() * gameSize.width,
    y: -20, // Spawn above the canvas
    width: 15,
    height: 15,
    speed: baseSpeed + (Math.random() * 2 - 1) * speedVariation,
    currentFrame: 0,
    lastAnimationUpdate: 0,
    scale: ZOMBIE_MIN_SCALE,
    lastAttackTime: 0,
    health: 1 + Math.floor(wave / 5), // Increase health every 5 waves
  };
};



// Update the createBossZombie function as well
const createBossZombie = (bossWaveCount: number, gameSize: GameSize): BossZombie => ({
  x: gameSize.width / 2,
  y: -50, // Spawn above the canvas
  width: 30, // Increase width
  height: 30, // Increase height
  speed: BOSS_SPEED,
  currentFrame: 0,
  lastAnimationUpdate: 0,
  scale: INITIAL_BOSS_SCALE + (bossWaveCount - 1) * BOSS_SCALE_INCREMENT,
  isActive: true,
  maxHealth: (INITIAL_BOSS_HEALTH + (bossWaveCount - 1) * BOSS_HEALTH_INCREMENT) * BOSS_HEALTH_MULTIPLIER,
  currentHealth: (INITIAL_BOSS_HEALTH + (bossWaveCount - 1) * BOSS_HEALTH_INCREMENT) * BOSS_HEALTH_MULTIPLIER,
  lastAttackTime: 0,
  playersEliminatedPerAttack: (BOSS_PLAYERS_ELIMINATED_PER_ATTACK + (bossWaveCount - 1) * 4) * BOSS_DAMAGE_MULTIPLIER,
});

// Keep only this definition of resetGame
const resetGame = (): GameState => {
  return {
    ...initialGameState,
    gameStarted: true,
    lastWaveTime: Date.now(),
    lastZombieSpawn: Date.now(),
    lastBossSpawn: Date.now(),
    soundState: {
      singleLaserSound: new Howl({ src: [LASER_SINGLE_SOUND], volume: 0.5 }),
      multipleLaserSound: new Howl({ src: [LASER_MULTIPLE_SOUND], volume: 0.5, loop: true }),
      isLaserPlaying: false
    }
  };
};

// Add this constant
const BULLET_TRAIL_LENGTH = 5; // Number of positions to keep in the trail

// Modify the updateGame function
const updateGame = (state: GameState, audioContext: AudioContext | null, bulletSoundBuffer: AudioBuffer | null, gameSize: GameSize): GameState => {
  if (!state.gameStarted || state.gameOver) return state;

  const newState = { ...state };
  const currentTime = Date.now();

  // Calculate formation dimensions
  const cols = Math.min(Math.ceil(newState.playerCount / FORMATION_ROWS), MAX_FORMATION_WIDTH);
  const formationWidth = (cols - 1) * (PLAYER_WIDTH + PLAYER_GAP) + PLAYER_WIDTH;

  // Update main player position with reduced speed and respect padding
  let newPlayerX = newState.player.x;
  let newPlayerY = newState.player.y;
  if (state.player.movingLeft) {
    newPlayerX = Math.max(0, newPlayerX - PLAYER_SPEED);
  }
  if (state.player.movingRight) {
    newPlayerX = Math.min(gameSize.width - formationWidth, newPlayerX + PLAYER_SPEED);
  }
  if (state.player.movingUp) {
    newPlayerY = Math.max(PADDING_TOP, newPlayerY - PLAYER_SPEED);
  }
  if (state.player.movingDown) {
    newPlayerY = Math.min(gameSize.height - PLAYER_HEIGHT - BOTTOM_PADDING, newPlayerY + PLAYER_SPEED);
  }

  // Calculate player formation based on the new position
  const playerFormation = calculatePlayerFormation(newState.playerCount, newPlayerX, newPlayerY, gameSize);

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

  // Update wave logic
  if (currentTime - newState.lastWaveTime > WAVE_DURATION) {
    newState.wave++;
    newState.lastWaveTime = currentTime;
    console.log(`Wave ${newState.wave} started`);
  }

  // Calculate zombies to spawn this frame
  const waveMultiplier = Math.min(newState.wave, 10); // Cap the multiplier at 10
  const baseZombiesPerWave = INITIAL_ZOMBIES_PER_WAVE + (waveMultiplier - 1) * ZOMBIES_PER_WAVE_INCREMENT;
  const zombiesPerWave = Math.min(baseZombiesPerWave, MAX_ZOMBIES_PER_WAVE);
  const zombiesPerSecond = zombiesPerWave / (WAVE_DURATION / 1000);
  const timeSinceLastSpawn = currentTime - newState.lastZombieSpawn;
  const zombiesToSpawnThisFrame = Math.random() < (zombiesPerSecond * timeSinceLastSpawn / 1000) * 1.3 ? 1 : 0; // Decreased from 1.5 to 1.3

  // Spawn zombies
  if (zombiesToSpawnThisFrame > 0) {
    newState.zombies.push(createZombie(newState.wave, gameSize));
    newState.lastZombieSpawn = currentTime;
  }

  // Boss zombie spawning logic
  if (newState.wave >= FIRST_BOSS_WAVE && 
      newState.wave % BOSS_WAVE_FREQUENCY === 0 &&
      (!newState.bossZombie || !newState.bossZombie.isActive) &&
      currentTime - newState.lastBossSpawn > BOSS_SPAWN_INTERVAL) {
    const bossWaveCount = Math.floor((newState.wave - FIRST_BOSS_WAVE) / BOSS_WAVE_FREQUENCY) + 1;
    newState.bossZombie = createBossZombie(bossWaveCount, gameSize);
    newState.lastBossSpawn = currentTime;
    console.log(`Boss zombie spawned at wave ${newState.wave}`);
  }

  let playersShooting = 0;

  // Updated shooting logic
  newState.playerFormation.forEach((player, index) => {
    if (currentTime - player.lastShot > SHOOT_COOLDOWN && Math.random() < SHOOT_CHANCE_PER_PLAYER) {
      let shootingDirection: Vector2D = { x: 0, y: -1 }; // Default direction (straight up)

      // Determine shooting direction based on last click or default to upward
      if (newState.lastClickPosition && currentTime - newState.lastClickTime < CLICK_TIMEOUT) {
        const dx = newState.lastClickPosition.x - player.x;
        const dy = newState.lastClickPosition.y - player.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        shootingDirection = {
          x: dx / magnitude,
          y: dy / magnitude
        };
      }

      const newBullet = {
        x: player.x + player.width / 2,
        y: player.y,
        width: 4,
        height: 8,
        speed: BULLET_SPEED,
        direction: shootingDirection,
        trail: [],
        creationTime: currentTime,
        glowIntensity: 1,
        visible: true,
      };

      newState.bullets.push(newBullet);
      newState.playerFormation[index] = { ...player, lastShot: currentTime };

      playersShooting++;
    }
  });

  // Sound logic
  if (newState.playerCount > MAX_SINGLE_SOUND_PLAYERS) {
    // More than 10 players, use multiple laser sound
    if (!newState.isMultipleLaserPlaying) {
      newState.soundState.multipleLaserSound.play();
      newState.isMultipleLaserPlaying = true;
      
      // Set up the ended event to reset the flag when the sound finishes
      newState.soundState.multipleLaserSound.once('end', () => {
        newState.isMultipleLaserPlaying = false;
      });
    }
  } else {
    // 10 or fewer players, use single laser sound
    if (playersShooting > 0) {
      newState.soundState.singleLaserSound.play();
    }
    
    // Stop multiple laser sound if it's playing and we now have 10 or fewer players
    if (newState.isMultipleLaserPlaying) {
      newState.soundState.multipleLaserSound.stop();
      newState.isMultipleLaserPlaying = false;
    }
  }

  // Update bullet positions and check for collisions
  newState.bullets = newState.bullets.filter(bullet => {
    // Add current position to trail
    bullet.trail.unshift({ x: bullet.x, y: bullet.y });
    // Limit trail length
    if (bullet.trail.length > BULLET_TRAIL_LENGTH) {
      bullet.trail.pop();
    }

    let bulletHit = false;

    // Check for collisions with math blocks
    if (newState.mathBlocks) {
      newState.mathBlocks = newState.mathBlocks.map(block => {
        if (!bulletHit && checkBulletMathBlockCollision(bullet, block)) {
          bulletHit = true;
          const cooldown = block.value >= 0 ? MATH_BLOCK_HIT_COOLDOWN_POSITIVE : MATH_BLOCK_HIT_COOLDOWN_NEGATIVE;
          
          if (currentTime - block.lastHitTime > cooldown) {
            block.lastHitTime = currentTime;
            block.value++;
            if (block.value === 0) {
              block.value = 1; // Skip 0 and change to positive
              block.operation = '+';
            }
            // Apply points for hitting a math block
            newState.score += MATH_BLOCK_VALUES.points;
          }
        }
        return block;
      });
    }

    if (bulletHit) {
      return false; // Remove the bullet if it hit a math block
    }

    // Update bullet position
    bullet.x += bullet.direction.x * bullet.speed;
    bullet.y += bullet.direction.y * bullet.speed;

    // Update glow intensity
    bullet.glowIntensity = Math.max(0, bullet.glowIntensity - 0.02); // Gradually reduce glow

    // Remove bullets that are off-screen or too old
    return (currentTime - bullet.creationTime < 5000) && // Remove after 5 seconds
           (bullet.y + bullet.height > 0) && (bullet.y < gameSize.height) &&
           (bullet.x + bullet.width > 0) && (bullet.x < gameSize.width);
  });

  // Check for collisions between bullets and zombies (including boss)
  newState.bullets = newState.bullets.filter(bullet => {
    let zombieHit = false;
    newState.zombies = newState.zombies.filter(zombie => {
      if (!zombieHit && checkCollisionWithZombie(bullet, zombie)) {
        zombieHit = true;
        newState.score += 10;
        return false; // Remove the zombie that was hit
      }
      return true;
    });

    // Check collision with boss zombie
    if (!zombieHit && newState.bossZombie && newState.bossZombie.isActive && checkCollisionWithZombie(bullet, newState.bossZombie)) {
      zombieHit = true;
      newState.bossZombie.currentHealth--;
      newState.score += 20;
      if (newState.bossZombie.currentHealth <= 0) {
        newState.bossZombie.isActive = false;
        newState.score += 1000; // Increased bonus score for defeating boss
      }
    }

    return !zombieHit; // Remove the bullet if it hit a zombie or boss
  });

  // Update regular zombies and check for collisions with players
  newState.zombies = newState.zombies.map(zombie => {
    const updatedZombie = updateZombie(zombie, newState, gameSize);
    
    // Check for collisions with players
    if (currentTime - updatedZombie.lastAttackTime > ZOMBIE_ATTACK_COOLDOWN) {
      for (let i = 0; i < newState.playerFormation.length; i++) {
        const player = newState.playerFormation[i];
        if (checkCollision(updatedZombie, player)) {
          newState.playerCount = Math.max(0, newState.playerCount - 1);
          newState.playerFormation.splice(i, 1);
          updatedZombie.lastAttackTime = currentTime;
          break; // Only eliminate one player per attack
        }
      }
    }

    return updatedZombie;
  });

  // Update boss zombie if active
  if (newState.bossZombie && newState.bossZombie.isActive) {
    newState.bossZombie = updateZombie(newState.bossZombie, newState, gameSize) as BossZombie;
    
    // Check for collisions with players
    if (currentTime - newState.bossZombie.lastAttackTime > BOSS_ATTACK_COOLDOWN) {
      let playersEliminated = 0;
      newState.playerFormation = newState.playerFormation.filter(player => {
        if (checkCollision(newState.bossZombie!, player) && playersEliminated < newState.bossZombie!.playersEliminatedPerAttack) {
          playersEliminated++;
          return false; // Remove the player that was hit
        }
        return true;
      });
      if (playersEliminated > 0) {
        newState.playerCount = Math.max(0, newState.playerCount - playersEliminated);
        newState.bossZombie.lastAttackTime = currentTime;
      }
    }
  }

  // Recalculate player formation based on current player count
  newState.playerFormation = calculatePlayerFormation(newState.playerCount, newState.player.x, gameSize.height - PLAYER_HEIGHT - BOTTOM_PADDING, gameSize);

  // Update main player position to match the first player in the formation
  if (newState.playerFormation.length > 0) {
    newState.player = {
      ...newState.player,
      x: newState.playerFormation[0].x,
      y: newState.playerFormation[0].y,
    };
  }

  // Check if the game is over
  if (newState.playerCount <= 0) {
    newState.gameOver = true;
  }

  // Spawn math blocks
  if (currentTime - newState.lastMathBlockSpawn > MATH_BLOCK_INTERVAL && !newState.mathBlocks) {
    let value1, value2;
    
    if (newState.wave === 1) {
      // For the first wave, use the initial range
      value1 = Math.floor(Math.random() * (INITIAL_MATH_BLOCK_VALUE_MAX - INITIAL_MATH_BLOCK_VALUE_MIN + 1)) + INITIAL_MATH_BLOCK_VALUE_MIN;
      value2 = Math.floor(Math.random() * (INITIAL_MATH_BLOCK_VALUE_MAX - INITIAL_MATH_BLOCK_VALUE_MIN + 1)) + INITIAL_MATH_BLOCK_VALUE_MIN;
    } else {
      // For subsequent waves, scale the values based on the wave number
      const minValue = Math.floor(INITIAL_MATH_BLOCK_VALUE_MIN * Math.pow(MATH_BLOCK_VALUE_WAVE_MULTIPLIER, newState.wave - 1));
      const maxValue = Math.floor(INITIAL_MATH_BLOCK_VALUE_MAX * Math.pow(MATH_BLOCK_VALUE_WAVE_MULTIPLIER, newState.wave - 1));
      value1 = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
      value2 = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
    }
    
    const blockWidth = (gameSize.width * (1 - 2 * PADDING - MATH_BLOCK_GAP)) / 2;
    const blockHeight = 60;
    const leftBlockX = gameSize.width * PADDING;
    const rightBlockX = gameSize.width * (1 - PADDING) - blockWidth;

    newState.mathBlocks = [
      { operation: '-', value: value1, x: leftBlockX, y: 0, width: blockWidth, height: blockHeight, lastHitTime: 0, lastPositiveUpdateTime: 0, positiveUpdateCount: 0 },
      { operation: '-', value: value2, x: rightBlockX, y: 0, width: blockWidth, height: blockHeight, lastHitTime: 0, lastPositiveUpdateTime: 0, positiveUpdateCount: 0 }
    ];
    newState.lastMathBlockSpawn = currentTime;
  }

  // Handle math block collisions and bullet hits
  if (newState.mathBlocks) {
    const currentTime = Date.now();
    newState.mathBlocks = newState.mathBlocks.map(block => {
      block.y += MATH_BLOCK_SPEED;

      // Check for collision with any player in the formation
      for (let player of newState.playerFormation) {
        if (checkCollision(block, player)) {
          // Apply math operation
          const oldPlayerCount = newState.playerCount;
          newState.playerCount = Math.max(1, oldPlayerCount + block.value);
          console.log(`Math operation: ${oldPlayerCount} ${block.value >= 0 ? '+' : '-'} ${Math.abs(block.value)} = ${newState.playerCount}`);
          return null; // Remove the block after collision
        }
      }

      return block;
    }).filter(Boolean) as MathBlock[]; // Remove null blocks

    // Check for bullet hits on math blocks
    newState.bullets = newState.bullets.filter(bullet => {
      let bulletHit = false;
      newState.mathBlocks = newState.mathBlocks!.map(block => {
        if (!bulletHit && checkBulletMathBlockCollision(bullet, block)) {
          bulletHit = true;
          const cooldown = block.value >= 0 ? MATH_BLOCK_HIT_COOLDOWN_POSITIVE : MATH_BLOCK_HIT_COOLDOWN_NEGATIVE;
          
          if (currentTime - block.lastHitTime > cooldown) {
            block.lastHitTime = currentTime;
            
            if (block.value < 0) {
              block.value++;
            } else {
              // For positive values, make it harder to increase
              const incrementChance = Math.random();
              const difficultyFactor = 1 + block.value / 5; // Adjusted difficulty factor
              if (incrementChance < 1 / (block.value * difficultyFactor + 1)) {
                block.value++;
              }
            }

            if (block.value === 0) {
              block.value = 1; // Skip 0 and change to positive
              block.operation = '+';
            }
          }
        }
        return block;
      });
      return !bulletHit; // Remove the bullet if it hit a block
    });

    // Remove math blocks that are off screen
    newState.mathBlocks = newState.mathBlocks.filter(block => block.y <= gameSize.height);

    // If all blocks are removed, set mathBlocks to null
    if (newState.mathBlocks.length === 0) {
      newState.mathBlocks = null;
    }
  }

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

// Update the existing checkCollision function to handle both rectangles and circles
const checkCollision = (entity1: { x: number; y: number; width: number; height: number; scale?: number }, entity2: { x: number; y: number; width: number; height: number }) => {
  const e1Width = entity1.width * (entity1.scale || 1);
  const e1Height = entity1.height * (entity1.scale || 1);
  const e1Left = entity1.x;
  const e1Top = entity1.y;

  return (
    e1Left < entity2.x + entity2.width &&
    e1Left + e1Width > entity2.x &&
    e1Top < entity2.y + entity2.height &&
    e1Top + e1Height > entity2.y
  );
};

const checkCollisionWithZombie = (bullet: Bullet, zombie: Zombie | BossZombie) => {
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

// Remove the 'export' keyword from here
const handleCanvasClick = (state: GameState, clickX: number, clickY: number): GameState => {
  const newState = { ...state } as GameStateWithClick;
  newState.lastClickPosition = { x: clickX, y: clickY };
  newState.lastClickTime = Date.now();
  return newState;
};

const calculatePlayerFormation = (playerCount: number, baseX: number, baseY: number, gameSize: GameSize): Player[] => {
  const formation: Player[] = [];
  const actualPlayerCount = Math.max(1, playerCount);

  let cols, rows;

  if (actualPlayerCount <= 4) {
    cols = actualPlayerCount;
    rows = 1;
  } else if (actualPlayerCount <= 10) {
    cols = Math.ceil(actualPlayerCount / 2);
    rows = 2;
  } else {
    cols = Math.min(Math.ceil(actualPlayerCount / 3), MAX_FORMATION_WIDTH);
    rows = Math.ceil(actualPlayerCount / cols);
  }

  const formationWidth = (cols - 1) * (PLAYER_WIDTH + PLAYER_GAP) + PLAYER_WIDTH;
  const formationHeight = (rows - 1) * (PLAYER_HEIGHT + PLAYER_GAP) + PLAYER_HEIGHT;
  const startX = Math.max(0, Math.min(baseX, gameSize.width - formationWidth));
  const startY = Math.min(baseY, gameSize.height - formationHeight - BOTTOM_PADDING);

  let remainingPlayers = actualPlayerCount;

  for (let row = 0; row < rows; row++) {
    let rowPlayerCount;
    if (actualPlayerCount <= 4) {
      rowPlayerCount = actualPlayerCount;
    } else if (actualPlayerCount <= 10) {
      rowPlayerCount = row === 0 ? Math.ceil(actualPlayerCount / 2) : Math.floor(actualPlayerCount / 2);
    } else {
      rowPlayerCount = Math.min(cols, remainingPlayers);
    }
    
    let rowStartX = startX;
    if (rowPlayerCount < cols) {
      // Center the row if it's not full
      rowStartX += (formationWidth - ((rowPlayerCount - 1) * (PLAYER_WIDTH + PLAYER_GAP) + PLAYER_WIDTH)) / 2;
    }

    for (let col = 0; col < rowPlayerCount; col++) {
      const x = rowStartX + col * (PLAYER_WIDTH + PLAYER_GAP);
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

    remainingPlayers -= rowPlayerCount;
  }

  return formation;
};

const updateZombie = (zombie: Zombie | BossZombie, state: GameState, gameSize: GameSize): Zombie | BossZombie => {
  // Find the closest player
  if (state.playerFormation.length === 0) {
    // If there are no players, move the zombie towards the center of the screen
    const centerX = gameSize.width / 2;
    const centerY = gameSize.height / 2;
    const dx = centerX - zombie.x;
    const dy = centerY - zombie.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      zombie.x += (dx / distance) * zombie.speed;
      zombie.y += (dy / distance) * zombie.speed;
    }
  } else {
    const closestPlayer = state.playerFormation.reduce((closest, player) => {
      const distanceToPlayer = Math.sqrt(Math.pow(zombie.x - player.x, 2) + Math.pow(zombie.y - player.y, 2));
      const distanceToClosest = Math.sqrt(Math.pow(zombie.x - closest.x, 2) + Math.pow(zombie.y - closest.y, 2));
      return distanceToPlayer < distanceToClosest ? player : closest;
    }, state.playerFormation[0]);

    // Move towards the closest player
    const dx = closestPlayer.x - zombie.x;
    const dy = closestPlayer.y - zombie.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      zombie.x += (dx / distance) * zombie.speed;
      zombie.y += (dy / distance) * zombie.speed;
    }
  }

  // Update zombie scale based on y position (only for regular zombies)
  if (!('isActive' in zombie)) {
    const progressToPlayer = zombie.y / gameSize.height;
    zombie.scale = ZOMBIE_MIN_SCALE + (ZOMBIE_MAX_SCALE - ZOMBIE_MIN_SCALE) * progressToPlayer;
  }

  // Apply repulsion force from other zombies (only for regular zombies)
  if (!('isActive' in zombie)) {
    state.zombies.forEach(otherZombie => {
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

    // Keep regular zombies away from boss zombie
    if (state.bossZombie && state.bossZombie.isActive) {
      const dx = zombie.x - state.bossZombie.x;
      const dy = zombie.y - state.bossZombie.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = (zombie.width * zombie.scale + state.bossZombie.width * state.bossZombie.scale) / 2;

      if (distance < minDistance) {
        const angle = Math.atan2(dy, dx);
        zombie.x = state.bossZombie.x + Math.cos(angle) * minDistance;
        zombie.y = state.bossZombie.y + Math.sin(angle) * minDistance;
      }
    }
  }

  // Keep zombies within canvas boundaries
  const scaledRadius = ZOMBIE_RADIUS * zombie.scale;
  zombie.x = Math.max(scaledRadius, Math.min(gameSize.width - scaledRadius, zombie.x));
  zombie.y = Math.max(scaledRadius, Math.min(gameSize.height - scaledRadius, zombie.y));

  // Update zombie animation
  const currentTime = Date.now();
  const elapsedTime = currentTime - zombie.lastAnimationUpdate;
  const frameProgress = elapsedTime / ZOMBIE_ANIMATION_FRAME_DURATION;
  zombie.currentFrame = (zombie.currentFrame + frameProgress) % TOTAL_ZOMBIE_FRAMES;
  zombie.lastAnimationUpdate = currentTime;

  return zombie;
};

// Improve the bullet-math block collision detection
const checkBulletMathBlockCollision = (bullet: Bullet, block: MathBlock): boolean => {
  // Check if any part of the bullet overlaps with the block
  return (
    bullet.x < block.x + block.width &&
    bullet.x + bullet.width > block.x &&
    bullet.y < block.y + block.height &&
    bullet.y + bullet.height > block.y
  );
};

// Update the export statement at the end of the file
export { initializeAudio, updateGame, handleCanvasClick, resetGame };