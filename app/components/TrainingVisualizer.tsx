"use client";

import React, { useEffect, useRef, useState } from "react";
import { gameSimulator } from "../utils/gameSimulator";

// Component to visualize a simplified version of games being played during training
export default function TrainingVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [simulationStatus, setSimulationStatus] = useState({
    isRunning: false,
    currentEpisode: 0,
    episodeCount: 0,
    speed: 1,
  });
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  // Handle simulation controls
  const startSimulation = () => {
    gameSimulator.startSimulation();
    setSimulationStatus({ ...gameSimulator.getStatus() });
  };

  const stopSimulation = () => {
    gameSimulator.stopSimulation();
    setSimulationStatus({ ...gameSimulator.getStatus() });
  };

  const changeSpeed = (speed: number) => {
    gameSimulator.setSimulationSpeed(speed);
    setSimulationSpeed(speed);
    setSimulationStatus({ ...gameSimulator.getStatus() });
  };

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulationStatus({ ...gameSimulator.getStatus() });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Draw a simplified visualization (placeholder)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw a placeholder visualization
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw some placeholder elements
    const colors = ["#e63946", "#457b9d", "#2a9d8f"];

    // Draw episode number
    ctx.font = "16px Arial";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText(
      `Episode: ${simulationStatus.currentEpisode}`,
      canvas.width / 2,
      20
    );

    // Draw a simple visualization of AI agents competing
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 3;

    // Draw territory areas - size based on episode number to show progress
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const x = centerX + Math.cos(angle) * radius * 0.5;
      const y = centerY + Math.sin(angle) * radius * 0.5;

      // Size variations based on episode
      const sizeVariation =
        ((simulationStatus.currentEpisode + i * 100) % 100) / 100;
      const size = 30 + 20 * sizeVariation;

      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      // Draw "territories"
      for (let j = 0; j < 5; j++) {
        const territoryAngle = angle + j * 0.2 - 0.4;
        const distance = radius * 0.8;
        const tx = centerX + Math.cos(territoryAngle) * distance;
        const ty = centerY + Math.sin(territoryAngle) * distance;

        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(tx, ty, 10, 0, Math.PI * 2);
        ctx.fill();

        // Add a small "troop" number
        ctx.fillStyle = "#fff";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(Math.floor(Math.random() * 10) + 1), tx, ty);
      }
    }

    // Add some animations based on current episode
    const time = simulationStatus.currentEpisode % 100;

    // Animated "attack" line
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const startAngle = Math.PI / 6;
    const endAngle = Math.PI / 2;
    const animationProgress = time / 100;
    const currentAngle =
      startAngle + (endAngle - startAngle) * animationProgress;

    const startX = centerX + Math.cos(startAngle) * radius * 0.7;
    const startY = centerY + Math.sin(startAngle) * radius * 0.7;
    const endX = centerX + Math.cos(currentAngle) * radius * 0.7;
    const endY = centerY + Math.sin(currentAngle) * radius * 0.7;

    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw an arrow at the end
    if (animationProgress > 0.1) {
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - 5, endY - 5);
      ctx.lineTo(endX + 5, endY - 5);
      ctx.closePath();
      ctx.fillStyle = "#ff0000";
      ctx.fill();
    }
  }, [simulationStatus]);

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Training Visualization</h2>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="font-medium">Status:</span>{" "}
            {simulationStatus.isRunning ? (
              <span className="text-green-600">Running</span>
            ) : (
              <span className="text-gray-600">Stopped</span>
            )}
          </div>
          <div>
            <span className="font-medium">Current Episode:</span>{" "}
            {simulationStatus.currentEpisode}
          </div>
          <div>
            <span className="font-medium">Total Episodes:</span>{" "}
            {simulationStatus.episodeCount}
          </div>
        </div>

        <div className="flex space-x-2 mb-4">
          {!simulationStatus.isRunning ? (
            <button
              onClick={startSimulation}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Start Simulation
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Stop Simulation
            </button>
          )}

          <div className="flex items-center">
            <span className="mr-2">Speed:</span>
            <select
              value={simulationSpeed}
              onChange={(e) => changeSpeed(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value="0.1">0.1x</option>
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <canvas ref={canvasRef} width={500} height={300} className="w-full" />
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          This visualization represents a simplified view of the games being
          played during training. Each colored area represents a player's
          territory, with the red player being the neural network AI.
        </p>
        <p className="mt-2">
          The actual training happens much faster in the background, with many
          more games being simulated than what is shown here.
        </p>
      </div>
    </div>
  );
}
