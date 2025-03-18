// Game simulator for neural network training
import { neuralAI, TrainingMetrics } from "./neuralAI";
import * as tf from "@tensorflow/tfjs";

// Game state types
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
  gold?: number;
}

interface Building {
  type: BuildingType;
  level: number;
}

type BuildingType =
  | "fort"
  | "farm"
  | "tower"
  | "barracks"
  | "wall"
  | "mine"
  | "market";

interface AIPlayer {
  id: string;
  name: string;
  color: string;
  personality?: string;
  gold?: number;
  troops?: number;
  territory?: number;
}

// Simulator class to run training episodes
export class GameSimulator {
  private isRunning: boolean = false;
  private simulationSpeed: number = 1; // Relative speed (higher = faster simulation)
  private episodeCount: number = 0; // Total episodes run
  private currentEpisode: number = 0;
  private maxEpisodes: number = 10000; // Max episodes to run

  // Game state
  private territories: Territory[] = [];
  private players: AIPlayer[] = [];
  private currentState: number[] = [];
  private gameDay: number = 0;
  private maxGameDays: number = 200; // Max days per episode

  constructor() {
    console.log("Game simulator initialized");
  }

  // Start the training simulation
  public startSimulation(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("Starting game simulation for training");
    this.runSimulation();
  }

  // Stop the simulation
  public stopSimulation(): void {
    this.isRunning = false;
    console.log("Simulation stopped at episode", this.currentEpisode);
  }

  // Set simulation speed
  public setSimulationSpeed(speed: number): void {
    this.simulationSpeed = Math.max(0.1, Math.min(10, speed));
  }

  // Get current simulation status
  public getStatus(): {
    isRunning: boolean;
    currentEpisode: number;
    episodeCount: number;
    speed: number;
  } {
    return {
      isRunning: this.isRunning,
      currentEpisode: this.currentEpisode,
      episodeCount: this.episodeCount,
      speed: this.simulationSpeed,
    };
  }

  // Initialize a new game episode
  private initializeEpisode(): void {
    // Reset game state
    this.gameDay = 0;
    this.territories = this.generateRandomMap(20, 15); // Generate a random map (width, height)
    this.players = this.initializePlayers(3); // 3 players
    this.distributeStartingTerritories();

    // Extract state for the neural network player (first player)
    this.currentState = neuralAI.extractFeatures(
      this.territories,
      this.players[0]
    );

    this.currentEpisode++;
    this.episodeCount++;
  }

  // Run the simulation loop
  private async runSimulation(): Promise<void> {
    if (!this.isRunning) return;

    // Initialize first episode if needed
    if (this.currentEpisode === 0) {
      this.initializeEpisode();
    }

    // Main simulation loop
    while (this.isRunning && this.currentEpisode <= this.maxEpisodes) {
      try {
        // Run a single episode
        const result = await this.runEpisode();

        // Record metrics
        neuralAI.addMetric({
          episode: this.currentEpisode,
          reward: result.totalReward,
          territoriesOwned: result.territoriesOwned,
          goldAccumulated: result.goldAccumulated,
          troopsAccumulated: result.troopsAccumulated,
          buildingsConstructed: result.buildingsConstructed,
          winRate: result.isWinner ? 1 : 0,
        });

        // Train the model periodically
        if (this.currentEpisode % 5 === 0) {
          await neuralAI.trainOnBatch();
        }

        // Initialize next episode
        this.initializeEpisode();

        // Pause briefly to prevent browser from hanging
        // Adjust delay based on simulation speed
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 / this.simulationSpeed)
        );
      } catch (error) {
        console.error("Error in simulation:", error);
        this.stopSimulation();
      }
    }

    // Simulation complete
    this.isRunning = false;
    console.log("Simulation complete after", this.episodeCount, "episodes");
  }

  // Run a single episode of the game
  private async runEpisode(): Promise<{
    totalReward: number;
    territoriesOwned: number;
    goldAccumulated: number;
    troopsAccumulated: number;
    buildingsConstructed: number;
    isWinner: boolean;
  }> {
    let totalReward = 0;
    let isGameOver = false;

    // Run until game is over or max days reached
    while (!isGameOver && this.gameDay < this.maxGameDays) {
      // Increment game day
      this.gameDay++;

      // Get current state for the neural network player
      const neuralPlayer = this.players[0];
      const previousState = {
        territories: [...this.territories],
        player: { ...neuralPlayer },
      };

      // Neural AI turn
      const legalActions = neuralAI.getLegalActions(
        this.territories,
        neuralPlayer
      );
      if (legalActions.length > 0) {
        // Choose action using the neural network
        const state = neuralAI.extractFeatures(this.territories, neuralPlayer);
        const action = await neuralAI.chooseAction(
          state,
          this.territories,
          neuralPlayer,
          legalActions
        );

        // Execute the action
        this.executeAction(action, neuralPlayer);
      }

      // AI opponents' turns
      for (let i = 1; i < this.players.length; i++) {
        const aiPlayer = this.players[i];
        // Simple rule-based AI for opponents
        this.executeAITurn(aiPlayer);
      }

      // Update game state (resources, troops, etc.)
      this.updateGameState();

      // Check for game over condition
      isGameOver = this.checkGameOver();

      // Calculate reward for the neural network
      const currentState = {
        territories: [...this.territories],
        player: { ...neuralPlayer },
      };

      const reward = neuralAI.calculateReward(previousState, currentState);
      totalReward += reward;

      // Add to experience memory
      const prevStateFeatures = neuralAI.extractFeatures(
        previousState.territories,
        previousState.player
      );
      const nextStateFeatures = neuralAI.extractFeatures(
        currentState.territories,
        currentState.player
      );

      // Store the experience if an action was taken
      if (legalActions.length > 0) {
        // This is simplified - in a real implementation we'd store the actual action
        const actionIndices = [0, 0, 0, 0]; // Placeholder
        neuralAI.addExperience(
          prevStateFeatures,
          actionIndices,
          reward,
          nextStateFeatures,
          isGameOver
        );
      }
    }

    // Final stats for this episode
    const neuralPlayer = this.players[0];
    const territoriesOwned = this.territories.filter(
      (t) => t.owner && t.owner.id === neuralPlayer.id
    ).length;

    const goldAccumulated = neuralPlayer.gold || 0;

    const troopsAccumulated = this.territories.reduce(
      (sum, t) =>
        t.owner && t.owner.id === neuralPlayer.id ? sum + t.troops : sum,
      0
    );

    const buildingsConstructed = this.territories.reduce(
      (sum, t) =>
        t.owner && t.owner.id === neuralPlayer.id && t.building ? sum + 1 : sum,
      0
    );

    // Determine if neural network player won
    const isWinner = this.determineWinner() === neuralPlayer.id;

    // Add win bonus to reward if won
    if (isWinner) {
      totalReward += 100; // Big bonus for winning
    }

    return {
      totalReward,
      territoriesOwned,
      goldAccumulated,
      troopsAccumulated,
      buildingsConstructed,
      isWinner,
    };
  }

  // Generate a random map
  private generateRandomMap(width: number, height: number): Territory[] {
    const territories: Territory[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        territories.push({
          x,
          y,
          type: "land",
          color: "#c2b280", // Sand color for empty land
          owner: null,
          troops: Math.floor(Math.random() * 5) + 1, // 1-5 troops for neutral territories
          troopCapacity: 100,
          isSelected: false,
          building: null,
          gold: Math.floor(Math.random() * 20), // 0-19 gold
        });
      }
    }

    // Add some water and mountains randomly
    territories.forEach((territory) => {
      const random = Math.random();
      if (random < 0.1) {
        territory.type = "water";
        territory.color = "#4a8fde";
        territory.troops = 0;
      } else if (random < 0.2) {
        territory.type = "mountain";
        territory.color = "#808080";
        territory.troopCapacity = 50; // Mountains have lower capacity
      }
    });

    return territories;
  }

  // Initialize players
  private initializePlayers(count: number): AIPlayer[] {
    const colors = ["#e63946", "#457b9d", "#2a9d8f", "#f4a261"];
    const players: AIPlayer[] = [];

    // Neural network player
    players.push({
      id: "neural",
      name: "Neural AI",
      color: colors[0],
      gold: 500,
      troops: 100,
      territory: 0,
    });

    // Regular AI players
    for (let i = 1; i < count; i++) {
      players.push({
        id: `ai${i}`,
        name: `AI Player ${i}`,
        color: colors[i],
        personality: i % 2 === 0 ? "aggressive" : "defensive",
        gold: 500,
        troops: 100,
        territory: 0,
      });
    }

    return players;
  }

  // Distribute starting territories to players
  private distributeStartingTerritories(): void {
    const width = Math.max(...this.territories.map((t) => t.x)) + 1;
    const height = Math.max(...this.territories.map((t) => t.y)) + 1;

    // Assign territories to each player
    this.players.forEach((player, index) => {
      // Determine starting position based on player index
      let startX, startY;

      switch (index) {
        case 0: // Neural AI - top left
          startX = Math.floor(width * 0.2);
          startY = Math.floor(height * 0.2);
          break;
        case 1: // AI 1 - top right
          startX = Math.floor(width * 0.8);
          startY = Math.floor(height * 0.2);
          break;
        case 2: // AI 2 - bottom left
          startX = Math.floor(width * 0.2);
          startY = Math.floor(height * 0.8);
          break;
        default: // AI 3 - bottom right
          startX = Math.floor(width * 0.8);
          startY = Math.floor(height * 0.8);
      }

      // Assign a 2x2 territory around the starting position
      for (let y = startY - 1; y <= startY; y++) {
        for (let x = startX - 1; x <= startX; x++) {
          const territoryIndex = this.territories.findIndex(
            (t) => t.x === x && t.y === y
          );

          if (territoryIndex !== -1) {
            const territory = this.territories[territoryIndex];
            if (territory.type !== "water") {
              // Avoid water territories
              // Assign ownership
              this.territories[territoryIndex].owner = {
                id: player.id,
                name: player.name,
                color: player.color,
              };

              // Give starting troops
              this.territories[territoryIndex].troops = 10;
            }
          }
        }
      }
    });
  }

  // Execute an action from the neural AI
  private executeAction(
    action: {
      action: "attack" | "defend" | "build";
      source?: Territory;
      target?: Territory;
      buildingType?: BuildingType;
    },
    player: AIPlayer
  ): void {
    switch (action.action) {
      case "attack":
        if (!action.source || !action.target) return;

        // Find territories in the actual map
        const sourceIndex = this.territories.findIndex(
          (t) => t.x === action.source!.x && t.y === action.source!.y
        );

        const targetIndex = this.territories.findIndex(
          (t) => t.x === action.target!.x && t.y === action.target!.y
        );

        if (sourceIndex === -1 || targetIndex === -1) return;

        // Get actual territories
        const source = this.territories[sourceIndex];
        const target = this.territories[targetIndex];

        // Ensure source is owned by player and has enough troops
        if (
          !source.owner ||
          source.owner.id !== player.id ||
          source.troops < 2
        ) {
          return;
        }

        // Calculate attacking troops (80% of source)
        const attackingTroops = Math.floor(source.troops * 0.8);

        // Update source troops
        this.territories[sourceIndex].troops -= attackingTroops;

        // Determine outcome
        if (attackingTroops > target.troops) {
          // Successful attack
          this.territories[targetIndex].owner = {
            id: player.id,
            name: player.name,
            color: player.color,
          };
          this.territories[targetIndex].troops =
            attackingTroops - target.troops;
        } else {
          // Failed attack
          this.territories[targetIndex].troops -= attackingTroops;
        }
        break;

      case "defend":
        if (!action.target) return;

        // Find territory
        const defendIndex = this.territories.findIndex(
          (t) => t.x === action.target!.x && t.y === action.target!.y
        );

        if (defendIndex === -1) return;

        // Ensure territory is owned by player
        if (
          !this.territories[defendIndex].owner ||
          this.territories[defendIndex].owner.id !== player.id
        ) {
          return;
        }

        // Add 5 troops
        this.territories[defendIndex].troops += 5;
        break;

      case "build":
        if (!action.target || !action.buildingType) return;

        // Find territory
        const buildIndex = this.territories.findIndex(
          (t) => t.x === action.target!.x && t.y === action.target!.y
        );

        if (buildIndex === -1) return;

        // Define building costs
        const buildingCosts = {
          fort: 100,
          farm: 150,
          tower: 200,
          barracks: 120,
          wall: 80,
          mine: 150,
          market: 200,
        };

        const cost = buildingCosts[action.buildingType] || 0;

        // Check if player has enough gold
        if ((player.gold || 0) < cost) return;

        // Deduct gold
        player.gold = (player.gold || 0) - cost;

        // Add building or wall
        if (action.buildingType === "wall") {
          // Only build walls on empty tiles
          if (!this.territories[buildIndex].owner) {
            this.territories[buildIndex].wall = true;

            // For visualization, mark as owned by the player
            this.territories[buildIndex].owner = {
              id: player.id,
              name: player.name,
              color: player.color,
            };

            // Walls don't have troops
            this.territories[buildIndex].troops = 0;
          }
        } else {
          // Only build on owned territories
          if (
            this.territories[buildIndex].owner &&
            this.territories[buildIndex].owner.id === player.id
          ) {
            this.territories[buildIndex].building = {
              type: action.buildingType,
              level: 1,
            };
          }
        }
        break;
    }
  }

  // Execute a turn for a rule-based AI player
  private executeAITurn(player: AIPlayer): void {
    // Simple rule-based AI implementation
    // This is a simplified version - in a real implementation this would be more complex

    // Find territories owned by this AI
    const ownedTerritories = this.territories.filter(
      (t) => t.owner && t.owner.id === player.id
    );

    if (ownedTerritories.length === 0) return;

    // Choose a random territory with enough troops to attack from
    const attackCandidates = ownedTerritories.filter((t) => t.troops >= 5);

    if (attackCandidates.length > 0 && Math.random() < 0.7) {
      // Attack mode
      const source =
        attackCandidates[Math.floor(Math.random() * attackCandidates.length)];

      // Find adjacent territories to attack
      const adjacentTerritories = this.findAdjacentTerritories(source);
      const targetableTerritories = adjacentTerritories.filter(
        (t) =>
          !t.wall &&
          (!t.owner || t.owner.id !== player.id) &&
          t.troops < source.troops
      );

      if (targetableTerritories.length > 0) {
        // Choose weakest target
        targetableTerritories.sort((a, b) => a.troops - b.troops);
        const target = targetableTerritories[0];

        // Execute attack
        this.executeAction(
          {
            action: "attack",
            source,
            target,
          },
          player
        );
      }
    } else if (ownedTerritories.length > 0 && (player.gold || 0) >= 80) {
      // Build mode
      // Choose a random territory to build on
      const buildableTerritories = ownedTerritories.filter(
        (t) => !t.building && !t.wall
      );

      if (buildableTerritories.length > 0) {
        const target =
          buildableTerritories[
            Math.floor(Math.random() * buildableTerritories.length)
          ];

        // Choose a random building type based on gold available
        const availableGold = player.gold || 0;
        let buildingType: BuildingType = "barracks";

        if (availableGold >= 200) {
          // Can afford anything
          const options: BuildingType[] = [
            "tower",
            "market",
            "barracks",
            "farm",
            "fort",
            "mine",
          ];
          buildingType = options[Math.floor(Math.random() * options.length)];
        } else if (availableGold >= 150) {
          const options: BuildingType[] = ["farm", "mine", "fort", "barracks"];
          buildingType = options[Math.floor(Math.random() * options.length)];
        } else if (availableGold >= 100) {
          const options: BuildingType[] = ["fort", "barracks"];
          buildingType = options[Math.floor(Math.random() * options.length)];
        } else {
          // Can only afford wall
          buildingType = "wall";
        }

        // Execute build action
        this.executeAction(
          {
            action: "build",
            target,
            buildingType,
          },
          player
        );
      }
    } else {
      // Defend mode
      // Find a territory with low troops
      ownedTerritories.sort((a, b) => a.troops - b.troops);

      if (ownedTerritories.length > 0) {
        const weakestTerritory = ownedTerritories[0];

        // Execute defend action
        this.executeAction(
          {
            action: "defend",
            target: weakestTerritory,
          },
          player
        );
      }
    }
  }

  // Update game state (resources, troops, etc.)
  private updateGameState(): void {
    // Update player stats
    this.players.forEach((player) => {
      // Count territories and buildings
      let territoryCount = 0;
      let goldIncome = 10; // Base income
      let troopGrowth = 5; // Base growth

      this.territories.forEach((territory) => {
        if (territory.owner && territory.owner.id === player.id) {
          territoryCount++;

          // Building bonuses
          if (territory.building) {
            switch (territory.building.type) {
              case "mine":
                goldIncome += 15;
                break;
              case "market":
                goldIncome += 25;
                break;
              case "farm":
                troopGrowth += 3;
                break;
              case "barracks":
                troopGrowth += 5;
                break;
            }
          }
        }
      });

      // Update player stats
      player.territory = territoryCount;
      player.gold = (player.gold || 0) + goldIncome;
      player.troops = (player.troops || 0) + troopGrowth;

      // Add some troops to a random territory
      const ownedTerritories = this.territories.filter(
        (t) => t.owner && t.owner.id === player.id
      );

      if (ownedTerritories.length > 0) {
        const randomTerritory =
          ownedTerritories[Math.floor(Math.random() * ownedTerritories.length)];
        const index = this.territories.findIndex(
          (t) => t.x === randomTerritory.x && t.y === randomTerritory.y
        );

        if (index !== -1) {
          this.territories[index].troops += 1;
        }
      }
    });
  }

  // Check if the game is over
  private checkGameOver(): boolean {
    // Count territories by owner
    const territoryCounts: { [playerId: string]: number } = {};

    this.territories.forEach((territory) => {
      if (territory.owner) {
        territoryCounts[territory.owner.id] =
          (territoryCounts[territory.owner.id] || 0) + 1;
      }
    });

    // Check if any player has been eliminated
    const activePlayers = Object.keys(territoryCounts).length;

    // Game is over if only one player remains or maximum days reached
    return activePlayers <= 1 || this.gameDay >= this.maxGameDays;
  }

  // Determine the winner of the game
  private determineWinner(): string | null {
    // Count territories by owner
    const territoryCounts: { [playerId: string]: number } = {};

    this.territories.forEach((territory) => {
      if (territory.owner) {
        territoryCounts[territory.owner.id] =
          (territoryCounts[territory.owner.id] || 0) + 1;
      }
    });

    // Find player with most territories
    let maxTerritories = 0;
    let winner: string | null = null;

    Object.entries(territoryCounts).forEach(([playerId, count]) => {
      if (count > maxTerritories) {
        maxTerritories = count;
        winner = playerId;
      }
    });

    return winner;
  }

  // Find adjacent territories
  private findAdjacentTerritories(
    territory: Territory,
    range: number = 2
  ): Territory[] {
    return this.territories.filter((t) => {
      const dx = t.x - territory.x;
      const dy = t.y - territory.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= range && distance > 0 && !t.wall;
    });
  }
}

// Create and export a singleton instance
export const gameSimulator = new GameSimulator();
