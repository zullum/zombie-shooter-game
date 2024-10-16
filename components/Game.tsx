'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, initialGameState } from '../utils/gameState';
import { updateGame, handleCanvasClick as updateCanvasClick, initializeAudio, resetGame } from '../utils/updateGame';
import { drawGame } from '../utils/drawGame';
import { useGameLoop } from '../hooks/useGameLoop';

const playerImages = {
  idle: '/player/idle.png',
  running: '/player/running.png',
  shooting: '/player/shooting.png',
};

const AUDIO_INIT_TIMEOUT = 30000; // Increased to 30 seconds
const AUDIO_INIT_RETRY_INTERVAL = 5000; // Retry every 5 seconds

// Update these constants
const DESKTOP_WIDTH = 540;
const DESKTOP_HEIGHT = 900; // Reduced from 960 to allow for some padding
const PADDING_TOP = 40; // Padding for the top area
const PADDING_BOTTOM = 20; // Padding for the bottom area

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

  const initAudio = useCallback(async () => {
    try {
      console.log('Starting audio initialization...');
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(context);
      console.log('AudioContext created:', context);

      const audioFilePath = '/audio/deserteagle.mp3';
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
    // Initialize background music
    const music = new Audio('/audio/background_music.mp3');
    music.loop = true;
    music.volume = 0.5; // Set volume to 50%
    setBackgroundMusic(music);

    // Start playing the music
    const playMusic = () => {
      music.play().catch(error => console.error("Error playing background music:", error));
    };

    // Try to play immediately (might not work due to autoplay restrictions)
    playMusic();

    // Add event listener to play music on first user interaction
    const handleInteraction = () => {
      playMusic();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    // Cleanup function
    return () => {
      music.pause();
      music.currentTime = 0;
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const startGame = useCallback(() => {
    console.log('Starting game');
    setGameState(resetGame());
    if (backgroundMusic) {
      backgroundMusic.play().catch(error => console.error("Error playing background music:", error));
    }
  }, [backgroundMusic]);

  const restartGame = useCallback(() => {
    setGameState(resetGame());
    console.log('Game restarted');
    if (backgroundMusic) {
      backgroundMusic.currentTime = 0; // Restart the music from the beginning
      backgroundMusic.play().catch(error => console.error("Error playing background music:", error));
    }
  }, [backgroundMusic]);

  const updateGameState = useCallback(() => {
    if (gameState.gameStarted && !gameState.gameOver) {
      setGameState(prevState => updateGame(prevState, audioContext, bulletSoundBuffer, gameSize));
    }
  }, [gameState.gameStarted, gameState.gameOver, audioContext, bulletSoundBuffer, gameSize]);

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
    // Preload images
    Object.values(playerImages).forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    console.log('Drawing game', gameState);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawGame(ctx, gameState);
      }
    }
  }, [gameState]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      setGameState(prevState => updateCanvasClick(prevState, x, y));
    }
  }, []);

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
    <div className="w-screen h-screen flex items-center justify-center bg-gray-800 overflow-hidden">
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
        
        {gameState.gameStarted && !gameState.gameOver && (
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-20 border border-white"
            width={gameSize.width}
            height={gameSize.height}
            onClick={(e) => {
              handleCanvasClick(e);
              initAudioContext();
            }}
          />
        )}
        
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
      </div>
    </div>
  );
};

export default Game;
