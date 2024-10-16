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

const AUDIO_INIT_TIMEOUT = 10000; // Increased to 10 seconds

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    ...initialGameState,
    setGameState: null as any,
  });
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [bulletSoundBuffer, setBulletSoundBuffer] = useState<AudioBuffer | null>(null);
  const [audioInitError, setAudioInitError] = useState<string | null>(null);

  useEffect(() => {
    const initAudio = async () => {
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
        console.log('Audio initialized successfully');
      } catch (error) {
        console.error('Failed to initialize audio:', error);
        setAudioInitError(`Audio initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    const audioInitTimeoutId = setTimeout(() => {
      if (!audioInitialized) {
        setAudioInitError('Audio initialization timed out. The game will start without sound.');
      }
    }, AUDIO_INIT_TIMEOUT);

    initAudio();

    return () => clearTimeout(audioInitTimeoutId);
  }, []);

  const startGame = useCallback(() => {
    console.log('Starting game');
    setGameState(resetGame());
  }, []);

  const restartGame = useCallback(() => {
    setGameState(resetGame());
    console.log('Game restarted');
  }, []);

  const updateGameState = useCallback(() => {
    if (gameState.gameStarted && !gameState.gameOver) {
      setGameState(prevState => updateGame(prevState, audioContext, bulletSoundBuffer));
    }
  }, [gameState.gameStarted, gameState.gameOver, audioContext, bulletSoundBuffer]);

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
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setGameState(prevState => updateCanvasClick(prevState, x, y));
    }
  }, []);

  const initAudioContext = useCallback(() => {
    if (audioContext) {
      audioContext.resume().then(() => {
        console.log('AudioContext resumed successfully');
      });
    }
  }, [audioContext]);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-800 overflow-hidden">
      <div className="relative w-[360px] h-[640px]">
        {(!gameState.gameStarted || gameState.gameOver) && (
          <video
            autoPlay
            loop
            muted
            className="absolute w-full h-full object-cover"
          >
            <source src="/background/background_video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
        {!gameState.gameOver && (
          <canvas
            ref={canvasRef}
            width={360}
            height={640}
            className="relative z-10 border border-white"
            onClick={(e) => {
              handleCanvasClick(e);
              initAudioContext();
            }}
          />
        )}
        {!gameState.gameStarted && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-20">
            <div className="text-center">
              <button
                onClick={startGame}
                className="px-8 py-4 bg-gradient-to-b from-yellow-400 to-orange-500 text-red-900 text-2xl font-bold rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl relative overflow-hidden"
              >
                <span className="relative z-10">Start Game</span>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-red-600 opacity-50 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-full h-2 bg-red-800 animate-drip"></div>
              </button>
              {!audioInitialized && !audioInitError && (
                <p className="text-white text-lg font-semibold animate-bounce mt-4">Initializing audio...</p>
              )}
              {audioInitError && (
                <p className="text-yellow-300 text-lg font-semibold mt-4">{audioInitError}</p>
              )}
            </div>
          </div>
        )}
        {gameState.gameOver && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-20">
            <div className="text-center bg-black bg-opacity-70 p-8 rounded-lg border-4 border-red-600">
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
