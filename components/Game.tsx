'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, initialGameState } from '../utils/gameState';
import { updateGame, handleCanvasClick as updateCanvasClick, initializeAudio, resetGame, pauseGameSounds, resumeGameSounds } from '../utils/updateGame';
import { drawGame } from '../utils/drawGame';
import { useGameLoop } from '../hooks/useGameLoop';
import Crosshair from './crosshair/crosshair';
import styles from './Game.module.css'; // If you're using CSS modules
import { useSwipeable } from 'react-swipeable'; // You'll need to install this package

const AUDIO_INIT_TIMEOUT = 30000; // Increased to 30 seconds
const AUDIO_INIT_RETRY_INTERVAL = 5000; // Retry every 5 seconds
const DESKTOP_WIDTH = 540;
const DESKTOP_HEIGHT = 900; // Reduced from 960 to allow for some padding
const CLICK_TIMEOUT = 1000; // 1 second cooldown for shooting direction
const SWIPE_SPEED_MULTIPLIER = 0.2; // Reduced from 0.5 to 0.2

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
  const [isPulsing, setIsPulsing] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isShootingDirectionActive, setIsShootingDirectionActive] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [isSwipingHorizontally, setIsSwipingHorizontally] = useState(false);

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
        setIsPaused(prev => !prev);
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 300); // Pulse effect duration
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.gameStarted, gameState.gameOver]);

  useEffect(() => {
    if (isPaused) {
      pauseGameSounds();
    } else {
      resumeGameSounds(gameState);
    }
  }, [isPaused, gameState]);

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
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setMousePosition({ x, y });
    }
  }, []);

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

  const updateGameSize = useCallback(() => {
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
  }, []);

  useEffect(() => {
    updateGameSize();

    const handleResize = () => {
      updateGameSize();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Add event listener for fullscreenchange
    document.addEventListener('fullscreenchange', handleResize);

    // Use requestAnimationFrame to check for height changes
    let lastHeight = window.innerHeight;
    const checkHeight = () => {
      if (window.innerHeight !== lastHeight) {
        lastHeight = window.innerHeight;
        updateGameSize();
      }
      requestAnimationFrame(checkHeight);
    };
    checkHeight();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, [updateGameSize]);

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

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    setIsTouching(true);
    setSwipeStartX(event.touches[0].clientX);
    setIsSwipingHorizontally(false);
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (isTouching) {
      const touchX = event.touches[0].clientX;
      const deltaX = touchX - swipeStartX;

      // Determine if it's a horizontal swipe
      if (Math.abs(deltaX) > 10 && !isSwipingHorizontally) {
        setIsSwipingHorizontally(true);
      }

      if (isSwipingHorizontally) {
        const moveAmount = deltaX * SWIPE_SPEED_MULTIPLIER;
        setGameState(prevState => {
          const newX = Math.max(0, Math.min(gameSize.width - prevState.player.width, prevState.player.x + moveAmount));
          return {
            ...prevState,
            player: {
              ...prevState.player,
              x: newX,
              movingLeft: deltaX < 0,
              movingRight: deltaX > 0,
            },
          };
        });
        setSwipeStartX(touchX);
      }
    }
  }, [isTouching, swipeStartX, isSwipingHorizontally, gameSize.width]);

  const handleTouchEnd = useCallback(() => {
    setIsTouching(false);
    setIsSwipingHorizontally(false);
    setGameState(prevState => ({
      ...prevState,
      player: {
        ...prevState.player,
        movingLeft: false,
        movingRight: false,
      },
    }));
  }, []);

  const handleTap = useCallback((event: React.TouchEvent) => {
    if (!isSwipingHorizontally && gameState.gameStarted && !gameState.gameOver && !isPaused) {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const scaleX = gameSize.width / rect.width;
        const scaleY = gameSize.height / rect.height;
        const x = (event.touches[0].clientX - rect.left) * scaleX;
        const y = (event.touches[0].clientY - rect.top) * scaleY;

        setGameState(prevState => updateCanvasClick(prevState, x, y));
        setIsShootingDirectionActive(true);
        setTimeout(() => setIsShootingDirectionActive(false), CLICK_TIMEOUT);
      }
    }
  }, [gameState.gameStarted, gameState.gameOver, isPaused, gameSize, isSwipingHorizontally]);

  return (
    <div 
      className="w-screen h-screen flex items-center justify-center bg-gray-800 overflow-hidden"
      onClick={handleClick}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        touchAction: 'none' // Prevent default touch actions
      }}
    >
      <div 
        ref={containerRef} 
        className={`relative ${styles.gameContainer}`}
        style={{
          width: `${containerSize.width}px`,
          height: `${containerSize.height}px`,
          maxWidth: '100vw',
          maxHeight: '100vh',
          cursor: 'none',
        }}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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
        
        {/* Game background and canvas */}
        {gameState.gameStarted && !gameState.gameOver && (
          <>
            <div className={styles.gameBackground}></div>
            <canvas
              ref={canvasRef}
              className={styles.gameCanvas}
              width={gameSize.width}
              height={gameSize.height}
            />
          </>
        )}
        
        {/* Crosshair */}
        <Crosshair 
          isActive={isShootingDirectionActive}
          style={{
            position: 'absolute',
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            pointerEvents: 'none',
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
          <div className={`absolute top-0 left-0 w-full h-full flex items-center justify-center z-30 ${isPulsing ? 'animate-pulse' : ''}`}>
            <div className="text-center bg-black bg-opacity-70 p-8 rounded-lg border-4 border-yellow-600 mx-4">
              <h2 className="text-6xl font-bold text-yellow-600 mb-8 animate-pulse shadow-text">Game is paused</h2>
              <button
                onClick={() => setIsPaused(false)}
                className="px-8 py-4 bg-gradient-to-b from-yellow-400 to-orange-500 text-red-900 text-2xl font-bold rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl relative overflow-hidden"
              >
                <span className="relative z-10">Resume Game</span>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-red-600 opacity-50 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-full h-2 bg-red-800 animate-drip"></div>
              </button>
            </div>
          </div>
        )}
        
        {/* Modify this part for mobile tapping */}
        {isMobile && gameState.gameStarted && !gameState.gameOver && !isPaused && (
          <div 
            className="absolute top-0 left-0 w-full h-full z-20"
            onTouchEnd={handleTap}
          />
        )}
      </div>
    </div>
  );
};

export default Game;
