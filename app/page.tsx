"use client";

import { useState, useEffect, useRef } from "react";
import {
  makeAIDecisions,
  processAIAction,
  assignAIPersonalities,
} from "./utils/ai";

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [territories, setTerritories] = useState<any[]>([]);
  const [playerTroops, setPlayerTroops] = useState(1000);
  const [playerGold, setPlayerGold] = useState(500);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStatus, setGameStatus] = useState("");
  const [buildingMode, setBuildingMode] = useState(false);
  const [selectedBuildingType, setSelectedBuildingType] = useState<
    "fort" | "farm" | "tower" | "barracks" | "wall" | "mine" | "market" | ""
  >("");
  const [hasClaimedTerritory, setHasClaimedTerritory] = useState(false);
  const [gameDay, setGameDay] = useState(1);
  const [nextEventDay, setNextEventDay] = useState(5);
  const [eventActive, setEventActive] = useState(false);
  const [currentEvent, setCurrentEvent] = useState("");

  // Define proper types for buildings
  type BuildingType =
    | "fort"
    | "farm"
    | "tower"
    | "barracks"
    | "wall"
    | "mine"
    | "market";

  interface BuildingDefinition {
    name: string;
    cost: number;
    color: string;
    shape: string;
    defenseBonus?: number;
    troopBonus?: number;
    rangeBonus?: number;
    goldBonus?: number;
  }

  interface Building {
    type: BuildingType;
    level: number;
  }

  interface Territory {
    x: number;
    y: number;
    type: string;
    color: string;
    owner: null | {
      id: string;
      name: string;
      color: string;
      troops?: number;
    };
    troops: number;
    troopCapacity: number;
    isSelected: boolean;
    building: Building | null;
    wall?: boolean;
  }

  // Define building types with proper typing
  const buildingTypes: Record<BuildingType, BuildingDefinition> = {
    fort: {
      name: "Fort",
      cost: 100,
      defenseBonus: 2,
      color: "#8B4513",
      shape: "rect",
    },
    farm: {
      name: "Farm",
      cost: 150,
      troopBonus: 2,
      color: "#FFD700",
      shape: "circle",
    },
    tower: {
      name: "Tower",
      cost: 200,
      rangeBonus: 1,
      color: "#708090",
      shape: "triangle",
    },
    barracks: {
      name: "Barracks",
      cost: 120,
      troopBonus: 0,
      color: "#d62828",
      shape: "rect",
    },
    wall: {
      name: "Wall",
      cost: 80,
      defenseBonus: 5,
      color: "#000000",
      shape: "rect",
    },
    mine: {
      name: "Mine",
      cost: 150,
      goldBonus: 5,
      color: "#a2a2a2",
      shape: "circle",
    },
    market: {
      name: "Market",
      cost: 200,
      goldBonus: 10,
      color: "#fb8500",
      shape: "rect",
    },
  };

  // Generate noise for realistic landmass generation
  const generatePerlinNoise = (
    width: number,
    height: number,
    scale: number = 50,
    octaves: number = 6,
    persistence: number = 0.5
  ) => {
    const noise = new Array(width * height);

    // Generate random seed values
    const seed = new Array(256);
    for (let i = 0; i < 256; i++) {
      seed[i] = Math.random();
    }

    // Helper function to get smoothed noise
    const smoothNoise = (x: number, y: number, octave: number) => {
      const scaledX = (x / scale) * (1 << octave);
      const scaledY = (y / scale) * (1 << octave);

      const x0 = Math.floor(scaledX);
      const y0 = Math.floor(scaledY);
      const x1 = (x0 + 1) % width;
      const y1 = (y0 + 1) % height;

      // Fractional parts
      const sx = scaledX - x0;
      const sy = scaledY - y0;

      // Get seed values
      const n00 = seed[(x0 + y0 * width) % 256];
      const n01 = seed[(x0 + y1 * width) % 256];
      const n10 = seed[(x1 + y0 * width) % 256];
      const n11 = seed[(x1 + y1 * width) % 256];

      // Interpolate
      const nx0 = n00 * (1 - sx) + n10 * sx;
      const nx1 = n01 * (1 - sx) + n11 * sx;

      return nx0 * (1 - sy) + nx1 * sy;
    };

    // Generate perlin noise
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let amplitude = 1;
        let frequency = 1;
        let noiseValue = 0;
        let totalAmplitude = 0;

        // Combine multiple octaves of noise
        for (let o = 0; o < octaves; o++) {
          noiseValue += smoothNoise(x, y, o) * amplitude;
          totalAmplitude += amplitude;
          amplitude *= persistence;
          frequency *= 2;
        }

        // Normalize
        noiseValue /= totalAmplitude;
        noise[x + y * width] = noiseValue;
      }
    }

    return noise;
  };

  // Create territories from noise
  const createTerritories = (
    noise: number[],
    width: number,
    height: number,
    seaLevel: number = 0.4
  ): Territory[] => {
    const territories: Territory[] = [];

    // Define different territory types based on noise values
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const noiseValue = noise[x + y * width];

        // Water vs land
        const isLand = noiseValue > seaLevel;

        if (isLand) {
          // Different types of land based on "height"
          let type = "plains";
          let color = "#90be6d";
          let troopCapacity = 0; // Now territories don't produce troops by default

          if (noiseValue > 0.75) {
            type = "mountains";
            color = "#6a994e";
            troopCapacity = 0;
          } else if (noiseValue > 0.65) {
            type = "hills";
            color = "#a7c957";
            troopCapacity = 0;
          } else if (noiseValue > 0.55) {
            type = "forest";
            color = "#80b918";
            troopCapacity = 0;
          } else if (noiseValue > 0.45) {
            type = "plains";
            color = "#d4d700";
            troopCapacity = 0;
          }

          territories.push({
            x,
            y,
            type,
            color,
            owner: null,
            troops: Math.floor(Math.random() * 5) + 1,
            troopCapacity,
            isSelected: false,
            building: null,
            wall: false,
          });
        }
      }
    }

    return territories;
  };

  // Simplify the draw map function without zoom
  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const tileSize = 8; // Fixed tile size

    // Clear canvas
    ctx.fillStyle = "#2c7da0"; // Ocean blue
    ctx.fillRect(0, 0, width, height);

    // Draw territories
    territories.forEach((territory) => {
      const x = territory.x * tileSize;
      const y = territory.y * tileSize;

      // Skip tiles that are off-screen
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
      }

      // Draw the territory
      ctx.fillStyle = territory.owner ? territory.owner.color : territory.color;
      ctx.fillRect(x, y, tileSize, tileSize);

      // Draw border if selected
      if (territory.isSelected) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);
      }

      // Draw walls
      if (territory.wall) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(x, y, tileSize, tileSize);

        // Add a small colored center to show ownership
        if (territory.owner) {
          ctx.fillStyle = territory.owner.color;
          ctx.fillRect(
            x + tileSize / 4,
            y + tileSize / 4,
            tileSize / 2,
            tileSize / 2
          );
        }
      }
      // Draw troop number if owned and not a wall
      else if (territory.owner) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "8px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          territory.troops.toString(),
          x + tileSize / 2,
          y + tileSize / 2
        );
      }

      // Draw buildings if they exist and not a wall
      if (territory.building && !territory.wall) {
        // Type assertion to ensure territory.building.type is interpreted as BuildingType
        const buildingInfo = territory.building as Building;
        const buildingType = buildingTypes[buildingInfo.type as BuildingType];
        const buildingX = x + tileSize / 2;
        const buildingY = y + tileSize / 2;
        const buildingSize = 4;

        ctx.fillStyle = buildingType.color;

        if (buildingType.shape === "rect") {
          // Fort/Barracks/Market (square)
          ctx.fillRect(
            buildingX - buildingSize / 2,
            buildingY - buildingSize / 2,
            buildingSize,
            buildingSize
          );

          // Add a distinctive marking for barracks
          if (buildingInfo.type === "barracks") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(
              buildingX - buildingSize / 4,
              buildingY - buildingSize / 4,
              buildingSize / 2,
              buildingSize / 2
            );
          }
          // Add a distinctive marking for market
          else if (buildingInfo.type === "market") {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(buildingX, buildingY, buildingSize / 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (buildingType.shape === "circle") {
          // Farm/Mine (circle)
          ctx.beginPath();
          ctx.arc(buildingX, buildingY, buildingSize / 2, 0, Math.PI * 2);
          ctx.fill();

          // Add a distinctive marking for mine
          if (buildingInfo.type === "mine") {
            ctx.fillStyle = "#333333";
            ctx.beginPath();
            ctx.arc(buildingX, buildingY, buildingSize / 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (buildingType.shape === "triangle") {
          // Tower (triangle)
          ctx.beginPath();
          ctx.moveTo(buildingX, buildingY - buildingSize / 2);
          ctx.lineTo(
            buildingX - buildingSize / 2,
            buildingY + buildingSize / 2
          );
          ctx.lineTo(
            buildingX + buildingSize / 2,
            buildingY + buildingSize / 2
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    });
  };

  // Add AI player state tracking
  const [aiPlayers, setAiPlayers] = useState<
    {
      id: string;
      name: string;
      color: string;
    }[]
  >([]);
  const [lastTroopUpdateTime, setLastTroopUpdateTime] = useState(0);
  const [gameTime, setGameTime] = useState(0);

  // Initialize the game with AI players using personalities
  useEffect(() => {
    if (!gameStarted) return;

    // Create world map when game starts
    const canvas = canvasRef.current;
    if (canvas) {
      // Make the map 50% smaller
      const width = Math.floor(canvas.width / 8);
      const height = Math.floor(canvas.height / 8);

      // Generate noise for natural-looking terrain
      const noise = generatePerlinNoise(width, height, 15, 6, 0.5); // Reduced scale parameter

      // Create territories from noise
      const generatedTerritories = createTerritories(noise, width, height, 0.4);
      setTerritories(generatedTerritories);

      // Set up AI players with personalities
      const computerPlayers = [
        { id: "ai1", name: "AI Blue", color: "#457b9d" },
        { id: "ai2", name: "AI Green", color: "#2a9d8f" },
        { id: "ai3", name: "AI Orange", color: "#f4a261" },
      ];
      const aiPlayersWithPersonalities = assignAIPersonalities(computerPlayers);
      setAiPlayers(aiPlayersWithPersonalities);

      // Initialize AI territories - place them around the map edges
      const sections = [
        { x: Math.floor(width * 0.2), y: Math.floor(height * 0.2) }, // top left
        { x: Math.floor(width * 0.8), y: Math.floor(height * 0.2) }, // top right
        { x: Math.floor(width * 0.5), y: Math.floor(height * 0.8) }, // bottom center
      ];

      // Assign starting territories to AI players
      const updatedTerritories = [...generatedTerritories];

      aiPlayersWithPersonalities.forEach((player, index) => {
        const center = sections[index];
        const startingRadius = 2;
        let territoriesClaimed = 0;

        updatedTerritories.forEach((territory) => {
          const dx = territory.x - center.x;
          const dy = territory.y - center.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= startingRadius) {
            territory.owner = {
              id: player.id,
              name: player.name,
              color: player.color,
            };
            territory.troops = 5 + Math.floor(Math.random() * 5);

            // Give each AI a barracks to start
            if (distance <= 0.5 && !territory.building) {
              territory.building = {
                type: "barracks",
                level: 1,
              };
            }

            territoriesClaimed++;
          }
        });
      });

      setTerritories(updatedTerritories);

      // Reset game time
      setGameTime(0);
      setLastTroopUpdateTime(0);

      // Player will claim their first territory by clicking
      setHasClaimedTerritory(false);
      setGameStatus(
        "Click on a territory to claim your starting point! AI players have already settled."
      );
    }
  }, [gameStarted]);

  // Slow down troop growth by changing the master timer
  useEffect(() => {
    if (!gameStarted) return;

    // Create a master game timer that updates every 100ms
    const gameTimer = setInterval(() => {
      setGameTime((currentTime) => {
        const newTime = currentTime + 0.1;

        // Advance game day every 30 seconds
        if (Math.floor(currentTime / 30) < Math.floor(newTime / 30)) {
          setGameDay((prev) => prev + 1);

          // Check for random events
          if (gameDay === nextEventDay) {
            triggerRandomEvent();
            setNextEventDay(gameDay + Math.floor(Math.random() * 5) + 3); // Next event in 3-7 days
          }
        }

        return newTime;
      });
    }, 100);

    return () => clearInterval(gameTimer);
  }, [gameStarted, gameDay, nextEventDay]);

  // Create a function for random events
  const triggerRandomEvent = () => {
    const events = [
      {
        name: "Resource Boom",
        effect: "All your farms produce double troops for the next 3 days!",
        action: () => {
          // Could implement buff here
          setTimeout(() => setEventActive(false), 90000); // 90 seconds = 3 game days
        },
      },
      {
        name: "Supply Shortage",
        effect: "AI players have reduced troop production for 2 days.",
        action: () => {
          // Could implement debuff here
          setTimeout(() => setEventActive(false), 60000); // 60 seconds = 2 game days
        },
      },
      {
        name: "Military Parade",
        effect: "Your defensive buildings are 50% more effective for 2 days!",
        action: () => {
          setTimeout(() => setEventActive(false), 60000);
        },
      },
    ];

    const selectedEvent = events[Math.floor(Math.random() * events.length)];
    setCurrentEvent(
      `Day ${gameDay}: ${selectedEvent.name} - ${selectedEvent.effect}`
    );
    setEventActive(true);
    selectedEvent.action();

    setGameStatus(selectedEvent.effect);
  };

  // Modify the troop update timer to be slower (every 3 seconds)
  useEffect(() => {
    if (!gameStarted || territories.length === 0 || !hasClaimedTerritory)
      return;

    // Only update troops every 3 seconds
    if (gameTime - lastTroopUpdateTime >= 3) {
      // Handle player troop updates
      const playerTerritories = territories.filter(
        (t) => t.owner && t.owner.id === "player1"
      );

      // Only territories with barracks produce troops
      const barracksTerritories = playerTerritories.filter(
        (t) => t.building && t.building.type === "barracks"
      );

      // Calculate farm bonus - now 1% per farm
      const farmCount = playerTerritories.reduce((count, t) => {
        if (t.building && t.building.type === "farm") {
          return count + 1;
        }
        return count;
      }, 0);

      // Calculate gold income from mines and markets
      const mineCount = playerTerritories.reduce((count, t) => {
        if (t.building && t.building.type === "mine") {
          return count + 1;
        }
        return count;
      }, 0);

      const marketCount = playerTerritories.reduce((count, t) => {
        if (t.building && t.building.type === "market") {
          return count + 1;
        }
        return count;
      }, 0);

      // Each farm provides 1% boost per territory
      const farmBonus = farmCount * 0.01 * playerTerritories.length;

      // Apply event bonus if active
      const eventMultiplier =
        eventActive && currentEvent.includes("Resource Boom") ? 2 : 1;

      // Base growth now comes from barracks count
      const baseGrowth = barracksTerritories.length * 3;
      // Apply farm bonus to total growth
      const totalGrowth = baseGrowth * (1 + farmBonus) * eventMultiplier;

      setPlayerTroops((prev) => Math.floor(prev + totalGrowth));

      // Gold growth from base, mines and markets
      const baseGoldGrowth = 10 + playerTerritories.length * 0.5; // Base gold growth
      const mineGoldBonus = mineCount * buildingTypes.mine.goldBonus!; // Gold from mines
      const marketGoldBonus = marketCount * buildingTypes.market.goldBonus!; // Gold from markets
      const totalGoldGrowth = baseGoldGrowth + mineGoldBonus + marketGoldBonus;

      setPlayerGold((prev) => Math.floor(prev + totalGoldGrowth));

      // Add troops to territories with barracks
      if (territories.length > 0) {
        const updatedTerritories = [...territories];

        // Process player territories
        barracksTerritories.forEach((territory) => {
          const territoryIndex = territories.findIndex(
            (t) => t.x === territory.x && t.y === territory.y
          );

          if (territoryIndex !== -1) {
            // Base growth from barracks
            let growth = 1;

            // Additional growth for farms
            if (territory.building && territory.building.type === "barracks") {
              growth += (territory.building as Building).level;
            }

            updatedTerritories[territoryIndex].troops += growth;
          }
        });

        // Process AI territories with smarter decisions
        aiPlayers.forEach((aiPlayer) => {
          // Make decisions for the AI player
          const aiDecision = makeAIDecisions(
            updatedTerritories,
            aiPlayer,
            gameDay
          );

          if (aiDecision) {
            // Process the AI's decision and update territories
            const aiUpdatedTerritories = processAIAction(
              updatedTerritories,
              aiDecision,
              aiPlayer
            );

            // Replace the territories with the updated ones
            for (let i = 0; i < aiUpdatedTerritories.length; i++) {
              updatedTerritories[i] = aiUpdatedTerritories[i];
            }

            // Notify player if their territory was captured by an AI
            if (
              aiDecision.action === "attack" &&
              aiDecision.target?.owner?.id === "player1" &&
              aiDecision.source &&
              aiDecision.source.troops >
                aiDecision.target.troops *
                  (aiDecision.target.building?.type === "fort" ? 2 : 1)
            ) {
              setGameStatus(
                `${aiPlayer.name} has attacked your territory at (${aiDecision.target.x}, ${aiDecision.target.y})!`
              );
            }
          }

          // Also give base troop growth to AI territories with barracks
          const aiBarracksTerritories = updatedTerritories.filter(
            (t) =>
              t.owner &&
              t.owner.id === aiPlayer.id &&
              t.building &&
              t.building.type === "barracks"
          );

          aiBarracksTerritories.forEach((territory) => {
            const territoryIndex = updatedTerritories.findIndex(
              (t) => t.x === territory.x && t.y === territory.y
            );

            if (territoryIndex !== -1) {
              // AI territories with barracks grow at a similar rate
              updatedTerritories[territoryIndex].troops += 1;
            }
          });
        });

        setTerritories(updatedTerritories);
      }

      // Update the last update time
      setLastTroopUpdateTime(gameTime);
    }
  }, [
    gameTime,
    gameStarted,
    territories,
    hasClaimedTerritory,
    aiPlayers,
    eventActive,
    currentEvent,
    gameDay,
  ]);

  // Handle canvas clicks - simplified without zoom
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    // Prevent default behavior
    e.preventDefault();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calculate click position
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Scale to canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const scaledX = clickX * scaleX;
    const scaledY = clickY * scaleY;

    // Convert to tile coordinates
    const tileSize = 8;
    const x = Math.floor(scaledX / tileSize);
    const y = Math.floor(scaledY / tileSize);

    console.log(`Clicked at position (${x}, ${y})`);

    // Find clicked territory
    const clickedIndex = territories.findIndex((t) => t.x === x && t.y === y);
    console.log(`Clicked territory index: ${clickedIndex}`);

    if (clickedIndex === -1) {
      console.log("No territory found at this position");
      return;
    }

    // If player hasn't claimed first territory yet
    if (!hasClaimedTerritory) {
      const updatedTerritories = [...territories];
      const startingTerritory = updatedTerritories[clickedIndex];

      // Set up player
      const player = {
        id: "player1",
        name: playerName || "Player",
        color: "#e63946",
      };

      // Claim the clicked territory and surrounding area
      const claimRadius = 2;
      let territoriesClaimed = 0;

      updatedTerritories.forEach((territory) => {
        const dx = territory.x - startingTerritory.x;
        const dy = territory.y - startingTerritory.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= claimRadius) {
          territory.owner = {
            id: player.id,
            name: player.name,
            color: player.color,
          };
          territory.troops = 10;
          territoriesClaimed++;

          // Add a free barracks to the starting point
          if (distance === 0) {
            territory.building = {
              type: "barracks",
              level: 1,
            };
          }
        }
      });

      setTerritories(updatedTerritories);
      setHasClaimedTerritory(true);
      setGameStatus(
        `You've claimed ${territoriesClaimed} territories! Your starting territory has a barracks to produce troops. Build more barracks to grow faster!`
      );
      return;
    }

    // Handle building mode
    if (buildingMode && selectedBuildingType) {
      const territory = territories[clickedIndex];

      // Special handling for walls - can only be built on empty tiles
      if (selectedBuildingType === "wall") {
        // Can only build walls on empty tiles (not owned by any player)
        if (!territory.owner) {
          const buildingType = buildingTypes[selectedBuildingType];

          if (playerGold >= buildingType.cost) {
            // Create a copy of territories
            const updatedTerritories = [...territories];

            // Add wall and mark it as owned by player for color display only
            updatedTerritories[clickedIndex].wall = true;
            updatedTerritories[clickedIndex].owner = {
              id: "player1",
              name: playerName || "Player",
              color: "#e63946",
            };
            // Walls don't have troops
            updatedTerritories[clickedIndex].troops = 0;

            // Deduct cost
            setPlayerGold((prev) => prev - buildingType.cost);

            // Update territories
            setTerritories(updatedTerritories);
            setGameStatus(`Built a Wall at (${x},${y})`);

            // Exit building mode
            setBuildingMode(false);
            setSelectedBuildingType("");
          } else {
            setGameStatus(
              `Not enough gold to build. Need ${buildingType.cost} gold.`
            );
          }
          return;
        } else {
          setGameStatus("You can only build walls on empty territory");
          return;
        }
      }

      // For other building types - can only build on own territory
      else if (territory.owner && territory.owner.id === "player1") {
        if (territory.building) {
          setGameStatus("This territory already has a building");
          return;
        }

        // Since selectedBuildingType is already typed, this is safe
        const buildingType = buildingTypes[selectedBuildingType];
        if (playerGold >= buildingType.cost) {
          // Create a copy of territories
          const updatedTerritories = [...territories];

          // Add building
          updatedTerritories[clickedIndex].building = {
            type: selectedBuildingType,
            level: 1,
          };

          // Deduct cost
          setPlayerGold((prev) => prev - buildingType.cost);

          // Update territories
          setTerritories(updatedTerritories);
          setGameStatus(`Built a ${buildingType.name} at (${x},${y})`);

          // Exit building mode
          setBuildingMode(false);
          setSelectedBuildingType("");
        } else {
          setGameStatus(
            `Not enough gold to build. Need ${buildingType.cost} gold.`
          );
        }
        return;
      } else {
        setGameStatus("You can only build on your own territory");
        return;
      }
    }

    // Regular territory selection/attack logic
    // Make a copy of territories
    const updatedTerritories = [...territories];

    // Find previously selected territory
    const selectedIndex = territories.findIndex((t) => t.isSelected);
    console.log(`Selected territory index: ${selectedIndex}`);

    if (selectedIndex === -1) {
      // No territory was selected before - select if it's player's
      if (
        updatedTerritories[clickedIndex].owner &&
        updatedTerritories[clickedIndex].owner.id === "player1"
      ) {
        console.log("Selected your territory");
        updatedTerritories[clickedIndex].isSelected = true;
        setTerritories(updatedTerritories);

        // Show building options if this territory has no building
        if (!updatedTerritories[clickedIndex].building) {
          setGameStatus(
            `Selected territory at (${x},${y}) with ${updatedTerritories[clickedIndex].troops} troops`
          );
        } else {
          const buildingInfo = updatedTerritories[clickedIndex]
            .building as Building;
          const buildingType = buildingTypes[buildingInfo.type as BuildingType];
          setGameStatus(
            `Selected territory with ${buildingType.name} (Level ${buildingInfo.level})`
          );
        }
      } else {
        console.log("Cannot select - not your territory");
      }
    } else {
      // We already had a selection - try to attack/move
      const selectedTerritory = updatedTerritories[selectedIndex];
      const targetTerritory = updatedTerritories[clickedIndex];

      // Calculate distance to check if territories are adjacent
      const dx = selectedTerritory.x - targetTerritory.x;
      const dy = selectedTerritory.y - targetTerritory.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      console.log(`Distance between territories: ${distance}`);

      // Check if the target is a wall (can't move onto walls)
      if (targetTerritory.wall) {
        setGameStatus("Cannot move troops onto walls");
        // Clear selection
        updatedTerritories[selectedIndex].isSelected = false;
        setTerritories(updatedTerritories);
        return;
      }

      // Check if the territory has a tower which extends attack range
      const hasRangeBonus =
        selectedTerritory.building &&
        selectedTerritory.building.type === "tower"
          ? (selectedTerritory.building as Building).level
          : 0;

      if (distance <= 2 + hasRangeBonus) {
        // Allow moving to adjacent or diagonal territories
        if (targetTerritory.owner && targetTerritory.owner.id === "player1") {
          // Moving troops between own territories
          const troopsToMove = Math.floor(selectedTerritory.troops * 0.8);
          console.log(`Moving ${troopsToMove} troops to your own territory`);
          if (troopsToMove > 0) {
            targetTerritory.troops += troopsToMove;
            selectedTerritory.troops -= troopsToMove;
            setGameStatus(
              `Moved ${troopsToMove} troops to (${targetTerritory.x},${targetTerritory.y})`
            );
          }
        } else {
          // Attacking enemy or neutral territory
          // Apply fort defense bonus
          const defenseBonus =
            targetTerritory.building && targetTerritory.building.type === "fort"
              ? (targetTerritory.building as Building).level
              : 0;

          const effectiveDefense = targetTerritory.troops * (1 + defenseBonus);

          const attackingTroops = Math.floor(selectedTerritory.troops / 2);
          console.log(
            `Attacking with ${attackingTroops} troops vs ${targetTerritory.troops} defending troops (effective: ${effectiveDefense})`
          );

          if (attackingTroops > 0) {
            if (attackingTroops > effectiveDefense) {
              // Successful attack
              console.log("Attack successful!");
              targetTerritory.owner = {
                id: "player1",
                name: playerName || "Player",
                color: "#e63946",
              };
              targetTerritory.troops = attackingTroops - targetTerritory.troops;
              selectedTerritory.troops -= attackingTroops;

              // Destroy building when captured
              if (targetTerritory.building) {
                targetTerritory.building = null;
                setGameStatus(
                  `Captured territory at (${targetTerritory.x},${targetTerritory.y}) and destroyed enemy building!`
                );
              } else {
                setGameStatus(
                  `Captured territory at (${targetTerritory.x},${targetTerritory.y})`
                );
              }
            } else {
              // Failed attack
              console.log("Attack failed!");
              targetTerritory.troops -= Math.floor(
                attackingTroops / (1 + defenseBonus)
              );
              selectedTerritory.troops -= attackingTroops;
              setGameStatus(`Attack failed! Enemy has a strong defense.`);
            }
          }
        }
      } else {
        setGameStatus(
          `Target is too far away (distance: ${distance.toFixed(1)})`
        );
      }

      // Clear selection
      updatedTerritories[selectedIndex].isSelected = false;
      setTerritories(updatedTerritories);
    }
  };

  // Remove zoom-related functions
  // handleZoomIn, handleZoomOut, handleZoomReset, etc.

  // Remove keyboard zoom handlers
  useEffect(() => {
    if (!gameStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && buildingMode) {
        // Cancel building mode
        setBuildingMode(false);
        setSelectedBuildingType("");
        setGameStatus("Building mode canceled");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, buildingMode]);

  // Remove all the panning functionality
  // handleMouseDown, handleMouseMove, handleMouseUp

  // Update canvas props - remove zoom controls from JSX
  // <canvas
  //   ref={canvasRef}
  //   width={800}
  //   height={600}
  //   onClick={handleCanvasClick}
  //   className="block w-full"
  // />

  // Remove zoom controls from JSX
  // <div className="relative border border-gray-300 rounded overflow-hidden">
  //   <canvas
  //     ref={canvasRef}
  //     width={800}
  //     height={600}
  //     onClick={handleCanvasClick}
  //     className="block w-full"
  //   />
  //   <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded text-sm">
  //     {gameStatus}
  //   </div>
  // </div>

  // Make sure to draw the map when territories change
  useEffect(() => {
    if (gameStarted && territories.length > 0) {
      drawMap();
    }
  }, [gameStarted, territories]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <header className="bg-blue-500 text-white p-4 mb-8 w-full text-center rounded">
        <h1 className="text-2xl font-bold">OpenFront</h1>
        <p>A territorial conquest game</p>
      </header>

      {!gameStarted ? (
        <div className="bg-white shadow-md rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Welcome to OpenFront
          </h2>
          <p className="mb-6 text-gray-600 text-center">
            A multiplayer territorial conquest game inspired by territorial.io
          </p>

          <div className="mb-4">
            <label
              htmlFor="playerName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Enter your name:
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Your name"
            />
          </div>

          <button
            onClick={() => setGameStarted(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Start Game
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl w-full">
          <h2 className="text-xl font-bold mb-4">World Map</h2>
          <p className="mb-4">
            {!hasClaimedTerritory
              ? "Welcome, " +
                (playerName || "Player") +
                "! Click on a territory to claim your starting point!"
              : "Welcome, " +
                (playerName || "Player") +
                "! Click to select and attack territories."}
          </p>
          <div className="relative border border-gray-300 rounded overflow-hidden">
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              onClick={handleCanvasClick}
              className="block w-full"
            />
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded text-base max-w-md">
              {gameStatus}
            </div>
          </div>

          {/* Building controls */}
          <div className="flex justify-between items-center mt-4 mb-2">
            <div>
              <span className="font-bold text-lg">Troops:</span>{" "}
              <span className="text-lg">{playerTroops}</span>
              <span className="text-sm text-gray-500 ml-1">
                (+
                {Math.floor(
                  // Calculate base growth from barracks
                  territories.filter(
                    (t) =>
                      t.owner &&
                      t.owner.id === "player1" &&
                      t.building?.type === "barracks"
                  ).length *
                    3 *
                    // Apply farm bonus (1% per farm per territory)
                    (1 +
                      territories.filter(
                        (t) =>
                          t.owner &&
                          t.owner.id === "player1" &&
                          t.building?.type === "farm"
                      ).length *
                        0.01 *
                        territories.filter(
                          (t) => t.owner && t.owner.id === "player1"
                        ).length)
                )}
                /3s)
              </span>
              <span className="font-bold text-lg ml-6">Gold:</span>{" "}
              <span className="text-lg">{playerGold}</span>
              <span className="text-sm text-gray-500 ml-1">
                (+
                {Math.floor(
                  10 + // Base gold growth
                    territories.filter(
                      (t) => t.owner && t.owner.id === "player1"
                    ).length *
                      0.5 + // Territory bonus
                    territories.filter(
                      (t) =>
                        t.owner &&
                        t.owner.id === "player1" &&
                        t.building?.type === "mine"
                    ).length *
                      buildingTypes.mine.goldBonus! + // Mine bonus
                    territories.filter(
                      (t) =>
                        t.owner &&
                        t.owner.id === "player1" &&
                        t.building?.type === "market"
                    ).length *
                      buildingTypes.market.goldBonus! // Market bonus
                )}
                /3s)
              </span>
            </div>
            <div className="flex">
              <button
                className={`px-4 py-2 rounded mx-1 text-white text-base ${
                  buildingMode && selectedBuildingType === "barracks"
                    ? "bg-red-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
                onClick={() => {
                  setBuildingMode(true);
                  setSelectedBuildingType("barracks");
                  setGameStatus(
                    `Building mode: Barracks (Cost: ${buildingTypes.barracks.cost} gold) - Required to produce troops in a territory`
                  );
                }}
              >
                Build Barracks ({buildingTypes.barracks.cost})
              </button>
              <button
                className={`px-4 py-2 rounded mx-1 text-white text-base ${
                  buildingMode && selectedBuildingType === "wall"
                    ? "bg-black"
                    : "bg-gray-700 hover:bg-gray-800"
                }`}
                onClick={() => {
                  setBuildingMode(true);
                  setSelectedBuildingType("wall");
                  setGameStatus(
                    `Building mode: Wall (Cost: ${buildingTypes.wall.cost} gold) - Impenetrable defense, blocks movement`
                  );
                }}
              >
                Build Wall ({buildingTypes.wall.cost})
              </button>
              <button
                className={`px-4 py-2 rounded mx-1 text-white text-base ${
                  buildingMode && selectedBuildingType === "fort"
                    ? "bg-red-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
                onClick={() => {
                  setBuildingMode(true);
                  setSelectedBuildingType("fort");
                  setGameStatus(
                    `Building mode: Fort (Cost: ${buildingTypes.fort.cost} gold) - Click on your territory to build`
                  );
                }}
              >
                Build Fort ({buildingTypes.fort.cost})
              </button>
            </div>
          </div>

          <div className="flex mt-2">
            <button
              className={`px-4 py-2 rounded mx-1 text-white text-base ${
                buildingMode && selectedBuildingType === "farm"
                  ? "bg-yellow-700"
                  : "bg-yellow-500 hover:bg-yellow-600"
              }`}
              onClick={() => {
                setBuildingMode(true);
                setSelectedBuildingType("farm");
                setGameStatus(
                  `Building mode: Farm (Cost: ${buildingTypes.farm.cost} gold) - Increases troop production by 30%`
                );
              }}
            >
              Build Farm ({buildingTypes.farm.cost})
            </button>
            <button
              className={`px-4 py-2 rounded mx-1 text-white text-base ${
                buildingMode && selectedBuildingType === "tower"
                  ? "bg-gray-700"
                  : "bg-gray-500 hover:bg-gray-600"
              }`}
              onClick={() => {
                setBuildingMode(true);
                setSelectedBuildingType("tower");
                setGameStatus(
                  `Building mode: Tower (Cost: ${buildingTypes.tower.cost} gold) - Extends attack range by 1 tile`
                );
              }}
            >
              Build Tower ({buildingTypes.tower.cost})
            </button>
            <button
              className={`px-4 py-2 rounded mx-1 text-white text-base ${
                buildingMode && selectedBuildingType === "mine"
                  ? "bg-slate-800"
                  : "bg-slate-600 hover:bg-slate-700"
              }`}
              onClick={() => {
                setBuildingMode(true);
                setSelectedBuildingType("mine");
                setGameStatus(
                  `Building mode: Mine (Cost: ${buildingTypes.mine.cost} gold) - Generates ${buildingTypes.mine.goldBonus} gold per turn`
                );
              }}
            >
              Build Mine ({buildingTypes.mine.cost})
            </button>
            <button
              className={`px-4 py-2 rounded mx-1 text-white text-base ${
                buildingMode && selectedBuildingType === "market"
                  ? "bg-orange-700"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
              onClick={() => {
                setBuildingMode(true);
                setSelectedBuildingType("market");
                setGameStatus(
                  `Building mode: Market (Cost: ${buildingTypes.market.cost} gold) - Generates ${buildingTypes.market.goldBonus} gold per turn`
                );
              }}
            >
              Build Market ({buildingTypes.market.cost})
            </button>
          </div>

          <div className="flex justify-between mt-2">
            <button
              className="bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => setGameStarted(false)}
            >
              Quit Game
            </button>
            <div className="text-sm text-gray-600">
              <p className="mb-1">
                <strong>Controls:</strong> Click territories to select and
                attack. ESC to cancel building.
              </p>
              <p>
                <strong>Buildings:</strong> Barracks (troops), Walls
                (impassable), Fort (defense), Farm (troop boost), Tower (range),
                Mine (gold), Market (more gold)
              </p>
            </div>
          </div>

          {/* Add game day display */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded">
            Day {gameDay}
          </div>

          {/* Add event notification */}
          {eventActive && (
            <div className="absolute top-4 left-4 bg-yellow-500 bg-opacity-90 text-white p-2 rounded max-w-xs">
              {currentEvent}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
