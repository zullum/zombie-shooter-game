export const PLAYER_SPACING = 40; // Define player spacing

// Add this constant
export const INITIAL_WAVE_INTERVAL = 20000; // 20 seconds between waves initially

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number; // Player speed
  movingLeft: boolean;
  movingRight: boolean;
  movingUp: boolean;
  movingDown: boolean;
  lastShot: number;
  health: number;
  currentFrame: number;
  animationState: 'idle' | 'running' | 'shooting';
  lastAnimationUpdate: number;
}

export interface Zombie {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  currentFrame: number;
  lastAnimationUpdate: number;
  scale: number; // Add this new property
}

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  direction: { x: number; y: number };
  trail: { x: number; y: number }[];
  creationTime: number;
  glowIntensity: number;
  visible: boolean;
}

export interface MathBlock {
  operation: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  player: Player;
  zombies: Zombie[];
  bullets: Bullet[];
  score: number;
  wave: number;
  lastZombieSpawn: number;
  gameOver: boolean;
  gameStarted: boolean;
  playerCount: number;
  lastPuzzleTime: number;
  currentPuzzle: MathPuzzle | null;
  mathBlocks: MathBlock[] | null; // Change this from [MathBlock, MathBlock] to MathBlock[]
  lastMathBlockSpawn: number;
  playerFormation: Player[];
  setGameState?: React.Dispatch<React.SetStateAction<GameState>>;
  lastClickPosition?: { x: number; y: number };
  lastClickTime?: number;
  bossZombie: BossZombie | null;
  waveInterval: number;
  lastWaveTime: number;
  lastBossSpawn: number;
}

export interface MathPuzzle {
  question: string;
  correctAnswer: number;
  userAnswer: number | null;
}

export interface BossZombie extends Zombie {
  isActive: boolean;
  maxHealth: number;
  currentHealth: number;
  playersEliminatedPerAttack: number;
}

export const initialGameState: GameState = {
  player: {
    x: 180,
    y: 580,
    width: 60,  // Adjust if needed
    height: 60, // Adjust if needed
    speed: 10,
    movingLeft: false,
    movingRight: false,
    movingUp: false,
    movingDown: false,
    lastShot: 0,
    health: 100,
    currentFrame: 0,
    animationState: 'idle',
    lastAnimationUpdate: 0,
  },
  zombies: [],
  bullets: [],
  score: 0,
  wave: 1,
  lastZombieSpawn: 0,
  gameOver: false,
  gameStarted: false, // Ensure this is false initially
  playerCount: 1,
  lastPuzzleTime: 0,
  currentPuzzle: null,
  mathBlocks: null,
  lastMathBlockSpawn: 0,
  playerFormation: [],
  bossZombie: null,
  waveInterval: INITIAL_WAVE_INTERVAL,
  lastWaveTime: Date.now(),
  lastBossSpawn: 0,
};

const PADDING = 0.2; // 20% padding




