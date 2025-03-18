// Interface to use the trained neural network in actual gameplay
import { neuralAI } from "./neuralAI";

// This module adapts the neural network AI for use in the actual game

// Import necessary types
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

// Interface for making decisions using the neural network model
class NeuralAIPlayer {
  private isInitialized: boolean = false;

  constructor() {
    // Check if the neural network is already initialized
    this.isInitialized = neuralAI.isReady();
    console.log(
      "Neural AI Player initialized, model ready:",
      this.isInitialized
    );
  }

  // Initialize the neural network if not already done
  public async initialize(): Promise<void> {
    if (!this.isInitialized) {
      try {
        // Try to load a saved model first
        await neuralAI.loadModel("openfront-neural-model");
        this.isInitialized = true;
        console.log("Loaded saved neural network model");
      } catch (error) {
        // If no saved model, initialize a new one
        const INPUT_SIZE = 500; // Should match training configuration
        const OUTPUT_SIZE = 1000; // Should match training configuration
        neuralAI.initialize(INPUT_SIZE, OUTPUT_SIZE);
        this.isInitialized = true;
        console.log("Created new neural network model");
      }
    }
  }

  // Check if the neural network is ready to be used
  public isReady(): boolean {
    return this.isInitialized;
  }

  // Make a decision for the current game state
  public async makeDecision(
    territories: Territory[],
    player: AIPlayer,
    gameDay: number
  ): Promise<{
    action: "attack" | "defend" | "build";
    source?: Territory;
    target?: Territory;
    buildingType?: BuildingType;
  } | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Get features from the current game state
      const state = neuralAI.extractFeatures(territories, player);

      // Get legal actions for the current state
      const legalActions = neuralAI.getLegalActions(territories, player);

      if (legalActions.length === 0) {
        return null; // No legal actions available
      }

      // Use the neural network to choose the best action
      const action = await neuralAI.chooseAction(
        state,
        territories,
        player,
        legalActions
      );

      return action;
    } catch (error) {
      console.error("Error making neural AI decision:", error);
      return null;
    }
  }

  // Learn from the outcome of an action (optional, for ongoing learning)
  public learnFromOutcome(
    prevState: { territories: Territory[]; player: AIPlayer },
    action: {
      action: "attack" | "defend" | "build";
      source?: Territory;
      target?: Territory;
      buildingType?: BuildingType;
    },
    currentState: { territories: Territory[]; player: AIPlayer },
    isGameOver: boolean
  ): void {
    if (!this.isInitialized) return;

    try {
      // Convert states to feature vectors
      const prevStateFeatures = neuralAI.extractFeatures(
        prevState.territories,
        prevState.player
      );

      const nextStateFeatures = neuralAI.extractFeatures(
        currentState.territories,
        currentState.player
      );

      // Calculate reward for the action
      const reward = neuralAI.calculateReward(prevState, currentState);

      // Convert action to indices
      const actionIndices = neuralAI.actionToIndices(
        action,
        prevState.territories
      );

      // Add experience to memory
      neuralAI.addExperience(
        prevStateFeatures,
        actionIndices,
        reward,
        nextStateFeatures,
        isGameOver
      );

      // Optionally train on this experience immediately
      // This is usually not necessary as training is typically done in batches
      // neuralAI.trainOnBatch();
    } catch (error) {
      console.error("Error learning from outcome:", error);
    }
  }

  // Utility method to convert a simple AI action to a more detailed format
  public convertToDetailedAction(
    action: {
      action: "attack" | "defend" | "build";
      source?: Territory;
      target?: Territory;
      buildingType?: BuildingType;
    },
    territories: Territory[]
  ): string {
    if (!action) return "No action";

    switch (action.action) {
      case "attack":
        if (!action.source || !action.target) return "Invalid attack";
        return `Attack from (${action.source.x},${action.source.y}) to (${action.target.x},${action.target.y})`;

      case "defend":
        if (!action.target) return "Invalid defend";
        return `Defend territory at (${action.target.x},${action.target.y})`;

      case "build":
        if (!action.target || !action.buildingType) return "Invalid build";
        return `Build ${action.buildingType} at (${action.target.x},${action.target.y})`;

      default:
        return "Unknown action";
    }
  }
}

// Create and export a singleton instance
export const neuralAIPlayer = new NeuralAIPlayer();
