"use client";

export default function Controls() {
  return (
    <div className="bg-gray-100 p-4 border-t border-gray-300">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex space-x-4">
          <button className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-200">
            Attack Mode
          </button>
          <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition duration-200">
            Defense Mode
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Troops: </span>
          <span className="text-lg font-bold">1000</span>
          <span className="text-xs text-gray-500">(+25/s)</span>
        </div>
      </div>
    </div>
  );
}
