import { create } from 'zustand';
import type { GameStore } from '../types/game';

export const useGameStore = create<GameStore>((set) => ({
  gameState: 'loading',
  playerPosition: { x: 0, y: 50, z: 0 },

  setGameState: (newState) => set({ gameState: newState }),

  setPlayerPosition: (position) => set({ playerPosition: position }),
}));

// Performance Store für Monitoring
interface PerformanceStore {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  chunkCount: number;
  setFPS: (fps: number) => void;
  setMemoryUsage: (usage: number) => void;
  setChunkCount: (count: number) => void;
}

export const usePerformanceStore = create<PerformanceStore>((set) => ({
  fps: 60,
  frameTime: 16.67,
  memoryUsage: 0,
  chunkCount: 0,

  setFPS: (fps) => set({ fps, frameTime: 1000 / fps }),
  setMemoryUsage: (memoryUsage) => set({ memoryUsage }),
  setChunkCount: (chunkCount) => set({ chunkCount }),
}));