export const PLAYER_SPACING = 40; // Define player spacing

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number; // Player speed
  movingLeft: boolean;
  movingRight: boolean;
  lastShot: number;
  health: number;
}

export interface Zombie {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
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
}

export interface MathPuzzle {
  question: string;
  correctAnswer: number;
  userAnswer: number | null;
}

export const initialGameState: GameState = {
  player: {
    x: 180,
    y: 580,
    width: 30,
    height: 30,
    speed: 10,
    movingLeft: false,
    movingRight: false,
    lastShot: 0,
    health: 100,
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
};

const PADDING = 0.2; // 20% padding