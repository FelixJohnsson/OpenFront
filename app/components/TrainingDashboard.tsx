"use client";

import { useState, useEffect } from "react";
import { neuralAI, TrainingMetrics } from "../utils/neuralAI";

// Training dashboard component to show neural network learning progress
export default function TrainingDashboard() {
  const [metrics, setMetrics] = useState<TrainingMetrics[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [episodes, setEpisodes] = useState(0);
  const [learningRate, setLearningRate] = useState(0.001);
  const [explorationRate, setExplorationRate] = useState(1.0);

  // Update metrics from neural AI
  useEffect(() => {
    const interval = setInterval(() => {
      if (neuralAI.isCurrentlyTraining()) {
        const currentMetrics = neuralAI.getMetrics();
        setMetrics(currentMetrics);

        // Update other values
        setExplorationRate(neuralAI.getExplorationRate());
        setEpisodes(
          currentMetrics.length > 0
            ? currentMetrics[currentMetrics.length - 1].episode
            : 0
        );
        setIsTraining(true);
      } else {
        setIsTraining(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Start training the neural network
  const handleStartTraining = () => {
    neuralAI.startTraining();
    setIsTraining(true);
  };

  // Stop training
  const handleStopTraining = () => {
    neuralAI.stopTraining();
    setIsTraining(false);
  };

  // Save the current model
  const handleSaveModel = async () => {
    await neuralAI.saveModel("openfront-neural-model");
  };

  // Load a previously saved model
  const handleLoadModel = async () => {
    await neuralAI.loadModel("openfront-neural-model");
  };

  // Helper function to calculate average reward over last N episodes
  const getAverageReward = (count: number = 10) => {
    if (metrics.length === 0) return 0;

    const lastN = metrics.slice(-Math.min(count, metrics.length));
    const sum = lastN.reduce((acc, metric) => acc + metric.reward, 0);
    return sum / lastN.length;
  };

  // Helper function to calculate win rate over last N episodes
  const getWinRate = (count: number = 10) => {
    if (metrics.length === 0) return 0;

    const lastN = metrics.slice(-Math.min(count, metrics.length));
    const sum = lastN.reduce((acc, metric) => acc + metric.winRate, 0);
    return sum / lastN.length;
  };

  // Data for reward chart
  const getChartData = () => {
    if (metrics.length === 0) return [];

    // Take last 50 episodes or all if less
    const displayMetrics = metrics.slice(-50);

    return displayMetrics.map((metric) => ({
      episode: metric.episode,
      reward: metric.reward,
      territories: metric.territoriesOwned,
      gold: metric.goldAccumulated / 100, // Scale down for display
      troops: metric.troopsAccumulated / 100, // Scale down for display
      buildings: metric.buildingsConstructed,
      winRate: metric.winRate * 100, // Convert to percentage
    }));
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-screen-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Neural Network Training</h2>

      {/* Training controls */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={isTraining ? handleStopTraining : handleStartTraining}
          className={`px-4 py-2 rounded-md ${
            isTraining
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {isTraining ? "Stop Training" : "Start Training"}
        </button>

        <button
          onClick={handleSaveModel}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
        >
          Save Model
        </button>

        <button
          onClick={handleLoadModel}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md"
        >
          Load Model
        </button>
      </div>

      {/* Training stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Episodes</div>
          <div className="text-xl font-semibold">{episodes}</div>
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Avg Reward (last 10)</div>
          <div className="text-xl font-semibold">
            {getAverageReward(10).toFixed(1)}
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Win Rate %</div>
          <div className="text-xl font-semibold">
            {(getWinRate(20) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-500">Exploration Rate</div>
          <div className="text-xl font-semibold">
            {explorationRate.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Chart would go here - we'll use a simplified version */}
      <div className="relative h-60 bg-gray-50 p-2 mb-6 overflow-hidden">
        <div className="absolute bottom-2 left-2 right-2 h-52 flex items-end">
          {getChartData().map((data, index) => (
            <div
              key={index}
              className="w-2 mx-0.5 bg-blue-500 transition-all duration-500"
              style={{
                height: `${Math.max(1, Math.min(100, data.reward))}%`,
                backgroundColor: data.reward > 0 ? "#3b82f6" : "#ef4444",
              }}
              title={`Episode ${data.episode}: Reward ${data.reward.toFixed(
                1
              )}`}
            />
          ))}
        </div>
        <div className="absolute top-2 left-2 text-xs text-gray-500">
          Rewards per Episode
        </div>
      </div>

      {/* Learning metrics */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Latest Episode Details</h3>
        {metrics.length > 0 ? (
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div>Territories Owned:</div>
            <div>{metrics[metrics.length - 1].territoriesOwned}</div>

            <div>Gold Accumulated:</div>
            <div>{metrics[metrics.length - 1].goldAccumulated}</div>

            <div>Troops Accumulated:</div>
            <div>{metrics[metrics.length - 1].troopsAccumulated}</div>

            <div>Buildings Constructed:</div>
            <div>{metrics[metrics.length - 1].buildingsConstructed}</div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No training data yet</div>
        )}
      </div>
    </div>
  );
}
