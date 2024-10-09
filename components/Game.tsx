'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, initialGameState } from '../utils/gameState';
import { updateGame } from '../utils/updateGame';
import { drawGame } from '../utils/drawGame';
import { useGameLoop } from '../hooks/useGameLoop';

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
    if (gameState.gameStarted && !gameState.gameOver) {
      setGameState(prevState => {
        const updatedState = updateGame(prevState);
        console.log('Game state updated:', updatedState.gameStarted, updatedState.gameOver);
        return updatedState;
      });
    }
  }, [gameState.gameStarted, gameState.gameOver]);

  useGameLoop(updateGameState);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setGameState(prev => ({ 
          ...prev, 
          player: { ...prev.player, movingLeft: true } 
        }));
      } else if (e.key === 'ArrowRight') {
        setGameState(prev => ({ 
          ...prev, 
          player: { ...prev.player, movingRight: true } 
        }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setGameState(prev => ({ 
          ...prev, 
          player: { ...prev.player, movingLeft: false } 
        }));
      } else if (e.key === 'ArrowRight') {
        setGameState(prev => ({ 
          ...prev, 
          player: { ...prev.player, movingRight: false } 
        }));
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
    console.log('Drawing game', gameState);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawGame(ctx, gameState);
      }
    }
  }, [gameState]);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-800 overflow-hidden">
      <div className="relative w-[360px] h-[640px]">
        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          className="border border-white"
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