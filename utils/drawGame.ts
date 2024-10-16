import { GameState, Player, Zombie, BossZombie } from './gameState';

const TOTAL_PLAYER_FRAMES = 15;
const TOTAL_ZOMBIE_FRAMES = 8; // Adjust this based on the actual number of zombie frames
const playerImages: HTMLImageElement[] = [];
const zombieImages: HTMLImageElement[] = [];

// Load all player images
for (let i = 1; i <= TOTAL_PLAYER_FRAMES; i++) {
  const img = new Image();
  img.src = `/player/player_${i.toString().padStart(3, '0')}.png`;
  playerImages.push(img);
}

// Load all zombie images
for (let i = 1; i <= TOTAL_ZOMBIE_FRAMES; i++) {
  const img = new Image();
  img.src = `/zombie/zombie_${i.toString().padStart(3, '0')}.png`;
  zombieImages.push(img);
}

// Add flags to track if images are loaded
let playerImagesLoaded = false;
let zombieImagesLoaded = false;

// Load player images
Promise.all(playerImages.map(img => new Promise(resolve => {
  img.onload = () => {
    console.log(`Player image loaded: ${img.src}, dimensions: ${img.width}x${img.height}`);
    resolve(null);
  };
  img.onerror = () => {
    console.error(`Failed to load player image: ${img.src}`);
    resolve(null);
  };
}))).then(() => {
  playerImagesLoaded = true;
  console.log('All player images loaded');
});

// Load zombie images
Promise.all(zombieImages.map(img => new Promise(resolve => {
  img.onload = () => {
    console.log(`Zombie image loaded: ${img.src}, dimensions: ${img.width}x${img.height}`);
    resolve(null);
  };
  img.onerror = () => {
    console.error(`Failed to load zombie image: ${img.src}`);
    resolve(null);
  };
}))).then(() => {
  zombieImagesLoaded = true;
  console.log('All zombie images loaded');
});

// Add this at the top of the file
const bulletSound = new Audio('/audio/deserteagle.mp3');

export const drawGame = (ctx: CanvasRenderingContext2D, state: GameState) => {
  // Clear the canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (!state.gameStarted) {
    // Draw start screen
    return;
  }

  // Draw players in formation
  state.playerFormation.forEach((player, index) => {
    drawPlayer(ctx, player, index);
  });

  // Draw zombies
  state.zombies.forEach((zombie, index) => {
    drawZombie(ctx, zombie, index);
  });

  // Draw boss zombie
  if (state.bossZombie && state.bossZombie.isActive) {
    drawBossZombie(ctx, state.bossZombie);
  }

  // Draw bullets with enhanced appearance
  state.bullets.forEach(bullet => {
    console.log('Drawing bullet:', bullet); // Add this line
    if (bullet.visible) {
      // Draw bullet trail
      if (bullet.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(bullet.trail[0].x, bullet.trail[0].y);
        for (let i = 1; i < bullet.trail.length; i++) {
          ctx.lineTo(bullet.trail[i].x, bullet.trail[i].y);
        }
        ctx.strokeStyle = `rgba(255, 255, 0, ${0.1 * bullet.glowIntensity})`; // Adjusted opacity
        ctx.lineWidth = 2; // Fixed width for trail
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Draw bullet
      ctx.fillStyle = `rgba(255, 255, 100, ${bullet.glowIntensity})`;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw bullet glow
      const glowGradient = ctx.createRadialGradient(
        bullet.x, bullet.y, 0,
        bullet.x, bullet.y, bullet.width * 2
      );
      glowGradient.addColorStop(0, `rgba(255, 255, 100, ${bullet.glowIntensity * 0.5})`);
      glowGradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.width * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Draw score in top right corner
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`Score: ${state.score}`, ctx.canvas.width - 10, 20);

  // Draw player count below the score
  ctx.fillText(`Players: ${state.playerCount}`, ctx.canvas.width - 10, 40);

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
};

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, index: number) {
  if (playerImagesLoaded) {
    const currentFrame = Math.floor(player.currentFrame) % TOTAL_PLAYER_FRAMES;
    const image = playerImages[currentFrame];
    if (image && image.complete && image.naturalWidth !== 0) {
      const scale = Math.max(player.width / image.width, player.height / image.height);
      const frameWidth = image.width * scale;
      const frameHeight = image.height * scale;
      
      ctx.drawImage(
        image,
        player.x + player.width / 2 - frameWidth / 2,
        player.y + player.height - frameHeight,
        frameWidth,
        frameHeight
      );

      console.log(`Player ${index} drawn:`, {
        currentFrame,
        animationState: player.animationState,
        x: player.x,
        y: player.y,
        playerWidth: player.width,
        playerHeight: player.height,
        frameWidth,
        frameHeight,
        imageWidth: image.width,
        imageHeight: image.height
      });
    } else {
      console.error(`Player image not loaded for frame: ${currentFrame}`);
      fallbackDrawPlayer(ctx, player);
    }
  } else {
    console.warn('Player images not loaded yet');
    fallbackDrawPlayer(ctx, player);
  }
}

function drawZombie(ctx: CanvasRenderingContext2D, zombie: Zombie, index: number) {
  if (zombieImagesLoaded) {
    const currentFrame = Math.floor(zombie.currentFrame) % TOTAL_ZOMBIE_FRAMES;
    const image = zombieImages[currentFrame];
    if (image && image.complete && image.naturalWidth !== 0) {
      const scale = Math.max(zombie.width / image.width, zombie.height / image.height) * zombie.scale;
      const frameWidth = image.width * scale;
      const frameHeight = image.height * scale;
      
      ctx.drawImage(
        image,
        zombie.x - frameWidth / 2,
        zombie.y - frameHeight / 2,
        frameWidth,
        frameHeight
      );

      console.log(`Zombie ${index} drawn:`, {
        currentFrame,
        x: zombie.x,
        y: zombie.y,
        zombieWidth: zombie.width,
        zombieHeight: zombie.height,
        frameWidth,
        frameHeight,
        imageWidth: image.width,
        imageHeight: image.height,
        scale: zombie.scale
      });
    } else {
      console.error(`Zombie image not loaded for frame: ${currentFrame}`);
      fallbackDrawZombie(ctx, zombie);
    }
  } else {
    console.warn('Zombie images not loaded yet');
    fallbackDrawZombie(ctx, zombie);
  }
}

function drawBossZombie(ctx: CanvasRenderingContext2D, bossZombie: BossZombie) {
  if (zombieImagesLoaded) {
    const currentFrame = Math.floor(bossZombie.currentFrame) % TOTAL_ZOMBIE_FRAMES;
    const image = zombieImages[currentFrame];
    if (image && image.complete && image.naturalWidth !== 0) {
      const scale = Math.max(bossZombie.width / image.width, bossZombie.height / image.height) * bossZombie.scale;
      const frameWidth = image.width * scale;
      const frameHeight = image.height * scale;
      
      ctx.drawImage(
        image,
        bossZombie.x - frameWidth / 2,
        bossZombie.y - frameHeight / 2,
        frameWidth,
        frameHeight
      );

      // Draw health bar
      const healthBarWidth = frameWidth;
      const healthBarHeight = 10;
      const healthBarY = bossZombie.y - frameHeight / 2 - healthBarHeight - 5;

      // Background of health bar
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);

      // Foreground of health bar (remaining health)
      const healthPercentage = bossZombie.currentHealth / bossZombie.maxHealth;
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);

      console.log(`Boss Zombie drawn:`, {
        currentFrame,
        x: bossZombie.x,
        y: bossZombie.y,
        frameWidth,
        frameHeight,
        scale: bossZombie.scale,
        currentHealth: bossZombie.currentHealth,
        maxHealth: bossZombie.maxHealth
      });
    } else {
      console.error(`Boss Zombie image not loaded for frame: ${currentFrame}`);
      fallbackDrawBossZombie(ctx, bossZombie);
    }
  } else {
    console.warn('Zombie images not loaded yet');
    fallbackDrawBossZombie(ctx, bossZombie);
  }
}

function fallbackDrawZombie(ctx: CanvasRenderingContext2D, zombie: Zombie) {
  ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'; // Very transparent green
  const scaledWidth = zombie.width * zombie.scale;
  const scaledHeight = zombie.height * zombie.scale;
  ctx.fillRect(
    zombie.x - scaledWidth / 2,
    zombie.y - scaledHeight / 2,
    scaledWidth,
    scaledHeight
  );
}

function fallbackDrawPlayer(ctx: CanvasRenderingContext2D, player: Player) {
  ctx.fillStyle = 'rgba(0, 0, 255, 0.1)'; // Very transparent blue
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function fallbackDrawBossZombie(ctx: CanvasRenderingContext2D, bossZombie: BossZombie) {
  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Red for boss zombie
  const scaledWidth = bossZombie.width * bossZombie.scale;
  const scaledHeight = bossZombie.height * bossZombie.scale;
  ctx.fillRect(
    bossZombie.x - scaledWidth / 2,
    bossZombie.y - scaledHeight / 2,
    scaledWidth,
    scaledHeight
  );

  // Draw health bar
  const healthBarWidth = scaledWidth;
  const healthBarHeight = 10;
  const healthBarY = bossZombie.y - scaledHeight / 2 - healthBarHeight - 5;

  // Background of health bar
  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);

  // Foreground of health bar (remaining health)
  const healthPercentage = bossZombie.currentHealth / bossZombie.maxHealth;
  ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
  ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
}
