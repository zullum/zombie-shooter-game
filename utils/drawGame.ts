import { GameState, PLAYER_SPACING } from './gameState'; // Import PLAYER_SPACING

export const drawGame = (ctx: CanvasRenderingContext2D, state: GameState) => {
  // Clear the canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (!state.gameStarted) {
    // Draw start screen
    return;
  }

  // Draw players in formation
  ctx.fillStyle = 'blue';
  state.playerFormation.forEach(player => {
    ctx.fillRect(player.x, player.y, player.width, player.height);
  });

  // Draw zombies
  ctx.fillStyle = 'green';
  state.zombies.forEach(zombie => {
    ctx.fillRect(zombie.x, zombie.y, zombie.width, zombie.height);
  });

  // Draw bullets
  ctx.fillStyle = 'yellow';
  state.bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  // Draw score in top right corner
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`Score: ${state.score}`, ctx.canvas.width - 10, 20);

  // Draw player count below the score
  ctx.fillText(`Players: ${state.playerCount}`, ctx.canvas.width - 10, 40); // Added line for player count

  // Draw wave and health
  ctx.textAlign = 'left';
  ctx.fillText(`Wave: ${state.wave}`, 10, 20);
  ctx.fillText(`Health: ${state.player.health}`, 10, 40);

  // Draw math blocks
  if (state.mathBlocks) {
    state.mathBlocks.forEach(block => {
      ctx.fillStyle = block.operation === '+' || block.operation === '*' ? 'green' : 'red';
      ctx.fillRect(block.x, block.y, block.width, block.height);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${block.operation}${block.value}`, block.x + block.width / 2, block.y + block.height / 2 + 7);
    });
  }

  // Draw game over screen
  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', ctx.canvas.width / 2, ctx.canvas.height / 2 - 30);
    ctx.font = '20px Arial';
    ctx.fillText(`Final Score: ${state.score}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 30);
  }
};