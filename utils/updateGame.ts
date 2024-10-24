import {
	GameState,
	GameStateWithClick,
	Zombie,
	BossZombie,
	Player,
	Bullet,
	MathBlock,
	initialGameState,
	GameSize,
	Vector2D,
} from "./gameState";
import { Howl } from "howler";
import {
	MAX_MATH_BLOCKS,
	PADDING,
	SHOOT_COOLDOWN,
	INITIAL_ZOMBIES_PER_WAVE,
	ZOMBIES_PER_WAVE_INCREMENT,
	PLAYER_GAP,
	PLAYER_WIDTH,
	PLAYER_HEIGHT,
	FORMATION_ROWS,
	MAX_FORMATION_WIDTH,
	TOTAL_ZOMBIE_FRAMES,
	ZOMBIE_ANIMATION_FRAME_DURATION,
	ZOMBIE_RADIUS,
	ZOMBIE_REPULSION_FORCE,
	PLAYER_SPEED,
	BULLET_SPEED,
	CLICK_TIMEOUT,
	ZOMBIE_MIN_SCALE,
	ZOMBIE_MAX_SCALE,
	BASE_ZOMBIE_SPEED,
	SPEED_INCREMENT_PER_WAVE,
	ANIMATION_FRAME_DURATION,
	TOTAL_FRAMES,
	SHOOT_CHANCE_PER_PLAYER,
	INITIAL_BOSS_HEALTH,
	BOSS_HEALTH_INCREMENT,
	INITIAL_BOSS_SCALE,
	BOSS_SCALE_INCREMENT,
	BOSS_HEALTH_MULTIPLIER,
	BOSS_DAMAGE_MULTIPLIER,
	ZOMBIE_ATTACK_COOLDOWN,
	BOSS_ATTACK_COOLDOWN,
	BOSS_PLAYERS_ELIMINATED_PER_ATTACK,
	BOSS_SPAWN_INTERVAL,
	BOSS_SPEED,
	BOSS_WAVE_FREQUENCY,
	FIRST_BOSS_WAVE,
	WAVE_DURATION,
	INITIAL_MATH_BLOCK_VALUE_MIN,
	INITIAL_MATH_BLOCK_VALUE_MAX,
	MATH_BLOCK_VALUE_WAVE_MULTIPLIER,
	MATH_BLOCK_SPEED,
	MATH_BLOCK_SPEED_INCREMENT,
	MAX_SINGLE_SOUND_PLAYERS,
	LASER_SINGLE_SOUND,
	LASER_MULTIPLE_SOUND,
	MAX_ZOMBIES_PER_WAVE,
	PADDING_TOP,
	BOTTOM_PADDING,
	MATH_BLOCK_HIT_COOLDOWN_NEGATIVE,
	MATH_BLOCK_VALUES,
	MAX_NEGATIVE_VALUE,
	MAX_NEGATIVE_RANGE_START,
	MAX_NEGATIVE_RANGE_END,
	BASE_MATH_BLOCK_HIT_COOLDOWN_POSITIVE,
	MATH_BLOCK_COOLDOWN_INCREMENT,
	BULLET_TRAIL_LENGTH,
	MATH_BLOCK_SPAWN_INTERVAL,
	MATH_BLOCK_SPAWN_CHANCE,
} from "@/constants";

declare module "howler" {
	interface Howl {
		playing(): boolean;
	}
}

let audioContext: AudioContext | null = null;
let bulletSoundBuffer: AudioBuffer | null = null;
let multipleLaserSound: HTMLAudioElement | null = null;

const initializeAudio = async () => {
	try {
		audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
		const response = await fetch("/audio/bullet_impact.mp3");
		const arrayBuffer = await response.arrayBuffer();
		bulletSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
	} catch (error) {
		console.error("Failed to initialize audio:", error);
	}
};

export const createZombie = (wave: number, gameSize: GameSize): Zombie => {
	const baseSpeed = BASE_ZOMBIE_SPEED + (wave - 1) * SPEED_INCREMENT_PER_WAVE;
	const speedVariation = baseSpeed * 0.2;

	return {
		x: Math.random() * gameSize.width,
		y: -20,
		width: 15,
		height: 15,
		speed: baseSpeed + (Math.random() * 2 - 1) * speedVariation,
		currentFrame: 0,
		lastAnimationUpdate: 0,
		scale: ZOMBIE_MIN_SCALE,
		lastAttackTime: 0,
		health: 1 + Math.floor(wave / 5),
	};
};

const createBossZombie = (bossWaveCount: number, gameSize: GameSize): BossZombie => ({
	x: gameSize.width / 2,
	y: -50,
	width: 30,
	height: 30,
	speed: BOSS_SPEED,
	currentFrame: 0,
	lastAnimationUpdate: 0,
	scale: INITIAL_BOSS_SCALE + (bossWaveCount - 1) * BOSS_SCALE_INCREMENT,
	isActive: true,
	maxHealth: (INITIAL_BOSS_HEALTH + (bossWaveCount - 1) * BOSS_HEALTH_INCREMENT) * BOSS_HEALTH_MULTIPLIER,
	currentHealth: (INITIAL_BOSS_HEALTH + (bossWaveCount - 1) * BOSS_HEALTH_INCREMENT) * BOSS_HEALTH_MULTIPLIER,
	health: (INITIAL_BOSS_HEALTH + (bossWaveCount - 1) * BOSS_HEALTH_INCREMENT) * BOSS_HEALTH_MULTIPLIER, // Added property
	lastAttackTime: 0,
	playersEliminatedPerAttack: (BOSS_PLAYERS_ELIMINATED_PER_ATTACK + (bossWaveCount - 1) * 4) * BOSS_DAMAGE_MULTIPLIER,
});

const resetGame = (): GameState => {
	return {
		...initialGameState,
		gameStarted: true,
		lastWaveTime: Date.now(),
		lastZombieSpawn: Date.now(),
		lastBossSpawn: Date.now(),
		soundState: {
			singleLaserSound: new Howl({ src: [LASER_SINGLE_SOUND], volume: 0.5 }),
			multipleLaserSound: new Howl({ src: [LASER_MULTIPLE_SOUND], volume: 0.5, loop: true }),
			isLaserPlaying: false,
		},
	};
};

const updateGame = (
	state: GameState,
	audioContext: AudioContext | null,
	bulletSoundBuffer: AudioBuffer | null,
	gameSize: GameSize,
): GameState => {
	if (!state.gameStarted || state.gameOver) return state;

	const newState = { ...state };
	const currentTime = Date.now();

	// Calculate formation dimensions
	const cols = Math.min(Math.ceil(newState.playerCount / FORMATION_ROWS), MAX_FORMATION_WIDTH);
	const formationWidth = (cols - 1) * (PLAYER_WIDTH + PLAYER_GAP) + PLAYER_WIDTH;

	// Update main player position with reduced speed and respect padding
	let newPlayerX = newState.player.x;
	let newPlayerY = newState.player.y;
	if (state.player.movingLeft) {
		newPlayerX = Math.max(0, newPlayerX - PLAYER_SPEED);
	}
	if (state.player.movingRight) {
		newPlayerX = Math.min(gameSize.width - formationWidth, newPlayerX + PLAYER_SPEED);
	}
	if (state.player.movingUp) {
		newPlayerY = Math.max(PADDING_TOP, newPlayerY - PLAYER_SPEED);
	}
	if (state.player.movingDown) {
		newPlayerY = Math.min(gameSize.height - PLAYER_HEIGHT - BOTTOM_PADDING, newPlayerY + PLAYER_SPEED);
	}
	// Calculate player formation based on the new position
	const playerFormation = calculatePlayerFormation(newState.playerCount, newPlayerX, newPlayerY, gameSize);

	// Update main player and formation
	newState.player = {
		...playerFormation[0],
		movingLeft: state.player.movingLeft,
		movingRight: state.player.movingRight,
		movingUp: state.player.movingUp,
		movingDown: state.player.movingDown,
		lastShot: state.player.lastShot,
		health: state.player.health,
		currentFrame: state.player.currentFrame,
		animationState: state.player.animationState,
		lastAnimationUpdate: state.player.lastAnimationUpdate,
	};
	newState.playerFormation = playerFormation;

	// Update wave logic
	if (currentTime - newState.lastWaveTime > WAVE_DURATION) {
		newState.wave++;
		newState.lastWaveTime = currentTime;
	}

	// Calculate zombies to spawn this frame
	const waveMultiplier = Math.min(newState.wave, 10); // Cap the multiplier at 10
	const baseZombiesPerWave = INITIAL_ZOMBIES_PER_WAVE + (waveMultiplier - 1) * ZOMBIES_PER_WAVE_INCREMENT;
	const zombiesPerWave = Math.min(baseZombiesPerWave, MAX_ZOMBIES_PER_WAVE);
	const zombiesPerSecond = zombiesPerWave / (WAVE_DURATION / 1000);
	const timeSinceLastSpawn = currentTime - newState.lastZombieSpawn;
	const zombiesToSpawnThisFrame = Math.random() < ((zombiesPerSecond * timeSinceLastSpawn) / 1000) * 1.3 ? 1 : 0; // Decreased from 1.5 to 1.3

	// Spawn zombies
	if (zombiesToSpawnThisFrame > 0) {
		newState.zombies.push(createZombie(newState.wave, gameSize));
		newState.lastZombieSpawn = currentTime;
	}

	// Boss zombie spawning logic
	if (
		newState.wave >= FIRST_BOSS_WAVE &&
		newState.wave % BOSS_WAVE_FREQUENCY === 0 &&
		(!newState.bossZombie || !newState.bossZombie.isActive) &&
		currentTime - newState.lastBossSpawn > BOSS_SPAWN_INTERVAL
	) {
		const bossWaveCount = Math.floor((newState.wave - FIRST_BOSS_WAVE) / BOSS_WAVE_FREQUENCY) + 1;
		newState.bossZombie = createBossZombie(bossWaveCount, gameSize);
		newState.lastBossSpawn = currentTime;
	}

	let playersShooting = 0;

	// Updated shooting logic
	newState.playerFormation.forEach((player, index) => {
		if (currentTime - player.lastShot > SHOOT_COOLDOWN && Math.random() < SHOOT_CHANCE_PER_PLAYER) {
			let shootingDirection: Vector2D = { x: 0, y: -1 }; // Default direction (straight up)

			// Determine shooting direction based on last click or default to upward with randomness
			if (
				newState.lastClickPosition &&
				newState.lastClickTime &&
				currentTime - newState.lastClickTime < CLICK_TIMEOUT
			) {
				const dx = newState.lastClickPosition.x - player.x;
				const dy = newState.lastClickPosition.y - player.y;
				const magnitude = Math.sqrt(dx * dx + dy * dy);
				shootingDirection = {
					x: dx / magnitude,
					y: dy / magnitude,
				};
			} else {
				// Add randomness to vertical shots
				const randomOffset = Math.random() * 0.2 - 0.1; // Random value between -0.1 and 0.1
				shootingDirection = {
					x: randomOffset,
					y: -1,
				};
				// Normalize the direction vector
				const magnitude = Math.sqrt(
					shootingDirection.x * shootingDirection.x + shootingDirection.y * shootingDirection.y,
				);
				shootingDirection.x /= magnitude;
				shootingDirection.y /= magnitude;
			}

			const newBullet = {
				x: player.x + player.width / 2,
				y: player.y,
				width: 4,
				height: 8,
				speed: BULLET_SPEED,
				direction: shootingDirection,
				trail: [],
				creationTime: currentTime,
				glowIntensity: 1,
				visible: true,
			};

			newState.bullets.push(newBullet);
			newState.playerFormation[index] = { ...player, lastShot: currentTime };

			playersShooting++;
		}
	});

	// Sound logic
	if (newState.playerCount > MAX_SINGLE_SOUND_PLAYERS) {
		// More than MAX_SINGLE_SOUND_PLAYERS players, use multiple laser sound
		if (!newState.isMultipleLaserPlaying) {
			if (!multipleLaserSound) {
				multipleLaserSound = new Audio(LASER_MULTIPLE_SOUND);
				multipleLaserSound.loop = true;
				multipleLaserSound.volume = 0.5;
			}
			multipleLaserSound.play().catch((error) => console.error("Error playing multiple laser sound:", error));
			newState.isMultipleLaserPlaying = true;
		}
	} else {
		// MAX_SINGLE_SOUND_PLAYERS or fewer players, use single laser sound
		if (newState.isMultipleLaserPlaying) {
			if (multipleLaserSound) {
				multipleLaserSound.pause();
				multipleLaserSound.currentTime = 0;
			}
			newState.isMultipleLaserPlaying = false;
		}

		// Play single laser sound for each shooting player
		if (playersShooting > 0) {
			const singleSound = new Audio(LASER_SINGLE_SOUND);
			singleSound.volume = 0.5;
			singleSound.play().catch((error) => console.error("Error playing single laser sound:", error));
		}
	}

	// Update bullet positions and check for collisions
	newState.bullets = newState.bullets.filter((bullet) => {
		// Add current position to trail
		bullet.trail.unshift({ x: bullet.x, y: bullet.y });
		// Limit trail length
		if (bullet.trail.length > BULLET_TRAIL_LENGTH) {
			bullet.trail.pop();
		}

		let bulletHit = false;

		// Check for collisions with math blocks
		if (newState.mathBlocks) {
			newState.mathBlocks = newState.mathBlocks.map((block) => {
				if (!bulletHit && checkBulletMathBlockCollision(bullet, block)) {
					bulletHit = true;
					const cooldown =
						block.value >= 0
							? BASE_MATH_BLOCK_HIT_COOLDOWN_POSITIVE * Math.pow(2, block.positiveIncrements)
							: MATH_BLOCK_HIT_COOLDOWN_NEGATIVE;

					if (currentTime - block.lastHitTime > cooldown) {
						block.lastHitTime = currentTime;

						if (block.value < 0) {
							block.value++;
						} else {
							// For positive values, always increment
							block.value++;
							block.positiveIncrements++;
						}

						if (block.value === 0) {
							block.value = 1; // Skip 0 and change to positive
							block.operation = "+";
							block.positiveIncrements = 0; // Reset the counter when transitioning to positive
						}

						// Apply points for hitting a math block
						newState.score += MATH_BLOCK_VALUES.points;
					}
				}
				return block;
			});
		}

		if (bulletHit) {
			return false; // Remove the bullet if it hit a math block
		}

		// Update bullet position
		bullet.x += bullet.direction.x * bullet.speed;
		bullet.y += bullet.direction.y * bullet.speed;

		// Update glow intensity
		bullet.glowIntensity = Math.max(0, bullet.glowIntensity - 0.02); // Gradually reduce glow

		// Remove bullets that are off-screen or too old
		return (
			currentTime - bullet.creationTime < 5000 && // Remove after 5 seconds
			bullet.y + bullet.height > 0 &&
			bullet.y < gameSize.height &&
			bullet.x + bullet.width > 0 &&
			bullet.x < gameSize.width
		);
	});

	// Check for collisions between bullets and zombies (including boss)
	newState.bullets = newState.bullets.filter((bullet) => {
		let zombieHit = false;
		newState.zombies = newState.zombies.filter((zombie) => {
			if (!zombieHit && checkCollisionWithZombie(bullet, zombie)) {
				zombieHit = true;
				newState.score += 10;
				return false; // Remove the zombie that was hit
			}
			return true;
		});

		// Check collision with boss zombie
		if (
			!zombieHit &&
			newState.bossZombie &&
			newState.bossZombie.isActive &&
			checkCollisionWithZombie(bullet, newState.bossZombie)
		) {
			zombieHit = true;
			newState.bossZombie.currentHealth--;
			newState.score += 20;
			if (newState.bossZombie.currentHealth <= 0) {
				newState.bossZombie.isActive = false;
				newState.score += 1000; // Increased bonus score for defeating boss
			}
		}

		return !zombieHit; // Remove the bullet if it hit a zombie or boss
	});

	// Update regular zombies and check for collisions with players
	newState.zombies = newState.zombies.map((zombie) => {
		const updatedZombie = updateZombie(zombie, newState, gameSize);

		// Check for collisions with players
		if (currentTime - updatedZombie.lastAttackTime > ZOMBIE_ATTACK_COOLDOWN) {
			for (let i = 0; i < newState.playerFormation.length; i++) {
				const player = newState.playerFormation[i];
				if (checkCollision(updatedZombie, player)) {
					newState.playerCount = Math.max(0, newState.playerCount - 1);
					newState.playerFormation.splice(i, 1);
					updatedZombie.lastAttackTime = currentTime;
					break; // Only eliminate one player per attack
				}
			}
		}

		return updatedZombie;
	});

	// Update boss zombie if active
	if (newState.bossZombie && newState.bossZombie.isActive) {
		newState.bossZombie = updateZombie(newState.bossZombie, newState, gameSize) as BossZombie;

		// Check for collisions with players
		if (currentTime - newState.bossZombie.lastAttackTime > BOSS_ATTACK_COOLDOWN) {
			let playersEliminated = 0;
			newState.playerFormation = newState.playerFormation.filter((player) => {
				if (
					checkCollision(newState.bossZombie!, player) &&
					playersEliminated < newState.bossZombie!.playersEliminatedPerAttack
				) {
					playersEliminated++;
					return false; // Remove the player that was hit
				}
				return true;
			});
			if (playersEliminated > 0) {
				newState.playerCount = Math.max(0, newState.playerCount - playersEliminated);
				newState.bossZombie.lastAttackTime = currentTime;
			}
		}
	}

	// Recalculate player formation based on current player count
	newState.playerFormation = calculatePlayerFormation(
		newState.playerCount,
		newState.player.x,
		gameSize.height - PLAYER_HEIGHT - BOTTOM_PADDING,
		gameSize,
	);

	// Update main player position to match the first player in the formation
	if (newState.playerFormation.length > 0) {
		newState.player = {
			...newState.player,
			x: newState.playerFormation[0].x,
			y: newState.playerFormation[0].y,
		};
	}

	// Check if the game is over
	if (newState.playerCount <= 0) {
		newState.gameOver = true;
	}

	// Spawn math blocks
	if (!newState.mathBlocks) {
		newState.mathBlocks = [];
	}

	if (
		newState.mathBlocks.length < MAX_MATH_BLOCKS &&
		currentTime - newState.lastMathBlockSpawn > MATH_BLOCK_SPAWN_INTERVAL &&
		Math.random() < MATH_BLOCK_SPAWN_CHANCE
	) {
		let value;
		if (newState.wave === 1) {
			// For the first wave, use the initial range
			value =
				Math.floor(Math.random() * (INITIAL_MATH_BLOCK_VALUE_MAX - INITIAL_MATH_BLOCK_VALUE_MIN + 1)) +
				INITIAL_MATH_BLOCK_VALUE_MIN;
		} else {
			// Calculate value based on wave number
			const baseValue = INITIAL_MATH_BLOCK_VALUE_MIN * Math.pow(MATH_BLOCK_VALUE_WAVE_MULTIPLIER, newState.wave - 1);

			// Check if the baseValue has reached the threshold
			if (baseValue <= MAX_NEGATIVE_VALUE) {
				// Generate a random value between MAX_NEGATIVE_RANGE_START and MAX_NEGATIVE_RANGE_END
				value =
					Math.floor(Math.random() * (MAX_NEGATIVE_RANGE_END - MAX_NEGATIVE_RANGE_START + 1)) +
					MAX_NEGATIVE_RANGE_START;
			} else {
				value = Math.floor(baseValue);
			}
		}

		const blockWidth = (gameSize.width * (1 - 2 * PADDING)) / 2;
		const blockHeight = 60;
		const isLeftSide = Math.random() < 0.5;
		const blockX = isLeftSide ? gameSize.width * PADDING : gameSize.width * (1 - PADDING) - blockWidth;

		newState.mathBlocks.push({
			operation: "-",
			value: value,
			x: blockX,
			y: 0,
			width: blockWidth,
			height: blockHeight,
			lastHitTime: 0,
			lastPositiveUpdateTime: 0,
			positiveUpdateCount: 0,
			positiveIncrements: 0,
		});
		newState.lastMathBlockSpawn = currentTime;
	}

	// Handle math block movement, collisions, and bullet hits
	if (newState.mathBlocks) {
		const currentWaveSpeedMultiplier = 1 + MATH_BLOCK_SPEED_INCREMENT * (newState.wave - 1);
		const currentMathBlockSpeed = MATH_BLOCK_SPEED * currentWaveSpeedMultiplier;

		// Calculate the current cooldown for positive math blocks
		const currentPositiveCooldown =
			BASE_MATH_BLOCK_HIT_COOLDOWN_POSITIVE * (1 + MATH_BLOCK_COOLDOWN_INCREMENT * (newState.wave - 1));

		newState.mathBlocks = newState.mathBlocks
			.map((block) => {
				block.y += currentMathBlockSpeed;

				// Check for collision with any player in the formation
				for (let player of newState.playerFormation) {
					if (checkCollision(block, player)) {
						// Apply math operation
						const oldPlayerCount = newState.playerCount;
						newState.playerCount = Math.max(1, oldPlayerCount + block.value);
						return null; // Remove the block after collision
					}
				}

				return block;
			})
			.filter(Boolean) as MathBlock[]; // Remove null blocks

		// Check for bullet hits on math blocks
		newState.bullets = newState.bullets.filter((bullet) => {
			let bulletHit = false;
			newState.mathBlocks = newState.mathBlocks!.map((block) => {
				if (!bulletHit && checkBulletMathBlockCollision(bullet, block)) {
					bulletHit = true;
					const cooldown =
						block.value >= 0
							? currentPositiveCooldown * Math.pow(2, block.positiveIncrements)
							: MATH_BLOCK_HIT_COOLDOWN_NEGATIVE;

					if (currentTime - block.lastHitTime > cooldown) {
						block.lastHitTime = currentTime;

						if (block.value < 0) {
							block.value++;
						} else {
							// For positive values, always increment
							block.value++;
							block.positiveIncrements++;
						}

						if (block.value === 0) {
							block.value = 1; // Skip 0 and change to positive
							block.operation = "+";
							block.positiveIncrements = 0; // Reset the counter when transitioning to positive
						}

						// Apply points for hitting a math block
						newState.score += MATH_BLOCK_VALUES.points;
					}
				}
				return block;
			});
			return !bulletHit; // Remove the bullet if it hit a block
		});

		// Remove math blocks that are off screen
		newState.mathBlocks = newState.mathBlocks.filter((block) => block.y <= gameSize.height);
	}

	// Update player animation
	const elapsedTime = currentTime - newState.player.lastAnimationUpdate;
	const frameProgress = elapsedTime / ANIMATION_FRAME_DURATION;
	newState.player.currentFrame = (newState.player.currentFrame + frameProgress) % TOTAL_FRAMES;
	newState.player.lastAnimationUpdate = currentTime;

	// Determine player animation state
	if (
		newState.player.movingLeft ||
		newState.player.movingRight ||
		newState.player.movingUp ||
		newState.player.movingDown
	) {
		newState.player.animationState = "running";
	} else if (currentTime - newState.player.lastShot < SHOOT_COOLDOWN) {
		newState.player.animationState = "shooting";
	} else {
		newState.player.animationState = "idle";
	}

	// Update animation state and frame for all players in formation
	newState.playerFormation = newState.playerFormation.map((player) => ({
		...player,
		currentFrame: newState.player.currentFrame,
		animationState: newState.player.animationState,
		lastAnimationUpdate: newState.player.lastAnimationUpdate,
	}));

	return newState;
};

const checkCollision = (
	entity1: { x: number; y: number; width: number; height: number; scale?: number },
	entity2: { x: number; y: number; width: number; height: number },
) => {
	const e1Width = entity1.width * (entity1.scale || 1);
	const e1Height = entity1.height * (entity1.scale || 1);
	const e1Left = entity1.x;
	const e1Top = entity1.y;

	return (
		e1Left < entity2.x + entity2.width &&
		e1Left + e1Width > entity2.x &&
		e1Top < entity2.y + entity2.height &&
		e1Top + e1Height > entity2.y
	);
};

const checkCollisionWithZombie = (bullet: Bullet, zombie: Zombie | BossZombie) => {
	const scaledWidth = zombie.width * zombie.scale;
	const scaledHeight = zombie.height * zombie.scale;
	const zombieRect = {
		x: zombie.x - scaledWidth / 2,
		y: zombie.y - scaledHeight / 2,
		width: scaledWidth,
		height: scaledHeight,
	};
	return checkCollision(bullet, zombieRect);
};

const handleCanvasClick = (state: GameState, clickX: number, clickY: number): GameState => {
	const newState = { ...state } as GameStateWithClick;
	newState.lastClickPosition = { x: clickX, y: clickY };
	newState.lastClickTime = Date.now();
	return newState;
};

const calculatePlayerFormation = (playerCount: number, baseX: number, baseY: number, gameSize: GameSize): Player[] => {
	const formation: Player[] = [];
	const actualPlayerCount = Math.max(1, playerCount);

	let cols, rows;

	if (actualPlayerCount <= 4) {
		cols = actualPlayerCount;
		rows = 1;
	} else if (actualPlayerCount <= 10) {
		cols = Math.ceil(actualPlayerCount / 2);
		rows = 2;
	} else {
		cols = Math.min(Math.ceil(actualPlayerCount / 3), MAX_FORMATION_WIDTH);
		rows = Math.ceil(actualPlayerCount / cols);
	}

	const formationWidth = (cols - 1) * (PLAYER_WIDTH + PLAYER_GAP) + PLAYER_WIDTH;
	const formationHeight = (rows - 1) * (PLAYER_HEIGHT + PLAYER_GAP) + PLAYER_HEIGHT;
	const startX = Math.max(0, Math.min(baseX, gameSize.width - formationWidth));
	const startY = Math.min(baseY, gameSize.height - formationHeight - BOTTOM_PADDING);

	let remainingPlayers = actualPlayerCount;

	for (let row = 0; row < rows; row++) {
		let rowPlayerCount;
		if (actualPlayerCount <= 4) {
			rowPlayerCount = actualPlayerCount;
		} else if (actualPlayerCount <= 10) {
			rowPlayerCount = row === 0 ? Math.ceil(actualPlayerCount / 2) : Math.floor(actualPlayerCount / 2);
		} else {
			rowPlayerCount = Math.min(cols, remainingPlayers);
		}

		let rowStartX = startX;
		if (rowPlayerCount < cols) {
			// Center the row if it's not full
			rowStartX += (formationWidth - ((rowPlayerCount - 1) * (PLAYER_WIDTH + PLAYER_GAP) + PLAYER_WIDTH)) / 2;
		}

		for (let col = 0; col < rowPlayerCount; col++) {
			const x = rowStartX + col * (PLAYER_WIDTH + PLAYER_GAP);
			const y = startY + row * (PLAYER_HEIGHT + PLAYER_GAP);

			const initialSoundState = {
				singleLaserSound: null,
				multipleLaserSound: null,
				isLaserPlaying: false,
			};

			formation.push({
				x,
				y,
				width: PLAYER_WIDTH,
				height: PLAYER_HEIGHT,
				speed: PLAYER_SPEED,
				movingLeft: false,
				movingRight: false,
				movingUp: false,
				movingDown: false,
				lastShot: 0,
				health: 100,
				currentFrame: 0,
				animationState: "idle",
				lastAnimationUpdate: 0,
				soundState: initialSoundState, // Initialize sound state
				isMultipleLaserPlaying: false, // Default to false
				waveInterval: 0, // Default interval
				lastWaveTime: 0, // Default last wave time
			});
		}

		remainingPlayers -= rowPlayerCount;
	}

	return formation;
};

const updateZombie = (zombie: Zombie | BossZombie, state: GameState, gameSize: GameSize): Zombie | BossZombie => {
	// Find the closest player
	if (state.playerFormation.length === 0) {
		// If there are no players, move the zombie towards the center of the screen
		const centerX = gameSize.width / 2;
		const centerY = gameSize.height / 2;
		const dx = centerX - zombie.x;
		const dy = centerY - zombie.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > 0) {
			zombie.x += (dx / distance) * zombie.speed;
			zombie.y += (dy / distance) * zombie.speed;
		}
	} else {
		const closestPlayer = state.playerFormation.reduce((closest, player) => {
			const distanceToPlayer = Math.sqrt(Math.pow(zombie.x - player.x, 2) + Math.pow(zombie.y - player.y, 2));
			const distanceToClosest = Math.sqrt(Math.pow(zombie.x - closest.x, 2) + Math.pow(zombie.y - closest.y, 2));
			return distanceToPlayer < distanceToClosest ? player : closest;
		}, state.playerFormation[0]);

		// Move towards the closest player
		const dx = closestPlayer.x - zombie.x;
		const dy = closestPlayer.y - zombie.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > 0) {
			zombie.x += (dx / distance) * zombie.speed;
			zombie.y += (dy / distance) * zombie.speed;
		}
	}

	// Update zombie scale based on y position (only for regular zombies)
	if (!("isActive" in zombie)) {
		const progressToPlayer = zombie.y / gameSize.height;
		zombie.scale = ZOMBIE_MIN_SCALE + (ZOMBIE_MAX_SCALE - ZOMBIE_MIN_SCALE) * progressToPlayer;
	}

	// Apply repulsion force from other zombies (only for regular zombies)
	if (!("isActive" in zombie)) {
		state.zombies.forEach((otherZombie) => {
			if (zombie !== otherZombie) {
				const repulsionDx = zombie.x - otherZombie.x;
				const repulsionDy = zombie.y - otherZombie.y;
				const repulsionDistance = Math.sqrt(repulsionDx * repulsionDx + repulsionDy * repulsionDy);

				if (repulsionDistance < ZOMBIE_RADIUS * 2 * zombie.scale) {
					const repulsionForce = (ZOMBIE_RADIUS * 2 * zombie.scale - repulsionDistance) * ZOMBIE_REPULSION_FORCE;
					zombie.x += (repulsionDx / repulsionDistance) * repulsionForce;
					zombie.y += (repulsionDy / repulsionDistance) * repulsionForce;
				}
			}
		});

		// Keep regular zombies away from boss zombie
		if (state.bossZombie && state.bossZombie.isActive) {
			const dx = zombie.x - state.bossZombie.x;
			const dy = zombie.y - state.bossZombie.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			const minDistance = (zombie.width * zombie.scale + state.bossZombie.width * state.bossZombie.scale) / 2;

			if (distance < minDistance) {
				const angle = Math.atan2(dy, dx);
				zombie.x = state.bossZombie.x + Math.cos(angle) * minDistance;
				zombie.y = state.bossZombie.y + Math.sin(angle) * minDistance;
			}
		}
	}

	// Keep zombies within canvas boundaries
	const scaledRadius = ZOMBIE_RADIUS * zombie.scale;
	zombie.x = Math.max(scaledRadius, Math.min(gameSize.width - scaledRadius, zombie.x));
	zombie.y = Math.max(scaledRadius, Math.min(gameSize.height - scaledRadius, zombie.y));

	// Update zombie animation
	const currentTime = Date.now();
	const elapsedTime = currentTime - zombie.lastAnimationUpdate;
	const frameProgress = elapsedTime / ZOMBIE_ANIMATION_FRAME_DURATION;
	zombie.currentFrame = (zombie.currentFrame + frameProgress) % TOTAL_ZOMBIE_FRAMES;
	zombie.lastAnimationUpdate = currentTime;

	return zombie;
};

const checkBulletMathBlockCollision = (bullet: Bullet, block: MathBlock): boolean => {
	return (
		bullet.x < block.x + block.width &&
		bullet.x + bullet.width > block.x &&
		bullet.y < block.y + block.height &&
		bullet.y + bullet.height > block.y
	);
};

export const pauseGameSounds = () => {
	if (multipleLaserSound) {
		multipleLaserSound.pause();
	}
	// Pause any other game sounds here if needed
};

export const resumeGameSounds = (state: GameState) => {
	if (state.isMultipleLaserPlaying && multipleLaserSound) {
		multipleLaserSound.play().catch((error) => console.error("Error resuming multiple laser sound:", error));
	}
	// Resume any other game sounds here if needed
};

export { initializeAudio, updateGame, handleCanvasClick, resetGame };
