'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, initialGameState } from '../utils/gameState';
import { updateGame, handleCanvasClick as updateCanvasClick } from '../utils/updateGame';
import { drawGame } from '../utils/drawGame';
import { useGameLoop } from '../hooks/useGameLoop';

const playerImages = {
  idle: '/player/idle.png',
  running: '/player/running.png',
  shooting: '/player/shooting.png',
};

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const startGame = () => {
    console.log('Starting game');
    setGameState(prevState => {
      const newState = {
        ...initialGameState,
        gameStarted: true
      };
      console.log('Initial game state:', newState);
      return newState;
    });
  };

  const restartGame = () => {
    setGameState({ ...initialGameState, gameStarted: true });
    console.log('Game restarted'); // Debugging log
  };

  const updateGameState = useCallback(() => {
    if (gameState?.gameStarted && !gameState?.gameOver) {
      setGameState(prevState => {
        const updatedState = updateGame(prevState);
        console.log('Game state updated:', updatedState.gameStarted, updatedState.gameOver);
        return updatedState;
      });
    }
  }, [gameState?.gameStarted, gameState?.gameOver]);

  useGameLoop(updateGameState);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
          setGameState(prev => ({ 
            ...prev, 
            player: { ...prev.player, movingLeft: true } 
          }));
          break;
        case 'arrowright':
        case 'd':
          setGameState(prev => ({ 
            ...prev, 
            player: { ...prev.player, movingRight: true } 
          }));
          break;
        case 'arrowup':
        case 'w':
          setGameState(prev => ({ 
            ...prev, 
            player: { ...prev.player, movingUp: true } 
          }));
          break;
        case 'arrowdown':
        case 's':
          setGameState(prev => ({ 
            ...prev, 
            player: { ...prev.player, movingDown: true } 
          }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
          setGameState(prev => ({ 
            ...prev, 
            player: { ...prev.player, movingLeft: false } 
          }));
          break;
        case 'arrowright':
        case 'd':
          setGameState(prev => ({ 
            ...prev, 
            player: { ...prev.player, movingRight: false } 
          }));
          break;
        case 'arrowup':
        case 'w':
          setGameState(prev => ({ 
            ...prev, 
            player: { ...prev.player, movingUp: false } 
          }));
          break;
        case 'arrowdown':
        case 's':
          setGameState(prev => ({ 
            ...prev, 
            player: { ...prev.player, movingDown: false } 
          }));
          break;
      }
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

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-800 overflow-hidden">
      <div className="relative w-[360px] h-[640px]">
        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          className="border border-white"
          onClick={handleCanvasClick}
        />
        {!gameState.gameStarted && (
          <button
            onClick={startGame}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Start Game
          </button>
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
