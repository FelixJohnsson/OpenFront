"use client";

import { useState, useEffect } from "react";
import TrainingDashboard from "../components/TrainingDashboard";
import TrainingVisualizer from "../components/TrainingVisualizer";
import { neuralAI } from "../utils/neuralAI";
import Link from "next/link";

// Training page for neural network learning
export default function TrainPage() {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the neural network on component mount
  useEffect(() => {
    // Configure input and output sizes for the model
    // Input size: depends on game state representation
    const INPUT_SIZE = 500; // This would need to be adjusted based on game complexity
    // Output size: represents all possible actions
    const OUTPUT_SIZE = 1000; // This is a simplified approximation

    // Initialize the neural network
    neuralAI.initialize(INPUT_SIZE, OUTPUT_SIZE);
    setIsInitialized(true);

    console.log("Neural network initialized for training");
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              OpenFront Neural Network Training
            </h1>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Game
            </Link>
          </div>
          <p className="text-gray-600 mb-4">
            This page allows you to train a neural network to play OpenFront
            through reinforcement learning. The AI will learn by playing games
            against itself and other AI players, improving its strategy over
            time.
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Training occurs in simulated games. The
              neural network learns by playing thousands of games against
              different opponents, gradually improving its strategy based on the
              outcomes. You can start/stop training, save the trained model, and
              watch its progress in real-time.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Neural network training dashboard */}
          <div>
            <section className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Training Dashboard</h2>
              {isInitialized ? (
                <TrainingDashboard />
              ) : (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">
                    Initializing neural network...
                  </span>
                </div>
              )}
            </section>

            {/* Training configuration section */}
            <section className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                Training Configuration
              </h2>
              <p className="text-gray-600 mb-4">
                The neural network learns through self-play and reinforcement
                learning. Each action the AI takes results in a reward or
                penalty, helping it learn which strategies lead to better
                outcomes.
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Learning Parameters</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      <span className="font-medium">Discount factor:</span> 0.95
                    </li>
                    <li>
                      <span className="font-medium">Learning rate:</span> 0.001
                    </li>
                    <li>
                      <span className="font-medium">
                        Initial exploration rate:
                      </span>{" "}
                      1.0
                    </li>
                    <li>
                      <span className="font-medium">
                        Final exploration rate:
                      </span>{" "}
                      0.1
                    </li>
                  </ul>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Reward System</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      <span className="font-medium">Territory gain:</span> +10
                      per territory
                    </li>
                    <li>
                      <span className="font-medium">Gold accumulated:</span>{" "}
                      +0.1 per gold
                    </li>
                    <li>
                      <span className="font-medium">Troops gained:</span> +0.5
                      per troop
                    </li>
                    <li>
                      <span className="font-medium">
                        Buildings constructed:
                      </span>{" "}
                      +5 per building
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* Game visualization and simulator controls */}
          <div>
            <section className="bg-white rounded-lg shadow-md p-6 mb-8">
              {isInitialized ? (
                <TrainingVisualizer />
              ) : (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">
                    Initializing visualization...
                  </span>
                </div>
              )}
            </section>

            <section className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                How Neural Network Learning Works
              </h2>
              <div className="text-sm text-gray-600 space-y-3">
                <p>
                  The neural network learns through a technique called{" "}
                  <span className="font-medium">reinforcement learning</span>,
                  specifically using Deep Q-Learning. Here's how it works:
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    The AI plays many games, initially making random moves
                    (exploration phase).
                  </li>
                  <li>
                    After each action, it observes the new game state and
                    receives a reward based on how that action affected its
                    position in the game.
                  </li>
                  <li>
                    These experiences (state, action, reward, next state) are
                    stored in memory.
                  </li>
                  <li>
                    Periodically, the AI trains on batches of these experiences,
                    learning which actions lead to the highest cumulative
                    rewards in different situations.
                  </li>
                  <li>
                    Over time, the AI gradually shifts from random exploration
                    to exploiting what it has learned, becoming increasingly
                    strategic in its gameplay.
                  </li>
                </ol>
                <p>
                  As training progresses, you'll see the AI's reward trending
                  upward, indicating improved performance. The win rate should
                  also increase as the neural network becomes more effective at
                  playing the game.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
