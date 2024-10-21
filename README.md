# Zombie Shooter Game

A dynamic, web-based zombie shooter game built with Next.js and TypeScript.

## Gameplay

![zombie shooter gameplay](gameplay.gif)

## Live Demo

[Zombie Shooter Game](https://zombie-shooter-game.vercel.app/)

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Running the Game](#running-the-game)
4. [Game Controls](#game-controls)
5. [Project Structure](#project-structure)
6. [Technologies Used](#technologies-used)
7. [Contributing](#contributing)
8. [License](#license)

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- Node.js (v14.0.0 or later)
- pnpm (v6.0.0 or later)

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/your-username/zombie-shooter-game.git
   ```

2. Navigate to the project directory:

   ```
   cd zombie-shooter-game
   ```

3. Install the dependencies:
   ```
   pnpm install
   ```

## Running the Game

1. Start the development server:

   ```
   pnpm dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. To build for production:

   ```
   pnpm build
   ```

4. To start the production server:
   ```
   pnpm start
   ```

## Game Controls

- **Desktop:**

  - Move: A (left), D (right), W (up), S (down)
  - Shoot: Left mouse click
  - Pause: Escape key

- **Mobile:**
  - Move: Swipe left/right
  - Shoot: Tap the screen
  - Pause: Single back button press

## Project Structure

- `components/`: React components
- `pages/`: Next.js pages
- `public/`: Static assets (images, sounds)
- `styles/`: CSS files
- `utils/`: Utility functions and game logic
- `constants.ts`: Game constants

## Technologies Used

- Next.js
- TypeScript
- HTML5 Canvas
- CSS Modules

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
