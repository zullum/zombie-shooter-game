import { GameState, Player, Zombie, BossZombie } from './gameState';

const TOTAL_PLAYER_FRAMES = 15;
const TOTAL_ZOMBIE_FRAMES = 8;
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
  img.onload = () => resolve(null);
  img.onerror = () => resolve(null);
}))).then(() => {
  playerImagesLoaded = true;
});

// Load zombie images
Promise.all(zombieImages.map(img => new Promise(resolve => {
  img.onload = () => resolve(null);
  img.onerror = () => resolve(null);
}))).then(() => {
  zombieImagesLoaded = true;
});

const bulletSound = new Audio('/audio/deserteagle.mp3');

const PADDING_TOP = 40;
const PADDING_BOTTOM = 20;
const BOTTOM_PADDING = 40;

export const drawGame = (ctx: CanvasRenderingContext2D, state: GameState) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (!state.gameStarted) return;

  state.playerFormation.forEach((player, index) => {
    const adjustedPlayer = {
      ...player,
      y: player.y - BOTTOM_PADDING
    };
    drawPlayer(ctx, adjustedPlayer, index);
  });

  state.zombies.forEach((zombie, index) => {
    drawZombie(ctx, zombie, index);
  });

  if (state.bossZombie && state.bossZombie.isActive) {
    drawBossZombie(ctx, state.bossZombie);
  }

  state.bullets.forEach(bullet => {
    if (bullet.visible) {
      drawEnhancedBullet(ctx, bullet);
    }
  });

  drawEnhancedText(ctx, state);

  if (state.mathBlocks) {
    state.mathBlocks.forEach(block => {
      drawEnhancedMathBlock(ctx, block, state.gameSize);
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
    } else {
      fallbackDrawPlayer(ctx, player);
    }
  } else {
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
    } else {
      fallbackDrawZombie(ctx, zombie);
    }
  } else {
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

      const healthBarWidth = frameWidth;
      const healthBarHeight = 10;
      const healthBarY = bossZombie.y - frameHeight / 2 - healthBarHeight - 5;

      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);

      const healthPercentage = bossZombie.currentHealth / bossZombie.maxHealth;
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
    } else {
      fallbackDrawBossZombie(ctx, bossZombie);
    }
  } else {
    fallbackDrawBossZombie(ctx, bossZombie);
  }
}

function fallbackDrawZombie(ctx: CanvasRenderingContext2D, zombie: Zombie) {
  ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
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
  ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function fallbackDrawBossZombie(ctx: CanvasRenderingContext2D, bossZombie: BossZombie) {
  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
  const scaledWidth = bossZombie.width * bossZombie.scale;
  const scaledHeight = bossZombie.height * bossZombie.scale;
  ctx.fillRect(
    bossZombie.x - scaledWidth / 2,
    bossZombie.y - scaledHeight / 2,
    scaledWidth,
    scaledHeight
  );

  const healthBarWidth = scaledWidth;
  const healthBarHeight = 10;
  const healthBarY = bossZombie.y - scaledHeight / 2 - healthBarHeight - 5;

  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);

  const healthPercentage = bossZombie.currentHealth / bossZombie.maxHealth;
  ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
  ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
}

function drawEnhancedBullet(ctx: CanvasRenderingContext2D, bullet: any) {
  if (bullet.trail.length > 1) {
    ctx.beginPath();
    ctx.moveTo(bullet.trail[0].x, bullet.trail[0].y);
    for (let i = 1; i < bullet.trail.length; i++) {
      ctx.lineTo(bullet.trail[i].x, bullet.trail[i].y);
    }
    const gradient = ctx.createLinearGradient(
      bullet.trail[0].x, bullet.trail[0].y,
      bullet.trail[bullet.trail.length - 1].x, bullet.trail[bullet.trail.length - 1].y
    );
    gradient.addColorStop(0, `rgba(255, 165, 0, ${0.1 * bullet.glowIntensity})`);
    gradient.addColorStop(1, `rgba(255, 69, 0, ${0.1 * bullet.glowIntensity})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  const bulletGradient = ctx.createRadialGradient(
    bullet.x, bullet.y, 0,
    bullet.x, bullet.y, bullet.width / 2
  );
  bulletGradient.addColorStop(0, `rgba(255, 255, 100, ${bullet.glowIntensity})`);
  bulletGradient.addColorStop(1, `rgba(255, 69, 0, ${bullet.glowIntensity})`);
  ctx.fillStyle = bulletGradient;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
  ctx.fill();

  const glowGradient = ctx.createRadialGradient(
    bullet.x, bullet.y, 0,
    bullet.x, bullet.y, bullet.width * 2
  );
  glowGradient.addColorStop(0, `rgba(255, 165, 0, ${bullet.glowIntensity * 0.5})`);
  glowGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.width * 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnhancedText(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const drawStylizedText = (text: string, x: number, y: number, fontSize: number) => {
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const gradient = ctx.createLinearGradient(x, y, x, y + fontSize);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(1, '#FF4500');
    ctx.fillStyle = gradient;

    ctx.fillText(text, x, y);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  drawStylizedText(`Score: ${state.score}`, 10, 10, 24);
  drawStylizedText(`Wave: ${state.wave}`, 10, 40, 24);
  drawStylizedText(`Players: ${state.playerCount}`, 10, 70, 24);
}

function drawEnhancedMathBlock(ctx: CanvasRenderingContext2D, block: any, gameSize: { width: number; height: number }) {
  const isPositive = block.operation === '+' || block.operation === '*';
  const baseColor = isPositive ? [0, 255, 0] : [255, 0, 0];
  const gradientColor = isPositive ? [0, 128, 0] : [128, 0, 0];

  const gradient = ctx.createLinearGradient(block.x, block.y, block.x, block.y + block.height);
  gradient.addColorStop(0, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.4)`);
  gradient.addColorStop(1, `rgba(${gradientColor[0]}, ${gradientColor[1]}, ${gradientColor[2]}, 0.4)`);

  const pulseIntensity = Math.sin(Date.now() / 500) * 0.1 + 0.9;

  ctx.beginPath();
  ctx.moveTo(block.x + 10, block.y);
  ctx.lineTo(block.x + block.width - 10, block.y);
  ctx.quadraticCurveTo(block.x + block.width, block.y, block.x + block.width, block.y + 10);
  ctx.lineTo(block.x + block.width, block.y + block.height - 10);
  ctx.quadraticCurveTo(block.x + block.width, block.y + block.height, block.x + block.width - 10, block.y + block.height);
  ctx.lineTo(block.x + 10, block.y + block.height);
  ctx.quadraticCurveTo(block.x, block.y + block.height, block.x, block.y + block.height - 10);
  ctx.lineTo(block.x, block.y + 10);
  ctx.quadraticCurveTo(block.x, block.y, block.x + 10, block.y);
  ctx.closePath();

  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.shadowColor = isPositive ? `rgba(0, 255, 0, ${0.3 * pulseIntensity})` : `rgba(255, 0, 0, ${0.3 * pulseIntensity})`;
  ctx.shadowBlur = 15 * pulseIntensity;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${block.operation}${block.value}`, block.x + block.width / 2, block.y + block.height / 2);
}
