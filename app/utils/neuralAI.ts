// Neural Network AI for OpenFront game
import * as tf from "@tensorflow/tfjs";

// Import territory and building types from existing AI
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

// Training metrics tracking
export interface TrainingMetrics {
  episode: number;
  reward: number;
  territoriesOwned: number;
  goldAccumulated: number;
  troopsAccumulated: number;
  buildingsConstructed: number;
  winRate: number;
}

// Neural Network AI Agent Class
export class NeuralAI {
  private model: tf.LayersModel | null = null;
  private targetModel: tf.LayersModel | null = null;
  private batchSize = 32;
  private gamma = 0.95; // discount factor
  private epsilon = 1.0; // exploration rate
  private epsilonMin = 0.1;
  private epsilonDecay = 0.995;
  private learningRate = 0.001;
  private replayMemory: any[] = [];
  private replayMemorySize = 10000;
  private updateFrequency = 10; // How often to update target network
  private trainingStep = 0;
  private inputSize = 0;
  private outputSize = 0;
  private metrics: TrainingMetrics[] = [];
  private isTraining = false;
  private gameHistory: any[] = [];

  constructor() {
    // Initialize metrics
    this.metrics = [];
  }

  // Check if the neural network is ready to use
  public isReady(): boolean {
    return this.model !== null;
  }

  // Get the current exploration rate (epsilon)
  public getExplorationRate(): number {
    return this.epsilon;
  }

  // Create the neural network model
  private createModel(inputSize: number, outputSize: number): tf.LayersModel {
    const model = tf.sequential();

    // Input layer
    model.add(
      tf.layers.dense({
        units: 128,
        activation: "relu",
        inputShape: [inputSize],
      })
    );

    // Hidden layers
    model.add(
      tf.layers.dense({
        units: 128,
        activation: "relu",
      })
    );

    model.add(
      tf.layers.dense({
        units: 64,
        activation: "relu",
      })
    );

    // Output layer
    model.add(
      tf.layers.dense({
        units: outputSize,
        activation: "linear",
      })
    );

    // Compile the model
    model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: "meanSquaredError",
    });

    return model;
  }

  // Initialize the model with the appropriate input and output sizes
  public initialize(inputSize: number, outputSize: number): void {
    this.inputSize = inputSize;
    this.outputSize = outputSize;

    // Create main model
    this.model = this.createModel(inputSize, outputSize);

    // Create target model with same architecture
    this.targetModel = this.createModel(inputSize, outputSize);

    // Copy weights from main model to target model
    this.updateTargetModel();

    console.log(
      "Neural AI initialized with input size:",
      inputSize,
      "and output size:",
      outputSize
    );
  }

  // Update target model with weights from main model
  private updateTargetModel(): void {
    if (!this.model || !this.targetModel) return;

    const weights = this.model.getWeights();
    this.targetModel.setWeights(weights);
  }

  // Convert game state to feature vector
  public extractFeatures(territories: Territory[], player: AIPlayer): number[] {
    // This is a critical function that converts the game state into a numerical
    // representation that the neural network can understand
    const features: number[] = [];

    // Board state features
    territories.forEach((territory) => {
      // Ownership: 1 for owned by this AI, -1 for enemy, 0 for neutral
      if (!territory.owner) {
        features.push(0); // Neutral
      } else if (territory.owner.id === player.id) {
        features.push(1); // Owned by this AI
      } else {
        features.push(-1); // Enemy
      }

      // Troop count (normalized)
      features.push(territory.troops / 100);

      // Building type (one-hot encoded)
      const buildingTypes = [
        "fort",
        "farm",
        "tower",
        "barracks",
        "wall",
        "mine",
        "market",
      ];
      buildingTypes.forEach((type) => {
        features.push(
          territory.building && territory.building.type === type ? 1 : 0
        );
      });

      // Wall feature
      features.push(territory.wall ? 1 : 0);
    });

    // Player features
    features.push((player.gold || 0) / 1000); // Normalized gold
    features.push((player.troops || 0) / 1000); // Normalized troops
    features.push((player.territory || 0) / 100); // Normalized territory count

    return features;
  }

  // Get action indices from the action object
  public actionToIndices(
    action: {
      action: "attack" | "defend" | "build";
      source?: Territory;
      target?: Territory;
      buildingType?: BuildingType;
    },
    territories: Territory[]
  ): number[] {
    // Convert the action object to indices
    const actionTypeIndex =
      action.action === "attack" ? 0 : action.action === "defend" ? 1 : 2;

    // Find source territory index
    let sourceIndex = -1;
    if (action.source) {
      sourceIndex = territories.findIndex(
        (t) => t.x === action.source!.x && t.y === action.source!.y
      );
    }

    // Find target territory index
    let targetIndex = -1;
    if (action.target) {
      targetIndex = territories.findIndex(
        (t) => t.x === action.target!.x && t.y === action.target!.y
      );
    }

    // Building type index
    const buildingTypeMap: Record<BuildingType, number> = {
      fort: 0,
      farm: 1,
      tower: 2,
      barracks: 3,
      wall: 4,
      mine: 5,
      market: 6,
    };

    let buildingTypeIndex = -1;
    if (action.buildingType) {
      buildingTypeIndex = buildingTypeMap[action.buildingType];
    }

    return [actionTypeIndex, sourceIndex, targetIndex, buildingTypeIndex];
  }

  // Convert model output (indices) back to game action
  public indicesToAction(
    indices: number[],
    territories: Territory[]
  ): {
    action: "attack" | "defend" | "build";
    source?: Territory;
    target?: Territory;
    buildingType?: BuildingType;
  } {
    const [actionTypeIndex, sourceIndex, targetIndex, buildingTypeIndex] =
      indices;

    // Action type
    const actionType =
      actionTypeIndex === 0
        ? "attack"
        : actionTypeIndex === 1
        ? "defend"
        : "build";

    // Source and target territories
    const source =
      sourceIndex >= 0 && sourceIndex < territories.length
        ? territories[sourceIndex]
        : undefined;

    const target =
      targetIndex >= 0 && targetIndex < territories.length
        ? territories[targetIndex]
        : undefined;

    // Building type
    const buildingTypes: BuildingType[] = [
      "fort",
      "farm",
      "tower",
      "barracks",
      "wall",
      "mine",
      "market",
    ];
    const buildingType =
      buildingTypeIndex >= 0 && buildingTypeIndex < buildingTypes.length
        ? (buildingTypes[buildingTypeIndex] as BuildingType)
        : undefined;

    return {
      action: actionType,
      source,
      target,
      buildingType,
    };
  }

  // Train the model on a batch of experiences
  public async trainOnBatch(): Promise<void> {
    if (
      this.replayMemory.length < this.batchSize ||
      !this.model ||
      !this.targetModel
    ) {
      return;
    }

    // Sample a batch of experiences
    const batch = this.sampleBatch();

    // Extract states, actions, rewards, next states, and dones
    const states = batch.map((exp) => exp.state);
    const actions = batch.map((exp) => exp.action);
    const rewards = batch.map((exp) => exp.reward);
    const nextStates = batch.map((exp) => exp.nextState);
    const dones = batch.map((exp) => (exp.done ? 1 : 0));

    // Convert to tensors
    const stateTensor = tf.tensor2d(states);
    const nextStateTensor = tf.tensor2d(nextStates);

    // Use target network to get next Q values
    const nextQValues = this.targetModel.predict(nextStateTensor) as tf.Tensor;
    const nextQValuesData = (await nextQValues.array()) as number[][];

    // Use main network to get current Q values
    const currentQValues = this.model.predict(stateTensor) as tf.Tensor;
    const currentQValuesData = (await currentQValues.array()) as number[][];

    // Prepare target Q values
    const targetQValuesData = [...currentQValuesData];

    // Update target Q values with Bellman equation
    for (let i = 0; i < this.batchSize; i++) {
      const [actionTypeIndex, sourceIndex, targetIndex, buildingTypeIndex] =
        actions[i];

      // Calculate target Q-value using Bellman equation
      let targetValue;
      if (dones[i]) {
        targetValue = rewards[i];
      } else {
        // Find max Q-value for next state
        const maxNextQ = Math.max(...nextQValuesData[i]);
        targetValue = rewards[i] + this.gamma * maxNextQ;
      }

      // Update the appropriate Q-value in the target
      // This is simplified - in reality you'd need to map the action indices to the correct output neuron
      const actionIndex =
        actionTypeIndex * 100 + (sourceIndex + 1) * 10 + (targetIndex + 1);
      if (actionIndex >= 0 && actionIndex < targetQValuesData[i].length) {
        targetQValuesData[i][actionIndex] = targetValue;
      }
    }

    // Train the model
    const targetQValuesTensor = tf.tensor2d(targetQValuesData);
    await this.model.fit(stateTensor, targetQValuesTensor, {
      epochs: 1,
      verbose: 0,
    });

    // Clean up tensors
    stateTensor.dispose();
    nextStateTensor.dispose();
    nextQValues.dispose();
    currentQValues.dispose();
    targetQValuesTensor.dispose();

    // Decay epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
    }

    // Update target network periodically
    this.trainingStep++;
    if (this.trainingStep % this.updateFrequency === 0) {
      this.updateTargetModel();
    }
  }

  // Sample a batch of experiences from replay memory
  private sampleBatch(): any[] {
    const batch = [];
    const memoryLength = this.replayMemory.length;

    // Randomly sample from memory
    for (let i = 0; i < this.batchSize; i++) {
      const index = Math.floor(Math.random() * memoryLength);
      batch.push(this.replayMemory[index]);
    }

    return batch;
  }

  // Add an experience to replay memory
  public addExperience(
    state: number[],
    action: number[],
    reward: number,
    nextState: number[],
    done: boolean
  ): void {
    // Add to replay memory
    this.replayMemory.push({ state, action, reward, nextState, done });

    // If memory is full, remove oldest experiences
    if (this.replayMemory.length > this.replayMemorySize) {
      this.replayMemory.shift();
    }
  }

  // Choose an action using epsilon-greedy policy
  public async chooseAction(
    state: number[],
    territories: Territory[],
    player: AIPlayer,
    legalActions: {
      action: "attack" | "defend" | "build";
      source?: Territory;
      target?: Territory;
      buildingType?: BuildingType;
    }[]
  ): Promise<{
    action: "attack" | "defend" | "build";
    source?: Territory;
    target?: Territory;
    buildingType?: BuildingType;
  }> {
    // Epsilon-greedy exploration
    if (Math.random() < this.epsilon) {
      // Choose a random legal action
      const randomIndex = Math.floor(Math.random() * legalActions.length);
      return legalActions[randomIndex];
    } else {
      // Choose the best action according to the model
      if (!this.model) {
        // If model isn't initialized, fall back to random
        const randomIndex = Math.floor(Math.random() * legalActions.length);
        return legalActions[randomIndex];
      }

      // Get Q-values from model
      const stateTensor = tf.tensor2d([state]);
      const qValues = this.model.predict(stateTensor) as tf.Tensor;
      const qValuesData = (await qValues.array()) as number[][];

      // Convert legal actions to indices and get their Q-values
      const actionScores = legalActions.map((action) => {
        const indices = this.actionToIndices(action, territories);
        // Map indices to appropriate q-value index (simplified)
        const actionIndex =
          indices[0] * 100 + (indices[1] + 1) * 10 + (indices[2] + 1);
        return {
          action,
          score:
            actionIndex >= 0 && actionIndex < qValuesData[0].length
              ? qValuesData[0][actionIndex]
              : -Infinity,
        };
      });

      // Choose action with highest Q-value
      actionScores.sort((a, b) => b.score - a.score);

      // Clean up tensors
      stateTensor.dispose();
      qValues.dispose();

      return actionScores[0].action;
    }
  }

  // Calculate reward based on game state change
  public calculateReward(
    prevState: { territories: Territory[]; player: AIPlayer },
    currentState: { territories: Territory[]; player: AIPlayer }
  ): number {
    // Territory gain/loss
    const prevTerritoryCount = prevState.territories.filter(
      (t) => t.owner && t.owner.id === prevState.player.id
    ).length;

    const currentTerritoryCount = currentState.territories.filter(
      (t) => t.owner && t.owner.id === currentState.player.id
    ).length;

    const territoryDiff = currentTerritoryCount - prevTerritoryCount;

    // Gold gain
    const goldDiff =
      (currentState.player.gold || 0) - (prevState.player.gold || 0);

    // Troop gain/loss
    const prevTroopCount = prevState.territories.reduce(
      (sum, t) =>
        t.owner && t.owner.id === prevState.player.id ? sum + t.troops : sum,
      0
    );

    const currentTroopCount = currentState.territories.reduce(
      (sum, t) =>
        t.owner && t.owner.id === currentState.player.id ? sum + t.troops : sum,
      0
    );

    const troopDiff = currentTroopCount - prevTroopCount;

    // Building gain/loss
    const prevBuildingCount = prevState.territories.reduce(
      (sum, t) =>
        t.owner && t.owner.id === prevState.player.id && t.building
          ? sum + 1
          : sum,
      0
    );

    const currentBuildingCount = currentState.territories.reduce(
      (sum, t) =>
        t.owner && t.owner.id === currentState.player.id && t.building
          ? sum + 1
          : sum,
      0
    );

    const buildingDiff = currentBuildingCount - prevBuildingCount;

    // Calculate total reward (weighted sum)
    const reward =
      territoryDiff * 10 + // Territory changes are important
      goldDiff * 0.1 + // Gold is valuable but less immediate impact
      troopDiff * 0.5 + // Troops are important for strength
      buildingDiff * 5; // Buildings provide long-term benefits

    return reward;
  }

  // Start training the neural network
  public startTraining(): void {
    this.isTraining = true;
    console.log("Neural AI training started");
  }

  // Stop training
  public stopTraining(): void {
    this.isTraining = false;
    console.log("Neural AI training stopped");
  }

  // Check if training is in progress
  public isCurrentlyTraining(): boolean {
    return this.isTraining;
  }

  // Get current training metrics
  public getMetrics(): TrainingMetrics[] {
    return this.metrics;
  }

  // Add a metric data point
  public addMetric(metric: TrainingMetrics): void {
    this.metrics.push(metric);

    // Keep only the last 1000 metrics for performance
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  // Save the model
  public async saveModel(path: string): Promise<void> {
    if (!this.model) return;

    try {
      await this.model.save(`localstorage://${path}`);
      console.log(`Model saved to localstorage://${path}`);
    } catch (error) {
      console.error("Error saving model:", error);
    }
  }

  // Load the model
  public async loadModel(path: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`localstorage://${path}`);
      console.log(`Model loaded from localstorage://${path}`);

      // Also create and update the target model
      if (this.inputSize && this.outputSize) {
        this.targetModel = this.createModel(this.inputSize, this.outputSize);
        this.updateTargetModel();
      }
    } catch (error) {
      console.error("Error loading model:", error);
    }
  }

  // Get legal actions for the current state
  public getLegalActions(
    territories: Territory[],
    player: AIPlayer
  ): {
    action: "attack" | "defend" | "build";
    source?: Territory;
    target?: Territory;
    buildingType?: BuildingType;
  }[] {
    const legalActions: {
      action: "attack" | "defend" | "build";
      source?: Territory;
      target?: Territory;
      buildingType?: BuildingType;
    }[] = [];

    // Filter territories owned by this AI
    const ownedTerritories = territories.filter(
      (t) => t.owner && t.owner.id === player.id
    );

    // Attack actions
    for (const source of ownedTerritories) {
      // Only consider territories with enough troops
      if (source.troops < 5) continue;

      // Find adjacent territories to attack
      const adjacentTerritories = this.findAdjacentTerritories(
        territories,
        source
      );

      for (const target of adjacentTerritories) {
        // Skip territories that are already owned by this AI
        if (target.owner && target.owner.id === player.id) continue;

        // Skip walls
        if (target.wall) continue;

        // Check if we have enough troops to potentially win
        if (source.troops > target.troops) {
          legalActions.push({
            action: "attack" as const,
            source,
            target,
          });
        }
      }
    }

    // Defend actions
    // Find border territories that might need defense
    const borderTerritories = ownedTerritories.filter((territory) => {
      const neighbors = this.findAdjacentTerritories(territories, territory);
      return neighbors.some((n) => n.owner && n.owner.id !== player.id);
    });

    for (const target of borderTerritories) {
      legalActions.push({
        action: "defend" as const,
        target,
      });
    }

    // Build actions
    // Check if player has enough gold to build
    if ((player.gold || 0) >= 80) {
      // 80 is the minimum cost (wall)
      // Territories where we can build
      const buildableTerritories = ownedTerritories.filter(
        (t) => !t.building && !t.wall
      );

      // Find empty territories around our borders for wall building
      const emptyNearbyTerritories: Territory[] = [];
      for (const border of borderTerritories) {
        const emptyNeighbors = this.findNearbyEmptyTerritories(
          territories,
          border
        );
        emptyNearbyTerritories.push(...emptyNeighbors);
      }

      // Different building types and their costs
      const buildingCosts: Record<BuildingType, number> = {
        fort: 100,
        farm: 150,
        tower: 200,
        barracks: 120,
        wall: 80,
        mine: 150,
        market: 200,
      };

      // Add building actions for each buildable territory
      for (const target of buildableTerritories) {
        for (const [buildingType, cost] of Object.entries(buildingCosts)) {
          // Skip if we don't have enough gold
          if ((player.gold || 0) < cost) continue;

          // Skip wall for owned territories
          if (buildingType === "wall") continue;

          legalActions.push({
            action: "build" as const,
            target,
            buildingType: buildingType as BuildingType,
          });
        }
      }

      // Add wall building actions for empty territories
      if ((player.gold || 0) >= buildingCosts.wall) {
        for (const target of emptyNearbyTerritories) {
          legalActions.push({
            action: "build" as const,
            target,
            buildingType: "wall" as const,
          });
        }
      }
    }

    return legalActions;
  }

  // Helper functions to find adjacent territories
  private findAdjacentTerritories(
    territories: Territory[],
    territory: Territory,
    range: number = 2
  ): Territory[] {
    return territories.filter((t) => {
      const dx = t.x - territory.x;
      const dy = t.y - territory.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= range && distance > 0 && !t.wall;
    });
  }

  private findNearbyEmptyTerritories(
    territories: Territory[],
    territory: Territory,
    range: number = 2
  ): Territory[] {
    return territories.filter((t) => {
      const dx = t.x - territory.x;
      const dy = t.y - territory.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= range && distance > 0 && !t.owner && !t.wall;
    });
  }
}

// Create and export a singleton instance
export const neuralAI = new NeuralAI();
