# OpenFront

OpenFront is a web-based multiplayer territorial conquest game inspired by games like territorial.io. Players compete to control territory on a grid-based map, managing troops and conquering new territories.

## Features

- Grid-based territorial conquest gameplay
- Simple click-based controls for troop movement and attacks
- Automatic troop generation based on territory size
- Multiple AI opponents

## Getting Started

### Prerequisites

- Node.js 18.x or later

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/openfront.git
cd openfront
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to play the game.

## How to Play

1. Enter your name and click "Start Game"
2. Click on one of your territories (colored in red) to select it
3. Click on another territory to send troops:
   - If you click on your own territory, troops will be transferred
   - If you click on an enemy or neutral territory, your troops will attack
4. Conquer territories to increase your troop generation rate
5. Eliminate all opponents to win!

## Technologies Used

- Next.js
- TypeScript
- React
- HTML5 Canvas
- Tailwind CSS

## License

This project is licensed under the MIT License - see the LICENSE file for details.
