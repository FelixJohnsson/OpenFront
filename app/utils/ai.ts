// AI decision making module for OpenFront game

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
  wall?: boolean; // New property for walls
  gold?: number; // New property for gold
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
  personality?: AIPersonality;
  gold?: number; // New property for gold
}

// Define different AI personalities for more diverse gameplay
type AIPersonality = "aggressive" | "defensive" | "expansionist" | "builder";

// Main AI decision maker function
export function makeAIDecisions(
  territories: Territory[],
  aiPlayer: AIPlayer,
  gameDay: number
): {
  action: "attack" | "defend" | "build";
  source?: Territory;
  target?: Territory;
  buildingType?: BuildingType;
} | null {
  // Get all territories owned by this AI
  const ownedTerritories = territories.filter(
    (t) => t.owner && t.owner.id === aiPlayer.id
  );

  if (ownedTerritories.length === 0) return null;

  // Determine AI personality if not set
  if (!aiPlayer.personality) {
    aiPlayer.personality = selectPersonality();
  }

  // Based on personality and situation, choose what to do
  const personality = aiPlayer.personality;

  // Calculate threat level (how many enemy territories are near)
  const threatLevel = calculateThreatLevel(
    territories,
    ownedTerritories,
    aiPlayer.id
  );

  // Strategic decision making
  if (threatLevel > 0.7) {
    // Under high threat - prioritize defense
    return defensiveStrategy(territories, ownedTerritories, aiPlayer);
  } else if (gameDay < 5 || personality === "expansionist") {
    // Early game or expansionist - focus on territory expansion
    return expansionStrategy(territories, ownedTerritories, aiPlayer);
  } else if (personality === "builder" || ownedTerritories.length > 15) {
    // Builder personality or large territory - develop infrastructure
    return buildingStrategy(territories, ownedTerritories, aiPlayer);
  } else if (personality === "aggressive") {
    // Aggressive - target players specifically
    return aggressiveStrategy(territories, ownedTerritories, aiPlayer);
  } else {
    // Default balanced approach
    return balancedStrategy(
      territories,
      ownedTerritories,
      aiPlayer,
      gameDay,
      threatLevel
    );
  }
}

// Helper function to select a random personality
function selectPersonality(): AIPersonality {
  const personalities: AIPersonality[] = [
    "aggressive",
    "defensive",
    "expansionist",
    "builder",
  ];
  return personalities[Math.floor(Math.random() * personalities.length)];
}

// Calculate threat level (0-1) based on enemy presence
function calculateThreatLevel(
  territories: Territory[],
  ownedTerritories: Territory[],
  aiId: string
): number {
  let borderTerritories = 0;
  let threatenedTerritories = 0;

  // Find territories that border other factions
  ownedTerritories.forEach((territory) => {
    const neighbors = findAdjacentTerritories(territories, territory);
    const enemyNeighbors = neighbors.filter(
      (n) => n.owner && n.owner.id !== aiId
    );

    if (enemyNeighbors.length > 0) {
      borderTerritories++;

      // Check if enemies have more troops than us
      const ourTroops = territory.troops;
      const maxEnemyTroops = Math.max(...enemyNeighbors.map((e) => e.troops));

      if (maxEnemyTroops > ourTroops) {
        threatenedTerritories++;
      }
    }
  });

  // Return ratio of threatened territories to border territories
  return borderTerritories === 0
    ? 0
    : threatenedTerritories / borderTerritories;
}

// Find adjacent territories
function findAdjacentTerritories(
  territories: Territory[],
  territory: Territory,
  range: number = 2
): Territory[] {
  return territories.filter((t) => {
    // Calculate distance
    const dx = t.x - territory.x;
    const dy = t.y - territory.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if within range and not the same territory
    return distance <= range && distance > 0 && !t.wall;
  });
}

// Find nearby empty territories (for wall building)
function findNearbyEmptyTerritories(
  territories: Territory[],
  territory: Territory,
  range: number = 2
): Territory[] {
  return territories.filter((t) => {
    // Calculate distance
    const dx = t.x - territory.x;
    const dy = t.y - territory.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if within range, not the same territory, and empty (no owner and not a wall)
    return distance <= range && distance > 0 && !t.owner && !t.wall;
  });
}

// Defensive strategy - prioritize building forts or defending borders
function defensiveStrategy(
  territories: Territory[],
  ownedTerritories: Territory[],
  aiPlayer: AIPlayer
): {
  action: "attack" | "defend" | "build";
  source?: Territory;
  target?: Territory;
  buildingType?: BuildingType;
} | null {
  // Find border territories under threat
  const borderTerritories = ownedTerritories.filter((territory) => {
    const neighbors = findAdjacentTerritories(territories, territory);
    return neighbors.some((n) => n.owner && n.owner.id !== aiPlayer.id);
  });

  if (borderTerritories.length === 0) return null;

  // Sort by most threatened (lowest troops)
  borderTerritories.sort((a, b) => a.troops - b.troops);

  // Check if we have enough gold to build a fort
  const fortCost = 100; // Assuming this is the cost value defined elsewhere
  if (aiPlayer.gold && aiPlayer.gold >= fortCost) {
    // Decide between building a fort
    const weakestBorder = borderTerritories[0];
    if (!weakestBorder.building && Math.random() > 0.5) {
      return {
        action: "build" as const,
        target: weakestBorder,
        buildingType: "fort",
      };
    }
  }

  // Or consider building a wall on an empty territory near our border
  const wallCost = 80; // Assuming this is the cost value defined elsewhere
  if (aiPlayer.gold && aiPlayer.gold >= wallCost) {
    // Look for empty territories near our border territories
    for (const borderTerritory of borderTerritories) {
      const emptyNearbyTerritories = findNearbyEmptyTerritories(
        territories,
        borderTerritory
      );

      if (emptyNearbyTerritories.length > 0) {
        // Pick a random empty territory to build a wall on
        const targetEmpty =
          emptyNearbyTerritories[
            Math.floor(Math.random() * emptyNearbyTerritories.length)
          ];

        return {
          action: "build" as const,
          target: targetEmpty,
          buildingType: "wall",
        };
      }
    }
  }

  // Otherwise reinforce the weakest territory
  return {
    action: "defend" as const,
    target: borderTerritories[0],
  };
}

// Expansion strategy - prioritize capturing new territories
function expansionStrategy(
  territories: Territory[],
  ownedTerritories: Territory[],
  aiPlayer: AIPlayer
): {
  action: "attack" | "defend" | "build";
  source?: Territory;
  target?: Territory;
  buildingType?: BuildingType;
} | null {
  // Find territories with sufficient troops to attack
  const attackCandidates = ownedTerritories.filter((t) => t.troops >= 5);

  if (attackCandidates.length === 0) return null;

  // For each candidate, find adjacent territories to attack
  for (const territory of attackCandidates) {
    const neighbors = findAdjacentTerritories(territories, territory);
    const targetableNeighbors = neighbors.filter(
      (n) =>
        !n.wall &&
        (!n.owner || n.owner.id !== aiPlayer.id) &&
        n.troops < territory.troops
    );

    if (targetableNeighbors.length > 0) {
      // Sort by easiest to capture
      targetableNeighbors.sort((a, b) => a.troops - b.troops);

      return {
        action: "attack" as const,
        source: territory,
        target: targetableNeighbors[0],
      };
    }
  }

  // If no good attack option, 80% chance to build a barracks if have enough gold
  const barracksCost = 120; // Assuming this is the cost value defined elsewhere
  if (aiPlayer.gold && aiPlayer.gold >= barracksCost && Math.random() < 0.8) {
    const nonBuildingTerritories = ownedTerritories.filter(
      (t) => !t.building && !t.wall
    );
    if (nonBuildingTerritories.length > 0) {
      return {
        action: "build" as const,
        target: nonBuildingTerritories[0],
        buildingType: "barracks",
      };
    }
  }

  // Consider building a mine to generate gold
  const mineCost = 150; // Assuming this is the cost value defined elsewhere
  if (aiPlayer.gold && aiPlayer.gold >= mineCost && Math.random() < 0.5) {
    const nonBuildingTerritories = ownedTerritories.filter(
      (t) => !t.building && !t.wall
    );
    if (nonBuildingTerritories.length > 0) {
      return {
        action: "build" as const,
        target: nonBuildingTerritories[0],
        buildingType: "mine",
      };
    }
  }

  // Otherwise, consider other buildings
  return buildingStrategy(territories, ownedTerritories, aiPlayer);
}

// Building strategy - focus on infrastructure
function buildingStrategy(
  territories: Territory[],
  ownedTerritories: Territory[],
  aiPlayer: AIPlayer
): {
  action: "attack" | "defend" | "build";
  source?: Territory;
  target?: Territory;
  buildingType?: BuildingType;
} | null {
  if (!aiPlayer.gold || aiPlayer.gold < 80) return null; // No gold to build anything

  // Count existing buildings
  const fortCount = ownedTerritories.filter(
    (t) => t.building?.type === "fort"
  ).length;
  const farmCount = ownedTerritories.filter(
    (t) => t.building?.type === "farm"
  ).length;
  const towerCount = ownedTerritories.filter(
    (t) => t.building?.type === "tower"
  ).length;
  const barracksCount = ownedTerritories.filter(
    (t) => t.building?.type === "barracks"
  ).length;
  const mineCount = ownedTerritories.filter(
    (t) => t.building?.type === "mine"
  ).length;
  const marketCount = ownedTerritories.filter(
    (t) => t.building?.type === "market"
  ).length;

  // Find territories without buildings
  const emptyTerritories = ownedTerritories.filter(
    (t) => !t.building && !t.wall
  );
  if (emptyTerritories.length === 0) return null;

  // Find empty territories around our borders for wall building
  const borderTerritories = ownedTerritories.filter((territory) => {
    const neighbors = findAdjacentTerritories(territories, territory);
    return neighbors.some(
      (n) => !n.owner || (n.owner && n.owner.id !== aiPlayer.id)
    );
  });

  const wallableTerritories: Territory[] = [];
  for (const border of borderTerritories) {
    const emptyNeighbors = findNearbyEmptyTerritories(territories, border);
    wallableTerritories.push(...emptyNeighbors);
  }

  // Choose what to build based on current balance
  let buildingType: BuildingType;
  let targetTerritory =
    emptyTerritories[Math.floor(Math.random() * emptyTerritories.length)];

  // IMPROVED BUILDING STRATEGY - more aggressive building

  // Prioritize mines early to ensure gold income
  if (
    mineCount < Math.max(2, ownedTerritories.length * 0.15) &&
    aiPlayer.gold >= 150
  ) {
    buildingType = "mine";
  }
  // Maintain a good number of barracks (at least 40% of territories)
  else if (
    barracksCount < ownedTerritories.length * 0.4 &&
    aiPlayer.gold >= 120
  ) {
    buildingType = "barracks";
  }
  // Prioritize markets for gold generation (at least 25% of territories)
  else if (
    marketCount < ownedTerritories.length * 0.25 &&
    aiPlayer.gold >= 200
  ) {
    buildingType = "market";
  }
  // Add more farms for troop bonus
  else if (farmCount < ownedTerritories.length * 0.3 && aiPlayer.gold >= 150) {
    buildingType = "farm";
  }
  // Add forts on border territories for defense
  else if (fortCount < borderTerritories.length * 0.4 && aiPlayer.gold >= 100) {
    buildingType = "fort";
    // Prioritize building forts on border territories
    if (borderTerritories.length > 0) {
      const emptyBorderTerritories = borderTerritories.filter(
        (t) => !t.building && !t.wall
      );
      if (emptyBorderTerritories.length > 0) {
        targetTerritory =
          emptyBorderTerritories[
            Math.floor(Math.random() * emptyBorderTerritories.length)
          ];
      }
    }
  }
  // Add towers for extended attack range
  else if (towerCount < ownedTerritories.length * 0.2 && aiPlayer.gold >= 200) {
    buildingType = "tower";
  }
  // Consider building walls on empty territories near our borders
  else if (
    wallableTerritories.length > 0 &&
    Math.random() < 0.4 &&
    aiPlayer.gold >= 80
  ) {
    buildingType = "wall";
    targetTerritory =
      wallableTerritories[
        Math.floor(Math.random() * wallableTerritories.length)
      ];
  }
  // If we already have a good infrastructure, continue building based on gold available
  else {
    // If we have a lot of gold, focus on higher-value buildings
    if (aiPlayer.gold >= 300) {
      const roll = Math.random();
      if (roll < 0.4) {
        buildingType = "market"; // High emphasis on markets for more gold
      } else if (roll < 0.7) {
        buildingType = "tower"; // Towers for offense
      } else if (roll < 0.85) {
        buildingType = "barracks"; // More barracks for troops
      } else {
        buildingType = "fort"; // Some forts for defense
      }
    }
    // Medium gold reserves - balanced approach
    else if (aiPlayer.gold >= 150) {
      const roll = Math.random();
      if (roll < 0.35) {
        buildingType = "barracks"; // Focus on barracks
      } else if (roll < 0.6) {
        buildingType = "mine"; // Mines for more gold
      } else if (roll < 0.8) {
        buildingType = "farm"; // Farms for troop bonus
      } else {
        buildingType = "fort"; // Some forts for defense
      }
    }
    // Low gold - build what we can afford
    else if (aiPlayer.gold >= 120) {
      buildingType = "barracks"; // Prioritize barracks with lower gold
    } else if (aiPlayer.gold >= 100) {
      buildingType = "fort"; // Cheaper defensive options
    } else if (aiPlayer.gold >= 80) {
      buildingType = "wall"; // Walls are cheapest
      if (wallableTerritories.length > 0) {
        targetTerritory =
          wallableTerritories[
            Math.floor(Math.random() * wallableTerritories.length)
          ];
      }
    } else {
      return null; // Not enough gold for any building
    }
  }

  // If the target is a border territory and we're building a fort, prioritize that
  if (buildingType === "fort" && borderTerritories.length > 0) {
    const emptyBorderTerritories = borderTerritories.filter(
      (t) => !t.building && !t.wall
    );
    if (emptyBorderTerritories.length > 0) {
      targetTerritory =
        emptyBorderTerritories[
          Math.floor(Math.random() * emptyBorderTerritories.length)
        ];
    }
  }

  return {
    action: "build" as const,
    target: targetTerritory,
    buildingType,
  };
}

// Aggressive strategy - target human players
function aggressiveStrategy(
  territories: Territory[],
  ownedTerritories: Territory[],
  aiPlayer: AIPlayer
): {
  action: "attack" | "defend" | "build";
  source?: Territory;
  target?: Territory;
  buildingType?: BuildingType;
} | null {
  // Find territories that can attack
  const attackCandidates = ownedTerritories.filter((t) => t.troops >= 8); // Need more troops for aggressive moves

  if (attackCandidates.length === 0) return null;

  // Find territories owned by human players
  const playerTerritories = territories.filter(
    (t) => t.owner && t.owner.id === "player1" && !t.wall
  );

  if (playerTerritories.length === 0) {
    // Fall back to expansion if no player territories found
    return expansionStrategy(territories, ownedTerritories, aiPlayer);
  }

  // For each candidate, check if any player territory is in range
  for (const territory of attackCandidates) {
    // Check if we have a tower for extended range
    const hasRangeBonus = territory.building?.type === "tower" ? 1 : 0;
    const attackRange = 2 + hasRangeBonus;

    // Find player territories in range
    const targetsInRange = playerTerritories.filter((playerTerritory) => {
      const dx = territory.x - playerTerritory.x;
      const dy = territory.y - playerTerritory.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= attackRange;
    });

    if (targetsInRange.length > 0) {
      // Sort by weakest defense
      targetsInRange.sort((a, b) => {
        const aDefense = a.building?.type === "fort" ? a.troops * 2 : a.troops;
        const bDefense = b.building?.type === "fort" ? b.troops * 2 : b.troops;
        return aDefense - bDefense;
      });

      // Attack if we have numerical advantage
      const target = targetsInRange[0];
      const targetDefense =
        target.building?.type === "fort" ? target.troops * 2 : target.troops;

      if (territory.troops > targetDefense * 1.2) {
        return {
          action: "attack" as const,
          source: territory,
          target,
        };
      }
    }
  }

  // If no good attack option, build towers for more range if we have gold
  const towerCost = 200; // Assuming this is the cost value defined elsewhere
  if (aiPlayer.gold && aiPlayer.gold >= towerCost) {
    const nonBuildingTerritories = ownedTerritories.filter(
      (t) => !t.building && !t.wall
    );
    if (nonBuildingTerritories.length > 0) {
      return {
        action: "build" as const,
        target: nonBuildingTerritories[0],
        buildingType: "tower",
      };
    }
  }

  return null;
}

// Balanced strategy - mix of attack, defense, and building
function balancedStrategy(
  territories: Territory[],
  ownedTerritories: Territory[],
  aiPlayer: AIPlayer,
  gameDay: number,
  threatLevel: number
): {
  action: "attack" | "defend" | "build";
  source?: Territory;
  target?: Territory;
  buildingType?: BuildingType;
} | null {
  // Choose randomly between strategies based on situation
  const roll = Math.random();

  // Increase building probability - AIs should build more
  if (roll < 0.45) {
    // Prioritize building more
    const buildingAction = buildingStrategy(
      territories,
      ownedTerritories,
      aiPlayer
    );
    if (buildingAction) return buildingAction;
  }

  if (roll < 0.3 + threatLevel * 0.4) {
    // More defensive when threatened
    const defensiveAction = defensiveStrategy(
      territories,
      ownedTerritories,
      aiPlayer
    );
    if (defensiveAction) return defensiveAction;
  }

  if (roll < 0.6 || gameDay < 10) {
    // Expand in early game
    const expansionAction = expansionStrategy(
      territories,
      ownedTerritories,
      aiPlayer
    );
    if (expansionAction) return expansionAction;
  }

  // Otherwise focus on building
  const buildingAction = buildingStrategy(
    territories,
    ownedTerritories,
    aiPlayer
  );
  if (buildingAction) return buildingAction;

  // Last resort - default to expansion
  return expansionStrategy(territories, ownedTerritories, aiPlayer);
}

// Process AI action
export function processAIAction(
  territories: Territory[],
  decision: {
    action: "attack" | "defend" | "build";
    source?: Territory;
    target?: Territory;
    buildingType?: BuildingType;
  },
  aiPlayer: AIPlayer
): Territory[] {
  // Make a copy of territories to modify
  const updatedTerritories = [...territories];

  // Handle different action types
  switch (decision.action) {
    case "attack":
      if (!decision.source || !decision.target) return territories;

      // Find territory indexes
      const attackingIndex = updatedTerritories.findIndex(
        (t) => t.x === decision.source!.x && t.y === decision.source!.y
      );

      const targetIndex = updatedTerritories.findIndex(
        (t) => t.x === decision.target!.x && t.y === decision.target!.y
      );

      if (attackingIndex === -1 || targetIndex === -1) return territories;

      // Calculate attack force (70% of troops)
      const attackingTroops = Math.floor(
        updatedTerritories[attackingIndex].troops * 0.7
      );

      // Apply defense bonuses
      const defenseBonus =
        updatedTerritories[targetIndex].building?.type === "fort"
          ? updatedTerritories[targetIndex].building.level
          : 0;

      const effectiveDefense =
        updatedTerritories[targetIndex].troops * (1 + defenseBonus);

      // Process attack outcome
      if (attackingTroops > effectiveDefense) {
        // Successful attack
        const remainingTroops =
          attackingTroops - updatedTerritories[targetIndex].troops;

        // Update target territory ownership
        updatedTerritories[targetIndex].owner = {
          id: aiPlayer.id,
          name: aiPlayer.name,
          color: aiPlayer.color,
        };
        updatedTerritories[targetIndex].troops = remainingTroops;

        // Remove buildings (except walls) when capturing
        if (
          updatedTerritories[targetIndex].building &&
          !updatedTerritories[targetIndex].wall
        ) {
          updatedTerritories[targetIndex].building = null;
        }

        // Deduct troops from attacking territory
        updatedTerritories[attackingIndex].troops -= attackingTroops;
      } else {
        // Failed attack
        updatedTerritories[targetIndex].troops -= Math.floor(
          attackingTroops / (1 + defenseBonus)
        );
        updatedTerritories[attackingIndex].troops -= attackingTroops;
      }
      break;

    case "defend":
      if (!decision.target) return territories;

      // Find territory index
      const defendIndex = updatedTerritories.findIndex(
        (t) => t.x === decision.target!.x && t.y === decision.target!.y
      );

      if (defendIndex === -1) return territories;

      // Reinforce with +5 troops
      updatedTerritories[defendIndex].troops += 5;
      break;

    case "build":
      if (!decision.target || !decision.buildingType) return territories;

      // Find territory index
      const buildIndex = updatedTerritories.findIndex(
        (t) => t.x === decision.target!.x && t.y === decision.target!.y
      );

      if (buildIndex === -1) return territories;

      // Get building costs (should match those in the UI)
      const buildingCosts = {
        fort: 100,
        farm: 150,
        tower: 200,
        barracks: 120,
        wall: 80,
        mine: 150,
        market: 200,
      };

      const cost = buildingCosts[decision.buildingType] || 0;

      // Check if AI has enough gold
      if (aiPlayer.gold && aiPlayer.gold >= cost) {
        // Deduct the gold cost
        aiPlayer.gold -= cost;

        // Add building or wall
        if (decision.buildingType === "wall") {
          // Only build walls on empty tiles
          if (!updatedTerritories[buildIndex].owner) {
            updatedTerritories[buildIndex].wall = true;
            // For visualization purposes, mark wall as owned by the AI
            updatedTerritories[buildIndex].owner = {
              id: aiPlayer.id,
              name: aiPlayer.name,
              color: aiPlayer.color,
            };
            // Walls don't have troops
            updatedTerritories[buildIndex].troops = 0;
          }
        } else {
          // Only build on owned territories
          if (
            updatedTerritories[buildIndex].owner &&
            updatedTerritories[buildIndex].owner.id === aiPlayer.id
          ) {
            updatedTerritories[buildIndex].building = {
              type: decision.buildingType,
              level: 1,
            };
          }
        }
      }
      break;
  }

  return updatedTerritories;
}

// Export a function to assign personalities to AI players
export function assignAIPersonalities(aiPlayers: AIPlayer[]): AIPlayer[] {
  return aiPlayers.map((player) => ({
    ...player,
    personality: selectPersonality(),
    gold: 500, // Start with some gold
  }));
}
