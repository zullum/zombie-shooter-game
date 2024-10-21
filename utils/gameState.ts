import { INITIAL_WAVE_INTERVAL } from "@/constants";

interface SoundState {
  singleLaserSound: Howl | null;
  multipleLaserSound: Howl | null;
  isLaserPlaying: boolean;
}
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
  soundState: SoundState;
  isMultipleLaserPlaying: boolean;
  waveInterval: number;
  lastWaveTime: number;
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
  lastAttackTime: number;
  health: number; // Add this line
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
  mathBlocks: MathBlock[] | null;
  lastMathBlockSpawn: number;
  playerFormation: Player[];
  setGameState?: React.Dispatch<React.SetStateAction<GameState>>;
  lastClickPosition?: { x: number; y: number };
  lastClickTime?: number;
  bossZombie: BossZombie | null;
  waveInterval: number;
  lastWaveTime: number;
  lastBossSpawn: number;
  gameSize: GameSize;
  isMultipleLaserPlaying: boolean;
  isPaused: boolean;
  soundState: SoundState;
}

export interface Vector2D {
  x: number;
  y: number;
}

export type GameStateWithClick = GameState & {
  lastClickPosition: Vector2D | null;
  lastClickTime: number;
};

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

export interface GameSize {
  width: number;
  height: number;
}


export const initialGameState: GameState = {
  player: {
    x: 270, // Half of the new width
    y: 870, // Adjusted for new height
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
    soundState: {
      singleLaserSound: null,
      multipleLaserSound: null,
      isLaserPlaying: false,
    },
    isMultipleLaserPlaying: false,
    waveInterval: INITIAL_WAVE_INTERVAL,
    lastWaveTime: Date.now(),
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
  gameSize: { width: 540, height: 960 }, // Default size, will be updated in the Game component
  isMultipleLaserPlaying: false,
  isPaused: false,
  soundState: {
    singleLaserSound: null,
    multipleLaserSound: null,
    isLaserPlaying: false,
  },
};

export interface MathBlock {
  operation: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lastHitTime: number;
  positiveIncrements: number;
  positiveUpdateCount: number;
  lastPositiveUpdateTime: number;
}