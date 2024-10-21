import {
	BASE_MATH_BLOCK_HIT_COOLDOWN_POSITIVE,
	COOLDOWN_RADIUS,
	COOLDOWN_STROKE_WIDTH,
	LOCKER_SIZE,
	TOTAL_PLAYER_FRAMES,
	TOTAL_ZOMBIE_FRAMES,
} from "@/constants";
import { GameState, Player, Zombie, BossZombie } from "./gameState";

const playerImages: HTMLImageElement[] = [];
const zombieImages: HTMLImageElement[] = [];

// Load all player images
for (let i = 1; i <= TOTAL_PLAYER_FRAMES; i++) {
	const img = new Image();
	img.src = `/player/player_${i.toString().padStart(3, "0")}.png`;
	playerImages.push(img);
}

// Load all zombie images
for (let i = 1; i <= TOTAL_ZOMBIE_FRAMES; i++) {
	const img = new Image();
	img.src = `/zombie/zombie_${i.toString().padStart(3, "0")}.png`;
	zombieImages.push(img);
}

// Add flags to track if images are loaded
let playerImagesLoaded = false;
let zombieImagesLoaded = false;

// Load player images
Promise.all(
	playerImages.map(
		(img) =>
			new Promise((resolve) => {
				img.onload = () => resolve(null);
				img.onerror = () => resolve(null);
			}),
	),
).then(() => {
	playerImagesLoaded = true;
});

// Load zombie images
Promise.all(
	zombieImages.map(
		(img) =>
			new Promise((resolve) => {
				img.onload = () => resolve(null);
				img.onerror = () => resolve(null);
			}),
	),
).then(() => {
	zombieImagesLoaded = true;
});

export const drawGame = (ctx: CanvasRenderingContext2D, state: GameState) => {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

	if (!state.gameStarted) return;

	state.playerFormation.forEach((player, index) => {
		drawPlayer(ctx, player, index);
	});

	state.zombies.forEach((zombie, index) => {
		drawZombie(ctx, zombie, index);
	});

	if (state.bossZombie && state.bossZombie.isActive) {
		drawBossZombie(ctx, state.bossZombie);
	}

	state.bullets.forEach((bullet) => {
		if (bullet.visible) {
			drawEnhancedBullet(ctx, bullet);
		}
	});

	drawEnhancedText(ctx, state);

	if (state.mathBlocks) {
		const currentTime = Date.now();
		state.mathBlocks.forEach((block) => {
			drawEnhancedMathBlock(ctx, block, state.gameSize, currentTime);
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
				frameHeight,
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

			ctx.drawImage(image, zombie.x - frameWidth / 2, zombie.y - frameHeight / 2, frameWidth, frameHeight);
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

			ctx.drawImage(image, bossZombie.x - frameWidth / 2, bossZombie.y - frameHeight / 2, frameWidth, frameHeight);

			const healthBarWidth = frameWidth;
			const healthBarHeight = 10;
			const healthBarY = bossZombie.y - frameHeight / 2 - healthBarHeight - 5;

			ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
			ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);

			const healthPercentage = bossZombie.currentHealth / bossZombie.maxHealth;
			ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
			ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
		} else {
			fallbackDrawBossZombie(ctx, bossZombie);
		}
	} else {
		fallbackDrawBossZombie(ctx, bossZombie);
	}
}

function fallbackDrawZombie(ctx: CanvasRenderingContext2D, zombie: Zombie) {
	ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
	const scaledWidth = zombie.width * zombie.scale;
	const scaledHeight = zombie.height * zombie.scale;
	ctx.fillRect(zombie.x - scaledWidth / 2, zombie.y - scaledHeight / 2, scaledWidth, scaledHeight);
}

function fallbackDrawPlayer(ctx: CanvasRenderingContext2D, player: Player) {
	ctx.fillStyle = "rgba(0, 0, 255, 0.1)";
	ctx.fillRect(player.x, player.y, player.width, player.height);
}

function fallbackDrawBossZombie(ctx: CanvasRenderingContext2D, bossZombie: BossZombie) {
	ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
	const scaledWidth = bossZombie.width * bossZombie.scale;
	const scaledHeight = bossZombie.height * bossZombie.scale;
	ctx.fillRect(bossZombie.x - scaledWidth / 2, bossZombie.y - scaledHeight / 2, scaledWidth, scaledHeight);

	const healthBarWidth = scaledWidth;
	const healthBarHeight = 10;
	const healthBarY = bossZombie.y - scaledHeight / 2 - healthBarHeight - 5;

	ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
	ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);

	const healthPercentage = bossZombie.currentHealth / bossZombie.maxHealth;
	ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
	ctx.fillRect(bossZombie.x - healthBarWidth / 2, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
}

function drawEnhancedBullet(ctx: CanvasRenderingContext2D, bullet: any) {
	// Draw bullet trail
	if (bullet.trail.length > 1) {
		ctx.beginPath();
		ctx.moveTo(bullet.trail[0].x, bullet.trail[0].y);
		for (let i = 1; i < bullet.trail.length; i++) {
			ctx.lineTo(bullet.trail[i].x, bullet.trail[i].y);
		}
		const gradient = ctx.createLinearGradient(
			bullet.trail[0].x,
			bullet.trail[0].y,
			bullet.trail[bullet.trail.length - 1].x,
			bullet.trail[bullet.trail.length - 1].y,
		);
		gradient.addColorStop(0, `rgba(255, 165, 0, ${bullet.glowIntensity})`);
		gradient.addColorStop(1, `rgba(255, 69, 0, ${bullet.glowIntensity * 0.5})`);
		ctx.strokeStyle = gradient;
		ctx.lineWidth = 2;
		ctx.lineCap = "round";
		ctx.stroke();
	}

	// Draw bullet
	const bulletGradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, bullet.width / 2);
	bulletGradient.addColorStop(0, `rgba(255, 255, 100, ${bullet.glowIntensity})`);
	bulletGradient.addColorStop(1, `rgba(255, 69, 0, ${bullet.glowIntensity})`);
	ctx.fillStyle = bulletGradient;
	ctx.beginPath();
	ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
	ctx.fill();

	// Draw bullet glow
	const glowGradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, bullet.width * 2);
	glowGradient.addColorStop(0, `rgba(255, 165, 0, ${bullet.glowIntensity * 0.5})`);
	glowGradient.addColorStop(1, "rgba(255, 69, 0, 0)");
	ctx.fillStyle = glowGradient;
	ctx.beginPath();
	ctx.arc(bullet.x, bullet.y, bullet.width * 2, 0, Math.PI * 2);
	ctx.fill();
}

function drawEnhancedText(ctx: CanvasRenderingContext2D, state: GameState) {
	ctx.textAlign = "left";
	ctx.textBaseline = "top";

	const drawStylizedText = (text: string, x: number, y: number, fontSize: number) => {
		ctx.font = `bold ${fontSize}px Arial`;
		ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
		ctx.shadowBlur = 4;
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;

		const gradient = ctx.createLinearGradient(x, y, x, y + fontSize);
		gradient.addColorStop(0, "#FFD700");
		gradient.addColorStop(1, "#FF4500");
		ctx.fillStyle = gradient;

		ctx.fillText(text, x, y);

		ctx.shadowColor = "transparent";
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
	};

	drawStylizedText(`Score: ${state.score}`, 10, 10, 24);
	drawStylizedText(`Wave: ${state.wave}`, 10, 40, 24);
	drawStylizedText(`Players: ${state.playerCount}`, 10, 70, 24);
}

// Add this function to draw the locker icon
function drawLockerIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
	ctx.save();
	ctx.translate(x - size / 2, y - size / 2);
	ctx.scale(size / 24, size / 24); // Scale to fit the desired size

	// Draw the SVG path
	ctx.fillStyle = "red"; // Change color as needed
	ctx.beginPath();
	ctx.moveTo(13, 14);
	ctx.bezierCurveTo(13, 13.4477, 12.5523, 13, 12, 13);
	ctx.bezierCurveTo(11.4477, 13, 11, 13.4477, 11, 14);
	ctx.lineTo(11, 16);
	ctx.bezierCurveTo(11, 16.5523, 11.4477, 17, 12, 17);
	ctx.bezierCurveTo(12.5523, 17, 13, 16.5523, 13, 16);
	ctx.lineTo(13, 14);
	ctx.closePath();
	ctx.fill();

	ctx.beginPath();
	ctx.moveTo(7, 8.12037);
	ctx.bezierCurveTo(5.3161, 8.53217, 4, 9.95979, 4, 11.7692);
	ctx.lineTo(4, 17.3077);
	ctx.bezierCurveTo(4, 19.973, 6.31545, 22, 9, 22);
	ctx.lineTo(15, 22);
	ctx.bezierCurveTo(17.6846, 22, 20, 19.973, 20, 17.3077);
	ctx.lineTo(20, 11.7692);
	ctx.bezierCurveTo(20, 9.95979, 18.6839, 8.53217, 17, 8.12037);
	ctx.lineTo(17, 7);
	ctx.bezierCurveTo(17, 4.23858, 14.7614, 2, 12, 2);
	ctx.bezierCurveTo(9.23858, 2, 7, 4.23858, 7, 7);
	ctx.lineTo(7, 8.12037);
	ctx.closePath();
	ctx.moveTo(15, 7);
	ctx.lineTo(15, 8);
	ctx.lineTo(9, 8);
	ctx.lineTo(9, 7);
	ctx.bezierCurveTo(9, 6.64936, 9.06015, 6.31278, 9.17071, 6);
	ctx.bezierCurveTo(9.58254, 4.83481, 10.6938, 4, 12, 4);
	ctx.bezierCurveTo(13.3062, 4, 14.4175, 4.83481, 14.8293, 6);
	ctx.bezierCurveTo(14.9398, 6.31278, 15, 6.64936, 15, 7);
	ctx.closePath();
	ctx.moveTo(6, 11.7692);
	ctx.bezierCurveTo(6, 10.866, 6.81856, 10, 8, 10);
	ctx.lineTo(16, 10);
	ctx.bezierCurveTo(17.1814, 10, 18, 10.866, 18, 11.7692);
	ctx.lineTo(18, 17.3077);
	ctx.bezierCurveTo(18, 18.7208, 16.7337, 20, 15, 20);
	ctx.lineTo(9, 20);
	ctx.bezierCurveTo(7.26627, 20, 6, 18.7208, 6, 17.3077);
	ctx.lineTo(6, 11.7692);
	ctx.closePath();
	ctx.fill();

	ctx.restore();
}

function drawEnhancedMathBlock(
	ctx: CanvasRenderingContext2D,
	block: any,
	gameSize: { width: number; height: number },
	currentTime: number,
) {
	const isPositive = block.value > 0;
	const baseColor = isPositive ? [0, 255, 0] : [255, 0, 0];
	const gradientColor = isPositive ? [0, 128, 0] : [128, 0, 0];

	const gradient = ctx.createLinearGradient(block.x, block.y, block.x, block.y + block.height);
	gradient.addColorStop(0, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.4)`);
	gradient.addColorStop(1, `rgba(${gradientColor[0]}, ${gradientColor[1]}, ${gradientColor[2]}, 0.4)`);

	const pulseIntensity = Math.sin(Date.now() / 500) * 0.1 + 0.9;

	// Draw the main block
	ctx.beginPath();
	ctx.moveTo(block.x + 10, block.y);
	ctx.lineTo(block.x + block.width - 10, block.y);
	ctx.quadraticCurveTo(block.x + block.width, block.y, block.x + block.width, block.y + 10);
	ctx.lineTo(block.x + block.width, block.y + block.height - 10);
	ctx.quadraticCurveTo(
		block.x + block.width,
		block.y + block.height,
		block.x + block.width - 10,
		block.y + block.height,
	);
	ctx.lineTo(block.x + 10, block.y + block.height);
	ctx.quadraticCurveTo(block.x, block.y + block.height, block.x, block.y + block.height - 10);
	ctx.lineTo(block.x, block.y + 10);
	ctx.quadraticCurveTo(block.x, block.y, block.x + 10, block.y);
	ctx.closePath();

	ctx.fillStyle = gradient;
	ctx.fill();

	ctx.shadowColor = isPositive
		? `rgba(0, 255, 0, ${0.3 * pulseIntensity})`
		: `rgba(255, 0, 0, ${0.3 * pulseIntensity})`;
	ctx.shadowBlur = 15 * pulseIntensity;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.fill();

	ctx.shadowColor = "transparent";
	ctx.shadowBlur = 0;

	// Draw the main text
	ctx.fillStyle = "white";
	ctx.font = "bold 20px Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(`${block.value > 0 ? "+" : ""}${block.value}`, block.x + block.width / 2, block.y + block.height / 2);

	// Draw cooldown circle and locker icon only for positive blocks
	if (isPositive) {
		const cooldown = BASE_MATH_BLOCK_HIT_COOLDOWN_POSITIVE * Math.pow(2, block.positiveIncrements);
		const timeSinceLastHit = currentTime - block.lastHitTime;
		const isLocked = timeSinceLastHit < cooldown;

		if (isLocked) {
			// Draw locker icon on the left side, vertically centered
			const lockerX = block.x + LOCKER_SIZE / 2 + 5;
			const lockerY = block.y + block.height / 2;
			drawLockerIcon(ctx, lockerX, lockerY, LOCKER_SIZE);

			// Draw cooldown circle on the right side
			const cooldownX = block.x + block.width - COOLDOWN_RADIUS - 5;
			const cooldownY = block.y + block.height / 2;

			// Draw background circle
			ctx.beginPath();
			ctx.arc(cooldownX, cooldownY, COOLDOWN_RADIUS, 0, 2 * Math.PI);
			ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
			ctx.fill();

			// Draw cooldown arc
			const cooldownPercentage = timeSinceLastHit / cooldown;
			ctx.beginPath();
			ctx.arc(cooldownX, cooldownY, COOLDOWN_RADIUS, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * cooldownPercentage);
			ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
			ctx.lineWidth = COOLDOWN_STROKE_WIDTH;
			ctx.stroke();

			// Draw cooldown text in milliseconds
			const remainingTime = Math.ceil(cooldown - timeSinceLastHit);
			ctx.fillStyle = "white";
			ctx.font = "bold 12px Arial";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(`${remainingTime}ms`, cooldownX, cooldownY);
		}
	}
}
