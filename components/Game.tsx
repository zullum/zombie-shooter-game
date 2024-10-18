'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, initialGameState } from '../utils/gameState';
import { updateGame, handleCanvasClick as updateCanvasClick, initializeAudio, resetGame } from '../utils/updateGame';
import { drawGame } from '../utils/drawGame';
import { useGameLoop } from '../hooks/useGameLoop';

const AUDIO_INIT_TIMEOUT = 30000; // Increased to 30 seconds
const AUDIO_INIT_RETRY_INTERVAL = 5000; // Retry every 5 seconds

// Update these constants
const DESKTOP_WIDTH = 540;
const DESKTOP_HEIGHT = 900; // Reduced from 960 to allow for some padding
const PADDING_TOP = 40; // Padding for the top area
const PADDING_BOTTOM = 20; // Padding for the bottom area

const CLICK_TIMEOUT = 1000; // 1 second cooldown for shooting direction

const Crosshair = ({ isActive, style }: { isActive: boolean; style: React.CSSProperties }) => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 937.4 937.4"
    style={{ position: 'absolute', pointerEvents: 'none', ...style }}
  >
    <path
      d="M887.4,418.7h-31.8c-4.5-35-13.7-69.1-27.5-101.8c-19.601-46.4-47.801-88.2-83.601-124c-35.8-35.8-77.5-63.9-124-83.6
      c-32.7-13.8-66.8-23-101.8-27.5V50c0-27.6-22.4-50-50-50s-50,22.4-50,50v31.8c-35,4.5-69.1,13.7-101.8,27.5
      c-46.4,19.6-88.2,47.8-124,83.6c-35.8,35.8-63.9,77.5-83.6,124c-13.8,32.7-23,66.8-27.5,101.8H50c-27.6,0-50,22.4-50,50
      c0,27.601,22.4,50,50,50h31.8c4.5,35,13.7,69.102,27.5,101.801c19.6,46.4,47.8,88.199,83.6,124c35.8,35.801,77.5,63.9,124,83.6
      c32.7,13.801,66.8,23,101.8,27.5V887.4c0,27.6,22.4,50,50,50s50-22.4,50-50V855.6c35-4.5,69.1-13.699,101.8-27.5
      c46.4-19.6,88.2-47.799,124-83.6s63.9-77.5,83.601-124c13.8-32.699,23-66.801,27.5-101.801h31.8c27.6,0,50-22.398,50-50
      C937.4,441.1,915,418.7,887.4,418.7z M730,518.699h24.4C744.3,577.1,716.5,631,673.7,673.801c-42.8,42.799-96.6,70.6-155.1,80.699
      v-24.4c0-27.6-22.4-50-50-50c-27.601,0-50,22.4-50,50v24.4C360.2,744.4,306.3,716.6,263.5,673.801
      c-42.8-42.801-70.6-96.602-80.7-155.102h24.4c27.6,0,50-22.398,50-50c0-27.6-22.4-50-50-50h-24.4
      c10.1-58.399,37.9-112.3,80.7-155.1s96.601-70.6,155.101-80.7v24.4c0,27.6,22.399,50,50,50c27.6,0,50-22.4,50-50v-24.4
      C577,193,630.9,220.8,673.7,263.6s70.6,96.6,80.7,155.1H730c-27.6,0-50,22.4-50,50C680,496.301,702.4,518.699,730,518.699z"
      fill={isActive ? "red" : "green"}
    />
  </svg>
);

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    ...initialGameState,
    setGameState: null as any,
  });
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [bulletSoundBuffer, setBulletSoundBuffer] = useState<AudioBuffer | null>(null);
  const [audioInitError, setAudioInitError] = useState<string | null>(null);
  const [gameSize, setGameSize] = useState({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
  const [isMobile, setIsMobile] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
  const [backgroundMusic, setBackgroundMusic] = useState<HTMLAudioElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isShootingDirectionActive, setIsShootingDirectionActive] = useState(false);

  const initAudio = useCallback(async () => {
    try {
      console.log('Starting audio initialization...');
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(context);
      console.log('AudioContext created:', context);

      const audioFilePath = '/audio/laser_single.mp3';
      console.log('Attempting to fetch audio file from:', audioFilePath);
      const response = await fetch(audioFilePath);
      console.log('Fetch response:', response);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, url: ${response.url}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('ArrayBuffer loaded, size:', arrayBuffer.byteLength);

      const soundBuffer = await context.decodeAudioData(arrayBuffer);
      console.log('Audio buffer decoded:', soundBuffer);

      setBulletSoundBuffer(soundBuffer);
      setAudioInitialized(true);
      setAudioInitError(null);
      console.log('Audio initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      setAudioInitError(`Audio initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      // Retry audio initialization
      setTimeout(initAudio, AUDIO_INIT_RETRY_INTERVAL);
    }
  }, []);

  useEffect(() => {
    initAudio();

    const audioInitTimeoutId = setTimeout(() => {
      if (!audioInitialized) {
        console.log('Audio initialization timed out. The game will start without sound, but we\'ll keep trying to initialize audio.');
      }
    }, AUDIO_INIT_TIMEOUT);

    return () => clearTimeout(audioInitTimeoutId);
  }, [initAudio]);

  useEffect(() => {
    // Initialize gameplay background music
    const gameMusic = new Audio('/audio/background_music.mp3');
    gameMusic.loop = true;
    gameMusic.volume = 0.5;
    setBackgroundMusic(gameMusic);

    // Cleanup function
    return () => {
      gameMusic.pause();
    };
  }, []);

  useEffect(() => {
    // Control audio based on game state
    if (backgroundMusic) {
      if (gameState.gameStarted && !gameState.gameOver && !isPaused) {
        backgroundMusic.play().catch(error => console.error("Error playing background music:", error));
      } else {
        backgroundMusic.pause();
      }
    }
  }, [gameState.gameStarted, gameState.gameOver, isPaused, backgroundMusic]);

  // Add this new effect to handle shooting sounds
  useEffect(() => {
    if (isPaused) {
      // Pause all active shooting sounds
      const shootingSounds = document.querySelectorAll('audio[data-sound="shooting"]');
      shootingSounds.forEach((sound: HTMLAudioElement) => sound.pause());
    }
  }, [isPaused]);

  const startGame = useCallback(() => {
    console.log('Starting game');
    setGameState(resetGame());
    if (backgroundMusic) {
      backgroundMusic.currentTime = 0;
      backgroundMusic.play().catch(error => console.error("Error playing background music:", error));
    }
  }, [backgroundMusic]);

  const restartGame = useCallback(() => {
    setGameState(resetGame());
    console.log('Game restarted');
    if (backgroundMusic) {
      backgroundMusic.currentTime = 0;
      backgroundMusic.play().catch(error => console.error("Error playing background music:", error));
    }
  }, [backgroundMusic]);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
    if (backgroundMusic) {
      backgroundMusic.play().catch(error => console.error("Error resuming background music:", error));
    }
    // Resume all paused shooting sounds
    const shootingSounds = document.querySelectorAll('audio[data-sound="shooting"]');
    shootingSounds.forEach((sound: HTMLAudioElement) => {
      if (sound.paused) {
        sound.play().catch(error => console.error("Error resuming shooting sound:", error));
      }
    });
  }, [backgroundMusic]);

  const pauseGame = useCallback(() => {
    setIsPaused(true);
    if (backgroundMusic) {
      backgroundMusic.pause();
    }
    // Pause all active shooting sounds
    const shootingSounds = document.querySelectorAll('audio[data-sound="shooting"]');
    shootingSounds.forEach((sound: HTMLAudioElement) => sound.pause());
  }, [backgroundMusic]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState.gameStarted && !gameState.gameOver) {
        if (isPaused) {
          resumeGame();
        } else {
          pauseGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.gameStarted, gameState.gameOver, isPaused, resumeGame, pauseGame]);

  const updateGameState = useCallback(() => {
    if (gameState.gameStarted && !gameState.gameOver && !isPaused) {
      setGameState(prevState => updateGame(prevState, audioContext, bulletSoundBuffer, gameSize));
    }
  }, [gameState.gameStarted, gameState.gameOver, isPaused, audioContext, bulletSoundBuffer, gameSize]);

  useGameLoop(updateGameState);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setGameState(prev => {
        const newPlayer = { ...prev.player };
        switch (e.key.toLowerCase()) {
          case 'arrowleft':
          case 'a':
            newPlayer.movingLeft = true;
            break;
          case 'arrowright':
          case 'd':
            newPlayer.movingRight = true;
            break;
          case 'arrowup':
          case 'w':
            newPlayer.movingUp = true;
            break;
          case 'arrowdown':
          case 's':
            newPlayer.movingDown = true;
            break;
        }
        return { ...prev, player: newPlayer };
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setGameState(prev => {
        const newPlayer = { ...prev.player };
        switch (e.key.toLowerCase()) {
          case 'arrowleft':
          case 'a':
            newPlayer.movingLeft = false;
            break;
          case 'arrowright':
          case 'd':
            newPlayer.movingRight = false;
            break;
          case 'arrowup':
          case 'w':
            newPlayer.movingUp = false;
            break;
          case 'arrowdown':
          case 's':
            newPlayer.movingDown = false;
            break;
        }
        return { ...prev, player: newPlayer };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawGame(ctx, gameState);
      }
    }
  }, [gameState]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const scaleX = gameSize.width / rect.width;
      const scaleY = gameSize.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      setMousePosition({ x, y });
    }
  }, [gameSize]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const scaleX = gameSize.width / rect.width;
      const scaleY = gameSize.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      if (gameState.gameStarted && !gameState.gameOver && !isPaused) {
        setGameState(prevState => updateCanvasClick(prevState, x, y));
        setIsShootingDirectionActive(true);
        setTimeout(() => setIsShootingDirectionActive(false), CLICK_TIMEOUT);
      }
    }
  }, [gameState.gameStarted, gameState.gameOver, isPaused, gameSize]);

  const initAudioContext = useCallback(() => {
    if (audioContext) {
      audioContext.resume().then(() => {
        console.log('AudioContext resumed successfully');
        if (!audioInitialized) {
          initAudio(); // Try to initialize audio again if it wasn't successful before
        }
      });
    } else if (!audioInitialized) {
      initAudio(); // Try to initialize audio if it wasn't successful before
    }
  }, [audioContext, audioInitialized, initAudio]);

  useEffect(() => {
    const handleResize = () => {
      const isMobileDevice = window.innerWidth <= 768;
      setIsMobile(isMobileDevice);

      if (isMobileDevice) {
        setGameSize({ width: window.innerWidth, height: window.innerHeight });
        setContainerSize({ width: window.innerWidth, height: window.innerHeight });
      } else {
        const aspectRatio = DESKTOP_WIDTH / DESKTOP_HEIGHT;
        const maxHeight = window.innerHeight;
        const width = Math.min(DESKTOP_WIDTH, maxHeight * aspectRatio);
        const height = width / aspectRatio;
        setGameSize({ width, height });
        setContainerSize({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = gameSize.width;
      canvas.height = gameSize.height;
    }
  }, [gameSize]);

  useEffect(() => {
    const video = document.querySelector('video');
    if (video) {
      console.log('Video element dimensions:', video.getBoundingClientRect());
      console.log('Video natural size:', video.videoWidth, 'x', video.videoHeight);
    }
  }, [gameState.gameStarted, gameState.gameOver]);

  return (
    <div 
      className="w-screen h-screen flex items-center justify-center bg-gray-800 overflow-hidden"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ cursor: 'none' }} // Hide the default cursor on all screens
    >
      <div 
        ref={containerRef} 
        className="relative bg-gray-800"
        style={{
          width: `${containerSize.width}px`,
          height: `${containerSize.height}px`,
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
      >
        {/* Background video */}
        {(!gameState.gameStarted || gameState.gameOver) && (
          <video
            key={gameState.gameOver ? "gameOver" : "start"}
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover z-10"
          >
            <source src="/background/background_video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
        
        {/* Game canvas */}
        {gameState.gameStarted && !gameState.gameOver && (
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-20 border border-white"
            width={gameSize.width}
            height={gameSize.height}
          />
        )}
        
        {/* Crosshair - now visible on all screens */}
        <Crosshair 
          isActive={isShootingDirectionActive && gameState.gameStarted && !gameState.gameOver && !isPaused}
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 30,
          }}
        />
        
        {/* Start screen */}
        {!gameState.gameStarted && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-30">
            <div className="text-center">
              <button
                onClick={() => {
                  startGame();
                  initAudioContext();
                }}
                className="px-8 py-4 bg-gradient-to-b from-yellow-400 to-orange-500 text-red-900 text-2xl font-bold rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl relative overflow-hidden"
              >
                <span className="relative z-10">Start Game</span>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-red-600 opacity-50 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-full h-2 bg-red-800 animate-drip"></div>
              </button>
              {!audioInitialized && !audioInitError && (
                <p className="text-white text-lg font-semibold animate-bounce mt-4">Initializing audio...</p>
              )}
            </div>
          </div>
        )}
        
        {/* Game over screen */}
        {gameState.gameOver && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-30">
            <div className="text-center bg-black bg-opacity-70 p-8 rounded-lg border-4 border-red-600 mx-4">
              <h2 className="text-6xl font-bold text-red-600 mb-8 animate-pulse shadow-text">Game Over</h2>
              <p className="text-4xl text-yellow-400 mb-4 shadow-text">
                Final Score: <span className="font-bold">{gameState.score}</span>
              </p>
              <p className="text-4xl text-yellow-400 mb-8 shadow-text">
                Waves Survived: <span className="font-bold">{gameState.wave - 1}</span>
              </p>
              <button
                onClick={restartGame}
                className="px-8 py-4 bg-gradient-to-b from-yellow-400 to-orange-500 text-red-900 text-2xl font-bold rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl relative overflow-hidden"
              >
                <span className="relative z-10">Restart Game</span>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-red-600 opacity-50 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-full h-2 bg-red-800 animate-drip"></div>
              </button>
            </div>
          </div>
        )}
        
        {/* Pause screen */}
        {isPaused && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-30">
            <div className="text-center bg-black bg-opacity-70 p-8 rounded-lg border-4 border-yellow-600 mx-4">
              <h2 className="text-6xl font-bold text-yellow-600 mb-8 animate-pulse shadow-text">Game Paused</h2>
              <button
                onClick={resumeGame}
                className="px-8 py-4 bg-gradient-to-b from-yellow-400 to-orange-500 text-red-900 text-2xl font-bold rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl relative overflow-hidden"
              >
                <span className="relative z-10">Resume Game</span>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-red-600 opacity-50 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-full h-2 bg-red-800 animate-drip"></div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
