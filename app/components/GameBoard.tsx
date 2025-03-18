"use client";

import { useState, useEffect, useRef } from "react";

interface GameBoardProps {
  playerName: string;
}

interface Tile {
  x: number;
  y: number;
  owner: string | null;
  troops: number;
}

interface Player {
  id: string;
  name: string;
  color: string;
  territory: number;
  troops: number;
  troopGrowth: number;
  gold: number;
  goldGrowth: number;
}

export default function GameBoard({ playerName }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 800, height: 600 });
  const [tiles, setTiles] = useState<Tile[][]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [selectedTile, setSelectedTile] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const tileSize = 40;

  // Initialize game board
  useEffect(() => {
    // Create initial board tiles
    const initializeTiles = () => {
      const columns = Math.floor(boardSize.width / tileSize);
      const rows = Math.floor(boardSize.height / tileSize);

      const newTiles: Tile[][] = [];

      for (let y = 0; y < rows; y++) {
        const row: Tile[] = [];
        for (let x = 0; x < columns; x++) {
          row.push({
            x,
            y,
            owner: null,
            troops: Math.floor(Math.random() * 10) + 1,
          });
        }
        newTiles.push(row);
      }

      setTiles(newTiles);
    };

    // Initialize players
    const initializePlayers = () => {
      const playerColors = ["#e63946", "#457b9d", "#2a9d8f", "#f4a261"];

      // Create AI players
      const aiPlayers: Player[] = [
        {
          id: "player1",
          name: playerName,
          color: playerColors[0],
          territory: 0,
          troops: 100,
          troopGrowth: 5,
          gold: 500,
          goldGrowth: 10,
        },
        {
          id: "ai1",
          name: "AI Player 1",
          color: playerColors[1],
          territory: 0,
          troops: 100,
          troopGrowth: 5,
          gold: 500,
          goldGrowth: 10,
        },
        {
          id: "ai2",
          name: "AI Player 2",
          color: playerColors[2],
          territory: 0,
          troops: 100,
          troopGrowth: 5,
          gold: 500,
          goldGrowth: 10,
        },
      ];

      setPlayers(aiPlayers);
      setCurrentPlayer(aiPlayers[0]); // Set human player as current player
    };

    initializeTiles();
    initializePlayers();

    // Assign starting territories
    setTimeout(() => {
      assignStartingTerritories();
    }, 100);
  }, [boardSize, playerName]);

  // Assign starting territories to players
  const assignStartingTerritories = () => {
    if (tiles.length === 0 || players.length === 0) return;

    const columns = tiles[0].length;
    const rows = tiles.length;

    // Create a deep copy of the tiles
    const newTiles = JSON.parse(JSON.stringify(tiles));

    // Assign territories to each player
    players.forEach((player, index) => {
      // Determine starting position based on player index
      let startX, startY;

      switch (index) {
        case 0: // Player 1 - top left
          startX = Math.floor(columns * 0.2);
          startY = Math.floor(rows * 0.2);
          break;
        case 1: // Player 2 - top right
          startX = Math.floor(columns * 0.8);
          startY = Math.floor(rows * 0.2);
          break;
        case 2: // Player 3 - bottom left
          startX = Math.floor(columns * 0.2);
          startY = Math.floor(rows * 0.8);
          break;
        default: // Player 4 - bottom right
          startX = Math.floor(columns * 0.8);
          startY = Math.floor(rows * 0.8);
      }

      // Assign a 3x3 territory around the starting position
      for (let y = startY - 1; y <= startY + 1; y++) {
        for (let x = startX - 1; x <= startX + 1; x++) {
          if (y >= 0 && y < rows && x >= 0 && x < columns) {
            newTiles[y][x].owner = player.id;
            newTiles[y][x].troops = 10;
          }
        }
      }
    });

    setTiles(newTiles);
  };

  // Render the game board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Clear canvas
    context.clearRect(0, 0, boardSize.width, boardSize.height);

    // Draw tiles
    tiles.forEach((row) => {
      row.forEach((tile) => {
        const x = tile.x * tileSize;
        const y = tile.y * tileSize;

        // Draw tile background
        context.fillStyle = tile.owner
          ? players.find((p) => p.id === tile.owner)?.color || "#e9ecef"
          : "#e9ecef";

        context.fillRect(x, y, tileSize, tileSize);

        // Draw border
        context.strokeStyle = "#adb5bd";
        context.lineWidth = 1;
        context.strokeRect(x, y, tileSize, tileSize);

        // Draw troops number
        context.fillStyle = "#000";
        context.font = "12px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
          tile.troops.toString(),
          x + tileSize / 2,
          y + tileSize / 2
        );
      });
    });

    // Highlight selected tile
    if (selectedTile) {
      const x = selectedTile.x * tileSize;
      const y = selectedTile.y * tileSize;

      context.strokeStyle = "#ff0";
      context.lineWidth = 2;
      context.strokeRect(x, y, tileSize, tileSize);
    }
  }, [tiles, selectedTile, players, boardSize]);

  // Handle tile click
  const handleTileClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentPlayer) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / tileSize);
    const y = Math.floor((e.clientY - rect.top) / tileSize);

    // Check if coordinates are within bounds
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      if (!selectedTile) {
        // First click - select the tile if it belongs to the player
        if (tiles[y][x].owner === currentPlayer.id) {
          setSelectedTile({ x, y });
        }
      } else {
        // Second click - attack or move to the target tile
        const sourceTile = tiles[selectedTile.y][selectedTile.x];
        const targetTile = tiles[y][x];

        if (sourceTile.owner === currentPlayer.id && sourceTile.troops > 1) {
          // Clone the tiles array
          const newTiles = JSON.parse(JSON.stringify(tiles));

          // Determine how many troops to send (all but 1)
          const troopsToSend = Math.floor(sourceTile.troops * 0.8);

          // Remove troops from source
          newTiles[selectedTile.y][selectedTile.x].troops -= troopsToSend;

          if (targetTile.owner === currentPlayer.id) {
            // If target is own tile, simply add troops
            newTiles[y][x].troops += troopsToSend;
          } else {
            // Attack logic
            if (troopsToSend > targetTile.troops) {
              // Successful attack
              newTiles[y][x].owner = currentPlayer.id;
              newTiles[y][x].troops = troopsToSend - targetTile.troops;
            } else {
              // Failed attack
              newTiles[y][x].troops -= troopsToSend;
            }
          }

          setTiles(newTiles);
        }

        // Clear selection
        setSelectedTile(null);
      }
    }
  };

  // Update troops and handle growth
  useEffect(() => {
    const interval = setInterval(() => {
      if (tiles.length === 0 || players.length === 0) return;

      // Clone the tiles and players
      const newTiles = JSON.parse(JSON.stringify(tiles));
      const newPlayers = JSON.parse(JSON.stringify(players));

      // Count territories and add troops
      const territoryCounts: { [playerId: string]: number } = {};

      newTiles.forEach((row: Tile[]) => {
        row.forEach((tile: Tile) => {
          if (tile.owner) {
            territoryCounts[tile.owner] =
              (territoryCounts[tile.owner] || 0) + 1;
          }
        });
      });

      // Update player territories and calculate troop growth
      newPlayers.forEach((player: Player) => {
        player.territory = territoryCounts[player.id] || 0;
        player.troopGrowth = Math.max(Math.floor(player.territory / 5), 1);
        player.troops += player.troopGrowth;

        // Calculate gold growth - base value + number of mines (if implemented)
        player.goldGrowth = 10 + player.territory * 0.5;
        player.gold += player.goldGrowth;
      });

      // Add troops to random territories
      newPlayers.forEach((player: Player) => {
        if (player.territory > 0) {
          // Find tiles owned by this player
          const playerTiles: { x: number; y: number }[] = [];

          newTiles.forEach((row: Tile[], y: number) => {
            row.forEach((tile: Tile, x: number) => {
              if (tile.owner === player.id) {
                playerTiles.push({ x, y });
              }
            });
          });

          // Add troops to a random tile
          if (playerTiles.length > 0) {
            const randomIndex = Math.floor(Math.random() * playerTiles.length);
            const { x, y } = playerTiles[randomIndex];
            newTiles[y][x].troops += 1;
          }
        }
      });

      setTiles(newTiles);
      setPlayers(newPlayers);

      // Update current player's info
      if (currentPlayer) {
        const updatedCurrentPlayer = newPlayers.find(
          (p: Player) => p.id === currentPlayer.id
        );
        if (updatedCurrentPlayer) {
          setCurrentPlayer(updatedCurrentPlayer);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tiles, players, currentPlayer]);

  return (
    <div className="flex-grow flex justify-center items-center p-4 bg-gray-100">
      <div className="flex flex-col space-y-4">
        {currentPlayer && (
          <div className="flex justify-between bg-white p-3 rounded shadow">
            <div>
              <span className="font-bold mr-2">Troops:</span>
              {currentPlayer.troops} (+{currentPlayer.troopGrowth}/s)
            </div>
            <div>
              <span className="font-bold mr-2">Gold:</span>
              {currentPlayer.gold} (+{currentPlayer.goldGrowth}/s)
            </div>
            <div>
              <span className="font-bold mr-2">Territories:</span>
              {currentPlayer.territory}
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={boardSize.width}
          height={boardSize.height}
          onClick={handleTileClick}
          className="border border-gray-300 bg-white shadow-md"
        />
      </div>
    </div>
  );
}
