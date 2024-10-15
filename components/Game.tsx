'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, initialGameState } from '../utils/gameState';
import { updateGame, handleCanvasClick as updateCanvasClick, initializeAudio } from '../utils/updateGame';
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
    setGameState(prevState => ({
      ...initialGameState,
      gameStarted: true,
      setGameState: prevState.setGameState,
    }));
  }, []);

  const restartGame = useCallback(() => {
    setGameState(prevState => ({
      ...initialGameState,
      gameStarted: true,
      setGameState: prevState.setGameState,
    }));
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
        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          className="border border-white"
          onClick={(e) => {
            handleCanvasClick(e);
            initAudioContext();
          }}
        />
        {!gameState.gameStarted && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <button
              onClick={startGame}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-2"
            >
              Start Game
            </button>
            {!audioInitialized && !audioInitError && (
              <p className="text-white">Initializing audio...</p>
            )}
            {audioInitError && (
              <p className="text-yellow-300 text-sm">{audioInitError}</p>
            )}
          </div>
        )}
        {gameState.gameOver && (
          <button
            onClick={restartGame}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Restart Game
          </button>
        )}
      </div>
    </div>
  );
};

export default Game;
